import { emailService } from './emailService';
import { storage } from '../storage';
import { User, Notification, InsertNotification } from '@wishlist-wizard/shared';

// Notification types that can be sent to users
export enum NotificationType {
  PRICE_DROP = 'price_drop',
  WISHLIST_ACTIVITY = 'wishlist_activity',
  ITEM_PURCHASED = 'item_purchased',
  WISHLIST_SHARED = 'wishlist_shared',
  COLLABORATION_INVITE = 'collaboration_invite',
  SYSTEM_NOTIFICATION = 'system_notification'
}

// Notification service that handles creating notifications and sending emails
export class NotificationService {
  /**
   * Create an in-app notification and optionally send an email
   */
  async createNotification(
    notificationData: Omit<InsertNotification, 'createdAt'>,
    sendEmail: boolean = true
  ): Promise<Notification> {
    // Create the in-app notification
    const notification = await storage.createNotification({
      ...notificationData,
      createdAt: new Date()
    });

    // If email is enabled, send the corresponding email notification
    if (sendEmail) {
      await this.sendEmailForNotification(notification);
    }

    return notification;
  }

  /**
   * Create a price drop notification
   */
  async createPriceDropNotification(
    userId: number,
    itemId: number,
    itemName: string,
    oldPrice: string,
    newPrice: string,
    itemUrl: string,
    imageUrl: string
  ): Promise<Notification> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const notification = await this.createNotification({
      userId,
      type: NotificationType.PRICE_DROP,
      title: `Price Drop: ${itemName}`,
      content: `The price of ${itemName} has dropped from ${oldPrice} to ${newPrice}!`,
      isRead: false,
      data: {
        itemId,
        oldPrice,
        newPrice,
        itemUrl,
        imageUrl
      }
    });

    // Send email notification
    try {
      await this.sendEmailForNotification(notification);
    } catch (error) {
      console.error('Failed to send price drop email:', error);
    }

    return notification;
  }

  /**
   * Create a wishlist activity notification
   */
  async createWishlistActivityNotification(
    userId: number,
    actorUserId: number,
    wishlistId: number,
    activityType: string
  ): Promise<Notification> {
    const [user, actor, wishlist] = await Promise.all([
      storage.getUser(userId),
      storage.getUser(actorUserId),
      storage.getWishlistById(wishlistId)
    ]);

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    if (!actor) {
      throw new Error(`Actor user with ID ${actorUserId} not found`);
    }

    if (!wishlist) {
      throw new Error(`Wishlist with ID ${wishlistId} not found`);
    }

    const notification = await this.createNotification({
      userId,
      type: NotificationType.WISHLIST_ACTIVITY,
      title: `Activity on "${wishlist.name}"`,
      content: `${actor.username} ${activityType} on your wishlist "${wishlist.name}"`,
      isRead: false,
      data: {
        actorUserId,
        actorUsername: actor.username,
        wishlistId,
        wishlistName: wishlist.name,
        activityType
      }
    });

    // Send email notification
    try {
      await this.sendEmailForNotification(notification);
    } catch (error) {
      console.error('Failed to send wishlist activity email:', error);
    }

    return notification;
  }

  /**
   * Create an item purchased notification
   */
  async createItemPurchasedNotification(
    userId: number,
    itemId: number,
    itemName: string,
    purchaserName: string
  ): Promise<Notification> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const notification = await this.createNotification({
      userId,
      type: NotificationType.ITEM_PURCHASED,
      title: `Item Purchased: ${itemName}`,
      content: `${purchaserName} has purchased "${itemName}" from your wishlist!`,
      isRead: false,
      data: {
        itemId,
        itemName,
        purchaserName
      }
    });

    return notification;
  }

  /**
   * Create a wishlist shared notification
   */
  async createWishlistSharedNotification(
    userId: number,
    sharerUserId: number,
    wishlistId: number,
    shareUrl: string
  ): Promise<Notification> {
    const [user, sharer, wishlist] = await Promise.all([
      storage.getUser(userId),
      storage.getUser(sharerUserId),
      storage.getWishlistById(wishlistId)
    ]);

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    if (!sharer) {
      throw new Error(`Sharer user with ID ${sharerUserId} not found`);
    }

    if (!wishlist) {
      throw new Error(`Wishlist with ID ${wishlistId} not found`);
    }

    const notification = await this.createNotification({
      userId,
      type: NotificationType.WISHLIST_SHARED,
      title: `Wishlist Shared with You`,
      content: `${sharer.username} has shared their wishlist "${wishlist.name}" with you`,
      isRead: false,
      data: {
        sharerUserId,
        sharerUsername: sharer.username,
        wishlistId,
        wishlistName: wishlist.name,
        shareUrl
      }
    });

    // Send email notification
    try {
      await this.sendEmailForNotification(notification);
    } catch (error) {
      console.error('Failed to send wishlist shared email:', error);
    }

    return notification;
  }

  /**
   * Create a collaboration invite notification
   */
  async createCollaborationInviteNotification(
    userId: number,
    inviterUserId: number,
    wishlistId: number,
    acceptUrl: string
  ): Promise<Notification> {
    const [user, inviter, wishlist] = await Promise.all([
      storage.getUser(userId),
      storage.getUser(inviterUserId),
      storage.getWishlistById(wishlistId)
    ]);

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    if (!inviter) {
      throw new Error(`Inviter user with ID ${inviterUserId} not found`);
    }

    if (!wishlist) {
      throw new Error(`Wishlist with ID ${wishlistId} not found`);
    }

    const notification = await this.createNotification({
      userId,
      type: NotificationType.COLLABORATION_INVITE,
      title: `Collaboration Invitation`,
      content: `${inviter.username} has invited you to collaborate on "${wishlist.name}"`,
      isRead: false,
      data: {
        inviterUserId,
        inviterUsername: inviter.username,
        wishlistId,
        wishlistName: wishlist.name,
        acceptUrl
      }
    });

    // Send email notification
    try {
      await this.sendEmailForNotification(notification);
    } catch (error) {
      console.error('Failed to send collaboration invite email:', error);
    }

    return notification;
  }

  /**
   * Create a system notification
   */
  async createSystemNotification(
    userId: number,
    title: string,
    content: string,
    data: any = {}
  ): Promise<Notification> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const notification = await this.createNotification({
      userId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title,
      content,
      isRead: false,
      data
    });

    return notification;
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    return storage.markNotificationAsRead(id);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    return storage.markAllNotificationsAsRead(userId);
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: number): Promise<boolean> {
    return storage.deleteNotification(id);
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(userId: number, limit?: number): Promise<Notification[]> {
    return storage.getNotifications(userId, limit);
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadNotificationCount(userId: number): Promise<number> {
    return storage.getUnreadNotificationCount(userId);
  }

  /**
   * Send email for a notification based on its type
   */
  private async sendEmailForNotification(notification: Notification): Promise<boolean> {
    const user = await storage.getUser(notification.userId);
    if (!user || !user.email) {
      return false;
    }

    switch (notification.type) {
      case NotificationType.PRICE_DROP:
        return this.sendPriceDropEmail(user, notification);
      
      case NotificationType.WISHLIST_ACTIVITY:
        return this.sendWishlistActivityEmail(user, notification);
      
      case NotificationType.ITEM_PURCHASED:
        return this.sendItemPurchasedEmail(user, notification);
      
      case NotificationType.WISHLIST_SHARED:
        return this.sendWishlistSharedEmail(user, notification);
      
      case NotificationType.COLLABORATION_INVITE:
        return this.sendCollaborationInviteEmail(user, notification);

      default:
        // No email for other notification types
        return false;
    }
  }

  private async sendPriceDropEmail(user: User, notification: Notification): Promise<boolean> {
    const { itemId, oldPrice, newPrice, itemUrl, imageUrl } = notification.data as any;
    const itemName = notification.title.replace('Price Drop: ', '');

    return emailService.sendPriceDropNotification(
      user.email,
      itemName,
      oldPrice,
      newPrice,
      itemUrl,
      imageUrl
    );
  }

  private async sendWishlistActivityEmail(user: User, notification: Notification): Promise<boolean> {
    const data = notification.data as any;
    const { actorUsername, wishlistName, activityType, wishlistId } = data;
    const wishlistUrl = `${process.env.APP_URL || 'https://wishkeeper.com'}/wishlist/${wishlistId}`;

    return emailService.sendWishlistActivityNotification(
      user.email,
      activityType,
      actorUsername,
      wishlistName,
      wishlistUrl
    );
  }

  private async sendItemPurchasedEmail(user: User, notification: Notification): Promise<boolean> {
    // Implementation depends on whether we want to send emails for purchases
    // For now, we'll skip email for purchases as it might spoil surprises
    return false;
  }

  private async sendWishlistSharedEmail(user: User, notification: Notification): Promise<boolean> {
    const { sharerUsername, wishlistName, shareUrl } = notification.data as any;

    return emailService.sendWishlistSharedNotification(
      user.email,
      sharerUsername,
      wishlistName,
      shareUrl
    );
  }

  private async sendCollaborationInviteEmail(user: User, notification: Notification): Promise<boolean> {
    const { inviterUsername, wishlistName, acceptUrl } = notification.data as any;

    return emailService.sendCollaborationInvite(
      user.email,
      inviterUsername,
      wishlistName,
      acceptUrl
    );
  }

  /**
   * Notify wishlist collaborators about activity
   */
  async notifyWishlistCollaborators(
    wishlistId: number, 
    actorUserId: number, 
    message: string, 
    type: string = NotificationType.WISHLIST_ACTIVITY
  ): Promise<void> {
    try {
      // Get wishlist collaborators
      const collaborators = await storage.getCollaborators(wishlistId);
      
      // Notify each collaborator (except the actor)
      for (const collaborator of collaborators) {
        if (collaborator.userId !== actorUserId) {
          await this.createNotification({
            userId: collaborator.userId,
            title: 'Wishlist Activity',
            type,
            content: message,
            relatedEntityId: wishlistId,
            relatedEntityType: 'wishlist'
          });
        }
      }
    } catch (error) {
      console.error('Error notifying wishlist collaborators:', error);
    }
  }

  /**
   * Notify about item added to wishlist
   */
  async notifyItemAdded(itemId: number, itemTitle: string, userId: number): Promise<void> {
    // This could notify collaborators about new items
    // Implementation depends on requirements
    console.log(`Item "${itemTitle}" added by user ${userId}`);
  }

  /**
   * Notify about item reserved
   */
  async notifyItemReserved(itemId: number, itemTitle: string, userId: number): Promise<void> {
    // This could notify the wishlist owner about reserved items
    console.log(`Item "${itemTitle}" reserved by user ${userId}`);
  }

  /**
   * Notify about item purchased
   */
  async notifyItemPurchased(itemId: number, itemTitle: string, userId: number): Promise<void> {
    // This could notify the wishlist owner about purchased items
    console.log(`Item "${itemTitle}" purchased by user ${userId}`);
  }
}

// Export a singleton instance
export const notificationService = new NotificationService();