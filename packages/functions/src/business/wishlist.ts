import {onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize Firestore
const firestore = admin.firestore();

export interface Wishlist {
  id?: string;
  title: string;
  description?: string;
  ownerId: string;
  collaborators: string[];
  isPublic: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface WishlistItem {
  id?: string;
  wishlistId: string;
  title: string;
  description?: string;
  url?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  priority: 'low' | 'medium' | 'high';
  isPurchased: boolean;
  purchasedBy?: string;
  purchasedAt?: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Create a new wishlist
 */
export const createWishlist = onCall(async (request) => {
  const { uid } = request.auth || {};
  const { title, description, isPublic = false } = request.data;

  if (!uid) {
    throw new Error("User not authenticated");
  }

  if (!title) {
    throw new Error("Title is required");
  }

  try {
    const wishlist: Omit<Wishlist, 'id'> = {
      title,
      description: description || '',
      ownerId: uid,
      collaborators: [uid], // Owner is always a collaborator
      isPublic,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const docRef = await firestore.collection('wishlists').add(wishlist);

    logger.info(`Wishlist created: ${docRef.id} by ${uid}`);
    return {
      success: true,
      wishlist: { ...wishlist, id: docRef.id }
    };
  } catch (error) {
    logger.error("Error creating wishlist:", error);
    throw new Error("Failed to create wishlist");
  }
});

/**
 * Get user's wishlists
 */
export const getUserWishlists = onCall(async (request) => {
  const { uid } = request.auth || {};

  if (!uid) {
    throw new Error("User not authenticated");
  }

  try {
    // Get wishlists where user is owner or collaborator
    const wishlistsQuery = firestore.collection('wishlists')
      .where('collaborators', 'array-contains', uid)
      .orderBy('updatedAt', 'desc');

    const snapshot = await wishlistsQuery.get();
    const wishlists = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      wishlists,
      count: wishlists.length
    };
  } catch (error) {
    logger.error("Error getting user wishlists:", error);
    throw new Error("Failed to get wishlists");
  }
});

/**
 * Get a specific wishlist with items
 */
export const getWishlist = onCall(async (request) => {
  const { uid } = request.auth || {};
  const { wishlistId } = request.data;

  if (!uid) {
    throw new Error("User not authenticated");
  }

  if (!wishlistId) {
    throw new Error("Wishlist ID is required");
  }

  try {
    // Get wishlist
    const wishlistDoc = await firestore.collection('wishlists').doc(wishlistId).get();

    if (!wishlistDoc.exists) {
      throw new Error("Wishlist not found");
    }

    const wishlist = { id: wishlistDoc.id, ...wishlistDoc.data() } as Wishlist;

    // Check if user has access
    if (!wishlist.collaborators.includes(uid) && !wishlist.isPublic) {
      throw new Error("Access denied");
    }

    // Get wishlist items
    const itemsQuery = firestore.collection('wishlistItems')
      .where('wishlistId', '==', wishlistId)
      .orderBy('createdAt', 'desc');

    const itemsSnapshot = await itemsQuery.get();
    const items = itemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      wishlist,
      items,
      itemCount: items.length
    };
  } catch (error) {
    logger.error("Error getting wishlist:", error);
    throw new Error("Failed to get wishlist");
  }
});

/**
 * Update a wishlist
 */
export const updateWishlist = onCall(async (request) => {
  const { uid } = request.auth || {};
  const { wishlistId, updates } = request.data;

  if (!uid) {
    throw new Error("User not authenticated");
  }

  if (!wishlistId || !updates) {
    throw new Error("Wishlist ID and updates are required");
  }

  try {
    // Check ownership
    const wishlistDoc = await firestore.collection('wishlists').doc(wishlistId).get();

    if (!wishlistDoc.exists) {
      throw new Error("Wishlist not found");
    }

    const wishlist = wishlistDoc.data() as Wishlist;

    if (wishlist.ownerId !== uid) {
      throw new Error("Only wishlist owner can update");
    }

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.ownerId;
    delete updates.createdAt;

    const updateData = {
      ...updates,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await firestore.collection('wishlists').doc(wishlistId).update(updateData);

    logger.info(`Wishlist updated: ${wishlistId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error updating wishlist:", error);
    throw new Error("Failed to update wishlist");
  }
});

/**
 * Delete a wishlist
 */
export const deleteWishlist = onCall(async (request) => {
  const { uid } = request.auth || {};
  const { wishlistId } = request.data;

  if (!uid) {
    throw new Error("User not authenticated");
  }

  if (!wishlistId) {
    throw new Error("Wishlist ID is required");
  }

  try {
    // Check ownership
    const wishlistDoc = await firestore.collection('wishlists').doc(wishlistId).get();

    if (!wishlistDoc.exists) {
      throw new Error("Wishlist not found");
    }

    const wishlist = wishlistDoc.data() as Wishlist;

    if (wishlist.ownerId !== uid) {
      throw new Error("Only wishlist owner can delete");
    }

    // Delete all items in the wishlist
    const itemsQuery = firestore.collection('wishlistItems')
      .where('wishlistId', '==', wishlistId);

    const itemsSnapshot = await itemsQuery.get();
    const batch = firestore.batch();

    itemsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the wishlist
    batch.delete(firestore.collection('wishlists').doc(wishlistId));

    await batch.commit();

    logger.info(`Wishlist deleted: ${wishlistId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error deleting wishlist:", error);
    throw new Error("Failed to delete wishlist");
  }
});

/**
 * Add item to wishlist
 */
export const addWishlistItem = onCall(async (request) => {
  const { uid } = request.auth || {};
  const { wishlistId, item } = request.data;

  if (!uid) {
    throw new Error("User not authenticated");
  }

  if (!wishlistId || !item) {
    throw new Error("Wishlist ID and item data are required");
  }

  try {
    // Check if user has access to wishlist
    const wishlistDoc = await firestore.collection('wishlists').doc(wishlistId).get();

    if (!wishlistDoc.exists) {
      throw new Error("Wishlist not found");
    }

    const wishlist = wishlistDoc.data() as Wishlist;

    if (!wishlist.collaborators.includes(uid)) {
      throw new Error("Access denied");
    }

    const wishlistItem: Omit<WishlistItem, 'id'> = {
      wishlistId,
      title: item.title,
      description: item.description || '',
      url: item.url || '',
      price: item.price || 0,
      currency: item.currency || 'USD',
      imageUrl: item.imageUrl || '',
      priority: item.priority || 'medium',
      isPurchased: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const docRef = await firestore.collection('wishlistItems').add(wishlistItem);

    logger.info(`Wishlist item added: ${docRef.id} to wishlist ${wishlistId}`);
    return {
      success: true,
      item: { ...wishlistItem, id: docRef.id }
    };
  } catch (error) {
    logger.error("Error adding wishlist item:", error);
    throw new Error("Failed to add item to wishlist");
  }
});

/**
 * Update wishlist item
 */
export const updateWishlistItem = onCall(async (request) => {
  const { uid } = request.auth || {};
  const { itemId, updates } = request.data;

  if (!uid) {
    throw new Error("User not authenticated");
  }

  if (!itemId || !updates) {
    throw new Error("Item ID and updates are required");
  }

  try {
    // Get the item to check permissions
    const itemDoc = await firestore.collection('wishlistItems').doc(itemId).get();

    if (!itemDoc.exists) {
      throw new Error("Item not found");
    }

    const item = itemDoc.data() as WishlistItem;

    // Check wishlist access
    const wishlistDoc = await firestore.collection('wishlists').doc(item.wishlistId).get();
    const wishlist = wishlistDoc.data() as Wishlist;

    if (!wishlist.collaborators.includes(uid)) {
      throw new Error("Access denied");
    }

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.wishlistId;
    delete updates.createdAt;

    const updateData = {
      ...updates,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await firestore.collection('wishlistItems').doc(itemId).update(updateData);

    logger.info(`Wishlist item updated: ${itemId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error updating wishlist item:", error);
    throw new Error("Failed to update item");
  }
});

/**
 * Delete wishlist item
 */
export const deleteWishlistItem = onCall(async (request) => {
  const { uid } = request.auth || {};
  const { itemId } = request.data;

  if (!uid) {
    throw new Error("User not authenticated");
  }

  if (!itemId) {
    throw new Error("Item ID is required");
  }

  try {
    // Get the item to check permissions
    const itemDoc = await firestore.collection('wishlistItems').doc(itemId).get();

    if (!itemDoc.exists) {
      throw new Error("Item not found");
    }

    const item = itemDoc.data() as WishlistItem;

    // Check wishlist access
    const wishlistDoc = await firestore.collection('wishlists').doc(item.wishlistId).get();
    const wishlist = wishlistDoc.data() as Wishlist;

    if (!wishlist.collaborators.includes(uid)) {
      throw new Error("Access denied");
    }

    await firestore.collection('wishlistItems').doc(itemId).delete();

    logger.info(`Wishlist item deleted: ${itemId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error deleting wishlist item:", error);
    throw new Error("Failed to delete item");
  }
});

/**
 * Mark item as purchased
 */
export const purchaseWishlistItem = onCall(async (request) => {
  const { uid } = request.auth || {};
  const { itemId } = request.data;

  if (!uid) {
    throw new Error("User not authenticated");
  }

  if (!itemId) {
    throw new Error("Item ID is required");
  }

  try {
    // Get the item to check permissions
    const itemDoc = await firestore.collection('wishlistItems').doc(itemId).get();

    if (!itemDoc.exists) {
      throw new Error("Item not found");
    }

    const item = itemDoc.data() as WishlistItem;

    if (item.isPurchased) {
      throw new Error("Item is already purchased");
    }

    // Check wishlist access
    const wishlistDoc = await firestore.collection('wishlists').doc(item.wishlistId).get();
    const wishlist = wishlistDoc.data() as Wishlist;

    if (!wishlist.collaborators.includes(uid)) {
      throw new Error("Access denied");
    }

    const updateData = {
      isPurchased: true,
      purchasedBy: uid,
      purchasedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await firestore.collection('wishlistItems').doc(itemId).update(updateData);

    logger.info(`Item purchased: ${itemId} by ${uid}`);
    return { success: true };
  } catch (error) {
    logger.error("Error purchasing item:", error);
    throw new Error("Failed to purchase item");
  }
});