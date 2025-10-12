import { Request, Response } from 'express';
import Stripe from 'stripe';
import { groupPaymentService } from '../services/groupPaymentService';
import { storage } from '../storage';

/**
 * Create a payment intent for a group gift contribution
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { groupGiftId, amount, currency = 'usd' } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (!groupGiftId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Group gift ID and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    // Create payment intent
    const paymentIntent = await groupPaymentService.createContributionPaymentIntent(
      groupGiftId,
      userId,
      amount,
      currency
    );

    res.json({
      success: true,
      data: paymentIntent
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent'
    });
  }
};

/**
 * Create a Stripe Checkout session for group gift contribution
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { groupGiftId, amount, currency = 'usd' } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (!groupGiftId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Group gift ID and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    // Generate success and cancel URLs
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/group-gifts/${groupGiftId}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/group-gifts/${groupGiftId}/payment-cancelled`;

    // Create checkout session
    const session = await groupPaymentService.createContributionCheckoutSession(
      groupGiftId,
      userId,
      amount,
      successUrl,
      cancelUrl,
      currency
    );

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session'
    });
  }
};

/**
 * Create a new group gift
 */
export const createGroupGift = async (req: Request, res: Response) => {
  try {
    const { itemId, targetAmount, message, expiresAt, isAnonymous = false } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (!itemId || !targetAmount) {
      return res.status(400).json({
        success: false,
        error: 'Item ID and target amount are required'
      });
    }

    if (targetAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Target amount must be greater than 0'
      });
    }

    // Verify the item exists and user has access
    const item = await storage.getWishlistItem(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Wishlist item not found'
      });
    }

    // Parse expiration date if provided
    let expirationDate: Date | undefined;
    if (expiresAt) {
      expirationDate = new Date(expiresAt);
      if (isNaN(expirationDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid expiration date'
        });
      }
      if (expirationDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Expiration date must be in the future'
        });
      }
    }

    // Create group gift
    const groupGift = await groupPaymentService.createGroupGift(
      itemId,
      userId,
      targetAmount,
      message,
      expirationDate,
      isAnonymous
    );

    res.status(201).json({
      success: true,
      data: groupGift
    });
  } catch (error) {
    console.error('Error creating group gift:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create group gift'
    });
  }
};

/**
 * Get a group gift by ID
 */
export const getGroupGift = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const groupGiftId = parseInt(id);

    if (isNaN(groupGiftId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid group gift ID'
      });
    }

    const groupGift = await groupPaymentService.getGroupGift(groupGiftId);
    if (!groupGift) {
      return res.status(404).json({
        success: false,
        error: 'Group gift not found'
      });
    }

    // Get additional details for the response
    const item = await storage.getWishlistItem(groupGift.itemId);
    const initiator = await storage.getUser(groupGift.initiatedByUserId);

    // Get contributor details (if not anonymous)
    const contributorDetails = [];
    if (!groupGift.isAnonymous) {
      for (const contribution of groupGift.contributions) {
        const contributor = await storage.getUser(contribution.userId);
        if (contributor) {
          contributorDetails.push({
            id: contribution.id,
            amount: contribution.amount,
            message: contribution.message,
            createdAt: contribution.createdAt,
            contributor: {
              id: contributor.id,
              displayName: contributor.displayName || contributor.username,
              avatarUrl: contributor.avatarUrl
            }
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        ...groupGift,
        item,
        initiator: initiator ? {
          id: initiator.id,
          displayName: initiator.displayName || initiator.username,
          avatarUrl: initiator.avatarUrl
        } : null,
        contributorDetails: groupGift.isAnonymous ? [] : contributorDetails,
        paymentStats: await groupPaymentService.getGroupGiftPaymentStats(groupGiftId)
      }
    });
  } catch (error) {
    console.error('Error getting group gift:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get group gift'
    });
  }
};

/**
 * Get user's group gifts (initiated or contributed to)
 */
export const getUserGroupGifts = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const groupGifts = await groupPaymentService.getUserGroupGifts(userId);

    // Enrich with additional details
    const enrichedGifts = [];
    for (const gift of groupGifts) {
      const item = await storage.getWishlistItem(gift.itemId);
      const initiator = await storage.getUser(gift.initiatedByUserId);
      const paymentStats = await groupPaymentService.getGroupGiftPaymentStats(gift.id);

      enrichedGifts.push({
        ...gift,
        item,
        initiator: initiator ? {
          id: initiator.id,
          displayName: initiator.displayName || initiator.username,
          avatarUrl: initiator.avatarUrl
        } : null,
        paymentStats
      });
    }

    res.json({
      success: true,
      data: enrichedGifts
    });
  } catch (error) {
    console.error('Error getting user group gifts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user group gifts'
    });
  }
};

/**
 * Process a refund for a contribution
 */
export const processRefund = async (req: Request, res: Response) => {
  try {
    const { contributionId } = req.params;
    const { reason = 'requested_by_customer' } = req.body;
    const userId = req.user!.id;

    const contributionIdNum = parseInt(contributionId);
    if (isNaN(contributionIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contribution ID'
      });
    }

    // TODO: Add authorization check - only allow refunds for own contributions or group gift initiator
    
    const refundResult = await groupPaymentService.processRefund(contributionIdNum, reason);

    res.json({
      success: true,
      data: refundResult
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process refund'
    });
  }
};

/**
 * Get payment statistics for a group gift
 */
export const getPaymentStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const groupGiftId = parseInt(id);

    if (isNaN(groupGiftId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid group gift ID'
      });
    }

    const stats = await groupPaymentService.getGroupGiftPaymentStats(groupGiftId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting payment stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get payment stats'
    });
  }
};

/**
 * Get user's payment history
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const history = await groupPaymentService.getUserPaymentHistory(userId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get payment history'
    });
  }
};

/**
 * Stripe webhook handler for payment events
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Stripe webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    if (!sig) {
      console.error('Stripe webhook signature missing');
      return res.status(400).json({ error: 'Webhook signature missing' });
    }

    // Verify webhook signature with Stripe
    let event: Stripe.Event;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await groupPaymentService.handleSuccessfulPayment(
          event.id,
          event.data.object.id as string
        );
        break;

      case 'payment_intent.payment_failed':
        await groupPaymentService.handleFailedPayment(
          event.id,
          event.data.object.id as string
        );
        break;

      case 'checkout.session.completed':
        await groupPaymentService.handleSuccessfulPayment(
          event.id,
          undefined,
          event.data.object.id as string
        );
        break;

      case 'checkout.session.expired':
        await groupPaymentService.handleFailedPayment(
          event.id,
          undefined,
          event.data.object.id as string
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    });
  }
};