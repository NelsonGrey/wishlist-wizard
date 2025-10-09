import { storage } from "../storage";
import { 
  insertPriceAlertSchema,
  type InsertPriceAlert,
  type WishlistItem
} from "@wishlist-wizard/shared";
import { PriceScraper } from './priceScrapingService';
import { emailService } from './emailService';

export class PriceTrackingService {
  constructor() {
    // PriceScraper uses static methods
  }

  /**
   * Update price for a specific item
   */
  async updateItemPrice(itemId: number, source: string = 'manual'): Promise<{
    success: boolean;
    oldPrice?: string;
    newPrice?: string;
    item?: WishlistItem;
    error?: string;
  }> {
    try {
      // Get the item
      const item = await storage.getWishlistItem(itemId);
      if (!item) {
        return { success: false, error: 'Item not found' };
      }

      let newPrice: string;
      let scrapedPrice: string | null = null;

      // If we have a product URL, try to scrape the price
      if (item.productUrl && source !== 'manual') {
        console.log(`Scraping price for item ${itemId}: ${item.title}`);
        const scrapeResult = await PriceScraper.scrapePrice(item.productUrl);
        
        if (scrapeResult.success && scrapeResult.price) {
          scrapedPrice = scrapeResult.price;
          newPrice = scrapeResult.price;
        } else {
          console.log(`Failed to scrape price for item ${itemId}:`, scrapeResult.error);
          return { 
            success: false, 
            error: `Failed to scrape price: ${scrapeResult.error}` 
          };
        }
      } else {
        // For manual updates, we'd typically receive the new price as a parameter
        // For now, we'll skip manual updates that don't provide a price
        return { 
          success: false, 
          error: 'Manual price updates require a new price value' 
        };
      }

      const oldPrice = item.price;
      const oldNumericPrice = item.numericPrice ? parseFloat(item.numericPrice) : null;
      const newNumericPrice = this.extractNumericPrice(newPrice);

      // Update the item with new price and history
      const currentHistory = Array.isArray(item.priceHistory) ? item.priceHistory : [];
      const updatedPriceHistory = [
        ...currentHistory,
        {
          price: newPrice,
          timestamp: new Date().toISOString(),
          source: source
        }
      ];

      const updatedItem = await storage.updateWishlistItem(itemId, {
        price: newPrice,
        numericPrice: newNumericPrice.toString()
        // Note: priceHistory might not be directly updatable through this interface
        // depending on the storage implementation
      });

      if (!updatedItem) {
        return { success: false, error: 'Failed to update item' };
      }

      // Check for price drop and trigger alerts
      if (oldNumericPrice && newNumericPrice < oldNumericPrice) {
        await this.handlePriceDrop(updatedItem, newPrice, oldPrice);
      }

      return {
        success: true,
        oldPrice,
        newPrice,
        item: updatedItem
      };

    } catch (error) {
      console.error('Error updating item price:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create a price alert for an item
   */
  async createPriceAlert(alertData: InsertPriceAlert): Promise<{
    success: boolean;
    alert?: any;
    error?: string;
  }> {
    try {
      // Validate the alert data
      const validatedData = insertPriceAlertSchema.parse(alertData);

      // Check if item exists
      const item = await storage.getWishlistItem(validatedData.itemId);
      if (!item) {
        return { success: false, error: 'Item not found' };
      }

      // Create the alert
      const alert = await storage.createPriceAlert(validatedData);

      return {
        success: true,
        alert
      };

    } catch (error) {
      console.error('Error creating price alert:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get price alerts for a user
   */
  async getUserPriceAlerts(userId: number): Promise<{
    success: boolean;
    alerts?: any[];
    error?: string;
  }> {
    try {
      const alerts = await storage.getPriceAlerts(userId);
      
      // Enrich alerts with item details
      const enrichedAlerts = await Promise.all(
        alerts.map(async (alert) => {
          const item = await storage.getWishlistItem(alert.itemId);
          return {
            ...alert,
            item: item ? {
              id: item.id,
              title: item.title,
              price: item.price,
              imageUrl: item.imageUrl,
              productUrl: item.productUrl
            } : null
          };
        })
      );

      return {
        success: true,
        alerts: enrichedAlerts
      };

    } catch (error) {
      console.error('Error getting user price alerts:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete a price alert
   */
  async deletePriceAlert(alertId: number, userId: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get the alert to verify ownership
      const alerts = await storage.getPriceAlerts(userId);
      const alert = alerts.find(a => a.id === alertId);
      
      if (!alert) {
        return { success: false, error: 'Alert not found or unauthorized' };
      }

      const deleted = await storage.deletePriceAlert(alertId);
      
      if (!deleted) {
        return { success: false, error: 'Failed to delete alert' };
      }

      return { success: true };

    } catch (error) {
      console.error('Error deleting price alert:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check and trigger price alerts for an item
   */
  async checkPriceAlerts(itemId: number, currentPrice: string): Promise<void> {
    try {
      const alerts = await storage.getPriceAlertsByItem(itemId);
      const currentNumericPrice = this.extractNumericPrice(currentPrice);

      for (const alert of alerts) {
        // Skip already triggered alerts
        if (alert.triggered) continue;

        // Skip expired alerts
        if (alert.expiresAt && new Date(alert.expiresAt) < new Date()) {
          continue;
        }

        // Check if target price is reached
        const targetPrice = parseFloat(alert.targetPrice);
        if (currentNumericPrice <= targetPrice) {
          // Trigger the alert
          await storage.markPriceAlertTriggered(alert.id);

          // Get item details for notification
          const item = await storage.getWishlistItem(itemId);
          if (!item) continue;

          // Create notification
          await storage.createNotification({
            userId: alert.userId,
            type: 'price_alert',
            title: 'Price Alert Triggered!',
            content: `${item.title} is now available for ${currentPrice} (target: $${targetPrice})`,
            data: {
              itemId: item.id,
              alertId: alert.id,
              currentPrice,
              targetPrice: alert.targetPrice,
              savings: (targetPrice - currentNumericPrice).toFixed(2)
            },
            relatedEntityId: item.id,
            relatedEntityType: 'wishlist_item',
            actionUrl: `/item/${item.id}`
          });

          // Send email notification if requested
          try {
            const user = await storage.getUser(alert.userId);
            if (user && user.email) {
              await emailService.sendPriceDropNotification(
                user.email,
                item.title,
                alert.targetPrice,
                currentPrice,
                item.productUrl || '#',
                item.imageUrl || ''
              );
            }
          } catch (emailError) {
            console.error('Failed to send price alert email:', emailError);
            // Don't fail the whole operation if email fails
          }
        }
      }

    } catch (error) {
      console.error('Error checking price alerts:', error);
    }
  }

  /**
   * Handle price drop scenario
   */
  private async handlePriceDrop(
    item: WishlistItem,
    newPrice: string,
    oldPrice: string
  ): Promise<void> {
    try {
      console.log(`Price drop detected for "${item.title}": ${oldPrice} → ${newPrice}`);

      // Check and trigger any price alerts
      await this.checkPriceAlerts(item.id, newPrice);

      // Calculate savings
      const oldNumericPrice = this.extractNumericPrice(oldPrice);
      const newNumericPrice = this.extractNumericPrice(newPrice);
      const savings = oldNumericPrice - newNumericPrice;
      const savingsPercentage = ((savings / oldNumericPrice) * 100).toFixed(1);

      // Get the wishlist to find the owner
      const wishlist = await storage.getWishlistById(item.wishlistId);
      if (!wishlist) return;

      // Create price drop notification
      await storage.createNotification({
        userId: wishlist.userId,
        type: 'price_drop',
        title: 'Price Drop Alert!',
        content: `${item.title} price dropped from ${oldPrice} to ${newPrice} (${savingsPercentage}% off)`,
        data: {
          itemId: item.id,
          oldPrice,
          newPrice,
          savings: savings.toFixed(2),
          savingsPercentage
        },
        relatedEntityId: item.id,
        relatedEntityType: 'wishlist_item',
        actionUrl: `/item/${item.id}`
      });

      // Send email notification
      try {
        const user = await storage.getUser(wishlist.userId);
        if (user && user.email) {
          await emailService.sendPriceDropNotification(
            user.email,
            item.title,
            oldPrice,
            newPrice,
            item.productUrl || '#',
            item.imageUrl || ''
          );
        }
      } catch (emailError) {
        console.error('Failed to send price drop email:', emailError);
      }

    } catch (error) {
      console.error('Error handling price drop:', error);
    }
  }

  /**
   * Extract numeric price from price string
   */
  private extractNumericPrice(priceString: string): number {
    // Remove currency symbols and non-numeric characters except decimal points
    const numericString = priceString.replace(/[^0-9.]/g, '');
    const price = parseFloat(numericString);
    return isNaN(price) ? 0 : price;
  }

  /**
   * Get recent price drops for a user
   */
  async getRecentPriceDrops(userId: number, days: number = 7): Promise<{
    success: boolean;
    priceDrops?: any[];
    error?: string;
  }> {
    try {
      const priceDrops = await storage.getRecentPriceDrops(userId, days);
      
      return {
        success: true,
        priceDrops
      };

    } catch (error) {
      console.error('Error getting recent price drops:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update prices for multiple items (batch operation)
   */
  async updateMultipleItemPrices(itemIds: number[], source: string = 'scheduled'): Promise<{
    success: boolean;
    results?: Array<{
      itemId: number;
      success: boolean;
      oldPrice?: string;
      newPrice?: string;
      error?: string;
    }>;
    error?: string;
  }> {
    try {
      const results = [];

      for (const itemId of itemIds) {
        const result = await this.updateItemPrice(itemId, source);
        results.push({
          itemId,
          success: result.success,
          oldPrice: result.oldPrice,
          newPrice: result.newPrice,
          error: result.error
        });

        // Add small delay between requests to be respectful to external sites
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return {
        success: true,
        results
      };

    } catch (error) {
      console.error('Error updating multiple item prices:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export singleton instance
export const priceTrackingService = new PriceTrackingService();