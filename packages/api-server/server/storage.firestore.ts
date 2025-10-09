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
  InsertPriceAlert,
  PrivacySettings,
  InsertPrivacySettings
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
  
  async getUser(id: number): Promise<User | undefined> {
    const docRef = doc(db, 'users', id.toString());
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return undefined;
    }
    
    const data = docSnap.data();
    return {
      id: parseInt(docSnap.id),
      username: data.username,
      email: data.email,
      password: data.password,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      role: data.role,
      createdAt: data.createdAt?.toDate(),
      lastLogin: data.lastLogin?.toDate() || null,
      emailVerified: data.emailVerified,
      verificationToken: data.verificationToken,
      verificationExpires: data.verificationExpires?.toDate() || null,
      passwordResetToken: data.passwordResetToken,
      passwordResetExpires: data.passwordResetExpires?.toDate() || null,
      active: data.active,
      twoFactorEnabled: data.twoFactorEnabled,
      twoFactorSecret: data.twoFactorSecret
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
      username: data.username,
      email: data.email,
      password: data.password,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      role: data.role,
      createdAt: data.createdAt?.toDate(),
      lastLogin: data.lastLogin?.toDate() || null,
      emailVerified: data.emailVerified,
      verificationToken: data.verificationToken,
      verificationExpires: data.verificationExpires?.toDate() || null,
      passwordResetToken: data.passwordResetToken,
      passwordResetExpires: data.passwordResetExpires?.toDate() || null,
      active: data.active,
      twoFactorEnabled: data.twoFactorEnabled,
      twoFactorSecret: data.twoFactorSecret
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
      username: data.username,
      email: data.email,
      password: data.password,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      role: data.role,
      createdAt: data.createdAt?.toDate(),
      lastLogin: data.lastLogin?.toDate() || null,
      emailVerified: data.emailVerified,
      verificationToken: data.verificationToken,
      verificationExpires: data.verificationExpires?.toDate() || null,
      passwordResetToken: data.passwordResetToken,
      passwordResetExpires: data.passwordResetExpires?.toDate() || null,
      active: data.active,
      twoFactorEnabled: data.twoFactorEnabled,
      twoFactorSecret: data.twoFactorSecret
    } as User;
  }
  
  async getUserByVerificationToken(token: string): Promise<User[]> {
    const q = query(
      collection(db, 'users'), 
      where('verificationToken', '==', token)
    );
    const querySnapshot = await getDocs(q);
    
    const users: User[] = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        id: parseInt(doc.id),
        username: data.username,
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        role: data.role,
        createdAt: data.createdAt?.toDate(),
        lastLogin: data.lastLogin?.toDate() || null,
        emailVerified: data.emailVerified,
        verificationToken: data.verificationToken,
        verificationExpires: data.verificationExpires?.toDate() || null,
        passwordResetToken: data.passwordResetToken,
        passwordResetExpires: data.passwordResetExpires?.toDate() || null,
        active: data.active,
        twoFactorEnabled: data.twoFactorEnabled,
        twoFactorSecret: data.twoFactorSecret
      } as User);
    });
    
    return users;
  }
  
  async getUserByResetToken(token: string): Promise<User[]> {
    const q = query(
      collection(db, 'users'), 
      where('passwordResetToken', '==', token)
    );
    const querySnapshot = await getDocs(q);
    
    const users: User[] = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        id: parseInt(doc.id),
        username: data.username,
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        role: data.role,
        createdAt: data.createdAt?.toDate(),
        lastLogin: data.lastLogin?.toDate() || null,
        emailVerified: data.emailVerified,
        verificationToken: data.verificationToken,
        verificationExpires: data.verificationExpires?.toDate() || null,
        passwordResetToken: data.passwordResetToken,
        passwordResetExpires: data.passwordResetExpires?.toDate() || null,
        active: data.active,
        twoFactorEnabled: data.twoFactorEnabled,
        twoFactorSecret: data.twoFactorSecret
      } as User);
    });
    
    return users;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const now = Timestamp.now();
    const userDoc = {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName || userData.username,
      avatarUrl: userData.avatarUrl || null,
      role: userData.role || 'user',
      createdAt: now,
      lastLogin: null,
      emailVerified: userData.emailVerified || false,
      verificationToken: userData.verificationToken || null,
      verificationExpires: userData.verificationExpires ? Timestamp.fromDate(userData.verificationExpires) : null,
      passwordResetToken: userData.passwordResetToken || null,
      passwordResetExpires: userData.passwordResetExpires ? Timestamp.fromDate(userData.passwordResetExpires) : null,
      active: userData.active ?? true,
      twoFactorEnabled: userData.twoFactorEnabled || false,
      twoFactorSecret: userData.twoFactorSecret || null
    };
    
    const docRef = await addDoc(collection(db, 'users'), userDoc);
    return {
      id: parseInt(docRef.id),
      username: userDoc.username,
      email: userDoc.email,
      password: userDoc.password,
      displayName: userDoc.displayName,
      avatarUrl: userDoc.avatarUrl,
      role: userDoc.role,
      createdAt: now.toDate(),
      lastLogin: null,
      emailVerified: userDoc.emailVerified,
      verificationToken: userDoc.verificationToken,
      verificationExpires: userDoc.verificationExpires?.toDate() || null,
      passwordResetToken: userDoc.passwordResetToken,
      passwordResetExpires: userDoc.passwordResetExpires?.toDate() || null,
      active: userDoc.active,
      twoFactorEnabled: userDoc.twoFactorEnabled,
      twoFactorSecret: userDoc.twoFactorSecret
    } as User;
  }
  
  async updateUser(id: number, userData: Partial<UpdateUser>): Promise<User | undefined> {
    const docRef = doc(db, 'users', id.toString());
    
    // Convert Date objects to Firestore Timestamps
    const firestoreUpdates: any = { ...userData };
    if (firestoreUpdates.lastLogin instanceof Date) {
      firestoreUpdates.lastLogin = Timestamp.fromDate(firestoreUpdates.lastLogin);
    }
    if (firestoreUpdates.verificationExpires instanceof Date) {
      firestoreUpdates.verificationExpires = Timestamp.fromDate(firestoreUpdates.verificationExpires);
    }
    if (firestoreUpdates.passwordResetExpires instanceof Date) {
      firestoreUpdates.passwordResetExpires = Timestamp.fromDate(firestoreUpdates.passwordResetExpires);
    }
    
    await updateDoc(docRef, firestoreUpdates);
    return this.getUser(id);
  }

  // Firebase-compatible user search
  async searchUsers(queryStr: string, maxResults = 10): Promise<Array<{id: number, username: string, email: string, displayName: string | null, avatarUrl: string | null}>> {
    try {
      // Note: Firestore doesn't support case-insensitive text search natively
      // For production, consider using Firebase Extensions like Search with Algolia
      // This is a simplified implementation that searches by exact prefix matches
      
      const usersRef = collection(db, 'users');
      const results: Array<{id: number, username: string, email: string, displayName: string | null, avatarUrl: string | null}> = [];
      
      // Search by username prefix
      const usernameQuery = query(
        usersRef,
        where('username', '>=', queryStr),
        where('username', '<=', queryStr + '\uf8ff'),
        orderBy('username'),
        limit(maxResults)
      );
      
      const usernameSnapshot = await getDocs(usernameQuery);
      usernameSnapshot.forEach(doc => {
        const data = doc.data();
        results.push({
          id: parseInt(doc.id),
          username: data.username,
          email: data.email,
          displayName: data.displayName || null,
          avatarUrl: data.avatarUrl || null
        });
      });
      
      // If we need more results, search by email prefix
      if (results.length < maxResults) {
        const emailQuery = query(
          usersRef,
          where('email', '>=', queryStr),
          where('email', '<=', queryStr + '\uf8ff'),
          orderBy('email'),
          limit(maxResults - results.length)
        );
        
        const emailSnapshot = await getDocs(emailQuery);
        const existingIds = new Set(results.map(r => r.id));
        
        emailSnapshot.forEach(doc => {
          const id = parseInt(doc.id);
          if (!existingIds.has(id)) {
            const data = doc.data();
            results.push({
              id,
              username: data.username,
              email: data.email,
              displayName: data.displayName || null,
              avatarUrl: data.avatarUrl || null
            });
          }
        });
      }
      
      return results.slice(0, maxResults);
    } catch (error) {
      console.error('Error searching users in Firestore:', error);
      return [];
    }
  }

  // ===========================
  // BENEFICIARY MANAGEMENT
  // ===========================
  
  async getBeneficiaries(ownerId: number): Promise<Beneficiary[]> {
    const q = query(
      collection(db, 'beneficiaries'),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const beneficiaries: Beneficiary[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      beneficiaries.push({
        id: parseInt(doc.id),
        name: data.name,
        ownerId: data.ownerId,
        relationship: data.relationship,
        birthdate: data.birthdate?.toDate() || null,
        notes: data.notes,
        createdAt: data.createdAt?.toDate()
      } as Beneficiary);
    });
    
    return beneficiaries;
  }
  
  async getBeneficiary(id: number): Promise<Beneficiary | undefined> {
    const docRef = doc(db, 'beneficiaries', id.toString());
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return undefined;
    }
    
    const data = docSnap.data();
    return {
      id: parseInt(docSnap.id),
      name: data.name,
      ownerId: data.ownerId,
      relationship: data.relationship,
      birthdate: data.birthdate?.toDate() || null,
      notes: data.notes,
      createdAt: data.createdAt?.toDate()
    } as Beneficiary;
  }
  
  async createBeneficiary(beneficiaryData: InsertBeneficiary): Promise<Beneficiary> {
    const now = Timestamp.now();
    const beneficiaryDoc = {
      name: beneficiaryData.name,
      ownerId: beneficiaryData.ownerId,
      relationship: beneficiaryData.relationship || null,
      birthdate: beneficiaryData.birthdate ? Timestamp.fromDate(beneficiaryData.birthdate) : null,
      notes: beneficiaryData.notes || null,
      createdAt: now
    };
    
    const docRef = await addDoc(collection(db, 'beneficiaries'), beneficiaryDoc);
    return {
      id: parseInt(docRef.id),
      name: beneficiaryDoc.name,
      ownerId: beneficiaryDoc.ownerId,
      relationship: beneficiaryDoc.relationship,
      birthdate: beneficiaryDoc.birthdate?.toDate() || null,
      notes: beneficiaryDoc.notes,
      createdAt: now.toDate()
    } as Beneficiary;
  }
  
  async updateBeneficiary(id: number, data: Partial<InsertBeneficiary>): Promise<Beneficiary | undefined> {
    const docRef = doc(db, 'beneficiaries', id.toString());
    
    const firestoreUpdates: any = { ...data };
    if (firestoreUpdates.birthdate instanceof Date) {
      firestoreUpdates.birthdate = Timestamp.fromDate(firestoreUpdates.birthdate);
    }
    
    await updateDoc(docRef, firestoreUpdates);
    return this.getBeneficiary(id);
  }
  
  async deleteBeneficiary(id: number): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'beneficiaries', id.toString()));
      return true;
    } catch (error) {
      console.error('Error deleting beneficiary:', error);
      return false;
    }
  }

  // ===========================
  // WISHLIST MANAGEMENT
  // ===========================
  
  async getWishlists(userId: number): Promise<Wishlist[]> {
    const q = query(
      collection(db, 'wishlists'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
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
        createdAt: data.createdAt?.toDate()
      } as Wishlist);
    });
    
    return wishlists;
  }
  
  async getWishlistsByBeneficiary(beneficiaryId: number): Promise<Wishlist[]> {
    const q = query(
      collection(db, 'wishlists'),
      where('beneficiaryId', '==', beneficiaryId),
      orderBy('createdAt', 'desc')
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
        createdAt: data.createdAt?.toDate()
      } as Wishlist);
    });
    
    return wishlists;
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
          name: data.name,
          userId: data.userId,
          beneficiaryId: data.beneficiaryId,
          shareId: data.shareId,
          isPublic: data.isPublic,
          isCollaborative: data.isCollaborative,
          occasion: data.occasion,
          occasionDate: data.occasionDate?.toDate() || null,
          description: data.description,
          createdAt: data.createdAt?.toDate()
        } as Wishlist);
      });
    }
    
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
      name: data.name,
      userId: data.userId,
      beneficiaryId: data.beneficiaryId,
      shareId: data.shareId,
      isPublic: data.isPublic,
      isCollaborative: data.isCollaborative,
      occasion: data.occasion,
      occasionDate: data.occasionDate?.toDate() || null,
      description: data.description,
      createdAt: data.createdAt?.toDate()
    } as Wishlist;
  }
  
  async getWishlistByShareId(shareId: string): Promise<Wishlist | undefined> {
    const q = query(
      collection(db, 'wishlists'),
      where('shareId', '==', shareId),
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
      name: data.name,
      userId: data.userId,
      beneficiaryId: data.beneficiaryId,
      shareId: data.shareId,
      isPublic: data.isPublic,
      isCollaborative: data.isCollaborative,
      occasion: data.occasion,
      occasionDate: data.occasionDate?.toDate() || null,
      description: data.description,
      createdAt: data.createdAt?.toDate()
    } as Wishlist;
  }
  
  async createWishlist(wishlistData: Omit<InsertWishlist, "shareId">): Promise<Wishlist> {
    const now = Timestamp.now();
    const shareId = uuidv4();
    
    const wishlistDoc = {
      name: wishlistData.name,
      userId: wishlistData.userId,
      beneficiaryId: wishlistData.beneficiaryId || null,
      shareId,
      isPublic: wishlistData.isPublic || false,
      isCollaborative: wishlistData.isCollaborative || false,
      occasion: wishlistData.occasion || null,
      occasionDate: wishlistData.occasionDate ? Timestamp.fromDate(wishlistData.occasionDate) : null,
      description: wishlistData.description || null,
      createdAt: now
    };
    
    const docRef = await addDoc(collection(db, 'wishlists'), wishlistDoc);
    return {
      id: parseInt(docRef.id),
      name: wishlistDoc.name,
      userId: wishlistDoc.userId,
      beneficiaryId: wishlistDoc.beneficiaryId,
      shareId: wishlistDoc.shareId,
      isPublic: wishlistDoc.isPublic,
      isCollaborative: wishlistDoc.isCollaborative,
      occasion: wishlistDoc.occasion,
      occasionDate: wishlistDoc.occasionDate?.toDate() || null,
      description: wishlistDoc.description,
      createdAt: now.toDate()
    } as Wishlist;
  }
  
  async updateWishlist(id: number, data: Partial<Omit<InsertWishlist, "userId">>): Promise<Wishlist | undefined> {
    const docRef = doc(db, 'wishlists', id.toString());
    
    const firestoreUpdates: any = { ...data };
    if (firestoreUpdates.occasionDate instanceof Date) {
      firestoreUpdates.occasionDate = Timestamp.fromDate(firestoreUpdates.occasionDate);
    }
    
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
      
      // Delete collaborators
      const collaboratorsQuery = query(
        collection(db, 'collaborators'),
        where('wishlistId', '==', id)
      );
      const collaboratorsSnapshot = await getDocs(collaboratorsQuery);
      
      const deleteCollaboratorPromises = collaboratorsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteCollaboratorPromises);
      
      // Delete the wishlist
      await deleteDoc(doc(db, 'wishlists', id.toString()));
      return true;
    } catch (error) {
      console.error('Error deleting wishlist:', error);
      return false;
    }
  }

  // ===========================
  // WISHLIST COLLABORATOR METHODS
  // ===========================
  
  async addCollaborator(collaboratorData: InsertWishlistCollaborator): Promise<WishlistCollaborator> {
    const now = Timestamp.now();
    const collaboratorDoc = {
      wishlistId: collaboratorData.wishlistId,
      userId: collaboratorData.userId,
      role: collaboratorData.role || 'editor',
      addedAt: now,
      addedBy: collaboratorData.addedBy || null,
      lastActive: collaboratorData.lastActive ? Timestamp.fromDate(collaboratorData.lastActive) : null
    };
    
    const docRef = await addDoc(collection(db, 'collaborators'), collaboratorDoc);
    return {
      id: parseInt(docRef.id),
      wishlistId: collaboratorDoc.wishlistId,
      userId: collaboratorDoc.userId,
      role: collaboratorDoc.role,
      addedAt: now.toDate(),
      addedBy: collaboratorDoc.addedBy,
      lastActive: collaboratorDoc.lastActive?.toDate() || null
    } as WishlistCollaborator;
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
        wishlistId: data.wishlistId,
        userId: data.userId,
        role: data.role,
        addedAt: data.addedAt?.toDate(),
        addedBy: data.addedBy,
        lastActive: data.lastActive?.toDate() || null
      } as WishlistCollaborator);
    });
    
    return collaborators;
  }
  
  async updateCollaboratorRole(wishlistId: number, userId: number, role: string): Promise<WishlistCollaborator | undefined> {
    const q = query(
      collection(db, 'collaborators'),
      where('wishlistId', '==', wishlistId),
      where('userId', '==', userId),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return undefined;
    }
    
    const docRef = querySnapshot.docs[0].ref;
    await updateDoc(docRef, { role });
    
    const data = querySnapshot.docs[0].data();
    return {
      id: parseInt(querySnapshot.docs[0].id),
      wishlistId: data.wishlistId,
      userId: data.userId,
      role: role,
      addedAt: data.addedAt?.toDate(),
      addedBy: data.addedBy,
      lastActive: data.lastActive?.toDate() || null
    } as WishlistCollaborator;
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
  
  async updateCollaboratorActivity(wishlistId: number, userId: number): Promise<boolean> {
    const q = query(
      collection(db, 'collaborators'),
      where('wishlistId', '==', wishlistId),
      where('userId', '==', userId),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return false;
    }
    
    const docRef = querySnapshot.docs[0].ref;
    await updateDoc(docRef, { lastActive: Timestamp.now() });
    return true;
  }

  // ===========================
  // WISHLIST ITEM METHODS
  // ===========================
  
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
        wishlistId: data.wishlistId,
        title: data.title,
        price: data.price,
        numericPrice: data.numericPrice,
        imageUrl: data.imageUrl,
        productUrl: data.productUrl,
        store: data.store,
        note: data.note,
        category: data.category,
        brand: data.brand,
        description: data.description,
        availability: data.availability,
        rating: data.rating,
        reviewCount: data.reviewCount,
        priceHistory: data.priceHistory || [],
        metadata: data.metadata || {},
        createdAt: data.createdAt?.toDate(),
        reservedByUserId: data.reservedByUserId,
        reservedAt: data.reservedAt?.toDate() || null,
        purchasedByUserId: data.purchasedByUserId,
        purchasedAt: data.purchasedAt?.toDate() || null,
        popularity: data.popularity || 0,
        productIdentifier: data.productIdentifier
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
      wishlistId: data.wishlistId,
      title: data.title,
      price: data.price,
      numericPrice: data.numericPrice,
      imageUrl: data.imageUrl,
      productUrl: data.productUrl,
      store: data.store,
      note: data.note,
      category: data.category,
      brand: data.brand,
      description: data.description,
      availability: data.availability,
      rating: data.rating,
      reviewCount: data.reviewCount,
      priceHistory: data.priceHistory || [],
      metadata: data.metadata || {},
      createdAt: data.createdAt?.toDate(),
      reservedByUserId: data.reservedByUserId,
      reservedAt: data.reservedAt?.toDate() || null,
      purchasedByUserId: data.purchasedByUserId,
      purchasedAt: data.purchasedAt?.toDate() || null,
      popularity: data.popularity || 0,
      productIdentifier: data.productIdentifier
    } as WishlistItem;
  }
  
  async createWishlistItem(itemData: InsertWishlistItem): Promise<WishlistItem> {
    const now = Timestamp.now();
    const itemDoc = {
      wishlistId: itemData.wishlistId,
      title: itemData.title,
      price: itemData.price,
      numericPrice: itemData.numericPrice || null,
      imageUrl: itemData.imageUrl,
      productUrl: itemData.productUrl,
      store: itemData.store,
      note: itemData.note || null,
      category: itemData.category || null,
      brand: itemData.brand || null,
      description: itemData.description || null,
      availability: itemData.availability || null,
      rating: itemData.rating || null,
      reviewCount: itemData.reviewCount || null,
      priceHistory: [],
      metadata: {},
      createdAt: now,
      reservedByUserId: itemData.reservedByUserId || null,
      reservedAt: null,
      purchasedByUserId: itemData.purchasedByUserId || null,
      purchasedAt: itemData.purchasedAt ? Timestamp.fromDate(itemData.purchasedAt) : null,
      popularity: 0,
      productIdentifier: itemData.productIdentifier || null
    };
    
    const docRef = await addDoc(collection(db, 'wishlistItems'), itemDoc);
    
    return {
      id: parseInt(docRef.id),
      wishlistId: itemDoc.wishlistId,
      title: itemDoc.title,
      price: itemDoc.price,
      numericPrice: itemDoc.numericPrice,
      imageUrl: itemDoc.imageUrl,
      productUrl: itemDoc.productUrl,
      store: itemDoc.store,
      note: itemDoc.note,
      category: itemDoc.category,
      brand: itemDoc.brand,
      description: itemDoc.description,
      availability: itemDoc.availability,
      rating: itemDoc.rating,
      reviewCount: itemDoc.reviewCount,
      priceHistory: itemDoc.priceHistory,
      metadata: itemDoc.metadata,
      createdAt: now.toDate(),
      reservedByUserId: itemDoc.reservedByUserId,
      reservedAt: null,
      purchasedByUserId: itemDoc.purchasedByUserId,
      purchasedAt: itemDoc.purchasedAt?.toDate() || null,
      popularity: itemDoc.popularity,
      productIdentifier: itemDoc.productIdentifier
    } as WishlistItem;
  }
  
  async updateWishlistItem(id: number, data: Partial<InsertWishlistItem>): Promise<WishlistItem | undefined> {
    const docRef = doc(db, 'wishlistItems', id.toString());
    
    const firestoreUpdates: any = { ...data };
    if (firestoreUpdates.purchasedAt instanceof Date) {
      firestoreUpdates.purchasedAt = Timestamp.fromDate(firestoreUpdates.purchasedAt);
    }
    if (firestoreUpdates.reservedAt instanceof Date) {
      firestoreUpdates.reservedAt = Timestamp.fromDate(firestoreUpdates.reservedAt);
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
  
  async reserveWishlistItem(itemId: number, userId: number): Promise<WishlistItem | undefined> {
    const item = await this.getWishlistItem(itemId);
    if (!item || item.reservedByUserId || item.purchasedByUserId) {
      return undefined;
    }
    
    await this.updateWishlistItem(itemId, { 
      reservedByUserId: userId
    });
    
    return this.getWishlistItem(itemId);
  }
  
  async markItemPurchased(itemId: number, userId: number): Promise<WishlistItem | undefined> {
    const item = await this.getWishlistItem(itemId);
    if (!item || item.purchasedByUserId) {
      return undefined;
    }
    
    await this.updateWishlistItem(itemId, { 
      purchasedByUserId: userId,
      purchasedAt: new Date(),
      // Clear reservation if it was reserved before
      reservedByUserId: null
    });
    
    return this.getWishlistItem(itemId);
  }

  // ===========================
  // NOTIFICATION METHODS
  // ===========================
  
  async getNotifications(userId: number, limitCount?: number): Promise<Notification[]> {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      ...(limitCount ? [limit(limitCount)] : [])
    );
    
    const querySnapshot = await getDocs(q);
    const notifications: Notification[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        id: parseInt(doc.id),
        userId: data.userId,
        type: data.type,
        title: data.title,
        content: data.content,
        data: data.data || {},
        relatedEntityId: data.relatedEntityId,
        relatedEntityType: data.relatedEntityType,
        createdAt: data.createdAt?.toDate(),
        isRead: data.isRead,
        actionUrl: data.actionUrl,
        emailSent: data.emailSent,
        emailStatus: data.emailStatus
      } as Notification);
    });
    
    return notifications;
  }
  
  async getUnreadNotificationCount(userId: number): Promise<number> {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  }
  
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const now = Timestamp.now();
    const notificationDoc = {
      userId: notificationData.userId,
      type: notificationData.type,
      title: notificationData.title,
      content: notificationData.content,
      data: notificationData.data || {},
      relatedEntityId: notificationData.relatedEntityId || null,
      relatedEntityType: notificationData.relatedEntityType || null,
      createdAt: now,
      isRead: notificationData.isRead || false,
      actionUrl: notificationData.actionUrl || null,
      emailSent: notificationData.emailSent || false,
      emailStatus: notificationData.emailStatus || null
    };
    
    const docRef = await addDoc(collection(db, 'notifications'), notificationDoc);
    return {
      id: parseInt(docRef.id),
      userId: notificationDoc.userId,
      type: notificationDoc.type,
      title: notificationDoc.title,
      content: notificationDoc.content,
      data: notificationDoc.data,
      relatedEntityId: notificationDoc.relatedEntityId,
      relatedEntityType: notificationDoc.relatedEntityType,
      createdAt: now.toDate(),
      isRead: notificationDoc.isRead,
      actionUrl: notificationDoc.actionUrl,
      emailSent: notificationDoc.emailSent,
      emailStatus: notificationDoc.emailStatus
    } as Notification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const docRef = doc(db, 'notifications', id.toString());
    await updateDoc(docRef, { isRead: true });
    return this.getNotification(id);
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      const updatePromises = querySnapshot.docs.map(doc => 
        updateDoc(doc.ref, { isRead: true })
      );
      
      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
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
  
  private async getNotification(id: number): Promise<Notification | undefined> {
    const docRef = doc(db, 'notifications', id.toString());
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return undefined;
    }
    
    const data = docSnap.data();
    return {
      id: parseInt(docSnap.id),
      userId: data.userId,
      type: data.type,
      title: data.title,
      content: data.content,
      data: data.data || {},
      relatedEntityId: data.relatedEntityId,
      relatedEntityType: data.relatedEntityType,
      createdAt: data.createdAt?.toDate(),
      isRead: data.isRead,
      actionUrl: data.actionUrl,
      emailSent: data.emailSent,
      emailStatus: data.emailStatus
    } as Notification;
  }

  // ===========================
  // PRICE ALERT METHODS
  // ===========================
  
  async getPriceAlerts(userId: number): Promise<PriceAlert[]> {
    const q = query(
      collection(db, 'priceAlerts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const alerts: PriceAlert[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      alerts.push({
        id: parseInt(doc.id),
        userId: data.userId,
        itemId: data.itemId,
        targetPrice: data.targetPrice,
        triggered: data.triggered,
        triggeredAt: data.triggeredAt?.toDate() || null,
        createdAt: data.createdAt?.toDate(),
        expiresAt: data.expiresAt?.toDate() || null,
        emailSent: data.emailSent
      } as PriceAlert);
    });
    
    return alerts;
  }
  
  async getPriceAlertsByItem(itemId: number): Promise<PriceAlert[]> {
    const q = query(
      collection(db, 'priceAlerts'),
      where('itemId', '==', itemId)
    );
    
    const querySnapshot = await getDocs(q);
    const alerts: PriceAlert[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      alerts.push({
        id: parseInt(doc.id),
        userId: data.userId,
        itemId: data.itemId,
        targetPrice: data.targetPrice,
        triggered: data.triggered,
        triggeredAt: data.triggeredAt?.toDate() || null,
        createdAt: data.createdAt?.toDate(),
        expiresAt: data.expiresAt?.toDate() || null,
        emailSent: data.emailSent
      } as PriceAlert);
    });
    
    return alerts;
  }
  
  async getPriceAlertsExpiringBefore(date: Date): Promise<PriceAlert[]> {
    const q = query(
      collection(db, 'priceAlerts'),
      where('expiresAt', '<=', Timestamp.fromDate(date)),
      where('triggered', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const alerts: PriceAlert[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      alerts.push({
        id: parseInt(doc.id),
        userId: data.userId,
        itemId: data.itemId,
        targetPrice: data.targetPrice,
        triggered: data.triggered,
        triggeredAt: data.triggeredAt?.toDate() || null,
        createdAt: data.createdAt?.toDate(),
        expiresAt: data.expiresAt?.toDate() || null,
        emailSent: data.emailSent
      } as PriceAlert);
    });
    
    return alerts;
  }
  
  async createPriceAlert(alertData: InsertPriceAlert): Promise<PriceAlert> {
    const now = Timestamp.now();
    const alertDoc = {
      userId: alertData.userId,
      itemId: alertData.itemId,
      targetPrice: alertData.targetPrice,
      triggered: alertData.triggered || false,
      triggeredAt: alertData.triggeredAt ? Timestamp.fromDate(alertData.triggeredAt) : null,
      createdAt: now,
      expiresAt: alertData.expiresAt ? Timestamp.fromDate(alertData.expiresAt) : null,
      emailSent: alertData.emailSent || false
    };
    
    const docRef = await addDoc(collection(db, 'priceAlerts'), alertDoc);
    return {
      id: parseInt(docRef.id),
      userId: alertDoc.userId,
      itemId: alertDoc.itemId,
      targetPrice: alertDoc.targetPrice,
      triggered: alertDoc.triggered,
      triggeredAt: alertDoc.triggeredAt?.toDate() || null,
      createdAt: now.toDate(),
      expiresAt: alertDoc.expiresAt?.toDate() || null,
      emailSent: alertDoc.emailSent
    } as PriceAlert;
  }
  
  async markPriceAlertTriggered(alertId: number): Promise<boolean> {
    try {
      const docRef = doc(db, 'priceAlerts', alertId.toString());
      await updateDoc(docRef, { 
        triggered: true, 
        triggeredAt: Timestamp.now() 
      });
      return true;
    } catch (error) {
      console.error('Error marking price alert as triggered:', error);
      return false;
    }
  }
  
  async deletePriceAlert(id: number): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'priceAlerts', id.toString()));
      return true;
    } catch (error) {
      console.error('Error deleting price alert:', error);
      return false;
    }
  }
  
  async getRecentPriceDrops(userId: number, days: number): Promise<any[]> {
    // This is a simplified implementation
    // In a real database, we would query items with price changes in the last X days
    const userWishlists = await this.getWishlists(userId);
    const wishlistIds = userWishlists.map(w => w.id);
    
    if (wishlistIds.length === 0) {
      return [];
    }
    
    // Get all items from user's wishlists
    const allItems: WishlistItem[] = [];
    for (const wishlistId of wishlistIds) {
      const items = await this.getWishlistItems(wishlistId);
      allItems.push(...items);
    }
    
    // Simulate recent price drops (in a real implementation, this would use priceHistory)
    return allItems.slice(0, 2).map(item => ({
      id: item.id,
      title: item.title,
      oldPrice: parseFloat(item.price.replace(/[^0-9.]/g, '')) * 1.2,
      newPrice: parseFloat(item.price.replace(/[^0-9.]/g, '')),
      imageUrl: item.imageUrl,
      productUrl: item.productUrl,
      dropPercentage: 20,
      dropDate: new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000)
    }));
  }

  // ===========================
  // PRIVACY SETTINGS METHODS
  // ===========================
  
  async getPrivacySettings(entityType: string, entityId: number): Promise<PrivacySettings | null> {
    try {
      const q = query(
        collection(db, 'privacySettings'),
        where('entityType', '==', entityType),
        where('entityId', '==', entityId)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      return {
        id: parseInt(doc.id),
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        visibilityLevel: data.visibilityLevel,
        customAccessList: data.customAccessList || [],
        expirationDate: data.expirationDate?.toDate() || null,
        allowComments: data.allowComments,
        allowReservations: data.allowReservations,
        requireApproval: data.requireApproval,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PrivacySettings;
    } catch (error) {
      console.error('Error getting privacy settings:', error);
      return null;
    }
  }
  
  async createPrivacySettings(settingsData: InsertPrivacySettings): Promise<PrivacySettings> {
    const now = Timestamp.now();
    const settingsDoc = {
      userId: settingsData.userId,
      entityType: settingsData.entityType,
      entityId: settingsData.entityId,
      visibilityLevel: settingsData.visibilityLevel || 'public',
      customAccessList: settingsData.customAccessList || [],
      expirationDate: settingsData.expirationDate ? Timestamp.fromDate(settingsData.expirationDate) : null,
      allowComments: settingsData.allowComments ?? true,
      allowReservations: settingsData.allowReservations ?? true,
      requireApproval: settingsData.requireApproval ?? false,
      createdAt: now,
      updatedAt: now
    };
    
    const docRef = await addDoc(collection(db, 'privacySettings'), settingsDoc);
    
    return {
      id: parseInt(docRef.id),
      userId: settingsDoc.userId,
      entityType: settingsDoc.entityType,
      entityId: settingsDoc.entityId,
      visibilityLevel: settingsDoc.visibilityLevel,
      customAccessList: settingsDoc.customAccessList,
      expirationDate: settingsDoc.expirationDate?.toDate() || null,
      allowComments: settingsDoc.allowComments,
      allowReservations: settingsDoc.allowReservations,
      requireApproval: settingsDoc.requireApproval,
      createdAt: now.toDate(),
      updatedAt: now.toDate()
    } as PrivacySettings;
  }
  
  async updatePrivacySettings(id: number, settingsData: Partial<InsertPrivacySettings>): Promise<PrivacySettings> {
    try {
      const docRef = doc(db, 'privacySettings', id.toString());
      const updateData: any = {
        ...settingsData,
        updatedAt: Timestamp.now()
      };
      
      // Convert date to Timestamp if present
      if (settingsData.expirationDate) {
        updateData.expirationDate = Timestamp.fromDate(settingsData.expirationDate);
      }
      
      await updateDoc(docRef, updateData);
      
      // Fetch and return updated document
      const updatedDoc = await getDoc(docRef);
      if (!updatedDoc.exists()) {
        throw new Error(`Privacy settings with ID ${id} not found after update`);
      }
      
      const data = updatedDoc.data();
      return {
        id,
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        visibilityLevel: data.visibilityLevel,
        customAccessList: data.customAccessList || [],
        expirationDate: data.expirationDate?.toDate() || null,
        allowComments: data.allowComments,
        allowReservations: data.allowReservations,
        requireApproval: data.requireApproval,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PrivacySettings;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw error;
    }
  }
  
  async deletePrivacySettings(id: number): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'privacySettings', id.toString()));
      return true;
    } catch (error) {
      console.error('Error deleting privacy settings:', error);
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