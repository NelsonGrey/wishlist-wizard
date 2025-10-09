// Firestore real-time utilities for Wishlist Wizard
// Provides hooks and utilities for real-time Firestore subscriptions

import type { FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  getDocs,
  Timestamp,
  type Firestore,
  type DocumentData,
  type QuerySnapshot,
  type DocumentSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';
import { firebaseApp, getCurrentUser } from './firebase';
import type { 
  Wishlist, 
  WishlistItem, 
  Notification, 
  WishlistCollaborator, 
  Beneficiary,
  PriceAlert
} from '@wishlist-wizard/shared';

let db: Firestore | null = null;

export function getFirestoreDb(): Firestore {
  if (!db && firebaseApp) {
    db = getFirestore(firebaseApp);
  }
  if (!db) {
    throw new Error('Firestore not initialized - ensure Firebase is properly configured');
  }
  return db;
}

// Helper to convert Firestore timestamp to Date
function convertTimestamp(data: any): any {
  if (!data) return data;
  
  const converted = { ...data };
  
  // Convert known timestamp fields
  const timestampFields = ['createdAt', 'lastLogin', 'verificationExpires', 'passwordResetExpires', 'birthdate', 'occasionDate', 'reservedAt', 'purchasedAt', 'triggeredAt', 'expiresAt', 'addedAt', 'lastActive'];
  
  timestampFields.forEach(field => {
    if (converted[field] && converted[field].toDate) {
      converted[field] = converted[field].toDate();
    }
  });
  
  return converted;
}

// Convert Firestore document to typed object
function convertFirestoreDoc<T>(doc: DocumentSnapshot): T | null {
  if (!doc.exists()) return null;
  
  const data = doc.data();
  if (!data) return null;
  
  return {
    id: parseInt(doc.id) || doc.id, // Handle both numeric and string IDs
    ...convertTimestamp(data)
  } as T;
}

// Convert Firestore QuerySnapshot to typed array
function convertFirestoreQuery<T>(querySnapshot: QuerySnapshot): T[] {
  const results: T[] = [];
  querySnapshot.forEach(doc => {
    const converted = convertFirestoreDoc<T>(doc);
    if (converted) {
      results.push(converted);
    }
  });
  return results;
}

// ===========================
// REAL-TIME HOOKS
// ===========================

/**
 * Hook for real-time user wishlists
 */
export function useUserWishlists(userId?: string) {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!userId) {
      setWishlists([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = getFirestoreDb();
      const q = query(
        collection(db, 'wishlists'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      unsubscribeRef.current = onSnapshot(q, 
        (querySnapshot) => {
          const wishlistData = convertFirestoreQuery<Wishlist>(querySnapshot);
          setWishlists(wishlistData);
          setLoading(false);
        },
        (err) => {
          console.error('Error listening to wishlists:', err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up wishlists listener:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [userId]);

  return { wishlists, loading, error };
}

/**
 * Hook for real-time wishlist items
 */
export function useWishlistItems(wishlistId?: number) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!wishlistId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = getFirestoreDb();
      const q = query(
        collection(db, 'wishlistItems'),
        where('wishlistId', '==', wishlistId),
        orderBy('createdAt', 'desc')
      );

      unsubscribeRef.current = onSnapshot(q,
        (querySnapshot) => {
          const itemData = convertFirestoreQuery<WishlistItem>(querySnapshot);
          setItems(itemData);
          setLoading(false);
        },
        (err) => {
          console.error('Error listening to wishlist items:', err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up wishlist items listener:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [wishlistId]);

  return { items, loading, error };
}

/**
 * Hook for real-time notifications
 */
export function useUserNotifications(userId?: string, limitCount: number = 10) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const unreadUnsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = getFirestoreDb();
      
      // Listen to recent notifications
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      unsubscribeRef.current = onSnapshot(notificationsQuery,
        (querySnapshot) => {
          const notificationData = convertFirestoreQuery<Notification>(querySnapshot);
          setNotifications(notificationData);
          setLoading(false);
        },
        (err) => {
          console.error('Error listening to notifications:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      // Listen to unread count
      const unreadQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      unreadUnsubscribeRef.current = onSnapshot(unreadQuery,
        (querySnapshot) => {
          setUnreadCount(querySnapshot.size);
        },
        (err) => {
          console.error('Error listening to unread notifications:', err);
        }
      );

    } catch (err) {
      console.error('Error setting up notifications listener:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (unreadUnsubscribeRef.current) {
        unreadUnsubscribeRef.current();
      }
    };
  }, [userId, limitCount]);

  return { notifications, unreadCount, loading, error };
}

/**
 * Hook for real-time wishlist collaborators
 */
export function useWishlistCollaborators(wishlistId?: number) {
  const [collaborators, setCollaborators] = useState<WishlistCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!wishlistId) {
      setCollaborators([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = getFirestoreDb();
      const q = query(
        collection(db, 'collaborators'),
        where('wishlistId', '==', wishlistId)
      );

      unsubscribeRef.current = onSnapshot(q,
        (querySnapshot) => {
          const collaboratorData = convertFirestoreQuery<WishlistCollaborator>(querySnapshot);
          setCollaborators(collaboratorData);
          setLoading(false);
        },
        (err) => {
          console.error('Error listening to collaborators:', err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up collaborators listener:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [wishlistId]);

  return { collaborators, loading, error };
}

/**
 * Hook for real-time beneficiaries
 */
export function useUserBeneficiaries(userId?: string) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!userId) {
      setBeneficiaries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = getFirestoreDb();
      const q = query(
        collection(db, 'beneficiaries'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      unsubscribeRef.current = onSnapshot(q,
        (querySnapshot) => {
          const beneficiaryData = convertFirestoreQuery<Beneficiary>(querySnapshot);
          setBeneficiaries(beneficiaryData);
          setLoading(false);
        },
        (err) => {
          console.error('Error listening to beneficiaries:', err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up beneficiaries listener:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [userId]);

  return { beneficiaries, loading, error };
}

/**
 * Hook for real-time price alerts
 */
export function useUserPriceAlerts(userId?: string) {
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!userId) {
      setPriceAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = getFirestoreDb();
      const q = query(
        collection(db, 'priceAlerts'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      unsubscribeRef.current = onSnapshot(q,
        (querySnapshot) => {
          const alertData = convertFirestoreQuery<PriceAlert>(querySnapshot);
          setPriceAlerts(alertData);
          setLoading(false);
        },
        (err) => {
          console.error('Error listening to price alerts:', err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up price alerts listener:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [userId]);

  return { priceAlerts, loading, error };
}

// ===========================
// COLLABORATIVE FEATURES
// ===========================

/**
 * Hook for tracking active collaborators on a wishlist
 * Updates collaborator activity and shows who's currently active
 */
export function useActiveCollaborators(wishlistId?: number) {
  const [activeCollaborators, setActiveCollaborators] = useState<WishlistCollaborator[]>([]);
  const currentUser = getCurrentUser();
  const { collaborators } = useWishlistCollaborators(wishlistId);

  useEffect(() => {
    if (!wishlistId || !currentUser) return;

    try {
      const db = getFirestoreDb();
      
      // Update current user's activity every 30 seconds
      const updateActivity = async () => {
        const collaboratorQuery = query(
          collection(db, 'collaborators'),
          where('wishlistId', '==', wishlistId),
          where('userId', '==', currentUser.uid)
        );
        
        const snapshot = await getDocs(collaboratorQuery);
        if (!snapshot.empty) {
          const collaboratorDoc = snapshot.docs[0];
          await updateDoc(collaboratorDoc.ref, {
            lastActive: Timestamp.now()
          });
        }
      };

      // Update immediately and then every 30 seconds
      updateActivity();
      const activityInterval = setInterval(updateActivity, 30000);

      return () => {
        clearInterval(activityInterval);
      };
    } catch (err) {
      console.error('Error updating collaborator activity:', err);
    }
  }, [wishlistId, currentUser]);

  useEffect(() => {
    // Filter collaborators who were active in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const active = collaborators.filter(collaborator => 
      collaborator.lastActive && collaborator.lastActive > twoMinutesAgo
    );
    setActiveCollaborators(active);
  }, [collaborators]);

  return { activeCollaborators };
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const db = getFirestoreDb();
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      isRead: true
    });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    throw err;
  }
}

/**
 * Create a new notification (typically called by server functions)
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  content: string,
  data?: any
): Promise<void> {
  try {
    const db = getFirestoreDb();
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      content,
      data: data || {},
      createdAt: Timestamp.now(),
      isRead: false,
      relatedEntityId: data?.itemId || data?.wishlistId || null,
      relatedEntityType: data?.itemId ? 'item' : data?.wishlistId ? 'wishlist' : null,
      actionUrl: data?.actionUrl || null,
      emailSent: false,
      emailStatus: null
    });
  } catch (err) {
    console.error('Error creating notification:', err);
    throw err;
  }
}

/**
 * Get a single document with real-time updates
 */
export function useDocument<T>(collectionName: string, documentId?: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = getFirestoreDb();
      const docRef = doc(db, collectionName, documentId);

      unsubscribeRef.current = onSnapshot(docRef,
        (docSnapshot) => {
          const documentData = convertFirestoreDoc<T>(docSnapshot);
          setData(documentData);
          setLoading(false);
        },
        (err) => {
          console.error(`Error listening to ${collectionName}/${documentId}:`, err);
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error(`Error setting up ${collectionName}/${documentId} listener:`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [collectionName, documentId]);

  return { data, loading, error };
}

export default {
  useUserWishlists,
  useWishlistItems,
  useUserNotifications,
  useWishlistCollaborators,
  useUserBeneficiaries,
  useUserPriceAlerts,
  useActiveCollaborators,
  useDocument,
  markNotificationAsRead,
  createNotification,
  getFirestoreDb
};