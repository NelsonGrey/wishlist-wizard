import { v4 as uuidv4 } from "uuid";
import { db } from "./db";
import { 
  users, User, InsertUser,
  beneficiaries, Beneficiary, InsertBeneficiary,
  wishlists, Wishlist, InsertWishlist,
  wishlistItems, WishlistItem, InsertWishlistItem
} from "@shared/schema";
import { IStorage } from "./storage";
import { eq, and } from "drizzle-orm";

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
}