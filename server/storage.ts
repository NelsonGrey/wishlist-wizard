import { v4 as uuidv4 } from "uuid";
import { 
  users, User, InsertUser,
  wishlists, Wishlist, InsertWishlist,
  wishlistItems, WishlistItem, InsertWishlistItem
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Wishlist methods
  getWishlists(userId: number): Promise<Wishlist[]>;
  getWishlistById(id: number): Promise<Wishlist | undefined>;
  getWishlistByShareId(shareId: string): Promise<Wishlist | undefined>;
  createWishlist(wishlist: Omit<InsertWishlist, "shareId">): Promise<Wishlist>;
  updateWishlist(id: number, name: string): Promise<Wishlist | undefined>;
  deleteWishlist(id: number): Promise<boolean>;

  // Wishlist item methods
  getWishlistItems(wishlistId: number): Promise<WishlistItem[]>;
  getWishlistItem(id: number): Promise<WishlistItem | undefined>;
  createWishlistItem(item: InsertWishlistItem): Promise<WishlistItem>;
  deleteWishlistItem(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private wishlists: Map<number, Wishlist>;
  private wishlistItems: Map<number, WishlistItem>;
  private userIdCounter: number;
  private wishlistIdCounter: number;
  private wishlistItemIdCounter: number;

  constructor() {
    this.users = new Map();
    this.wishlists = new Map();
    this.wishlistItems = new Map();
    this.userIdCounter = 1;
    this.wishlistIdCounter = 1;
    this.wishlistItemIdCounter = 1;
    
    // Add a demo user
    this.createUser({
      username: "demo",
      password: "password123"
    });
    
    // Create sample wishlists for demo user
    const sampleWishlists = [
      { name: "Birthday Wishlist", userId: 1 },
      { name: "Christmas List", userId: 1 },
      { name: "Home Decor Ideas", userId: 1 }
    ];
    
    sampleWishlists.forEach(list => this.createWishlist(list));
    
    // Add sample items to the wishlists
    const items = [
      {
        wishlistId: 1,
        title: "Sony WH-1000XM4 Wireless Noise-Cancelling Headphones",
        price: "$298.00",
        imageUrl: "https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SL1500_.jpg",
        productUrl: "https://www.amazon.com/Sony-WH-1000XM4-Canceling-Headphones-phone-call/dp/B0863TXGM3/",
        store: "Amazon",
        note: ""
      },
      {
        wishlistId: 2,
        title: "Breville Barista Express Espresso Machine",
        price: "$699.95",
        imageUrl: "https://m.media-amazon.com/images/I/71tVNhmDDWL._AC_SL1500_.jpg",
        productUrl: "https://www.amazon.com/Breville-BES870XL-Barista-Express-Espresso/dp/B00CH9QWOU/",
        store: "Target",
        note: "Silver color preferred"
      },
      {
        wishlistId: 3,
        title: "Modern Table Lamp with Wooden Base",
        price: "$59.99",
        imageUrl: "https://images.thdstatic.com/productImages/ceb67e49-cabb-49c4-b26a-905d1d95741f/svn/natural-wood-base-elegant-designs-table-lamps-lt2008-wod-e1.jpg",
        productUrl: "https://www.walmart.com/ip/Modern-Table-Lamp-with-Wooden-Base/123456789",
        store: "Walmart",
        note: ""
      }
    ];
    
    items.forEach(item => this.createWishlistItem(item));
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Wishlist methods
  async getWishlists(userId: number): Promise<Wishlist[]> {
    return Array.from(this.wishlists.values()).filter(
      (wishlist) => wishlist.userId === userId
    );
  }

  async getWishlistById(id: number): Promise<Wishlist | undefined> {
    return this.wishlists.get(id);
  }

  async getWishlistByShareId(shareId: string): Promise<Wishlist | undefined> {
    return Array.from(this.wishlists.values()).find(
      (wishlist) => wishlist.shareId === shareId
    );
  }

  async createWishlist(wishlistData: Omit<InsertWishlist, "shareId">): Promise<Wishlist> {
    const id = this.wishlistIdCounter++;
    const shareId = uuidv4();
    const now = new Date();
    
    const wishlist: Wishlist = {
      id,
      name: wishlistData.name,
      userId: wishlistData.userId,
      shareId,
      createdAt: now
    };
    
    this.wishlists.set(id, wishlist);
    return wishlist;
  }

  async updateWishlist(id: number, name: string): Promise<Wishlist | undefined> {
    const wishlist = this.wishlists.get(id);
    if (!wishlist) return undefined;
    
    const updatedWishlist = { ...wishlist, name };
    this.wishlists.set(id, updatedWishlist);
    return updatedWishlist;
  }

  async deleteWishlist(id: number): Promise<boolean> {
    if (!this.wishlists.has(id)) return false;
    
    // Delete associated wishlist items
    const itemsToDelete = Array.from(this.wishlistItems.values())
      .filter(item => item.wishlistId === id)
      .map(item => item.id);
    
    itemsToDelete.forEach(itemId => this.wishlistItems.delete(itemId));
    
    return this.wishlists.delete(id);
  }

  // Wishlist item methods
  async getWishlistItems(wishlistId: number): Promise<WishlistItem[]> {
    return Array.from(this.wishlistItems.values())
      .filter(item => item.wishlistId === wishlistId)
      .sort((a, b) => {
        // Sort by most recently added first
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  async getWishlistItem(id: number): Promise<WishlistItem | undefined> {
    return this.wishlistItems.get(id);
  }

  async createWishlistItem(itemData: InsertWishlistItem): Promise<WishlistItem> {
    const id = this.wishlistItemIdCounter++;
    const now = new Date();
    
    const item: WishlistItem = {
      id,
      wishlistId: itemData.wishlistId,
      title: itemData.title,
      price: itemData.price,
      imageUrl: itemData.imageUrl,
      productUrl: itemData.productUrl,
      store: itemData.store,
      note: itemData.note || "",
      createdAt: now
    };
    
    this.wishlistItems.set(id, item);
    return item;
  }

  async deleteWishlistItem(id: number): Promise<boolean> {
    return this.wishlistItems.delete(id);
  }
}

export const storage = new MemStorage();
