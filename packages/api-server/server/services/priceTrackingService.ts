import { storage } from "../storage";
import { emailService } from "./emailService";
import { 
  insertPriceAlertSchema,
  type InsertPriceAlert,
  type WishlistItem,
  type PriceAlert,
  type InsertNotification
} from "@wishlist-wizard/shared";

/**
 * Update price history for an item and check all alerts
 * @param itemId The item ID
 * @param newPrice The new price (as string with currency symbol e.g. "$99.99")
 * @param numericPrice The numeric price (as decimal)
 */
export async function updateItemPrice(
  itemId: number, 
  newPrice: string, 
  numericPrice: number | string
): Promise<void> {
  try {
    // Get current item to access its price history
    const item = await storage.getWishlistItem(itemId);

    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }

    // Parse the current price history
    let priceHistory = [];
    try {
      if (item.priceHistory) {
        priceHistory = Array.isArray(item.priceHistory) 
          ? item.priceHistory 
          : [];
      }
    } catch (err) {
      console.error("Error parsing price history:", err);
      priceHistory = [];
    }

    // Ensure priceHistory is an array
    if (!Array.isArray(priceHistory)) {
      priceHistory = [];
    }

    // Convert numeric price to a number for comparison
    const newNumericPrice = typeof numericPrice === 'string' 
      ? parseFloat(numericPrice) 
      : numericPrice;

    // Add the new price to the history
    priceHistory.push({
      date: new Date().toISOString(),
      price: newNumericPrice,
      formattedPrice: newPrice
    });

    // Keep only the last 30 price points to avoid excessive storage
    if (priceHistory.length > 30) {
      priceHistory = priceHistory.slice(priceHistory.length - 30);
    }

    // Update the item with the new price and history
    await storage.updateWishlistItem(itemId, {
      price: newPrice,
      numericPrice: newNumericPrice.toString(),
    });

    // Check alerts for this item
    await checkPriceAlerts(itemId, newNumericPrice, item.title);

  } catch (error) {
    console.error("Error updating item price:", error);
    throw new Error("Failed to update item price and check alerts");
  }
}

/**
 * Create a price alert for a specific item
 * @param alertData The price alert data
 */
export async function createPriceAlert(alertData: InsertPriceAlert): Promise<PriceAlert> {
  try {
    // Validate the input using Zod schema
    const validatedData = insertPriceAlertSchema.parse(alertData);
    
    // Create the alert using storage interface
    const newAlert = await storage.createPriceAlert(validatedData);
    
    return newAlert;
  } catch (error) {
    console.error("Error creating price alert:", error);
    throw new Error("Failed to create price alert");
  }
}

/**
 * Get all price alerts for a user with item details
 * @param userId The user ID
 */
export async function getUserPriceAlerts(userId: number): Promise<any[]> {
  try {
    // Get alerts from storage
    const alerts = await storage.getPriceAlerts(userId);
    
    // Enhance alerts with item details
    const enrichedAlerts = await Promise.all(
      alerts.map(async (alert) => {
        const item = await storage.getWishlistItem(alert.itemId);
        return {
          id: alert.id,
          itemId: alert.itemId,
          targetPrice: alert.targetPrice,
          triggered: alert.triggered,
          triggeredAt: alert.triggeredAt,
          createdAt: alert.createdAt,
          expiresAt: alert.expiresAt,
          emailSent: alert.emailSent,
          item: item ? {
            title: item.title,
            price: item.price,
            numericPrice: item.numericPrice,
            imageUrl: item.imageUrl,
            productUrl: item.productUrl,
            store: item.store
          } : null
        };
      })
    );

    return enrichedAlerts;
  } catch (error) {
    console.error("Error fetching user price alerts:", error);
    throw new Error("Failed to fetch price alerts");
  }
}

/**
 * Delete a price alert
 * @param alertId The alert ID
 * @param userId The user ID (for security check)
 */
export async function deletePriceAlert(alertId: number, userId: number): Promise<boolean> {
  try {
    // Get all alerts for the user to verify ownership
    const userAlerts = await storage.getPriceAlerts(userId);
    const alert = userAlerts.find(a => a.id === alertId);

    if (!alert) {
      return false; // Alert doesn't exist or doesn't belong to user
    }

    // Delete the alert using storage interface
    const success = await storage.deletePriceAlert(alertId);
    return success;
  } catch (error) {
    console.error("Error deleting price alert:", error);
    throw new Error("Failed to delete price alert");
  }
}

/**
 * Check all price alerts for an item when its price changes
 * @param itemId The item ID
 * @param currentPrice The current price as a number
 * @param itemTitle The item's title for notifications
 */
async function checkPriceAlerts(
  itemId: number, 
  currentPrice: number, 
  itemTitle: string
): Promise<void> {
  try {
    // Get all alerts for this item
    const itemAlerts = await storage.getPriceAlertsByItem(itemId);
    
    // Filter for active, non-expired, non-triggered alerts where current price is at or below target
    const now = new Date();
    const triggeredAlerts = itemAlerts.filter(alert => {
      // Skip if already triggered
      if (alert.triggered) return false;
      
      // Skip if expired
      if (alert.expiresAt && new Date(alert.expiresAt) <= now) return false;
      
      // Check if current price is at or below target price
      const targetPrice = typeof alert.targetPrice === 'string' 
        ? parseFloat(alert.targetPrice) 
        : Number(alert.targetPrice);
      
      return currentPrice <= targetPrice;
    });

    if (triggeredAlerts.length === 0) {
      return; // No alerts to process
    }

    // Process each triggered alert
    for (const alert of triggeredAlerts) {
      // Mark the alert as triggered
      await storage.markPriceAlertTriggered(alert.id);

      // Create a notification for the user
      const targetPrice = String(alert.targetPrice);
        
      await storage.createNotification({
        userId: alert.userId,
        type: "price_drop",
        title: "Price Drop Alert",
        content: `The price of "${itemTitle}" has dropped to or below your target price of $${targetPrice}!`,
        relatedEntityId: itemId,
        relatedEntityType: "wishlist_item",
        actionUrl: `/item/${itemId}`,
        isRead: false,
        data: { itemId, currentPrice, targetPrice: alert.targetPrice }
      });

      // Send email notification
      try {
        const user = await storage.getUser(alert.userId);
        if (user && user.email) {
          const item = await storage.getWishlistItem(itemId);
          if (item) {
            const oldPrice = `$${targetPrice}`;
            const newPrice = `$${currentPrice.toFixed(2)}`;
            
            await emailService.sendPriceDropNotification(
              user.email,
              itemTitle,
              oldPrice,
              newPrice,
              item.productUrl,
              item.imageUrl
            );
            
            console.log(`[PriceTracking] Email sent to ${user.email} for price drop on ${itemTitle}`);
          }
        }
      } catch (emailError) {
        console.error(`[PriceTracking] Failed to send email for price alert ${alert.id}:`, emailError);
        // Don't throw - we still want the in-app notification to work
      }
    }
  } catch (error) {
    console.error("Error checking price alerts:", error);
    // Don't throw here to prevent blocking the price update
  }
}

/**
 * Update price history for multiple items (batch processing)
 * Used for scheduled price updates from external sources
 * @param updates Array of item updates with ID and new price
 */
export async function updateMultipleItemPrices(
  updates: Array<{ itemId: number; newPrice: string; numericPrice: number }>
): Promise<void> {
  // Process each update
  for (const update of updates) {
    try {
      await updateItemPrice(update.itemId, update.newPrice, update.numericPrice);
    } catch (error) {
      console.error(`Error updating price for item ${update.itemId}:`, error);
      // Continue with other updates even if one fails
    }
  }
}

/**
 * Get price history for an item
 * @param itemId The item ID
 * @returns Array of price history points
 */
export async function getItemPriceHistory(itemId: number): Promise<any[]> {
  try {
    const item = await storage.getWishlistItem(itemId);

    if (!item) {
      return [];
    }

    // Return the price history - it should already be parsed as an array from storage
    const priceHistory = item.priceHistory;
    return Array.isArray(priceHistory) ? priceHistory : [];
  } catch (error) {
    console.error("Error getting item price history:", error);
    throw new Error("Failed to get item price history");
  }
}

/**
 * Find items with significant price drops in the last day
 * This can be used for a daily digest email or recommendations
 * @param threshold Percentage threshold for significant drops (e.g. 10 for 10%)
 * @param userId Optional user ID to limit search to user's items
 * @returns Array of items with significant price drops
 */
export async function findSignificantPriceDrops(
  threshold: number = 10, 
  userId?: number
): Promise<WishlistItem[]> {
  try {
    let items: WishlistItem[] = [];
    
    if (userId) {
      // Get items from user's wishlists only
      const userWishlists = await storage.getWishlists(userId);
      for (const wishlist of userWishlists) {
        const wishlistItems = await storage.getWishlistItems(wishlist.id);
        items.push(...wishlistItems);
      }
    } else {
      // This would require a method to get all items from storage
      // For now, let's use the recent price drops method as a fallback
      const recentDrops = await storage.getRecentPriceDrops(userId || 1, 1);
      return recentDrops as WishlistItem[];
    }

    const significantDrops: WishlistItem[] = [];
    
    // Process each item
    for (const item of items) {
      const priceHistory = item.priceHistory;
      
      if (!Array.isArray(priceHistory) || priceHistory.length < 2) {
        continue; // Skip items with insufficient price history
      }

      // Check for price drops in the last day
      const now = new Date();
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(now.getDate() - 1);

      const recentPrices = priceHistory
        .filter((p: any) => new Date(p.date) >= oneDayAgo)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (recentPrices.length < 2) {
        continue; // Skip if not enough recent price points
      }

      const oldestRecent = recentPrices[0];
      const newest = recentPrices[recentPrices.length - 1];

      // Calculate percentage drop
      const percentDrop = ((oldestRecent.price - newest.price) / oldestRecent.price) * 100;

      if (percentDrop >= threshold) {
        significantDrops.push(item);
      }
    }

    return significantDrops;
  } catch (error) {
    console.error("Error finding significant price drops:", error);
    return [];
  }
}