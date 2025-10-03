import sgMail from '@sendgrid/mail';

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

  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.initialized = true;
    } else {
      console.warn('SendGrid API key not found. Email notifications will not be sent.');
    }
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
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Price Drop Alert!</h2>
  <p>Good news! An item on your Wishlist Wizard wishlist has dropped in price:</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <img src="${imageUrl}" alt="${itemName}" style="max-width: 200px; max-height: 200px; display: block; margin: 0 auto 16px auto;" />
          <h3 style="margin: 0 0 8px 0;">${itemName}</h3>
          <p>
            <span style="text-decoration: line-through; color: #9ca3af;">${oldPrice}</span>
            <span style="font-weight: bold; color: #10b981; font-size: 1.2em; margin-left: 8px;">${newPrice}</span>
          </p>
          <a href="${itemUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px; margin-top: 16px;">View Item</a>
        </div>
        <p>Don't miss out on this deal!</p>
  <p>- The Wishlist Wizard Team</p>
      </div>
    `;

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
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Wishlist Activity Update</h2>
  <p>There's been new activity on your Wishlist Wizard wishlist:</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${wishlistName}</h3>
          <p><strong>${userName}</strong> ${activityType}</p>
          <a href="${wishlistUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px; margin-top: 16px;">View Wishlist</a>
        </div>
        <p>Stay up to date with all your wishlist activities!</p>
  <p>- The Wishlist Wizard Team</p>
      </div>
    `;

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
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #4f46e5;">Welcome to Wishlist Wizard!</h2>
        <p>Hi ${userName},</p>
        <p>We're thrilled to have you join our community of wishlist enthusiasts!</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">Get Started with Wishlist Wizard:</h3>
          <ul style="padding-left: 20px;">
            <li>Create your first wishlist</li>
            <li>Add items from any shopping website</li>
            <li>Share your wishlist with friends and family</li>
            <li>Track price drops on your favorite items</li>
          </ul>
          <a href="https://wishlistwizard.com/dashboard" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px; margin-top: 16px;">Go to Dashboard</a>
        </div>
        <p>If you have any questions, feel free to reply to this email!</p>
  <p>- The Wishlist Wizard Team</p>
      </div>
    `;

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
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Collaboration Invitation</h2>
  <p>${inviterName} has invited you to collaborate on a Wishlist Wizard wishlist:</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0;">${wishlistName}</h3>
          <p>Collaborate on this wishlist to add items, make comments, and help organize gifts.</p>
          <a href="${acceptUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px; margin-top: 16px;">Accept Invitation</a>
        </div>
        <p>Working together makes gift planning easier!</p>
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