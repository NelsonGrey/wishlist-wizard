import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  FirebaseWishlistService, 
  FirebaseNotificationService,
  type Wishlist, 
  type WishlistItem, 
  type Notification 
} from '../lib/firebase-service';

/**
 * React hook for managing wishlists with real-time updates
 */
export function useWishlists() {
  const { user } = useAuth();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setWishlists([]);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        // Set up real-time subscription
        unsubscribe = FirebaseWishlistService.subscribeToUserWishlists(
          user.uid,
          (updatedWishlists) => {
            setWishlists(updatedWishlists);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error setting up wishlists subscription:', err);
        setError(err instanceof Error ? err.message : 'Failed to load wishlists');
        setLoading(false);
      }
    };

    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  const createWishlist = useCallback(async (
    wishlistData: Omit<Wishlist, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Wishlist> => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    return await FirebaseWishlistService.createWishlist(user.uid, wishlistData);
  }, [user?.uid]);

  const updateWishlist = useCallback(async (
    wishlistId: string,
    updates: Partial<Omit<Wishlist, 'id' | 'createdAt'>>
  ): Promise<void> => {
    await FirebaseWishlistService.updateWishlist(wishlistId, updates);
  }, []);

  const deleteWishlist = useCallback(async (wishlistId: string): Promise<void> => {
    await FirebaseWishlistService.deleteWishlist(wishlistId);
  }, []);

  return {
    wishlists,
    loading,
    error,
    createWishlist,
    updateWishlist,
    deleteWishlist
  };
}

/**
 * React hook for managing a specific wishlist's items
 */
export function useWishlistItems(wishlistId: string | null) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wishlistId) {
      setItems([]);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        // Set up real-time subscription
        unsubscribe = FirebaseWishlistService.subscribeToWishlistItems(
          wishlistId,
          (updatedItems) => {
            setItems(updatedItems);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error setting up wishlist items subscription:', err);
        setError(err instanceof Error ? err.message : 'Failed to load wishlist items');
        setLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [wishlistId]);

  const addItem = useCallback(async (
    itemData: Omit<WishlistItem, 'id' | 'wishlistId' | 'createdAt' | 'updatedAt'>
  ): Promise<WishlistItem> => {
    if (!wishlistId) {
      throw new Error('No wishlist ID provided');
    }

    return await FirebaseWishlistService.addWishlistItem(wishlistId, itemData);
  }, [wishlistId]);

  const updateItem = useCallback(async (
    itemId: string,
    updates: Partial<Omit<WishlistItem, 'id' | 'createdAt'>>
  ): Promise<void> => {
    await FirebaseWishlistService.updateWishlistItem(itemId, updates);
  }, []);

  const deleteItem = useCallback(async (itemId: string): Promise<void> => {
    await FirebaseWishlistService.deleteWishlistItem(itemId);
  }, []);

  const reserveItem = useCallback(async (itemId: string, userId: string): Promise<void> => {
    await FirebaseWishlistService.reserveItem(itemId, userId);
  }, []);

  const markItemPurchased = useCallback(async (itemId: string, userId: string): Promise<void> => {
    await FirebaseWishlistService.markItemPurchased(itemId, userId);
  }, []);

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    reserveItem,
    markItemPurchased
  };
}

/**
 * React hook for managing notifications with real-time updates
 */
export function useNotifications(limit: number = 50) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        // Set up real-time subscription
        unsubscribe = FirebaseNotificationService.subscribeToUserNotifications(
          user.uid,
          (updatedNotifications) => {
            setNotifications(updatedNotifications);
            
            // Calculate unread count
            const unread = updatedNotifications.filter(n => !n.isRead).length;
            setUnreadCount(unread);
            
            setLoading(false);
          },
          limit
        );
      } catch (err) {
        console.error('Error setting up notifications subscription:', err);
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
        setLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, limit]);

  const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
    await FirebaseNotificationService.markNotificationAsRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    await FirebaseNotificationService.markAllNotificationsAsRead(user.uid);
  }, [user?.uid]);

  const deleteNotification = useCallback(async (notificationId: string): Promise<void> => {
    await FirebaseNotificationService.deleteNotification(notificationId);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
}

/**
 * React hook for managing a single wishlist
 */
export function useWishlist(wishlistId: string | null) {
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wishlistId) {
      setWishlist(null);
      setLoading(false);
      return;
    }

    const fetchWishlist = async () => {
      try {
        setLoading(true);
        setError(null);

        const fetchedWishlist = await FirebaseWishlistService.getWishlistById(wishlistId);
        setWishlist(fetchedWishlist);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching wishlist:', err);
        setError(err instanceof Error ? err.message : 'Failed to load wishlist');
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [wishlistId]);

  return {
    wishlist,
    loading,
    error
  };
}

/**
 * Hook to combine wishlist and items data
 */
export function useWishlistWithItems(wishlistId: string | null) {
  const { wishlist, loading: wishlistLoading, error: wishlistError } = useWishlist(wishlistId);
  const { items, loading: itemsLoading, error: itemsError, ...itemActions } = useWishlistItems(wishlistId);

  return {
    wishlist,
    items,
    loading: wishlistLoading || itemsLoading,
    error: wishlistError || itemsError,
    ...itemActions
  };
}