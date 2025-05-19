import { db } from "../db";
import { 
  wishlistItems, 
  priceAlerts, 
  notifications,
  InsertNotification
} from "@shared/schema";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { IStorage } from "../storage";

export class PriceTrackingService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Update the price of an item and track the price history
   */
  async updateItemPrice(itemId: number, newPrice: string, numericPrice: number): Promise<boolean> {
    try {
      // Get the current item data
      const item = await db.query.wishlistItems.findFirst({
        where: eq(wishlistItems.id, itemId)
      });

      if (!item) return false;

      // Get current price history or initialize empty array
      const priceHistory = item.priceHistory ? 
        (Array.isArray(item.priceHistory) ? item.priceHistory : []) : 
        [];

      // Add current price to history with timestamp
      priceHistory.push({
        price: item.price,
        numericPrice: item.numericPrice,
        timestamp: new Date().toISOString()
      });

      // Update the item with new price and history
      await db.update(wishlistItems)
        .set({
          price: newPrice,
          numericPrice,
          priceHistory: JSON.stringify(priceHistory)
        })
        .where(eq(wishlistItems.id, itemId));

      // Check if price drop triggers any alerts
      await this.checkPriceAlerts(itemId, numericPrice);

      return true;
    } catch (error) {
      console.error("Error updating item price:", error);
      return false;
    }
  }

  /**
   * Create a price alert for an item
   */
  async createPriceAlert(userId: number, itemId: number, targetPrice: number, expiresAt?: Date): Promise<number | null> {
    try {
      // Get the current item
      const item = await db.query.wishlistItems.findFirst({
        where: eq(wishlistItems.id, itemId)
      });

      if (!item) return null;

      // Create the price alert
      const [newAlert] = await db.insert(priceAlerts)
        .values({
          userId,
          itemId,
          targetPrice,
          expiresAt: expiresAt || null
        })
        .returning({ id: priceAlerts.id });

      // If the current price is already lower than target price, notify immediately
      if (item.numericPrice && item.numericPrice <= targetPrice) {
        await this.notifyPriceAlert(newAlert.id);
      }

      return newAlert.id;
    } catch (error) {
      console.error("Error creating price alert:", error);
      return null;
    }
  }

  /**
   * Check if any price alerts are triggered by a price change
   */
  private async checkPriceAlerts(itemId: number, currentPrice: number): Promise<void> {
    // Find all alerts for this item where target price >= current price
    const triggeredAlerts = await db.query.priceAlerts.findMany({
      where: and(
        eq(priceAlerts.itemId, itemId),
        lte(priceAlerts.targetPrice, currentPrice),
        eq(priceAlerts.notified, false),
        isNotNull(priceAlerts.expiresAt)
      )
    });

    // Notify for each triggered alert
    for (const alert of triggeredAlerts) {
      await this.notifyPriceAlert(alert.id);
    }
  }

  /**
   * Send notification for a triggered price alert
   */
  private async notifyPriceAlert(alertId: number): Promise<void> {
    // Get the alert details
    const alert = await db.query.priceAlerts.findFirst({
      where: eq(priceAlerts.id, alertId),
      with: {
        item: true,
        user: true
      }
    });

    if (!alert || !alert.item) return;

    // Create notification
    const notification: InsertNotification = {
      userId: alert.userId,
      type: "price_alert",
      title: "Price Drop Alert",
      message: `The price of "${alert.item.title}" has dropped to ${alert.item.price}, below your target of $${alert.targetPrice}`,
      relatedEntityId: alert.itemId,
      relatedEntityType: "wishlist_item",
      actionUrl: `/items/${alert.itemId}`,
      isRead: false
    };

    await db.insert(notifications).values(notification);

    // Mark the alert as notified
    await db.update(priceAlerts)
      .set({ notified: true })
      .where(eq(priceAlerts.id, alertId));
  }

  /**
   * Get price history for an item
   */
  async getItemPriceHistory(itemId: number): Promise<any[]> {
    // Get the item
    const item = await db.query.wishlistItems.findFirst({
      where: eq(wishlistItems.id, itemId)
    });

    if (!item || !item.priceHistory) return [];

    // Parse and return price history
    return Array.isArray(item.priceHistory) ? 
      item.priceHistory : 
      JSON.parse(item.priceHistory.toString());
  }

  /**
   * Get price alerts for a user
   */
  async getUserPriceAlerts(userId: number): Promise<any[]> {
    return db.query.priceAlerts.findMany({
      where: eq(priceAlerts.userId, userId),
      with: {
        item: true
      }
    });
  }

  /**
   * Delete a price alert
   */
  async deletePriceAlert(alertId: number): Promise<boolean> {
    const result = await db.delete(priceAlerts)
      .where(eq(priceAlerts.id, alertId));
    
    return result.rowCount > 0;
  }

  /**
   * Get items with recent price drops
   */
  async getRecentPriceDrops(limit: number = 10): Promise<any[]> {
    // Get all items with price history
    const items = await db.query.wishlistItems.findMany({
      where: isNotNull(wishlistItems.priceHistory)
    });

    // Find items with recent price drops
    const itemsWithPriceDrops = items
      .filter(item => {
        if (!item.priceHistory) return false;
        
        const history = Array.isArray(item.priceHistory) ? 
          item.priceHistory : 
          JSON.parse(item.priceHistory.toString());
        
        if (history.length < 2) return false;
        
        // Check if latest price is lower than previous
        const latestPrice = history[history.length - 1].numericPrice;
        const previousPrice = history[history.length - 2].numericPrice;
        
        return latestPrice < previousPrice;
      })
      .map(item => {
        const history = Array.isArray(item.priceHistory) ? 
          item.priceHistory : 
          JSON.parse(item.priceHistory.toString());
        
        const latestPrice = history[history.length - 1].numericPrice;
        const previousPrice = history[history.length - 2].numericPrice;
        const dropPercentage = ((previousPrice - latestPrice) / previousPrice) * 100;
        
        return {
          ...item,
          previousPrice,
          dropPercentage
        };
      })
      .sort((a, b) => b.dropPercentage - a.dropPercentage)
      .slice(0, limit);
    
    return itemsWithPriceDrops;
  }

  /**
   * Find similar items with lower prices
   */
  async findCheaperAlternatives(itemId: number, limit: number = 5): Promise<any[]> {
    // Get the item
    const item = await db.query.wishlistItems.findFirst({
      where: eq(wishlistItems.id, itemId)
    });

    if (!item || !item.category || !item.numericPrice) return [];

    // Find items in the same category with lower prices
    const similarItems = await db.query.wishlistItems.findMany({
      where: and(
        eq(wishlistItems.category, item.category),
        isNotNull(wishlistItems.numericPrice)
      )
    });

    // Filter by similar title and lower price
    const alternatives = similarItems
      .filter(similar => {
        // Exclude the same item
        if (similar.id === itemId) return false;
        
        // Only include items with lower prices
        if (!similar.numericPrice || similar.numericPrice >= item.numericPrice) return false;
        
        // Check for title similarity (simple word overlap)
        const itemWords = item.title.toLowerCase().split(' ');
        const similarWords = similar.title.toLowerCase().split(' ');
        const commonWords = itemWords.filter(word => 
          word.length > 3 && similarWords.includes(word)
        ).length;
        
        // If at least 2 significant words match, consider it similar
        return commonWords >= 2;
      })
      .sort((a, b) => {
        const aPriceDiff = item.numericPrice - a.numericPrice;
        const bPriceDiff = item.numericPrice - b.numericPrice;
        return bPriceDiff - aPriceDiff; // Sort by biggest price difference first
      })
      .slice(0, limit);
    
    return alternatives;
  }
}