import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';

// Email templates for different notification types
export enum EmailTemplate {
  PRICE_DROP = 'price_drop',
  WISHLIST_ACTIVITY = 'wishlist_activity',
  ITEM_PURCHASED = 'item_purchased',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  WISHLIST_SHARED = 'wishlist_shared',
  COLLABORATION_INVITE = 'collaboration_invite'
}

// Email configuration and setup
export class EmailService {
  private initialized = false;
  private defaultFromEmail = 'notifications@wishlistwizard.com';
  private defaultFromName = 'Wishlist Wizard';
  private emailStyles = '';

  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.initialized = true;
    } else {
      console.warn('SendGrid API key not found. Email notifications will not be sent.');
    }
    
    // Load email styles
    this.loadEmailStyles();
  }

  /**
   * Load email styles from CSS file
   */
  private loadEmailStyles() {
    try {
      const cssPath = path.join(__dirname, '../assets/email-styles.css');
      this.emailStyles = fs.readFileSync(cssPath, 'utf8');
    } catch (error) {
      console.warn('Could not load email styles:', error);
      this.emailStyles = '';
    }
  }

  /**
   * Wrap HTML content with styles
   */
  private wrapWithStyles(content: string): string {
    return `
      <html>
        <head>
          <style>
            ${this.emailStyles}
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
  }

  /**
   * Send a price drop notification email
   */
  async sendPriceDropNotification(
    to: string,
    itemName: string, 
    oldPrice: string, 
    newPrice: string,
    itemUrl: string,
    imageUrl: string
  ): Promise<boolean> {
    if (!this.initialized) return false;

    const subject = `Price Drop Alert: ${itemName} is now ${newPrice}!`;
    const text = `The price of ${itemName} has dropped from ${oldPrice} to ${newPrice}. Check it out at ${itemUrl}`;
    const htmlContent = `
      <div class="email-container">
        <h2 class="email-header">Price Drop Alert!</h2>
        <p>Good news! An item on your Wishlist Wizard wishlist has dropped in price:</p>
        <div class="email-content-box">
          <img src="${imageUrl}" alt="${itemName}" class="product-image" />
          <h3 class="product-title">${itemName}</h3>
          <p>
            <span class="price-old">${oldPrice}</span>
            <span class="price-new">${newPrice}</span>
          </p>
          <a href="${itemUrl}" class="email-button">View Item</a>
        </div>
        <p>Don't miss out on this deal!</p>
        <p>- The Wishlist Wizard Team</p>
      </div>
    `;
    
    const html = this.wrapWithStyles(htmlContent);

    return this.sendEmail(to, subject, text, html);
  }

  /**
   * Send a wishlist activity notification email
   */
  async sendWishlistActivityNotification(
    to: string,
    activityType: string,
    userName: string,
    wishlistName: string,
    wishlistUrl: string
  ): Promise<boolean> {
    if (!this.initialized) return false;

  const subject = `Wishlist Wizard: New activity on "${wishlistName}"`;
    const text = `${userName} ${activityType} on your wishlist "${wishlistName}". Check it out at ${wishlistUrl}`;
    const htmlContent = `
      <div class="email-container">
        <h2 class="email-header">Wishlist Activity Update</h2>
        <p>There's been new activity on your Wishlist Wizard wishlist:</p>
        <div class="email-content-box">
          <h3 class="product-title">${wishlistName}</h3>
          <p><strong>${userName}</strong> ${activityType}</p>
          <a href="${wishlistUrl}" class="email-button">View Wishlist</a>
        </div>
        <p>Stay up to date with all your wishlist activities!</p>
        <p>- The Wishlist Wizard Team</p>
      </div>
    `;
    
    const html = this.wrapWithStyles(htmlContent);

    return this.sendEmail(to, subject, text, html);
  }

  /**
   * Send a welcome email to new users
   */
  async sendWelcomeEmail(
    to: string,
    userName: string
  ): Promise<boolean> {
    if (!this.initialized) return false;

  const subject = `Welcome to Wishlist Wizard!`;
  const text = `Welcome to Wishlist Wizard, ${userName}! We're excited to have you on board. Start creating your wishlists today.`;
    const htmlContent = `
      <div class="email-container">
        <h2 class="email-header">Welcome to Wishlist Wizard!</h2>
        <p>Hi ${userName},</p>
        <p>We're thrilled to have you join our community of wishlist enthusiasts!</p>
        <div class="email-content-box">
          <h3 class="product-title">Get Started with Wishlist Wizard:</h3>
          <ul class="welcome-list">
            <li>Create your first wishlist</li>
            <li>Add items from any shopping website</li>
            <li>Share your wishlist with friends and family</li>
            <li>Track price drops on your favorite items</li>
          </ul>
          <a href="https://wishlistwizard.com/dashboard" class="email-button">Go to Dashboard</a>
        </div>
        <p>If you have any questions, feel free to reply to this email!</p>
        <p>- The Wishlist Wizard Team</p>
      </div>
    `;
    
    const html = this.wrapWithStyles(htmlContent);

    return this.sendEmail(to, subject, text, html);
  }

  /**
   * Send a collaboration invite email
   */
  async sendCollaborationInvite(
    to: string,
    inviterName: string,
    wishlistName: string,
    acceptUrl: string
  ): Promise<boolean> {
    if (!this.initialized) return false;

  const subject = `Wishlist Wizard: ${inviterName} invited you to collaborate on "${wishlistName}"`;
    const text = `${inviterName} has invited you to collaborate on the wishlist "${wishlistName}". Accept the invitation at ${acceptUrl}`;
    const htmlContent = `
      <div class="email-container">
        <h2 class="email-header">Collaboration Invitation</h2>
        <p>${inviterName} has invited you to collaborate on a Wishlist Wizard wishlist:</p>
        <div class="email-content-box">
          <h3 class="product-title">${wishlistName}</h3>
          <p>Collaborate on this wishlist to add items, make comments, and help organize gifts.</p>
          <a href="${acceptUrl}" class="email-button">Accept Invitation</a>
        </div>
        <p>Working together makes gift planning easier!</p>
        <p>- The Wishlist Wizard Team</p>
      </div>
    `;
    
    const html = this.wrapWithStyles(htmlContent);

    return this.sendEmail(to, subject, text, html);
  }

  /**
   * Send an email verification email
   */
  async sendVerificationEmail(
    to: string,
    userName: string,
    verificationUrl: string
  ): Promise<boolean> {
    if (!this.initialized) return false;

    const subject = `Please verify your Wishlist Wizard email`;
    const text = `Hi ${userName}, please verify your email address by clicking this link: ${verificationUrl}. If you didn't create this account, please ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Verify Your Email Address</h2>
        <p>Hi ${userName},</p>
        <p>Thanks for signing up for Wishlist Wizard! Please verify your email address to complete your account setup.</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p>Click the button below to verify your email:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px; margin-top: 16px;">Verify Email Address</a>
        </div>
        <p>This link will expire in 24 hours. If you didn't create this account, please ignore this email.</p>
        <p>- The Wishlist Wizard Team</p>
      </div>
    `;

    return this.sendEmail(to, subject, text, html);
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    resetUrl: string
  ): Promise<boolean> {
    if (!this.initialized) return false;

  const subject = `Reset Your Wishlist Wizard Password`;
  const text = `You requested to reset your Wishlist Wizard password. Click the following link to reset it: ${resetUrl}. If you didn't request this, please ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Reset Your Password</h2>
  <p>We received a request to reset your Wishlist Wizard password.</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px; margin-top: 16px;">Reset Password</a>
        </div>
        <p>This link will expire in 24 hours. If you didn't request a password reset, please ignore this email.</p>
  <p>- The Wishlist Wizard Team</p>
      </div>
    `;

    return this.sendEmail(to, subject, text, html);
  }

  /**
   * Send a wishlist shared notification email
   */
  async sendWishlistSharedNotification(
    to: string,
    sharerName: string,
    wishlistName: string,
    wishlistUrl: string
  ): Promise<boolean> {
    if (!this.initialized) return false;

  const subject = `Wishlist Wizard: ${sharerName} shared a wishlist with you`;
    const text = `${sharerName} has shared their wishlist "${wishlistName}" with you. View it at ${wishlistUrl}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Wishlist Shared With You</h2>
  <p>${sharerName} has shared a Wishlist Wizard wishlist with you:</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${wishlistName}</h3>
          <p>Check out this wishlist to see what ${sharerName} would like!</p>
          <a href="${wishlistUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px; margin-top: 16px;">View Wishlist</a>
        </div>
        <p>Find the perfect gift for any occasion!</p>
  <p>- The Wishlist Wizard Team</p>
      </div>
    `;

    return this.sendEmail(to, subject, text, html);
  }

  /**
   * Send a contribution confirmation email
   */
  async sendContributionConfirmation(
    to: string,
    userName: string,
    contributionDetails: {
      itemTitle: string;
      contributionAmount: number;
      totalRaised: number;
      targetAmount: number;
      percentComplete: number;
    }
  ): Promise<boolean> {
    if (!this.initialized) return false;

    const subject = `Group Gift Contribution Confirmed - ${contributionDetails.itemTitle}`;
    const text = `Thank you ${userName}! Your contribution of $${contributionDetails.contributionAmount} to "${contributionDetails.itemTitle}" has been confirmed. The group gift has raised $${contributionDetails.totalRaised} of the $${contributionDetails.targetAmount} goal (${contributionDetails.percentComplete}% complete).`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Contribution Confirmed!</h2>
        <p>Thank you ${userName}!</p>
        <p>Your group gift contribution has been successfully processed.</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${contributionDetails.itemTitle}</h3>
          <p><strong>Your contribution:</strong> $${contributionDetails.contributionAmount}</p>
          <p><strong>Total raised:</strong> $${contributionDetails.totalRaised} of $${contributionDetails.targetAmount}</p>
          <div style="background-color: #f3f4f6; border-radius: 4px; padding: 8px; margin: 12px 0;">
            <div style="background-color: #10b981; height: 8px; border-radius: 4px; width: ${contributionDetails.percentComplete}%;"></div>
            <p style="margin: 4px 0 0 0; font-size: 14px;">${contributionDetails.percentComplete}% complete</p>
          </div>
        </div>
        <p>Thank you for participating in group gifting!</p>
        <p>- The Wishlist Wizard Team</p>
      </div>
    `;

    return this.sendEmail(to, subject, text, html);
  }

  /**
   * Send a payment failure notification email
   */
  async sendPaymentFailureNotification(
    to: string,
    userName: string,
    itemTitle: string
  ): Promise<boolean> {
    if (!this.initialized) return false;

    const subject = `Payment Failed - ${itemTitle}`;
    const text = `Hi ${userName}, we were unable to process your payment for the group gift contribution to "${itemTitle}". Please try again or use a different payment method.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Payment Failed</h2>
        <p>Hi ${userName},</p>
        <p>We were unable to process your payment for the group gift contribution:</p>
        <div style="border: 1px solid #fee2e2; border-radius: 8px; padding: 16px; margin: 16px 0; background-color: #fef2f2;">
          <h3 style="margin: 0 0 8px 0; color: #dc2626;">${itemTitle}</h3>
          <p>Your payment could not be processed. This may be due to:</p>
          <ul style="padding-left: 20px;">
            <li>Insufficient funds</li>
            <li>Card expired or invalid</li>
            <li>Bank security restrictions</li>
          </ul>
        </div>
        <p>Please try again with a different payment method or contact your bank if the issue persists.</p>
        <p>- The Wishlist Wizard Team</p>
      </div>
    `;

    return this.sendEmail(to, subject, text, html);
  }

  /**
   * Send a refund notification email
   */
  async sendRefundNotification(
    to: string,
    userName: string,
    refundDetails: {
      itemTitle: string;
      refundAmount: number;
    }
  ): Promise<boolean> {
    if (!this.initialized) return false;

    const subject = `Refund Processed - ${refundDetails.itemTitle}`;
    const text = `Hi ${userName}, your refund of $${refundDetails.refundAmount} for "${refundDetails.itemTitle}" has been processed. It may take 3-5 business days to appear in your account.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Refund Processed</h2>
        <p>Hi ${userName},</p>
        <p>Your refund has been successfully processed:</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${refundDetails.itemTitle}</h3>
          <p><strong>Refund amount:</strong> $${refundDetails.refundAmount}</p>
          <p style="color: #6b7280; font-size: 14px;">This refund may take 3-5 business days to appear in your account, depending on your payment method and bank.</p>
        </div>
        <p>If you have any questions about this refund, please contact our support team.</p>
        <p>- The Wishlist Wizard Team</p>
      </div>
    `;

    return this.sendEmail(to, subject, text, html);
  }

  /**
   * Send a group gift completed notification email
   */
  async sendGroupGiftCompletedNotification(
    to: string,
    userName: string,
    completionDetails: {
      itemTitle: string;
      totalRaised: number;
      contributorCount: number;
    }
  ): Promise<boolean> {
    if (!this.initialized) return false;

    const subject = `Group Gift Complete! - ${completionDetails.itemTitle}`;
    const text = `Great news ${userName}! The group gift for "${completionDetails.itemTitle}" has reached its goal! $${completionDetails.totalRaised} was raised by ${completionDetails.contributorCount} contributors.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">🎉 Group Gift Complete!</h2>
        <p>Great news ${userName}!</p>
        <p>The group gift you contributed to has reached its goal:</p>
        <div style="border: 1px solid #dcfce7; border-radius: 8px; padding: 16px; margin: 16px 0; background-color: #f0fdf4;">
          <h3 style="margin: 0 0 8px 0; color: #15803d;">${completionDetails.itemTitle}</h3>
          <p><strong>Total raised:</strong> $${completionDetails.totalRaised}</p>
          <p><strong>Contributors:</strong> ${completionDetails.contributorCount} amazing people</p>
          <div style="background-color: #10b981; height: 8px; border-radius: 4px; width: 100%; margin: 12px 0;"></div>
          <p style="margin: 4px 0 0 0; font-weight: bold; color: #15803d;">100% Complete! 🎉</p>
        </div>
        <p>Thank you for being part of this group gift! The recipient will be delighted.</p>
        <p>- The Wishlist Wizard Team</p>
      </div>
    `;

    return this.sendEmail(to, subject, text, html);
  }

  /**
   * General method to send an email
   */
  private async sendEmail(
    to: string,
    subject: string,
    text: string,
    html: string
  ): Promise<boolean> {
    if (!this.initialized) return false;

    try {
      const msg = {
        to,
        from: {
          email: this.defaultFromEmail,
          name: this.defaultFromName
        },
        subject,
        text,
        html
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService();