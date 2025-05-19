import { v4 as uuidv4 } from "uuid";
import { db } from "./db";
import { 
  users, User, InsertUser,
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Wishlist methods
  async getWishlists(userId: number): Promise<Wishlist[]> {
    return await db.select().from(wishlists).where(eq(wishlists.userId, userId));
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

  async updateWishlist(id: number, name: string): Promise<Wishlist | undefined> {
    const [updatedWishlist] = await db
      .update(wishlists)
      .set({ name })
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
}