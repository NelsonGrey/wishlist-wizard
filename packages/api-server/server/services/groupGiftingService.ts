import { db } from "../db";
import { 
  wishlistItems, 
  groupGifts, 
  groupGiftContributions, 
  notifications, 
  InsertGroupGift,
  InsertGroupGiftContribution,
  InsertNotification
} from "@wishlist-wizard/shared";
import { eq, and, desc, isNull } from "drizzle-orm";
import { IStorage } from "../storage";

export class GroupGiftingService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Create a new group gift for an item
   */
  async createGroupGift(data: InsertGroupGift): Promise<number | null> {
    try {
      // Get the wishlist item
      const item = await db.query.wishlistItems.findFirst({
        where: eq(wishlistItems.id, data.itemId),
        with: {
          wishlist: {
            with: {
              owner: true
            }
          }
        }
      });

      if (!item) return null;
      
      // Create group gift
      const [newGroupGift] = await db.insert(groupGifts)
        .values({
          ...data,
          currentAmount: 0,
          status: "active"
        })
        .returning({ id: groupGifts.id });
      
      // Notify the wishlist owner
      if (item.wishlist && item.wishlist.owner && item.wishlist.owner.id !== data.initiatedByUserId) {
        const notification: InsertNotification = {
          userId: item.wishlist.owner.id,
          type: "group_gift_created",
          title: "New Group Gift Started",
          content: `Someone has started a group gift for "${item.title}" on your wishlist`,
          relatedEntityId: newGroupGift.id,
          relatedEntityType: "group_gift",
          actionUrl: `/group-gifts/${newGroupGift.id}`,
          isRead: false
        };
        
        await db.insert(notifications).values(notification);
      }
      
      return newGroupGift.id;
    } catch (error) {
      console.error("Error creating group gift:", error);
      return null;
    }
  }

  /**
   * Add a contribution to a group gift
   */
  async addContribution(data: InsertGroupGiftContribution): Promise<number | null> {
    try {
      // Get the group gift
      const groupGift = await db.query.groupGifts.findFirst({
        where: eq(groupGifts.id, data.groupGiftId),
        with: {
          item: true,
          initiator: true
        }
      });

      if (!groupGift || groupGift.status !== "active") return null;
      
      // Create contribution
      const [newContribution] = await db.insert(groupGiftContributions)
        .values({
          ...data,
          paymentStatus: "completed" // In a real system, would be pending until payment processed
        })
        .returning({ id: groupGiftContributions.id });
      
      // Update the total amount
      const newTotal = Number(groupGift.currentAmount) + Number(data.amount);
      await db.update(groupGifts)
        .set({ currentAmount: newTotal })
        .where(eq(groupGifts.id, data.groupGiftId));
      
      // Check if goal reached
      if (newTotal >= Number(groupGift.targetAmount)) {
        await this.completeGroupGift(data.groupGiftId);
      }
      
      // Notify the group gift initiator
      if (groupGift.initiator && groupGift.initiator.id !== data.userId) {
        const notification: InsertNotification = {
          userId: groupGift.initiator.id,
          type: "group_gift_contribution",
          title: "New Group Gift Contribution",
          content: `Someone has contributed $${data.amount} to the group gift for "${groupGift.item?.title}"`,
          relatedEntityId: data.groupGiftId,
          relatedEntityType: "group_gift",
          actionUrl: `/group-gifts/${data.groupGiftId}`,
          isRead: false
        };
        
        await db.insert(notifications).values(notification);
      }
      
      return newContribution.id;
    } catch (error) {
      console.error("Error adding contribution:", error);
      return null;
    }
  }

  /**
   * Complete a group gift when the goal is reached
   */
  private async completeGroupGift(groupGiftId: number): Promise<boolean> {
    try {
      // Get the group gift
      const groupGift = await db.query.groupGifts.findFirst({
        where: eq(groupGifts.id, groupGiftId),
        with: {
          item: {
            with: {
              wishlist: {
                with: {
                  owner: true
                }
              }
            }
          },
          contributions: {
            with: {
              contributor: true
            }
          }
        }
      });

      if (!groupGift) return false;
      
      // Mark the group gift as completed
      await db.update(groupGifts)
        .set({ 
          status: "completed",
          completedAt: new Date()
        })
        .where(eq(groupGifts.id, groupGiftId));
      
      // Mark the item as purchased
      if (groupGift.item) {
        await db.update(wishlistItems)
          .set({
            purchasedByUserId: groupGift.initiatedByUserId,
            purchasedAt: new Date()
          })
          .where(eq(wishlistItems.id, groupGift.itemId));
      }
      
      // Notify the wishlist owner
      if (groupGift.item?.wishlist?.owner) {
        const notification: InsertNotification = {
          userId: groupGift.item.wishlist.owner.id,
          type: "group_gift_completed",
          title: "Group Gift Completed",
          content: `The group gift for "${groupGift.item.title}" has been fully funded!`,
          relatedEntityId: groupGiftId,
          relatedEntityType: "group_gift",
          actionUrl: `/group-gifts/${groupGiftId}`,
          isRead: false
        };
        
        await db.insert(notifications).values(notification);
      }
      
      // Notify all contributors
      const uniqueContributors = new Set(
        groupGift.contributions
          .map((c: any) => c.userId)
          .filter((id: any) => id !== groupGift.initiatedByUserId) // Don't notify the initiator twice
      );
      
      for (const contributorId of uniqueContributors) {
        const notification: InsertNotification = {
          userId: contributorId as number,
          type: "group_gift_completed",
          title: "Group Gift Completed",
          content: `The group gift for "${groupGift.item?.title}" that you contributed to has been fully funded!`,
          relatedEntityId: groupGiftId,
          relatedEntityType: "group_gift",
          actionUrl: `/group-gifts/${groupGiftId}`,
          isRead: false
        };
        
        await db.insert(notifications).values(notification);
      }
      
      return true;
    } catch (error) {
      console.error("Error completing group gift:", error);
      return false;
    }
  }

  /**
   * Cancel a group gift and refund all contributions
   */
  async cancelGroupGift(groupGiftId: number, userId: number): Promise<boolean> {
    try {
      // Get the group gift
      const groupGift = await db.query.groupGifts.findFirst({
        where: eq(groupGifts.id, groupGiftId),
        with: {
          contributions: {
            with: {
              contributor: true
            }
          }
        }
      });

      if (!groupGift) return false;
      
      // Verify the user is the initiator
      if (groupGift.initiatedByUserId !== userId) return false;
      
      // Mark the group gift as cancelled
      await db.update(groupGifts)
        .set({ status: "cancelled" })
        .where(eq(groupGifts.id, groupGiftId));
      
      // Mark all contributions as refunded
      for (const contribution of groupGift.contributions) {
        await db.update(groupGiftContributions)
          .set({ paymentStatus: "refunded" })
          .where(eq(groupGiftContributions.id, contribution.id));
        
        // Notify the contributor
        if (contribution.contributor) {
          const notification: InsertNotification = {
            userId: contribution.contributor.id,
            type: "group_gift_cancelled",
            title: "Group Gift Cancelled",
            content: `A group gift you contributed to has been cancelled. Your contribution of $${contribution.amount} will be refunded.`,
            relatedEntityId: groupGiftId,
            relatedEntityType: "group_gift",
            actionUrl: `/group-gifts/${groupGiftId}`,
            isRead: false
          };
          
          await db.insert(notifications).values(notification);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error cancelling group gift:", error);
      return false;
    }
  }

  /**
   * Get all group gifts for a user (initiated or contributed)
   */
  async getUserGroupGifts(userId: number): Promise<any[]> {
    // Get all group gifts initiated by the user
    const initiatedGifts = await db.query.groupGifts.findMany({
      where: eq(groupGifts.initiatedByUserId, userId),
      with: {
        item: true,
        contributions: true
      },
      orderBy: [desc(groupGifts.createdAt)]
    });
    
    // Get all group gifts the user has contributed to
    const contributedGifts = await db.query.groupGiftContributions.findMany({
      where: eq(groupGiftContributions.userId, userId),
      with: {
        groupGift: {
          with: {
            item: true,
            contributions: true
          }
        }
      },
      orderBy: [desc(groupGiftContributions.createdAt)]
    });
    
    // Merge and deduplicate
    const contributedGiftIds = new Set(contributedGifts.map((c: any) => c.groupGift.id));
    const mergedGifts = [
      ...initiatedGifts,
      ...contributedGifts
        .map((c: any) => c.groupGift)
        .filter((g: any) => !contributedGiftIds.has(g.id))
    ];
    
    return mergedGifts;
  }

  /**
   * Get details for a specific group gift
   */
  async getGroupGiftDetails(groupGiftId: number): Promise<any | null> {
    const groupGift = await db.query.groupGifts.findFirst({
      where: eq(groupGifts.id, groupGiftId),
      with: {
        item: {
          with: {
            wishlist: {
              with: {
                owner: true
              }
            }
          }
        },
        initiator: true,
        contributions: {
          with: {
            contributor: true
          }
        }
      }
    });
    
    if (!groupGift) return null;
    
    // Calculate stats
    const totalContributors = new Set(groupGift.contributions.map((c: any) => c.userId)).size;
    const percentComplete = Math.min(100, Math.round((Number(groupGift.currentAmount) / Number(groupGift.targetAmount)) * 100));
    
    // Format anonymous contributions correctly
    const contributions = groupGift.contributions.map((c: any) => ({
      ...c,
      contributor: c.isAnonymous ? { displayName: "Anonymous" } : c.contributor
    }));
    
    return {
      ...groupGift,
      contributions,
      totalContributors,
      percentComplete,
      remaining: Math.max(0, Number(groupGift.targetAmount) - Number(groupGift.currentAmount))
    };
  }

  /**
   * Get all active group gifts for an item
   */
  async getItemGroupGifts(itemId: number): Promise<any[]> {
    return db.query.groupGifts.findMany({
      where: and(
        eq(groupGifts.itemId, itemId),
        eq(groupGifts.status, "active")
      ),
      with: {
        initiator: true,
        contributions: true
      }
    });
  }

  /**
   * Get all active group gifts for a wishlist
   */
  async getWishlistGroupGifts(wishlistId: number): Promise<any[]> {
    // Get all items in the wishlist
    const items = await db.query.wishlistItems.findMany({
      where: eq(wishlistItems.wishlistId, wishlistId)
    });
    
    const itemIds = items.map((item: any) => item.id);
    
    // Get all active group gifts for these items
    const groupGifts = [];
    for (const itemId of itemIds) {
      const gifts = await this.getItemGroupGifts(itemId);
      groupGifts.push(...gifts);
    }
    
    return groupGifts;
  }
}