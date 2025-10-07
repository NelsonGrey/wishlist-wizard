import { db } from "../db";
import { eq, and, lt, gt, inArray } from "drizzle-orm";
import { 
  wishlistItems, 
  priceAlerts,
  users,
  notifications,
  insertPriceAlertSchema,
  type InsertPriceAlert,
  type WishlistItem
} from "@shared/schema";

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
    const [item] = await db
      .select({
        id: wishlistItems.id,
        title: wishlistItems.title,
        price: wishlistItems.price,
        numericPrice: wishlistItems.numericPrice,
        priceHistory: wishlistItems.priceHistory
      })
      .from(wishlistItems)
      .where(eq(wishlistItems.id, itemId));

    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }

    // Parse the current price history
    let priceHistory = [];
    try {
      if (item.priceHistory) {
        priceHistory = typeof item.priceHistory === 'string' 
          ? JSON.parse(item.priceHistory) 
          : item.priceHistory;
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
    await db.update(wishlistItems)
      .set({
        price: newPrice,
        numericPrice: newNumericPrice.toString(),
        priceHistory: JSON.stringify(priceHistory)
      })
      .where(eq(wishlistItems.id, itemId));

    // Check alerts for this item
    await checkPriceAlerts(itemId, newNumericPrice, item.title);

  } catch (error) {
    console.error("Error updating item price:", error);
    throw new Error("Failed to update item price and check alerts");
  }
}

/**
 * Create a price alert for a specific item
 * @param userId The user ID
 * @param itemId The item ID
 * @param targetPrice The target price to alert at
 * @param expiresAt Optional expiration date for the alert
 */
export async function createPriceAlert(alertData: InsertPriceAlert): Promise<any> {
  try {
    // Validate the input using Zod schema
    const validatedData = insertPriceAlertSchema.parse(alertData);
    
    // Create the alert in the database
    const [newAlert] = await db.insert(priceAlerts)
      .values(validatedData)
      .returning();
    
    return newAlert;
  } catch (error) {
    console.error("Error creating price alert:", error);
    throw new Error("Failed to create price alert");
  }
}

/**
 * Get all price alerts for a user
 * @param userId The user ID
 */
export async function getUserPriceAlerts(userId: number): Promise<any[]> {
  try {
    // Get alerts from the database
    const alerts = await db
      .select({
        id: priceAlerts.id,
        itemId: priceAlerts.itemId,
        targetPrice: priceAlerts.targetPrice,
  // triggered field indicates whether the alert fired
  triggered: priceAlerts.triggered,
        createdAt: priceAlerts.createdAt,
        expiresAt: priceAlerts.expiresAt,
        // Include item details
        item: {
          title: wishlistItems.title,
          price: wishlistItems.price,
          numericPrice: wishlistItems.numericPrice,
          imageUrl: wishlistItems.imageUrl,
          productUrl: wishlistItems.productUrl,
          store: wishlistItems.store
        }
      })
      .from(priceAlerts)
      .leftJoin(wishlistItems, eq(priceAlerts.itemId, wishlistItems.id))
      .where(eq(priceAlerts.userId, userId));

    return alerts;
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
    // Verify the alert belongs to the user
    const [alert] = await db
      .select()
      .from(priceAlerts)
      .where(
        and(
          eq(priceAlerts.id, alertId),
          eq(priceAlerts.userId, userId)
        )
      );

    if (!alert) {
      return false;
    }

    // Delete the alert
    await db.delete(priceAlerts)
      .where(eq(priceAlerts.id, alertId));

    return true;
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
  // Get all active, non-expired, non-triggered alerts for this item
    // where the current price is at or below the target price
    const now = new Date();
    
    const alerts = await db
      .select({
        id: priceAlerts.id,
        userId: priceAlerts.userId,
        targetPrice: priceAlerts.targetPrice
      })
      .from(priceAlerts)
      .where(
        and(
          eq(priceAlerts.itemId, itemId),
          eq(priceAlerts.triggered, false),
          // Either no expiration or not expired yet
          (priceAlerts.expiresAt.isNull().or(gt(priceAlerts.expiresAt, now))),
          // Current price must be at or below target price
          lt(currentPrice, priceAlerts.targetPrice)
        )
      );

    if (alerts.length === 0) {
      return; // No alerts to process
    }

    // Process each alert
    for (const alert of alerts) {
  // Mark the alert as triggered
      await db.update(priceAlerts)
        .set({ triggered: true, triggeredAt: new Date() })
        .where(eq(priceAlerts.id, alert.id));

      // Create a notification for the user
      await db.insert(notifications)
        .values({
          userId: alert.userId,
          type: "price_drop",
          title: "Price Drop Alert",
          content: `The price of "${itemTitle}" has dropped to or below your target price of ${alert.targetPrice}!`,
          relatedEntityId: itemId,
          relatedEntityType: "wishlist_item",
          actionUrl: `/item/${itemId}`,
          isRead: false,
          data: { itemId, currentPrice, targetPrice: alert.targetPrice }
        });
    }

    // If needed, you could also send email notifications here
    // This would require integrating with an email service like SendGrid
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
    const [item] = await db
      .select({
        priceHistory: wishlistItems.priceHistory
      })
      .from(wishlistItems)
      .where(eq(wishlistItems.id, itemId));

    if (!item) {
      return [];
    }

    // Parse the price history
    let priceHistory = [];
    try {
      if (item.priceHistory) {
        priceHistory = typeof item.priceHistory === 'string' 
          ? JSON.parse(item.priceHistory) 
          : item.priceHistory;
      }
    } catch (err) {
      console.error("Error parsing price history:", err);
      return [];
    }

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
 * @returns Array of items with significant price drops
 */
export async function findSignificantPriceDrops(threshold: number = 10): Promise<WishlistItem[]> {
  try {
    // Get all items
    const items = await db
      .select()
      .from(wishlistItems);

    const significantDrops: WishlistItem[] = [];
    
    // Process each item
    for (const item of items) {
      let priceHistory = [];
      try {
        if (item.priceHistory) {
          priceHistory = typeof item.priceHistory === 'string' 
            ? JSON.parse(item.priceHistory) 
            : item.priceHistory;
        }
      } catch (err) {
        continue; // Skip items with invalid price history
      }

      if (!Array.isArray(priceHistory) || priceHistory.length < 2) {
        continue; // Skip items with insufficient price history
      }

      // Check for price drops in the last day
      const now = new Date();
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(now.getDate() - 1);

      const recentPrices = priceHistory
        .filter(p => new Date(p.date) >= oneDayAgo)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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