import { v4 as uuidv4 } from "uuid";
import { 
  users, User, InsertUser, UpdateUser,
  beneficiaries, Beneficiary, InsertBeneficiary,
  wishlists, Wishlist, InsertWishlist,
  wishlistItems, WishlistItem, InsertWishlistItem,
  wishlistCollaborators, WishlistCollaborator, InsertWishlistCollaborator,
  notifications, Notification, InsertNotification,
  priceAlerts, PriceAlert, InsertPriceAlert
} from "@shared/schema";
import { DatabaseStorage } from "./storage.db";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User[]>;
  getUserByResetToken(token: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<UpdateUser>): Promise<User | undefined>;

  // Beneficiary methods
  getBeneficiaries(ownerId: number): Promise<Beneficiary[]>;
  getBeneficiary(id: number): Promise<Beneficiary | undefined>;
  createBeneficiary(beneficiary: InsertBeneficiary): Promise<Beneficiary>;
  updateBeneficiary(id: number, data: Partial<InsertBeneficiary>): Promise<Beneficiary | undefined>;
  deleteBeneficiary(id: number): Promise<boolean>;

  // Wishlist methods
  getWishlists(userId: number): Promise<Wishlist[]>;
  getWishlistsByBeneficiary(beneficiaryId: number): Promise<Wishlist[]>;
  getCollaborativeWishlists(userId: number): Promise<Wishlist[]>;
  getWishlistById(id: number): Promise<Wishlist | undefined>;
  getWishlistByShareId(shareId: string): Promise<Wishlist | undefined>;
  createWishlist(wishlist: Omit<InsertWishlist, "shareId">): Promise<Wishlist>;
  updateWishlist(id: number, data: Partial<Omit<InsertWishlist, "userId">>): Promise<Wishlist | undefined>;
  deleteWishlist(id: number): Promise<boolean>;
  
  // Wishlist collaborator methods
  addCollaborator(collaborator: InsertWishlistCollaborator): Promise<WishlistCollaborator>;
  removeCollaborator(wishlistId: number, userId: number): Promise<boolean>;
  getCollaborators(wishlistId: number): Promise<WishlistCollaborator[]>;
  updateCollaboratorRole(wishlistId: number, userId: number, role: string): Promise<WishlistCollaborator | undefined>;
  isCollaborator(wishlistId: number, userId: number): Promise<boolean>;
  updateCollaboratorActivity(wishlistId: number, userId: number): Promise<boolean>;

  // Wishlist item methods
  getWishlistItems(wishlistId: number): Promise<WishlistItem[]>;
  getWishlistItem(id: number): Promise<WishlistItem | undefined>;
  createWishlistItem(item: InsertWishlistItem): Promise<WishlistItem>;
  updateWishlistItem(id: number, data: Partial<InsertWishlistItem>): Promise<WishlistItem | undefined>;
  deleteWishlistItem(id: number): Promise<boolean>;
  reserveWishlistItem(itemId: number, userId: number): Promise<WishlistItem | undefined>;
  markItemPurchased(itemId: number, userId: number): Promise<WishlistItem | undefined>;
  
  // Notification methods
  getNotifications(userId: number, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  
  // Price alert methods
  getPriceAlerts(userId: number): Promise<PriceAlert[]>;
  getPriceAlertsByItem(itemId: number): Promise<PriceAlert[]>;
  getPriceAlertsExpiringBefore(date: Date): Promise<PriceAlert[]>;
  createPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert>;
  markPriceAlertTriggered(alertId: number): Promise<boolean>;
  deletePriceAlert(id: number): Promise<boolean>;
  getRecentPriceDrops(userId: number, days: number): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private beneficiaries: Map<number, Beneficiary>;
  private wishlists: Map<number, Wishlist>;
  private wishlistItems: Map<number, WishlistItem>;
  private wishlistCollaborators: Map<number, WishlistCollaborator>;
  private notifications: Map<number, Notification>;
  private userIdCounter: number;
  private beneficiaryIdCounter: number;
  private wishlistIdCounter: number;
  private wishlistItemIdCounter: number;
  private collaboratorIdCounter: number;
  private notificationIdCounter: number;

  constructor() {
    this.users = new Map();
    this.beneficiaries = new Map();
    this.wishlists = new Map();
    this.wishlistItems = new Map();
    this.wishlistCollaborators = new Map();
    this.notifications = new Map();
    this.userIdCounter = 1;
    this.beneficiaryIdCounter = 1;
    this.wishlistIdCounter = 1;
    this.wishlistItemIdCounter = 1;
    this.collaboratorIdCounter = 1;
    this.notificationIdCounter = 1;
    
    // Add a demo user
    this.createUser({
      username: "demo",
      email: "demo@example.com",
      password: "password123",
      displayName: "Demo User",
      avatarUrl: null
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  async getUserByVerificationToken(token: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.verificationToken === token,
    );
  }
  
  async getUserByResetToken(token: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.passwordResetToken === token,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    
    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      password: insertUser.password,
      displayName: insertUser.displayName || insertUser.username,
      avatarUrl: insertUser.avatarUrl || null,
      role: insertUser.role || 'user',
      createdAt: now,
      lastLogin: null,
      emailVerified: insertUser.emailVerified || false,
      verificationToken: insertUser.verificationToken || null,
      verificationExpires: insertUser.verificationExpires || null,
      passwordResetToken: insertUser.passwordResetToken || null,
      passwordResetExpires: insertUser.passwordResetExpires || null,
      active: insertUser.active ?? true,
      twoFactorEnabled: insertUser.twoFactorEnabled || false,
      twoFactorSecret: insertUser.twoFactorSecret || null
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Beneficiary methods
  async getBeneficiaries(ownerId: number): Promise<Beneficiary[]> {
    return Array.from(this.beneficiaries.values()).filter(
      (beneficiary) => beneficiary.ownerId === ownerId
    );
  }

  async getBeneficiary(id: number): Promise<Beneficiary | undefined> {
    return this.beneficiaries.get(id);
  }

  async createBeneficiary(beneficiaryData: InsertBeneficiary): Promise<Beneficiary> {
    const id = this.beneficiaryIdCounter++;
    const now = new Date();
    
    const beneficiary: Beneficiary = {
      id,
      name: beneficiaryData.name,
      ownerId: beneficiaryData.ownerId,
      relationship: beneficiaryData.relationship || null,
      birthdate: beneficiaryData.birthdate || null,
      notes: beneficiaryData.notes || null,
      createdAt: now
    };
    
    this.beneficiaries.set(id, beneficiary);
    return beneficiary;
  }

  async updateBeneficiary(id: number, data: Partial<InsertBeneficiary>): Promise<Beneficiary | undefined> {
    const beneficiary = await this.getBeneficiary(id);
    if (!beneficiary) return undefined;
    
    const updatedBeneficiary = { ...beneficiary, ...data };
    this.beneficiaries.set(id, updatedBeneficiary);
    return updatedBeneficiary;
  }

  async deleteBeneficiary(id: number): Promise<boolean> {
    return this.beneficiaries.delete(id);
  }

  // Wishlist methods
  async getWishlists(userId: number): Promise<Wishlist[]> {
    return Array.from(this.wishlists.values()).filter(
      (wishlist) => wishlist.userId === userId
    );
  }

  async getWishlistsByBeneficiary(beneficiaryId: number): Promise<Wishlist[]> {
    return Array.from(this.wishlists.values()).filter(
      (wishlist) => wishlist.beneficiaryId === beneficiaryId
    );
  }

  async getCollaborativeWishlists(userId: number): Promise<Wishlist[]> {
    // Get all wishlists where the user is a collaborator
    const collaborations = Array.from(this.wishlistCollaborators.values()).filter(
      (collaborator) => collaborator.userId === userId
    );
    
    // Get the actual wishlists by their IDs
    const wishlistIds = new Set(collaborations.map(c => c.wishlistId));
    return Array.from(this.wishlists.values()).filter(
      (wishlist) => wishlistIds.has(wishlist.id)
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
      beneficiaryId: wishlistData.beneficiaryId || null,
      shareId,
      isPublic: wishlistData.isPublic || false,
      isCollaborative: wishlistData.isCollaborative || false,
      occasion: wishlistData.occasion || null,
      occasionDate: wishlistData.occasionDate || null,
      description: wishlistData.description || null,
      createdAt: now
    };
    
    this.wishlists.set(id, wishlist);
    return wishlist;
  }

  async updateWishlist(id: number, data: Partial<Omit<InsertWishlist, "userId">>): Promise<Wishlist | undefined> {
    const wishlist = this.wishlists.get(id);
    if (!wishlist) return undefined;
    
    const updatedWishlist = { ...wishlist, ...data };
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
      note: itemData.note || null,
      createdAt: now,
      reservedByUserId: itemData.reservedByUserId || null,
      purchasedByUserId: itemData.purchasedByUserId || null,
      purchasedAt: itemData.purchasedAt || null
    };
    
    this.wishlistItems.set(id, item);
    return item;
  }

  async updateWishlistItem(id: number, data: Partial<InsertWishlistItem>): Promise<WishlistItem | undefined> {
    const item = await this.getWishlistItem(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...data };
    this.wishlistItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteWishlistItem(id: number): Promise<boolean> {
    return this.wishlistItems.delete(id);
  }

  async reserveWishlistItem(itemId: number, userId: number): Promise<WishlistItem | undefined> {
    const item = await this.getWishlistItem(itemId);
    if (!item || item.reservedByUserId || item.purchasedByUserId) return undefined;
    
    const updatedItem: WishlistItem = { 
      ...item, 
      reservedByUserId: userId 
    };
    
    this.wishlistItems.set(itemId, updatedItem);
    return updatedItem;
  }

  async markItemPurchased(itemId: number, userId: number): Promise<WishlistItem | undefined> {
    const item = await this.getWishlistItem(itemId);
    if (!item || item.purchasedByUserId) return undefined;
    
    const now = new Date();
    const updatedItem: WishlistItem = { 
      ...item, 
      purchasedByUserId: userId,
      purchasedAt: now,
      // Clear reservation if it was reserved before
      reservedByUserId: null
    };
    
    this.wishlistItems.set(itemId, updatedItem);
    return updatedItem;
  }

  // Wishlist collaborator methods
  async addCollaborator(collaboratorData: InsertWishlistCollaborator): Promise<WishlistCollaborator> {
    const id = this.collaboratorIdCounter++;
    const now = new Date();
    
    const collaborator: WishlistCollaborator = {
      id,
      wishlistId: collaboratorData.wishlistId,
      userId: collaboratorData.userId,
      role: collaboratorData.role || 'editor',
      addedAt: now,
      addedBy: collaboratorData.addedBy || null,
      lastActive: collaboratorData.lastActive || null
    };
    
    this.wishlistCollaborators.set(id, collaborator);
    return collaborator;
  }
  
  async removeCollaborator(wishlistId: number, userId: number): Promise<boolean> {
    const collaborator = Array.from(this.wishlistCollaborators.values()).find(
      c => c.wishlistId === wishlistId && c.userId === userId
    );
    
    if (!collaborator) return false;
    
    return this.wishlistCollaborators.delete(collaborator.id);
  }
  
  async getCollaborators(wishlistId: number): Promise<WishlistCollaborator[]> {
    return Array.from(this.wishlistCollaborators.values()).filter(
      c => c.wishlistId === wishlistId
    );
  }
  
  async updateCollaboratorRole(wishlistId: number, userId: number, role: string): Promise<WishlistCollaborator | undefined> {
    const collaborator = Array.from(this.wishlistCollaborators.values()).find(
      c => c.wishlistId === wishlistId && c.userId === userId
    );
    
    if (!collaborator) return undefined;
    
    const updatedCollaborator: WishlistCollaborator = {
      ...collaborator,
      role
    };
    
    this.wishlistCollaborators.set(collaborator.id, updatedCollaborator);
    return updatedCollaborator;
  }
  
  async isCollaborator(wishlistId: number, userId: number): Promise<boolean> {
    return Array.from(this.wishlistCollaborators.values()).some(
      c => c.wishlistId === wishlistId && c.userId === userId
    );
  }
  
  async updateCollaboratorActivity(wishlistId: number, userId: number): Promise<boolean> {
    const collaborator = Array.from(this.wishlistCollaborators.values()).find(
      c => c.wishlistId === wishlistId && c.userId === userId
    );
    
    if (!collaborator) return false;
    
    const now = new Date();
    const updatedCollaborator: WishlistCollaborator = {
      ...collaborator,
      lastActive: now
    };
    
    this.wishlistCollaborators.set(collaborator.id, updatedCollaborator);
    return true;
  }

  // Notification methods
  async getNotifications(userId: number, limit?: number): Promise<Notification[]> {
    // Get all notifications for the user, sorted by most recent first
    let notifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Apply limit if specified
    if (limit && limit > 0) {
      notifications = notifications.slice(0, limit);
    }
    
    return notifications;
  }
  
  async getUnreadNotificationCount(userId: number): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.isRead)
      .length;
  }
  
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const now = new Date();
    
    const notification: Notification = {
      id,
      userId: notificationData.userId,
      type: notificationData.type,
      title: notificationData.title,
      content: notificationData.content,
      data: notificationData.data || {},
      createdAt: now,
      isRead: notificationData.isRead || false,
      actionUrl: notificationData.actionUrl || null,
      emailSent: notificationData.emailSent || false,
      emailStatus: notificationData.emailStatus || null
    };
    
    this.notifications.set(id, notification);
    return notification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification: Notification = {
      ...notification,
      isRead: true
    };
    
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    let success = true;
    
    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.isRead);
    
    for (const notification of userNotifications) {
      const updatedNotification: Notification = {
        ...notification,
        isRead: true
      };
      
      this.notifications.set(notification.id, updatedNotification);
    }
    
    return success;
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    return this.notifications.delete(id);
  }

  // Price Alert methods
  private priceAlerts: Map<number, PriceAlert>;
  private priceAlertIdCounter: number;

  async getPriceAlerts(userId: number): Promise<PriceAlert[]> {
    return Array.from(this.priceAlerts.values())
      .filter(alert => alert.userId === userId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getPriceAlertsByItem(itemId: number): Promise<PriceAlert[]> {
    return Array.from(this.priceAlerts.values())
      .filter(alert => alert.itemId === itemId);
  }

  async getPriceAlertsExpiringBefore(date: Date): Promise<PriceAlert[]> {
    return Array.from(this.priceAlerts.values())
      .filter(alert => {
        return alert.expiresAt && new Date(alert.expiresAt) <= date && !alert.triggered;
      });
  }

  async createPriceAlert(alertData: InsertPriceAlert): Promise<PriceAlert> {
    const id = this.priceAlertIdCounter++;
    const now = new Date();

    const alert: PriceAlert = {
      id,
      userId: alertData.userId,
      itemId: alertData.itemId,
      targetPrice: alertData.targetPrice,
      triggered: alertData.triggered || false,
      triggeredAt: alertData.triggeredAt || null,
      createdAt: now,
      expiresAt: alertData.expiresAt || null,
      emailSent: alertData.emailSent || false
    };

    this.priceAlerts.set(id, alert);
    return alert;
  }

  async markPriceAlertTriggered(alertId: number): Promise<boolean> {
    const alert = this.priceAlerts.get(alertId);
    if (!alert) return false;

    const now = new Date();
    const updatedAlert: PriceAlert = {
      ...alert,
      triggered: true,
      triggeredAt: now
    };

    this.priceAlerts.set(alertId, updatedAlert);
    return true;
  }

  async deletePriceAlert(id: number): Promise<boolean> {
    return this.priceAlerts.delete(id);
  }

  async getRecentPriceDrops(userId: number, days: number): Promise<any[]> {
    // This is a simplified implementation
    // In a real database, we would query items with price changes in the last X days
    const userWishlists = await this.getWishlists(userId);
    const wishlistIds = userWishlists.map(w => w.id);
    
    // Get all items from user's wishlists
    const allItems = Array.from(this.wishlistItems.values())
      .filter(item => wishlistIds.includes(item.wishlistId));
    
    // Simulate recent price drops (in a real implementation, this would use priceHistory)
    return allItems.slice(0, 2).map(item => ({
      id: item.id,
      title: item.title,
      oldPrice: parseFloat(item.price) * 1.2,
      newPrice: parseFloat(item.price),
      imageUrl: item.imageUrl,
      productUrl: item.productUrl,
      dropPercentage: 20,
      dropDate: new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000)
    }));
  }
}

// Create and export an instance of DatabaseStorage
export const storage = new DatabaseStorage();
