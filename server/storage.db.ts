import { v4 as uuidv4 } from "uuid";
import { db } from "./db";
import { 
  users, User, InsertUser,
  beneficiaries, Beneficiary, InsertBeneficiary,
  wishlists, Wishlist, InsertWishlist,
  wishlistItems, WishlistItem, InsertWishlistItem,
  wishlistCollaborators, WishlistCollaborator, InsertWishlistCollaborator,
  notifications, Notification, InsertNotification,
  priceAlerts, PriceAlert, InsertPriceAlert
} from "@shared/schema";
import { IStorage } from "./storage";
import { eq, and, desc, sql, lt, gt } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser || undefined;
  }

  // Beneficiary methods
  async getBeneficiaries(ownerId: number): Promise<Beneficiary[]> {
    return await db
      .select()
      .from(beneficiaries)
      .where(eq(beneficiaries.ownerId, ownerId));
  }

  async getBeneficiary(id: number): Promise<Beneficiary | undefined> {
    const [beneficiary] = await db
      .select()
      .from(beneficiaries)
      .where(eq(beneficiaries.id, id));
    return beneficiary || undefined;
  }

  async createBeneficiary(beneficiaryData: InsertBeneficiary): Promise<Beneficiary> {
    const [beneficiary] = await db
      .insert(beneficiaries)
      .values(beneficiaryData)
      .returning();
    return beneficiary;
  }

  async updateBeneficiary(id: number, data: Partial<InsertBeneficiary>): Promise<Beneficiary | undefined> {
    const [updatedBeneficiary] = await db
      .update(beneficiaries)
      .set(data)
      .where(eq(beneficiaries.id, id))
      .returning();
    
    return updatedBeneficiary || undefined;
  }

  async deleteBeneficiary(id: number): Promise<boolean> {
    // First check if there are any wishlists for this beneficiary
    const beneficiaryWishlists = await db
      .select()
      .from(wishlists)
      .where(eq(wishlists.beneficiaryId, id));
    
    // If there are wishlists, don't delete the beneficiary
    if (beneficiaryWishlists.length > 0) {
      return false;
    }
    
    const [deleted] = await db
      .delete(beneficiaries)
      .where(eq(beneficiaries.id, id))
      .returning();
    
    return !!deleted;
  }

  // Wishlist methods
  async getWishlists(userId: number): Promise<Wishlist[]> {
    return await db.select().from(wishlists).where(eq(wishlists.userId, userId));
  }

  async getWishlistsByBeneficiary(beneficiaryId: number): Promise<Wishlist[]> {
    return await db
      .select()
      .from(wishlists)
      .where(eq(wishlists.beneficiaryId, beneficiaryId));
  }

  async getCollaborativeWishlists(userId: number): Promise<Wishlist[]> {
    // Find all wishlists where user is a collaborator
    const collaborations = await db
      .select()
      .from(wishlistCollaborators)
      .where(eq(wishlistCollaborators.userId, userId));
    
    if (collaborations.length === 0) {
      return [];
    }
    
    // Get the wishlist IDs
    const wishlistIds = collaborations.map(c => c.wishlistId);
    
    // Get the actual wishlists by using a query with OR conditions for each ID
    if (wishlistIds.length === 1) {
      return await db
        .select()
        .from(wishlists)
        .where(eq(wishlists.id, wishlistIds[0]));
    }
    
    // For multiple IDs, construct multiple conditions
    const results = [];
    for (const wishlistId of wishlistIds) {
      const [wishlist] = await db
        .select()
        .from(wishlists)
        .where(eq(wishlists.id, wishlistId));
      
      if (wishlist) {
        results.push(wishlist);
      }
    }
    
    return results;
  }

  async getWishlistById(id: number): Promise<Wishlist | undefined> {
    const [wishlist] = await db.select().from(wishlists).where(eq(wishlists.id, id));
    return wishlist || undefined;
  }

  async getWishlistByShareId(shareId: string): Promise<Wishlist | undefined> {
    const [wishlist] = await db.select().from(wishlists).where(eq(wishlists.shareId, shareId));
    return wishlist || undefined;
  }

  async createWishlist(wishlistData: Omit<InsertWishlist, "shareId">): Promise<Wishlist> {
    const shareId = uuidv4();
    
    const [wishlist] = await db
      .insert(wishlists)
      .values({
        ...wishlistData,
        shareId
      })
      .returning();
    
    return wishlist;
  }

  async updateWishlist(id: number, data: Partial<Omit<InsertWishlist, "userId">>): Promise<Wishlist | undefined> {
    const [updatedWishlist] = await db
      .update(wishlists)
      .set(data)
      .where(eq(wishlists.id, id))
      .returning();
    
    return updatedWishlist || undefined;
  }

  async deleteWishlist(id: number): Promise<boolean> {
    // First delete all wishlist items
    await db
      .delete(wishlistItems)
      .where(eq(wishlistItems.wishlistId, id));
    
    // Then delete the wishlist
    const [deleted] = await db
      .delete(wishlists)
      .where(eq(wishlists.id, id))
      .returning();
    
    return !!deleted;
  }

  // Wishlist item methods
  async getWishlistItems(wishlistId: number): Promise<WishlistItem[]> {
    return await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.wishlistId, wishlistId))
      .orderBy(wishlistItems.createdAt);
  }

  async getWishlistItem(id: number): Promise<WishlistItem | undefined> {
    const [item] = await db.select().from(wishlistItems).where(eq(wishlistItems.id, id));
    return item || undefined;
  }

  async createWishlistItem(itemData: InsertWishlistItem): Promise<WishlistItem> {
    const [item] = await db
      .insert(wishlistItems)
      .values(itemData)
      .returning();
    
    return item;
  }

  async deleteWishlistItem(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(wishlistItems)
      .where(eq(wishlistItems.id, id))
      .returning();
    
    return !!deleted;
  }

  async updateWishlistItem(id: number, data: Partial<InsertWishlistItem>): Promise<WishlistItem | undefined> {
    const [updatedItem] = await db
      .update(wishlistItems)
      .set(data)
      .where(eq(wishlistItems.id, id))
      .returning();
    
    return updatedItem || undefined;
  }

  async reserveWishlistItem(itemId: number, userId: number): Promise<WishlistItem | undefined> {
    // First check if the item is already reserved or purchased
    const [item] = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.id, itemId));
    
    if (!item || item.reservedByUserId || item.purchasedByUserId) {
      return undefined;
    }
    
    // Update the item with the reservation
    const [updatedItem] = await db
      .update(wishlistItems)
      .set({ reservedByUserId: userId })
      .where(eq(wishlistItems.id, itemId))
      .returning();
    
    return updatedItem || undefined;
  }

  async markItemPurchased(itemId: number, userId: number): Promise<WishlistItem | undefined> {
    // First check if the item is already purchased
    const [item] = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.id, itemId));
    
    if (!item || item.purchasedByUserId) {
      return undefined;
    }
    
    const now = new Date();
    
    // Update the item as purchased and clear any reservation
    const [updatedItem] = await db
      .update(wishlistItems)
      .set({ 
        purchasedByUserId: userId,
        purchasedAt: now,
        reservedByUserId: null 
      })
      .where(eq(wishlistItems.id, itemId))
      .returning();
    
    return updatedItem || undefined;
  }

  // Wishlist collaborator methods
  async addCollaborator(collaborator: InsertWishlistCollaborator): Promise<WishlistCollaborator> {
    const now = new Date();
    
    // Set defaults for any missing fields
    const collaboratorData: InsertWishlistCollaborator = {
      ...collaborator,
      role: collaborator.role || 'editor',
      lastActive: collaborator.lastActive || now
    };
    
    // Add the collaborator
    const [newCollaborator] = await db
      .insert(wishlistCollaborators)
      .values(collaboratorData)
      .returning();
    
    return newCollaborator;
  }
  
  async removeCollaborator(wishlistId: number, userId: number): Promise<boolean> {
    const [deleted] = await db
      .delete(wishlistCollaborators)
      .where(
        and(
          eq(wishlistCollaborators.wishlistId, wishlistId),
          eq(wishlistCollaborators.userId, userId)
        )
      )
      .returning();
    
    return !!deleted;
  }
  
  async getCollaborators(wishlistId: number): Promise<WishlistCollaborator[]> {
    return await db
      .select()
      .from(wishlistCollaborators)
      .where(eq(wishlistCollaborators.wishlistId, wishlistId));
  }
  
  async updateCollaboratorRole(wishlistId: number, userId: number, role: string): Promise<WishlistCollaborator | undefined> {
    const [updatedCollaborator] = await db
      .update(wishlistCollaborators)
      .set({ role })
      .where(
        and(
          eq(wishlistCollaborators.wishlistId, wishlistId),
          eq(wishlistCollaborators.userId, userId)
        )
      )
      .returning();
    
    return updatedCollaborator || undefined;
  }
  
  async isCollaborator(wishlistId: number, userId: number): Promise<boolean> {
    const [collaborator] = await db
      .select()
      .from(wishlistCollaborators)
      .where(
        and(
          eq(wishlistCollaborators.wishlistId, wishlistId),
          eq(wishlistCollaborators.userId, userId)
        )
      );
    
    return !!collaborator;
  }
  
  async updateCollaboratorActivity(wishlistId: number, userId: number): Promise<boolean> {
    const now = new Date();
    
    const [updated] = await db
      .update(wishlistCollaborators)
      .set({ lastActive: now })
      .where(
        and(
          eq(wishlistCollaborators.wishlistId, wishlistId),
          eq(wishlistCollaborators.userId, userId)
        )
      )
      .returning();
    
    return !!updated;
  }
  
  // Notification methods
  async getNotifications(userId: number, limit?: number): Promise<Notification[]> {
    // Get all notifications for the user, sorted by most recent first
    const query = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    
    // Apply limit if specified
    if (limit && limit > 0) {
      query.limit(limit);
    }
    
    return await query;
  }
  
  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    
    return result?.count || 0;
  }
  
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    
    return notification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    
    return notification || undefined;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    
    return true; // Operation completed
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(notifications)
      .where(eq(notifications.id, id))
      .returning();
    
    return !!deleted;
  }
}