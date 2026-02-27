import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseApp, firebaseAuth, firebaseFirestore } from './firebase';
import { apiRequest } from './queryClient';

function getDb() {
  if (firebaseFirestore) {
    return firebaseFirestore;
  }

  if (!firebaseApp) {
    throw new Error('Firebase app is not initialized');
  }

  return getFirestore(firebaseApp);
}

function getAuthService() {
  if (firebaseAuth) {
    return firebaseAuth;
  }

  if (!firebaseApp) {
    throw new Error('Firebase app is not initialized');
  }

  return getAuth(firebaseApp);
}

export interface Wishlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  isCollaborative: boolean;
  shareId?: string;
  beneficiaryId?: string;
  occasion?: string;
  occasionDate?: Date;
  recurrence?: 'none' | 'yearly' | 'monthly';
  reminderDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WishlistItem {
  id: string;
  wishlistId: string;
  title: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  productUrl?: string;
  store?: string;
  priority: 'low' | 'medium' | 'high';
  reservedByUserId?: string;
  purchasedByUserId?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  actionUrl?: string;
  data?: unknown;
  createdAt: Date;
}

/**
 * Firebase Wishlist Service
 * Direct Firestore operations replacing HTTP API calls
 */
export class FirebaseWishlistService {
  
  /**
   * Get current user's wishlists with real-time updates
   */
  static subscribeToUserWishlists(
    userId: string, 
    callback: (wishlists: Wishlist[]) => void
  ): () => void {
    const q = query(
      collection(getDb(), 'wishlists'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const wishlists = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        occasionDate: doc.data().occasionDate?.toDate()
      })) as Wishlist[];
      
      callback(wishlists);
    });
  }
  
  /**
   * Get user's wishlists (one-time fetch)
   */
  static async getUserWishlists(userId: string): Promise<Wishlist[]> {
    const q = query(
      collection(getDb(), 'wishlists'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      occasionDate: doc.data().occasionDate?.toDate()
    })) as Wishlist[];
  }
  
  /**
   * Get a specific wishlist by ID
   */
  static async getWishlistById(wishlistId: string): Promise<Wishlist | null> {
    const docRef = doc(getDb(), 'wishlists', wishlistId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        occasionDate: data.occasionDate?.toDate()
      } as Wishlist;
    }
    
    return null;
  }
  
  /**
   * Create a new wishlist
   */
  static async createWishlist(
    userId: string, 
    wishlistData: Omit<Wishlist, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Wishlist> {
    const now = Timestamp.now();
    const docData = {
      ...wishlistData,
      userId,
      createdAt: now,
      updatedAt: now,
      occasionDate: wishlistData.occasionDate ? Timestamp.fromDate(wishlistData.occasionDate) : null
    };
    
    const docRef = await addDoc(collection(getDb(), 'wishlists'), docData);
    
    return {
      id: docRef.id,
      ...wishlistData,
      userId,
      createdAt: now.toDate(),
      updatedAt: now.toDate()
    };
  }
  
  /**
   * Update a wishlist
   */
  static async updateWishlist(
    wishlistId: string, 
    updates: Partial<Omit<Wishlist, 'id' | 'createdAt'>>
  ): Promise<void> {
    const docRef = doc(getDb(), 'wishlists', wishlistId);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now(),
      occasionDate: updates.occasionDate ? Timestamp.fromDate(updates.occasionDate) : undefined
    };
    
    await updateDoc(docRef, updateData);
  }
  
  /**
   * Delete a wishlist
   */
  static async deleteWishlist(wishlistId: string): Promise<void> {
    // Delete wishlist items first
    const itemsQuery = query(
      collection(getDb(), 'wishlistItems'),
      where('wishlistId', '==', wishlistId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);
    
    // Delete all items
    const deletePromises = itemsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Delete the wishlist
    await deleteDoc(doc(getDb(), 'wishlists', wishlistId));
  }
  
  /**
   * Get items in a wishlist with real-time updates
   */
  static subscribeToWishlistItems(
    wishlistId: string,
    callback: (items: WishlistItem[]) => void
  ): () => void {
    const q = query(
      collection(getDb(), 'wishlistItems'),
      where('wishlistId', '==', wishlistId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as WishlistItem[];
      
      callback(items);
    });
  }
  
  /**
   * Get wishlist items (one-time fetch)
   */
  static async getWishlistItems(wishlistId: string): Promise<WishlistItem[]> {
    const q = query(
      collection(getDb(), 'wishlistItems'),
      where('wishlistId', '==', wishlistId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as WishlistItem[];
  }
  
  /**
   * Add an item to a wishlist
   */
  static async addWishlistItem(
    wishlistId: string,
    itemData: Omit<WishlistItem, 'id' | 'wishlistId' | 'createdAt' | 'updatedAt'>
  ): Promise<WishlistItem> {
    const now = Timestamp.now();
    const docData = {
      ...itemData,
      wishlistId,
      createdAt: now,
      updatedAt: now
    };
    
    const docRef = await addDoc(collection(getDb(), 'wishlistItems'), docData);
    
    return {
      id: docRef.id,
      ...itemData,
      wishlistId,
      createdAt: now.toDate(),
      updatedAt: now.toDate()
    };
  }
  
  /**
   * Update a wishlist item
   */
  static async updateWishlistItem(
    itemId: string,
    updates: Partial<Omit<WishlistItem, 'id' | 'createdAt'>>
  ): Promise<void> {
    const docRef = doc(getDb(), 'wishlistItems', itemId);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(docRef, updateData);
  }
  
  /**
   * Delete a wishlist item
   */
  static async deleteWishlistItem(itemId: string): Promise<void> {
    await deleteDoc(doc(getDb(), 'wishlistItems', itemId));
  }
  
  /**
   * Reserve an item
   */
  static async reserveItem(itemId: string, userId: string): Promise<void> {
    await apiRequest(`/api/items/${itemId}/reserve`, {
      method: 'POST',
      body: { userId },
      useFirebaseFunctions: true,
    });
  }
  
  /**
   * Mark an item as purchased
   */
  static async markItemPurchased(itemId: string, userId: string): Promise<void> {
    await apiRequest(`/api/items/${itemId}/purchase`, {
      method: 'POST',
      body: { userId },
      useFirebaseFunctions: true,
    });
  }
}

/**
 * Firebase Notification Service
 * Direct Firestore operations for notifications
 */
export class FirebaseNotificationService {
  
  /**
   * Get user notifications with real-time updates
   */
  static subscribeToUserNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void,
    limitCount: number = 50
  ): () => void {
    const q = query(
      collection(getDb(), 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as Notification[];
      
      callback(notifications);
    });
  }
  
  /**
   * Get user notifications (one-time fetch) 
   */
  static async getUserNotifications(userId: string, limitCount: number = 50): Promise<Notification[]> {
    const q = query(
      collection(getDb(), 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    })) as Notification[];
  }
  
  /**
   * Mark a notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    const docRef = doc(getDb(), 'notifications', notificationId);
    await updateDoc(docRef, {
      isRead: true
    });
  }
  
  /**
   * Mark all user notifications as read
   */
  static async markAllNotificationsAsRead(userId: string): Promise<void> {
    const q = query(
      collection(getDb(), 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { isRead: true })
    );
    
    await Promise.all(updatePromises);
  }
  
  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    await deleteDoc(doc(getDb(), 'notifications', notificationId));
  }
  
  /**
   * Get unread notification count
   */
  static async getUnreadNotificationCount(userId: string): Promise<number> {
    const q = query(
      collection(getDb(), 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  }
}

/**
 * Get current authenticated user ID
 */
export function getCurrentUserId(): string | null {
  return getAuthService().currentUser?.uid || null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthService().currentUser;
}