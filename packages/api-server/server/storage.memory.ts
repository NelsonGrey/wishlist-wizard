import { 
  User, 
  Wishlist, 
  WishlistItem, 
  WishlistCollaborator, 
  Notification
} from '@wishlist-wizard/shared';

/**
 * Simple in-memory storage for development and testing
 * This provides a working storage solution without external dependencies
 */
export class MemoryStorage {
  private users: Map<number, User> = new Map();
  private wishlists: Map<number, Wishlist> = new Map();
  private wishlistItems: Map<number, WishlistItem> = new Map();
  private collaborators: Map<number, WishlistCollaborator> = new Map();
  private notifications: Map<number, Notification> = new Map();
  
  private nextUserId = 1;
  private nextWishlistId = 1;
  private nextItemId = 1;
  private nextCollaboratorId = 1;
  private nextNotificationId = 1;

  constructor() {
    // Add a test user for development
    this.createUser({
      username: 'testuser',
      email: 'test@example.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: 'password'
      displayName: 'Test User',
      avatarUrl: null,
      role: 'user',
      emailVerified: true,
      verificationToken: null,
      verificationExpires: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      active: true,
      twoFactorEnabled: false,
      twoFactorSecret: null
    });
  }
  
  // ===========================
  // USER MANAGEMENT
  // ===========================
  
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): Promise<User> {
    const user: User = {
      id: this.nextUserId++,
      ...userData,
      createdAt: new Date(),
      lastLogin: null
    };
    
    this.users.set(user.id, user);
    return user;
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async searchUsers(searchTerm: string): Promise<User[]> {
    const results: User[] = [];
    const term = searchTerm.toLowerCase();
    
    for (const user of this.users.values()) {
      if (user.username.toLowerCase().includes(term) || 
          user.email.toLowerCase().includes(term) ||
          (user.displayName && user.displayName.toLowerCase().includes(term))) {
        results.push(user);
      }
    }
    
    return results.slice(0, 10); // Limit results
  }
  
  // ===========================
  // WISHLIST MANAGEMENT
  // ===========================
  
  async createWishlist(wishlistData: Omit<Wishlist, 'id' | 'createdAt'>): Promise<Wishlist> {
    const wishlist: Wishlist = {
      id: this.nextWishlistId++,
      ...wishlistData,
      createdAt: new Date()
    };
    
    this.wishlists.set(wishlist.id, wishlist);
    return wishlist;
  }
  
  async getWishlists(userId: number): Promise<Wishlist[]> {
    const userWishlists: Wishlist[] = [];
    
    for (const wishlist of this.wishlists.values()) {
      if (wishlist.userId === userId) {
        userWishlists.push(wishlist);
      }
    }
    
    return userWishlists.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getWishlistById(id: number): Promise<Wishlist | undefined> {
    return this.wishlists.get(id);
  }
  
  async updateWishlist(id: number, updates: Partial<Wishlist>): Promise<Wishlist | undefined> {
    const wishlist = this.wishlists.get(id);
    if (!wishlist) return undefined;
    
    const updatedWishlist = { ...wishlist, ...updates };
    this.wishlists.set(id, updatedWishlist);
    return updatedWishlist;
  }
  
  async deleteWishlist(id: number): Promise<boolean> {
    // Delete all items in the wishlist first
    for (const [itemId, item] of this.wishlistItems.entries()) {
      if (item.wishlistId === id) {
        this.wishlistItems.delete(itemId);
      }
    }
    
    // Delete all collaborators
    for (const [collabId, collab] of this.collaborators.entries()) {
      if (collab.wishlistId === id) {
        this.collaborators.delete(collabId);
      }
    }
    
    // Delete the wishlist
    return this.wishlists.delete(id);
  }
  
  async getCollaborativeWishlists(userId: number): Promise<Wishlist[]> {
    const collaborativeWishlists: Wishlist[] = [];
    
    // Find wishlists where user is a collaborator
    for (const collaborator of this.collaborators.values()) {
      if (collaborator.userId === userId) {
        const wishlist = this.wishlists.get(collaborator.wishlistId);
        if (wishlist) {
          collaborativeWishlists.push(wishlist);
        }
      }
    }
    
    return collaborativeWishlists.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  // ===========================
  // WISHLIST ITEMS MANAGEMENT
  // ===========================
  
  async createWishlistItem(itemData: Omit<WishlistItem, 'id' | 'createdAt'>): Promise<WishlistItem> {
    // Generate realistic mock data for missing fields
    const item: WishlistItem = {
      id: this.nextItemId++,
      ...itemData,
      createdAt: new Date(),
      // Set defaults for optional fields that might not be provided
      brand: itemData.brand || null,
      description: itemData.description || null,
      category: itemData.category || null,
      availability: itemData.availability || 'In Stock',
      rating: itemData.rating || null,
      reviewCount: itemData.reviewCount || null,
      priceHistory: itemData.priceHistory || [],
      metadata: itemData.metadata || {},
      popularity: itemData.popularity || 0,
      reservedAt: itemData.reservedAt || null,
      numericPrice: itemData.numericPrice || (itemData.price ? itemData.price.replace(/[^0-9.]/g, '') : null),
      productIdentifier: itemData.productIdentifier || null
    };
    
    this.wishlistItems.set(item.id, item);
    return item;
  }
  
  async getWishlistItems(wishlistId: number): Promise<WishlistItem[]> {
    const items: WishlistItem[] = [];
    
    for (const item of this.wishlistItems.values()) {
      if (item.wishlistId === wishlistId) {
        items.push(item);
      }
    }
    
    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getWishlistItem(id: number): Promise<WishlistItem | undefined> {
    return this.wishlistItems.get(id);
  }
  
  async updateWishlistItem(id: number, updates: Partial<WishlistItem>): Promise<WishlistItem | undefined> {
    const item = this.wishlistItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { 
      ...item, 
      ...updates
    };
    this.wishlistItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async deleteWishlistItem(id: number): Promise<boolean> {
    return this.wishlistItems.delete(id);
  }
  
  // ===========================
  // COLLABORATORS MANAGEMENT
  // ===========================
  
  async addCollaborator(collaboratorData: Omit<WishlistCollaborator, 'id' | 'addedAt'>): Promise<WishlistCollaborator> {
    const collaborator: WishlistCollaborator = {
      id: this.nextCollaboratorId++,
      ...collaboratorData,
      addedAt: new Date(),
      lastActive: null
    };
    
    this.collaborators.set(collaborator.id, collaborator);
    return collaborator;
  }
  
  async getCollaborators(wishlistId: number): Promise<WishlistCollaborator[]> {
    const wishlistCollaborators: WishlistCollaborator[] = [];
    
    for (const collaborator of this.collaborators.values()) {
      if (collaborator.wishlistId === wishlistId) {
        wishlistCollaborators.push(collaborator);
      }
    }
    
    return wishlistCollaborators;
  }
  
  async isCollaborator(wishlistId: number, userId: number): Promise<boolean> {
    for (const collaborator of this.collaborators.values()) {
      if (collaborator.wishlistId === wishlistId && collaborator.userId === userId) {
        return true;
      }
    }
    return false;
  }
  
  async removeCollaborator(wishlistId: number, userId: number): Promise<boolean> {
    for (const [id, collaborator] of this.collaborators.entries()) {
      if (collaborator.wishlistId === wishlistId && collaborator.userId === userId) {
        this.collaborators.delete(id);
        return true;
      }
    }
    return false;
  }
  
  // ===========================
  // NOTIFICATIONS MANAGEMENT
  // ===========================
  
  async createNotification(notificationData: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const notification: Notification = {
      id: this.nextNotificationId++,
      ...notificationData,
      createdAt: new Date(),
      relatedEntityId: notificationData.relatedEntityId || null,
      relatedEntityType: notificationData.relatedEntityType || null,
      emailSent: notificationData.emailSent || false,
      emailStatus: notificationData.emailStatus || null,
      data: notificationData.data || {}
    };
    
    this.notifications.set(notification.id, notification);
    return notification;
  }
  
  async getNotifications(userId: number): Promise<Notification[]> {
    const userNotifications: Notification[] = [];
    
    for (const notification of this.notifications.values()) {
      if (notification.userId === userId) {
        userNotifications.push(notification);
      }
    }
    
    return userNotifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 50); // Limit to 50 most recent
  }
  
  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    return this.notifications.delete(id);
  }
}

// Export singleton instance
export const memoryStorage = new MemoryStorage();