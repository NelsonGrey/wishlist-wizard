import { notificationService } from './notificationService';
import { storage } from '../storage';

/**
 * Service to handle price tracking email notifications
 */
export class PriceTrackingEmailService {
  /**
   * Send price drop notifications to users with alerts
   * This would be called by a scheduled job that checks prices
   */
  async sendPriceDropNotifications(
    itemId: number,
    oldPrice: number,
    newPrice: number
  ): Promise<number> {
    try {
      // Get the item details
      const item = await storage.getWishlistItem(itemId);
      if (!item) {
        throw new Error(`Item with ID ${itemId} not found`);
      }

      // Format prices for display
      const oldPriceStr = `$${oldPrice.toFixed(2)}`;
      const newPriceStr = `$${newPrice.toFixed(2)}`;

      // Get the wishlist to know the owner
      const wishlist = await storage.getWishlistById(item.wishlistId);
      if (!wishlist) {
        throw new Error(`Wishlist with ID ${item.wishlistId} not found`);
      }

      // Get any price alerts that have been triggered by this price drop
      const alerts = await storage.getPriceAlertsByItem(itemId);
      const triggeredAlerts = alerts.filter(alert => 
        !alert.triggered && newPrice <= parseFloat(alert.targetPrice)
      );

      // For each triggered alert, send a notification
      for (const alert of triggeredAlerts) {
        // Create an in-app notification with email
        await notificationService.createPriceDropNotification(
          alert.userId,
          itemId,
          item.title,
          oldPriceStr,
          newPriceStr,
          item.productUrl,
          item.imageUrl
        );

        // Mark the alert as triggered
        await storage.markPriceAlertTriggered(alert.id);
      }

      // Also notify the wishlist owner if they don't have an alert but would be interested
      if (wishlist.userId && !triggeredAlerts.some(alert => alert.userId === wishlist.userId)) {
        await notificationService.createPriceDropNotification(
          wishlist.userId,
          itemId,
          item.title,
          oldPriceStr,
          newPriceStr,
          item.productUrl,
          item.imageUrl
        );
      }

      return triggeredAlerts.length + (wishlist.userId ? 1 : 0);
    } catch (error) {
      console.error('Error sending price drop notifications:', error);
      return 0;
    }
  }

  /**
   * Send weekly price updates for items on user wishlists
   * This would be called by a weekly scheduled job
   */
  async sendWeeklyPriceUpdates(userId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.email) {
        return false;
      }

      // Get all user's wishlists
      const wishlists = await storage.getWishlists(userId);
      
      // Get recent price drops across all wishlists
      const recentPriceDrops = await storage.getRecentPriceDrops(userId, 7); // Last 7 days
      
      if (recentPriceDrops.length === 0) {
        // No price drops to report
        return false;
      }

      // Create a summary notification
      await notificationService.createSystemNotification(
        userId,
        'Weekly Price Update',
        `${recentPriceDrops.length} items on your wishlists have price changes this week.`,
        {
          priceDropCount: recentPriceDrops.length,
          topDrops: recentPriceDrops.slice(0, 3) // Include top 3 price drops in the notification data
        }
      );

      return true;
    } catch (error) {
      console.error('Error sending weekly price updates:', error);
      return false;
    }
  }

  /**
   * Notify users when a price alert is about to expire
   * This would be called by a daily scheduled job
   */
  async sendPriceAlertExpirationNotices(): Promise<number> {
    try {
      // Get alerts expiring in the next 3 days
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
      
      const expiringAlerts = await storage.getPriceAlertsExpiringBefore(threeDaysFromNow);
      
      // Group alerts by user for efficient notification
      const alertsByUser = expiringAlerts.reduce((acc, alert) => {
        acc[alert.userId] = acc[alert.userId] || [];
        acc[alert.userId].push(alert);
        return acc;
      }, {} as Record<number, any[]>);
      
      // Send notifications to each user
      let notificationCount = 0;
      for (const userId in alertsByUser) {
        const userAlerts = alertsByUser[userId];
        
        // Create a system notification for the user
        await notificationService.createSystemNotification(
          parseInt(userId),
          'Price Alerts Expiring Soon',
          `You have ${userAlerts.length} price alerts expiring in the next 3 days.`,
          {
            alertCount: userAlerts.length,
            alerts: userAlerts.map(alert => ({
              id: alert.id,
              itemId: alert.itemId,
              targetPrice: alert.targetPrice,
              expiresAt: alert.expiresAt
            }))
          }
        );
        
        notificationCount++;
      }
      
      return notificationCount;
    } catch (error) {
      console.error('Error sending price alert expiration notices:', error);
      return 0;
    }
  }
}

// Export a singleton instance
export const priceTrackingEmailService = new PriceTrackingEmailService();