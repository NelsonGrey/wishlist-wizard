import { db } from "../db";
import { storage } from "../storage";
import { eq, and, sql } from "drizzle-orm";
import {
  giftReservations,
  InsertGiftReservation,
  GiftReservation,
  notifications,
  InsertNotification,
  users,
  wishlistItems,
  wishlists
} from "@wishlist-wizard/shared";

/**
 * Get all gift reservations for a wishlist item
 */
export async function getGiftReservationsForItem(itemId: number): Promise<GiftReservation[]> {
  try {
    return await db
      .select()
      .from(giftReservations)
      .where(eq(giftReservations.wishlistItemId, itemId));
  } catch (error) {
    console.error("Error getting gift reservations:", error);
    throw new Error("Failed to get gift reservations");
  }
}

/**
 * Add a gifting participant to an item (someone intending to contribute to a gift)
 */
export async function addGiftParticipant(
  itemId: number, 
  userId: number, 
  contributionAmount: number,
  message: string = ""
): Promise<GiftReservation> {
  try {
    // Get the item to check if it's valid
    const item = await storage.getWishlistItem(itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Get the wishlist to check if it's a collaborative wishlist
    const wishlist = await storage.getWishlistById(item.wishlistId);
    if (!wishlist) {
      throw new Error("Wishlist not found");
    }

    // Check if user is already participating
    const existingReservation = await db
      .select()
      .from(giftReservations)
      .where(
        and(
          eq(giftReservations.wishlistItemId, itemId),
          eq(giftReservations.userId, userId)
        )
      )
      .limit(1);

    if (existingReservation.length > 0) {
      throw new Error("You are already participating in this gift");
    }

    // Create the new gift reservation
    const newReservation: InsertGiftReservation = {
      wishlistItemId: itemId,
      userId,
      contributionAmount: contributionAmount.toString(),
      message,
      status: "active",
    };

    // Insert the reservation
    const [reservation] = await db
      .insert(giftReservations)
      .values(newReservation)
      .returning();

    // Get user info for notification
    const user = await storage.getUser(userId);
    const userName = user?.displayName || user?.username || "Someone";

    // Notify other participants about the new participant
    await notifyOtherParticipants(
      itemId,
      userId,
      `${userName} is now contributing to the gift "${item.title}"`,
      "New Gift Participant"
    );

    return reservation;
  } catch (error) {
    console.error("Error adding gift participant:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to add gift participant: ${errorMessage}`);
  }
}

/**
 * Remove a user from gift participation
 */
export async function removeGiftParticipant(
  itemId: number,
  userId: number
): Promise<boolean> {
  try {
    // Check if the participation exists
    const existingReservation = await db
      .select()
      .from(giftReservations)
      .where(
        and(
          eq(giftReservations.wishlistItemId, itemId),
          eq(giftReservations.userId, userId)
        )
      )
      .limit(1);

    if (existingReservation.length === 0) {
      throw new Error("You are not participating in this gift");
    }

    // Delete the reservation
    await db
      .delete(giftReservations)
      .where(
        and(
          eq(giftReservations.wishlistItemId, itemId),
          eq(giftReservations.userId, userId)
        )
      );

    // Get the item info for notification
    const item = await storage.getWishlistItem(itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Get user info for notification
    const user = await storage.getUser(userId);
    const userName = user?.displayName || user?.username || "Someone";

    // Notify other participants about the cancellation
    await notifyOtherParticipants(
      itemId,
      userId,
      `${userName} is no longer contributing to the gift "${item.title}"`,
      "Gift Participant Left"
    );

    return true;
  } catch (error) {
    console.error("Error removing gift participant:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to remove gift participant: ${errorMessage}`);
  }
}

/**
 * Update a gift participant's contribution or message
 */
export async function updateGiftParticipation(
  itemId: number,
  userId: number,
  updates: {
    contributionAmount?: number;
    message?: string;
    status?: string;
  }
): Promise<GiftReservation> {
  try {
    // Check if the participation exists
    const existingReservation = await db
      .select()
      .from(giftReservations)
      .where(
        and(
          eq(giftReservations.wishlistItemId, itemId),
          eq(giftReservations.userId, userId)
        )
      )
      .limit(1);

    if (existingReservation.length === 0) {
      throw new Error("You are not participating in this gift");
    }

    // Update the reservation
    const updatesWithStringAmount = {
      ...updates,
      contributionAmount: updates.contributionAmount ? updates.contributionAmount.toString() : undefined
    };

    const [updatedReservation] = await db
      .update(giftReservations)
      .set(updatesWithStringAmount)
      .where(
        and(
          eq(giftReservations.wishlistItemId, itemId),
          eq(giftReservations.userId, userId)
        )
      )
      .returning();

    // Get the item info for notification
    const item = await storage.getWishlistItem(itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Get user info for notification
    const user = await storage.getUser(userId);
    const userName = user?.displayName || user?.username || "Someone";

    // Notify other participants about the update
    if (updates.contributionAmount) {
      await notifyOtherParticipants(
        itemId,
        userId,
        `${userName} updated their contribution for "${item.title}"`,
        "Gift Contribution Updated"
      );
    }

    return updatedReservation;
  } catch (error) {
    console.error("Error updating gift participation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to update gift participation: ${errorMessage}`);
  }
}

/**
 * Get gift participants' details with user information
 */
export async function getGiftParticipantsWithDetails(itemId: number): Promise<any[]> {
  try {
    const participants = await db
      .select({
        reservation: giftReservations,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
          avatarUrl: users.avatarUrl
        }
      })
      .from(giftReservations)
      .leftJoin(users, eq(giftReservations.userId, users.id))
      .where(eq(giftReservations.wishlistItemId, itemId));

    return participants;
  } catch (error) {
    console.error("Error getting gift participants with details:", error);
    throw new Error("Failed to get gift participants");
  }
}

/**
 * Calculate the total amount contributed to a gift
 */
export async function getTotalContributedAmount(itemId: number): Promise<number> {
  try {
    const result = await db
      .select({
        totalAmount: sql<number>`SUM(${giftReservations.contributionAmount})`
      })
      .from(giftReservations)
      .where(eq(giftReservations.wishlistItemId, itemId));

    return result[0]?.totalAmount || 0;
  } catch (error) {
    console.error("Error calculating total contribution:", error);
    throw new Error("Failed to calculate total contribution");
  }
}

/**
 * Notify all other participants about an update
 */
async function notifyOtherParticipants(
  itemId: number,
  excludeUserId: number,
  message: string,
  title: string
): Promise<void> {
  try {
    // Get all participants except the current user
    const otherParticipants = await db
      .select({
        userId: giftReservations.userId
      })
      .from(giftReservations)
      .where(
        and(
          eq(giftReservations.wishlistItemId, itemId),
          sql`${giftReservations.userId} != ${excludeUserId}`
        )
      );

    // Get the item details
    const item = await storage.getWishlistItem(itemId);
    if (!item) return;

    // Get the wishlist info to add to notification
    const wishlist = await storage.getWishlistById(item.wishlistId);
    if (!wishlist) return;

    // Create notifications for each participant
    for (const participant of otherParticipants) {
      const notification: InsertNotification = {
        userId: participant.userId,
        type: "gift_coordination",
        title,
        content: message,
        isRead: false,
        relatedEntityId: itemId,
        relatedEntityType: "item"
      };

      await db.insert(notifications).values(notification);
    }
  } catch (error) {
    console.error("Error notifying other participants:", error);
    // Just log the error but don't throw as this is a non-critical operation
  }
}

/**
 * Mark a gift as fully funded and ready to purchase
 */
export async function markGiftAsReady(itemId: number, organizerId: number): Promise<boolean> {
  try {
    // Update all reservations to "ready" status
    await db
      .update(giftReservations)
      .set({ status: "ready" })
      .where(eq(giftReservations.wishlistItemId, itemId));

    // Update the item status
    await storage.updateWishlistItem(itemId, { 
      reservedByUserId: organizerId,
      note: "Group gift ready to be purchased"
    });

    // Get the item details
    const item = await storage.getWishlistItem(itemId);
    if (!item) throw new Error("Item not found");

    // Get the wishlist info
    const wishlist = await storage.getWishlistById(item.wishlistId);
    if (!wishlist) throw new Error("Wishlist not found");

    // Get organizer info
    const organizer = await storage.getUser(organizerId);
    const organizerName = organizer?.displayName || organizer?.username || "Someone";

    // Notify all participants
    const participants = await db
      .select({
        userId: giftReservations.userId
      })
      .from(giftReservations)
      .where(eq(giftReservations.wishlistItemId, itemId));

    for (const participant of participants) {
      if (participant.userId === organizerId) continue;

      const notification: InsertNotification = {
        userId: participant.userId,
        type: "gift_ready",
        title: "Gift Ready to Purchase",
        content: `The group gift "${item.title}" is now ready to purchase. ${organizerName} will coordinate the purchase.`,
        isRead: false,
        relatedEntityId: itemId,
        relatedEntityType: "item",
        actionUrl: `/wishlist/${item.wishlistId}`
      };

      await db.insert(notifications).values(notification);
    }

    return true;
  } catch (error) {
    console.error("Error marking gift as ready:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to mark gift as ready: ${errorMessage}`);
  }
}

/**
 * Mark a gift as purchased
 */
export async function markGiftAsPurchased(
  itemId: number, 
  purchaserId: number,
  purchaseDetails?: string
): Promise<boolean> {
  try {
    // Update all reservations to "purchased" status
    await db
      .update(giftReservations)
      .set({ status: "purchased" })
      .where(eq(giftReservations.wishlistItemId, itemId));

    // Update the item status
    await storage.updateWishlistItem(itemId, { 
      purchasedByUserId: purchaserId,
      purchasedAt: new Date(),
      note: purchaseDetails || "Group gift purchased"
    });

    // Get the item details
    const item = await storage.getWishlistItem(itemId);
    if (!item) throw new Error("Item not found");

    // Get the wishlist info
    const wishlist = await storage.getWishlistById(item.wishlistId);
    if (!wishlist) throw new Error("Wishlist not found");

    // Get purchaser info
    const purchaser = await storage.getUser(purchaserId);
    const purchaserName = purchaser?.displayName || purchaser?.username || "Someone";

    // Notify all participants
    const participants = await db
      .select({
        userId: giftReservations.userId
      })
      .from(giftReservations)
      .where(eq(giftReservations.wishlistItemId, itemId));

    for (const participant of participants) {
      if (participant.userId === purchaserId) continue;

      const notification: InsertNotification = {
        userId: participant.userId,
        type: "gift_purchased",
        title: "Group Gift Purchased",
        content: `The group gift "${item.title}" has been purchased by ${purchaserName}.`,
        isRead: false,
        relatedEntityId: itemId,
        relatedEntityType: "item",
        actionUrl: `/wishlist/${item.wishlistId}`
      };

      await db.insert(notifications).values(notification);
    }

    return true;
  } catch (error) {
    console.error("Error marking gift as purchased:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to mark gift as purchased: ${errorMessage}`);
  }
}