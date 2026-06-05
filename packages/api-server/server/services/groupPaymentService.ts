import Stripe from 'stripe';
import { storage } from '../storage';
import { emailService } from './emailService';

// Initialize Stripe - use default API version
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentSession {
  id: string;
  url: string;
  expires_at: number;
}

export interface RefundResult {
  id: string;
  amount: number;
  status: string;
  reason?: string;
}

export interface GroupGift {
  id: number;
  itemId: number;
  initiatedByUserId: number;
  targetAmount: number;
  currentAmount: number;
  status: 'active' | 'completed' | 'cancelled';
  expiresAt?: Date;
  completedAt?: Date;
  message?: string;
  createdAt: Date;
  isAnonymous: boolean;
  contributions: GroupGiftContribution[];
}

export interface GroupGiftContribution {
  id: number;
  groupGiftId: number;
  userId: number;
  amount: number;
  message?: string;
  isAnonymous: boolean;
  createdAt: Date;
  paymentStatus: 'pending' | 'completed' | 'refunded';
  paymentMethod?: string;
  stripePaymentIntentId?: string;
}

/**
 * Memory-based Group Payment Service with Stripe Integration
 * This version works with the memory storage system until PostgreSQL is configured
 */
export class GroupPaymentService {
  private stripe: Stripe | null;
  private groupGifts: Map<number, GroupGift> = new Map();
  private contributions: Map<number, GroupGiftContribution> = new Map();
  private payments: Map<string, any> = new Map();
  private nextId = 1;

  constructor() {
    this.stripe = stripe;
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY to enable payments.');
    }
    return this.stripe;
  }

  /**
   * Create a payment intent for a group gift contribution
   */
  async createContributionPaymentIntent(
    groupGiftId: number,
    userId: number,
    amount: number,
    currency: string = 'usd'
  ): Promise<PaymentIntent> {
    try {
      // Get group gift details from memory
      const groupGift = this.groupGifts.get(groupGiftId);
      if (!groupGift) {
        throw new Error('Group gift not found');
      }

      if (groupGift.status !== 'active') {
        throw new Error('Group gift is not active for contributions');
      }

      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get wishlist item for additional context
      const item = await storage.getWishlistItem(groupGift.itemId);
      
      // Create payment intent with Stripe
      const paymentIntent = await this.requireStripe().paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          groupGiftId: groupGiftId.toString(),
          userId: userId.toString(),
          itemId: groupGift.itemId.toString(),
          type: 'group_gift_contribution'
        },
        description: `Group gift contribution for "${item?.title || 'Unknown Item'}"`,
        receipt_email: user.email || undefined,
      });

      // Store payment record in memory
      this.payments.set(paymentIntent.id, {
        id: paymentIntent.id,
        userId,
        amount,
        currency,
        status: 'pending',
        groupGiftId,
        itemId: groupGift.itemId,
        createdAt: new Date()
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount,
        currency,
        status: paymentIntent.status
      };
    } catch (error) {
      console.error('Error creating contribution payment intent:', error);
      throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a Stripe Checkout session for group gift contribution
   */
  async createContributionCheckoutSession(
    groupGiftId: number,
    userId: number,
    amount: number,
    successUrl: string,
    cancelUrl: string,
    currency: string = 'usd'
  ): Promise<PaymentSession> {
    try {
      // Get group gift details
      const groupGift = this.groupGifts.get(groupGiftId);
      if (!groupGift) {
        throw new Error('Group gift not found');
      }

      // Get user details
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get item details
      const item = await storage.getWishlistItem(groupGift.itemId);

      // Create Stripe Checkout session
      const session = await this.requireStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: `Group Gift Contribution`,
                description: `Contributing to group gift for "${item?.title || 'Unknown Item'}"`,
                images: item?.imageUrl ? [item.imageUrl] : undefined,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: user.email || undefined,
        metadata: {
          groupGiftId: groupGiftId.toString(),
          userId: userId.toString(),
          itemId: groupGift.itemId.toString(),
          type: 'group_gift_contribution'
        },
      });

      // Store payment record
      this.payments.set(session.id, {
        id: session.id,
        userId,
        amount,
        currency,
        status: 'pending',
        groupGiftId,
        itemId: groupGift.itemId,
        createdAt: new Date()
      });

      return {
        id: session.id,
        url: session.url!,
        expires_at: session.expires_at
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle successful payment and create group gift contribution
   */
  async handleSuccessfulPayment(stripeEventId: string, paymentIntentId?: string, sessionId?: string): Promise<void> {
    try {
      let paymentRecord;
      
      // Find the payment record
      if (paymentIntentId) {
        paymentRecord = this.payments.get(paymentIntentId);
      } else if (sessionId) {
        paymentRecord = this.payments.get(sessionId);
      }

      if (!paymentRecord) {
        console.error('Payment record not found for successful payment');
        return;
      }

      // Update payment status
      paymentRecord.status = 'completed';
      paymentRecord.completedAt = new Date();
      paymentRecord.stripeEventId = stripeEventId;

      // Create group gift contribution
      const contributionId = this.nextId++;
      const contribution: GroupGiftContribution = {
        id: contributionId,
        groupGiftId: paymentRecord.groupGiftId,
        userId: paymentRecord.userId,
        amount: paymentRecord.amount,
        paymentStatus: 'completed',
        isAnonymous: false,
        createdAt: new Date(),
        stripePaymentIntentId: paymentIntentId || sessionId
      };

      this.contributions.set(contributionId, contribution);

      // Update group gift
      const groupGift = this.groupGifts.get(paymentRecord.groupGiftId);
      if (groupGift) {
        groupGift.currentAmount += paymentRecord.amount;
        groupGift.contributions.push(contribution);

        // Check if goal reached
        if (groupGift.currentAmount >= groupGift.targetAmount) {
          groupGift.status = 'completed';
          groupGift.completedAt = new Date();
          await this.notifyGroupGiftCompleted(groupGift.id);
        }
      }

      // Send notifications
      await this.notifyContributionSuccess(contributionId);

    } catch (error) {
      console.error('Error handling successful payment:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  async handleFailedPayment(stripeEventId: string, paymentIntentId?: string, sessionId?: string): Promise<void> {
    try {
      let paymentRecord;
      
      // Find the payment record
      if (paymentIntentId) {
        paymentRecord = this.payments.get(paymentIntentId);
      } else if (sessionId) {
        paymentRecord = this.payments.get(sessionId);
      }

      if (!paymentRecord) {
        console.error('Payment record not found for failed payment');
        return;
      }

      // Update payment status
      paymentRecord.status = 'failed';
      paymentRecord.stripeEventId = stripeEventId;

      // Notify user of payment failure
      await this.notifyPaymentFailure(paymentRecord.userId, paymentRecord.groupGiftId);

    } catch (error) {
      console.error('Error handling failed payment:', error);
      throw error;
    }
  }

  /**
   * Process refund for a contribution
   */
  async processRefund(contributionId: number, reason: string = 'requested_by_customer'): Promise<RefundResult> {
    try {
      // Get contribution details
      const contribution = this.contributions.get(contributionId);
      if (!contribution) {
        throw new Error('Contribution not found');
      }

      if (contribution.paymentStatus === 'refunded') {
        throw new Error('Contribution already refunded');
      }

      // Process refund with Stripe
      let refund;
      if (contribution.stripePaymentIntentId) {
        refund = await this.requireStripe().refunds.create({
          payment_intent: contribution.stripePaymentIntentId,
          reason: reason as any, // Cast to bypass type checking for now
          metadata: {
            contributionId: contributionId.toString(),
            groupGiftId: contribution.groupGiftId.toString(),
          }
        });
      } else {
        throw new Error('No Stripe payment intent found for refund');
      }

      // Update contribution status
      contribution.paymentStatus = 'refunded';

      // Update group gift total
      const groupGift = this.groupGifts.get(contribution.groupGiftId);
      if (groupGift) {
        groupGift.currentAmount -= contribution.amount;
        groupGift.contributions = groupGift.contributions.filter(c => c.id !== contributionId);
      }

      // Notify about refund
      await this.notifyRefundProcessed(contribution.userId, contributionId);

      return {
        id: refund.id,
        amount: refund.amount / 100, // Convert from cents
        status: refund.status || 'pending',
        reason: refund.reason || undefined
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw new Error(`Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new group gift
   */
  async createGroupGift(
    itemId: number,
    initiatedByUserId: number,
    targetAmount: number,
    message?: string,
    expiresAt?: Date,
    isAnonymous: boolean = false
  ): Promise<GroupGift> {
    const groupGiftId = this.nextId++;
    const groupGift: GroupGift = {
      id: groupGiftId,
      itemId,
      initiatedByUserId,
      targetAmount,
      currentAmount: 0,
      status: 'active',
      expiresAt,
      message,
      createdAt: new Date(),
      isAnonymous,
      contributions: []
    };

    this.groupGifts.set(groupGiftId, groupGift);
    return groupGift;
  }

  /**
   * Get group gift by ID
   */
  async getGroupGift(id: number): Promise<GroupGift | null> {
    return this.groupGifts.get(id) || null;
  }

  /**
   * Get all group gifts for a user
   */
  async getUserGroupGifts(userId: number): Promise<GroupGift[]> {
    return Array.from(this.groupGifts.values()).filter(
      gift => gift.initiatedByUserId === userId || 
      gift.contributions.some(c => c.userId === userId)
    );
  }

  /**
   * Get payment statistics for a group gift
   */
  async getGroupGiftPaymentStats(groupGiftId: number): Promise<any> {
    const groupGift = this.groupGifts.get(groupGiftId);
    if (!groupGift) {
      return {
        totalContributions: 0,
        totalAmount: 0,
        completedContributions: 0,
        refundedContributions: 0
      };
    }

    const completedContributions = groupGift.contributions.filter(c => c.paymentStatus === 'completed');
    const refundedContributions = groupGift.contributions.filter(c => c.paymentStatus === 'refunded');

    return {
      totalContributions: groupGift.contributions.length,
      totalAmount: groupGift.currentAmount,
      completedContributions: completedContributions.length,
      refundedContributions: refundedContributions.length
    };
  }

  /**
   * Get user's payment history for group gifts
   */
  async getUserPaymentHistory(userId: number): Promise<any[]> {
    const userPayments = [];
    
    for (const [paymentId, payment] of this.payments.entries()) {
      if (payment.userId === userId) {
        const contribution = Array.from(this.contributions.values())
          .find(c => c.stripePaymentIntentId === paymentId);
        
        const groupGift = contribution ? this.groupGifts.get(contribution.groupGiftId) : null;
        const item = groupGift ? await storage.getWishlistItem(groupGift.itemId) : null;

        userPayments.push({
          ...payment,
          contribution,
          groupGift,
          item
        });
      }
    }

    return userPayments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Notify successful contribution
   */
  private async notifyContributionSuccess(contributionId: number): Promise<void> {
    try {
      const contribution = this.contributions.get(contributionId);
      if (!contribution) return;

      const user = await storage.getUser(contribution.userId);
      const groupGift = this.groupGifts.get(contribution.groupGiftId);
      const item = groupGift ? await storage.getWishlistItem(groupGift.itemId) : null;

      if (!user || !groupGift || !item) return;

      // Send email confirmation to contributor
      if (user.email) {
        await emailService.sendContributionConfirmation(
          user.email,
          user.displayName || user.username || 'Contributor',
          {
            itemTitle: item.title,
            contributionAmount: contribution.amount,
            totalRaised: groupGift.currentAmount,
            targetAmount: groupGift.targetAmount,
            percentComplete: Math.round((groupGift.currentAmount / groupGift.targetAmount) * 100)
          }
        );
      }

      console.log(`Contribution success notification sent for contribution ${contributionId}`);
    } catch (error) {
      console.error('Error notifying contribution success:', error);
    }
  }

  /**
   * Notify payment failure
   */
  private async notifyPaymentFailure(userId: number, groupGiftId: number): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      const groupGift = this.groupGifts.get(groupGiftId);
      const item = groupGift ? await storage.getWishlistItem(groupGift.itemId) : null;

      if (!user || !groupGift || !item) return;

      // Send email notification
      if (user.email) {
        await emailService.sendPaymentFailureNotification(
          user.email,
          user.displayName || user.username || 'User',
          item.title
        );
      }

      console.log(`Payment failure notification sent for user ${userId}, group gift ${groupGiftId}`);
    } catch (error) {
      console.error('Error notifying payment failure:', error);
    }
  }

  /**
   * Notify refund processed
   */
  private async notifyRefundProcessed(userId: number, contributionId: number): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      const contribution = this.contributions.get(contributionId);
      const groupGift = contribution ? this.groupGifts.get(contribution.groupGiftId) : null;
      const item = groupGift ? await storage.getWishlistItem(groupGift.itemId) : null;

      if (!user || !contribution || !item) return;

      // Send email notification
      if (user.email) {
        await emailService.sendRefundNotification(
          user.email,
          user.displayName || user.username || 'User',
          {
            itemTitle: item.title,
            refundAmount: contribution.amount
          }
        );
      }

      console.log(`Refund notification sent for user ${userId}, contribution ${contributionId}`);
    } catch (error) {
      console.error('Error notifying refund processed:', error);
    }
  }

  /**
   * Notify group gift completion
   */
  private async notifyGroupGiftCompleted(groupGiftId: number): Promise<void> {
    try {
      const groupGift = this.groupGifts.get(groupGiftId);
      if (!groupGift) return;

      const item = await storage.getWishlistItem(groupGift.itemId);
      if (!item) return;

      // Notify all contributors
      const uniqueContributors = new Map();
      for (const contribution of groupGift.contributions) {
        if (!uniqueContributors.has(contribution.userId)) {
          const user = await storage.getUser(contribution.userId);
          if (user) {
            uniqueContributors.set(contribution.userId, user);
          }
        }
      }

      for (const [userId, user] of uniqueContributors) {
        if (user.email) {
          await emailService.sendGroupGiftCompletedNotification(
            user.email,
            user.displayName || user.username || 'Contributor',
            {
              itemTitle: item.title,
              totalRaised: groupGift.currentAmount,
              contributorCount: uniqueContributors.size
            }
          );
        }
      }

      console.log(`Group gift completion notifications sent for group gift ${groupGiftId}`);
    } catch (error) {
      console.error('Error notifying group gift completion:', error);
    }
  }
}

// Export singleton instance
export const groupPaymentService = new GroupPaymentService();