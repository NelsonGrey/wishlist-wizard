import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  DocumentReference,
  QuerySnapshot,
  CollectionReference
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { v4 as uuidv4 } from 'uuid';
import { 
  User, 
  InsertUser,
  UpdateUser,
  Wishlist, 
  InsertWishlist,
  WishlistItem, 
  InsertWishlistItem,
  WishlistCollaborator, 
  InsertWishlistCollaborator,
  Notification,
  InsertNotification,
  Beneficiary,
  InsertBeneficiary,
  PriceAlert,
  InsertPriceAlert
} from '@wishlist-wizard/shared';
import { IStorage } from './storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

/**
 * Firestore-based storage implementation for Wishlist Wizard
 */
export class FirestoreStorage implements IStorage {
  
  // ===========================
  // USER MANAGEMENT
  // ===========================
  
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const userDoc = {
      ...userData,
      createdAt: Timestamp.now(),
      lastLogin: null,
      emailVerified: false,
      active: true,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      verificationToken: null,
      passwordResetToken: null,
      passwordResetExpires: null
    };
    
    const docRef = await addDoc(collection(db, 'users'), userDoc);
    return {
      id: parseInt(docRef.id),
      ...userDoc,
      createdAt: userDoc.createdAt.toDate(),
      lastLogin: null,
      passwordResetExpires: null
    } as User;
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const docRef = doc(db, 'users', id.toString());
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return undefined;
    }
    
    const data = docSnap.data();
    return {
      id: parseInt(docSnap.id),
      ...data,
      createdAt: data.createdAt?.toDate(),
      lastLogin: data.lastLogin?.toDate(),
      passwordResetExpires: data.passwordResetExpires?.toDate()
    } as User;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const q = query(
      collection(db, 'users'), 
      where('username', '==', username),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return undefined;
    }
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: parseInt(doc.id),
      ...data,
      createdAt: data.createdAt?.toDate(),
      lastLogin: data.lastLogin?.toDate(),
      passwordResetExpires: data.passwordResetExpires?.toDate()
    } as User;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const q = query(
      collection(db, 'users'), 
      where('email', '==', email),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return undefined;
    }
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: parseInt(doc.id),
      ...data,
      createdAt: data.createdAt?.toDate(),
      lastLogin: data.lastLogin?.toDate(),
      passwordResetExpires: data.passwordResetExpires?.toDate()
    } as User;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const docRef = doc(db, 'users', id.toString());
    
    // Convert Date objects to Firestore Timestamps
    const firestoreUpdates: any = { ...updates };
    if (firestoreUpdates.lastLogin instanceof Date) {
      firestoreUpdates.lastLogin = Timestamp.fromDate(firestoreUpdates.lastLogin);
    }
    if (firestoreUpdates.passwordResetExpires instanceof Date) {
      firestoreUpdates.passwordResetExpires = Timestamp.fromDate(firestoreUpdates.passwordResetExpires);
    }
    
    await updateDoc(docRef, firestoreUpdates);
    return this.getUser(id);
  }
  
  async searchUsers(searchTerm: string): Promise<User[]> {
    // Firestore doesn't support full-text search natively
    // We'll search by username and email separately
    const usernameQuery = query(
      collection(db, 'users'),
      where('username', '>=', searchTerm),
      where('username', '<=', searchTerm + '\uf8ff'),
      limit(10)
    );
    
    const emailQuery = query(
      collection(db, 'users'),
      where('email', '>=', searchTerm),
      where('email', '<=', searchTerm + '\uf8ff'),
      limit(10)
    );
    
    const [usernameResults, emailResults] = await Promise.all([
      getDocs(usernameQuery),
      getDocs(emailQuery)
    ]);
    
    const users: User[] = [];
    const seenIds = new Set<string>();
    
    // Process username results
    usernameResults.forEach(doc => {
      if (!seenIds.has(doc.id)) {
        seenIds.add(doc.id);
        const data = doc.data();
        users.push({
          id: parseInt(doc.id),
          ...data,
          createdAt: data.createdAt?.toDate(),
          lastLogin: data.lastLogin?.toDate(),
          passwordResetExpires: data.passwordResetExpires?.toDate()
        } as User);
      }
    });
    
    // Process email results
    emailResults.forEach(doc => {
      if (!seenIds.has(doc.id)) {
        seenIds.add(doc.id);
        const data = doc.data();
        users.push({
          id: parseInt(doc.id),
          ...data,
          createdAt: data.createdAt?.toDate(),
          lastLogin: data.lastLogin?.toDate(),
          passwordResetExpires: data.passwordResetExpires?.toDate()
        } as User);
      }
    });
    
    return users;
  }
  
  // ===========================
  // WISHLIST MANAGEMENT
  // ===========================
  
  async createWishlist(wishlistData: Omit<Wishlist, 'id' | 'createdAt' | 'updatedAt'>): Promise<Wishlist> {
    const wishlistDoc = {
      ...wishlistData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'wishlists'), wishlistDoc);
    return {
      id: parseInt(docRef.id),
      ...wishlistDoc,
      createdAt: wishlistDoc.createdAt.toDate(),
      updatedAt: wishlistDoc.updatedAt.toDate()
    } as Wishlist;
  }
  
  async getWishlists(userId: number): Promise<Wishlist[]> {
    const q = query(
      collection(db, 'wishlists'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const wishlists: Wishlist[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      wishlists.push({
        id: parseInt(doc.id),
        name: data.name,
        userId: data.userId,
        beneficiaryId: data.beneficiaryId,
        shareId: data.shareId,
        isPublic: data.isPublic,
        isCollaborative: data.isCollaborative,
        occasion: data.occasion,
        occasionDate: data.occasionDate?.toDate() || null,
        description: data.description,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as Wishlist);
    });
    
    return wishlists;
  }
  
  async getWishlistById(id: number): Promise<Wishlist | undefined> {
    const docRef = doc(db, 'wishlists', id.toString());
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return undefined;
    }
    
    const data = docSnap.data();
    return {
      id: parseInt(docSnap.id),
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as Wishlist;
  }
  
  async updateWishlist(id: number, updates: Partial<Wishlist>): Promise<Wishlist | undefined> {
    const docRef = doc(db, 'wishlists', id.toString());
    
    const firestoreUpdates = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    
    await updateDoc(docRef, firestoreUpdates);
    return this.getWishlistById(id);
  }
  
  async deleteWishlist(id: number): Promise<boolean> {
    try {
      // Delete all items in the wishlist first
      const itemsQuery = query(
        collection(db, 'wishlistItems'),
        where('wishlistId', '==', id)
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      
      const deletePromises = itemsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Delete the wishlist
      await deleteDoc(doc(db, 'wishlists', id.toString()));
      return true;
    } catch (error) {
      console.error('Error deleting wishlist:', error);
      return false;
    }
  }
  
  async getCollaborativeWishlists(userId: number): Promise<Wishlist[]> {
    // Get wishlists where user is a collaborator
    const collaboratorsQuery = query(
      collection(db, 'collaborators'),
      where('userId', '==', userId)
    );
    
    const collaboratorsSnapshot = await getDocs(collaboratorsQuery);
    const wishlistIds = collaboratorsSnapshot.docs.map(doc => doc.data().wishlistId);
    
    if (wishlistIds.length === 0) {
      return [];
    }
    
    // Get the actual wishlists (Firestore doesn't support 'in' queries with more than 10 items)
    const wishlists: Wishlist[] = [];
    const chunks = this.chunkArray(wishlistIds, 10);
    
    for (const chunk of chunks) {
      const wishlistQuery = query(
        collection(db, 'wishlists'),
        where('__name__', 'in', chunk.map(id => id.toString()))
      );
      
      const wishlistSnapshot = await getDocs(wishlistQuery);
      wishlistSnapshot.forEach(doc => {
        const data = doc.data();
        wishlists.push({
          id: parseInt(doc.id),
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as Wishlist);
      });
    }
    
    return wishlists;
  }
  
  // ===========================
  // WISHLIST ITEMS MANAGEMENT
  // ===========================
  
  async createWishlistItem(itemData: Omit<WishlistItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<WishlistItem> {
    const itemDoc = {
      ...itemData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      purchasedAt: itemData.purchasedAt ? Timestamp.fromDate(itemData.purchasedAt) : null
    };
    
    const docRef = await addDoc(collection(db, 'wishlistItems'), itemDoc);
    
    // Update wishlist's updatedAt timestamp
    const wishlistRef = doc(db, 'wishlists', itemData.wishlistId.toString());
    await updateDoc(wishlistRef, { updatedAt: Timestamp.now() });
    
    return {
      id: parseInt(docRef.id),
      ...itemDoc,
      createdAt: itemDoc.createdAt.toDate(),
      updatedAt: itemDoc.updatedAt.toDate(),
      purchasedAt: itemDoc.purchasedAt?.toDate() || null
    } as WishlistItem;
  }
  
  async getWishlistItems(wishlistId: number): Promise<WishlistItem[]> {
    const q = query(
      collection(db, 'wishlistItems'),
      where('wishlistId', '==', wishlistId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const items: WishlistItem[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      items.push({
        id: parseInt(doc.id),
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        purchasedAt: data.purchasedAt?.toDate() || null
      } as WishlistItem);
    });
    
    return items;
  }
  
  async getWishlistItem(id: number): Promise<WishlistItem | undefined> {
    const docRef = doc(db, 'wishlistItems', id.toString());
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return undefined;
    }
    
    const data = docSnap.data();
    return {
      id: parseInt(docSnap.id),
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      purchasedAt: data.purchasedAt?.toDate() || null
    } as WishlistItem;
  }
  
  async updateWishlistItem(id: number, updates: Partial<WishlistItem>): Promise<WishlistItem | undefined> {
    const docRef = doc(db, 'wishlistItems', id.toString());
    
    const firestoreUpdates: any = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    
    if (firestoreUpdates.purchasedAt instanceof Date) {
      firestoreUpdates.purchasedAt = Timestamp.fromDate(firestoreUpdates.purchasedAt);
    }
    
    await updateDoc(docRef, firestoreUpdates);
    return this.getWishlistItem(id);
  }
  
  async deleteWishlistItem(id: number): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'wishlistItems', id.toString()));
      return true;
    } catch (error) {
      console.error('Error deleting wishlist item:', error);
      return false;
    }
  }
  
  // ===========================
  // COLLABORATORS MANAGEMENT
  // ===========================
  
  async addCollaborator(collaboratorData: Omit<WishlistCollaborator, 'id' | 'addedAt'>): Promise<WishlistCollaborator> {
    const collaboratorDoc = {
      ...collaboratorData,
      addedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'collaborators'), collaboratorDoc);
    return {
      id: parseInt(docRef.id),
      ...collaboratorDoc,
      addedAt: collaboratorDoc.addedAt.toDate()
    } as WishlistCollaborator;
  }
  
  async getCollaborators(wishlistId: number): Promise<WishlistCollaborator[]> {
    const q = query(
      collection(db, 'collaborators'),
      where('wishlistId', '==', wishlistId)
    );
    
    const querySnapshot = await getDocs(q);
    const collaborators: WishlistCollaborator[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      collaborators.push({
        id: parseInt(doc.id),
        ...data,
        addedAt: data.addedAt?.toDate()
      } as WishlistCollaborator);
    });
    
    return collaborators;
  }
  
  async isCollaborator(wishlistId: number, userId: number): Promise<boolean> {
    const q = query(
      collection(db, 'collaborators'),
      where('wishlistId', '==', wishlistId),
      where('userId', '==', userId),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  }
  
  async removeCollaborator(wishlistId: number, userId: number): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'collaborators'),
        where('wishlistId', '==', wishlistId),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      return true;
    } catch (error) {
      console.error('Error removing collaborator:', error);
      return false;
    }
  }
  
  // ===========================
  // NOTIFICATIONS MANAGEMENT
  // ===========================
  
  async createNotification(notificationData: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const notificationDoc = {
      ...notificationData,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'notifications'), notificationDoc);
    return {
      id: parseInt(docRef.id),
      ...notificationDoc,
      createdAt: notificationDoc.createdAt.toDate()
    } as Notification;
  }
  
  async getNotifications(userId: number): Promise<Notification[]> {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const querySnapshot = await getDocs(q);
    const notifications: Notification[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        id: parseInt(doc.id),
        ...data,
        createdAt: data.createdAt?.toDate()
      } as Notification);
    });
    
    return notifications;
  }
  
  async markNotificationAsRead(id: number): Promise<boolean> {
    try {
      const docRef = doc(db, 'notifications', id.toString());
      await updateDoc(docRef, { isRead: true });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }
  
  async deleteNotification(id: number): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'notifications', id.toString()));
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }
  
  // ===========================
  // UTILITY METHODS
  // ===========================
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Export singleton instance
export const firestoreStorage = new FirestoreStorage();