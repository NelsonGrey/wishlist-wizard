// Firebase Functions - Wishlist API
// Replaces Express.js wishlist routes with Firebase Functions and Firestore

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { ensureFirebaseAdmin } from '../firebase-admin.js';
import { generateId } from '../utils/helpers.js';
import { convertAffiliateUrl } from '../utils/affiliate.js';

ensureFirebaseAdmin();
const db = getFirestore();
const publicCallableOptions = { invoker: 'public' as const };

// Removed unused interfaces - using Firestore document structure and shared types directly

/**
 * Get User's Wishlists
 * Replaces: GET /api/wishlists
 */
export const getUserWishlists = onCall(publicCallableOptions, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const userId = request.auth.uid;
    const wishlistsSnapshot = await db
      .collection('wishlists')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const wishlists = [];
    for (const doc of wishlistsSnapshot.docs) {
      const wishlistData = doc.data();
      
      // Get item count for each wishlist
      const itemsSnapshot = await db
        .collection('wishlistItems')
        .where('wishlistId', '==', doc.id)
        .count()
        .get();

      wishlists.push({
        id: doc.id,
        ...wishlistData,
        itemCount: itemsSnapshot.data().count
      });
    }

    return wishlists;
  } catch (error) {
    logger.error('Error getting user wishlists:', error);
    throw new HttpsError('internal', 'Failed to get wishlists');
  }
});

/**
 * Get Wishlist by ID
 * Replaces: GET /api/wishlists/:id
 */
export const getWishlistById = onCall(publicCallableOptions, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { wishlistId } = request.data;
  if (!wishlistId) {
    throw new HttpsError('invalid-argument', 'Wishlist ID is required');
  }

  try {
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    const wishlistData = wishlistDoc.data();
    
    // Check if user has access to this wishlist
    const userId = request.auth.uid;
    const isOwner = wishlistData?.userId === userId;
    const isCollaborator = wishlistData?.isCollaborative && 
      await isUserCollaborator(wishlistId, userId);

    if (!isOwner && !isCollaborator && !wishlistData?.isPublic) {
      throw new HttpsError('permission-denied', 'Access denied to this wishlist');
    }

    return { id: wishlistDoc.id, ...wishlistData };
  } catch (error) {
    logger.error('Error getting wishlist by ID:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to get wishlist');
  }
});

/**
 * Get Shared Wishlist by Share ID
 * Replaces: GET /api/shared/:shareId
 */
export const getSharedWishlist = onCall(publicCallableOptions, async (request: CallableRequest) => {
  const { shareId } = request.data;
  if (!shareId) {
    throw new HttpsError('invalid-argument', 'Share ID is required');
  }

  try {
    const wishlistSnapshot = await db
      .collection('wishlists')
      .where('shareId', '==', shareId)
      .limit(1)
      .get();

    if (wishlistSnapshot.empty) {
      throw new HttpsError('not-found', 'Shared wishlist not found');
    }

    const wishlistDoc = wishlistSnapshot.docs[0];
    const wishlistData = wishlistDoc.data();

    // Get items for this wishlist
    const itemsSnapshot = await db
      .collection('wishlistItems')
      .where('wishlistId', '==', wishlistDoc.id)
      .orderBy('createdAt', 'desc')
      .get();

    const items = itemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      wishlist: { id: wishlistDoc.id, ...wishlistData },
      items
    };
  } catch (error) {
    logger.error('Error getting shared wishlist:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to get shared wishlist');
  }
});

/**
 * Create New Wishlist
 * Replaces: POST /api/wishlists
 */
export const createWishlist = onCall(publicCallableOptions, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const {
    name,
    description,
    isPublic,
    isCollaborative,
    beneficiaryId,
    occasion,
    occasionDate,
    recurrence,
    reminderDays,
  } = request.data;

  if (!name || name.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'Wishlist name is required');
  }

  try {
    const validRecurrence = ['none', 'yearly', 'monthly'].includes(String(recurrence))
      ? String(recurrence)
      : 'none';

    const parsedReminderDays =
      reminderDays === null || reminderDays === undefined || reminderDays === ''
        ? null
        : Number(reminderDays);

    const wishlistData = {
      userId: request.auth.uid,
      name: name.trim(),
      description: description || '',
      isPublic: !!isPublic,
      isCollaborative: !!isCollaborative,
      beneficiaryId: beneficiaryId || null,
      occasion: occasion || null,
      occasionDate: occasionDate ? new Date(occasionDate) : null,
      recurrence: validRecurrence,
      reminderDays: Number.isFinite(parsedReminderDays) ? parsedReminderDays : null,
      shareId: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('wishlists').add(wishlistData);
    
    // Create notification for wishlist creation
    await createNotification(request.auth.uid, {
      type: 'wishlist_created',
      title: 'Wishlist Created',
      content: `Your wishlist "${name}" has been created successfully`,
      data: { wishlistId: docRef.id, wishlistName: name }
    });

    return { id: docRef.id, ...wishlistData };
  } catch (error) {
    logger.error('Error creating wishlist:', error);
    throw new HttpsError('internal', 'Failed to create wishlist');
  }
});

/**
 * Update Wishlist
 * Replaces: PATCH /api/wishlists/:id
 */
export const updateWishlist = onCall(publicCallableOptions, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { wishlistId, ...updateData } = request.data;
  if (!wishlistId) {
    throw new HttpsError('invalid-argument', 'Wishlist ID is required');
  }

  try {
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    const wishlistData = wishlistDoc.data();
    if (wishlistData?.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'You can only update your own wishlists');
    }

    const validFields = ['name', 'description', 'isPublic', 'isCollaborative', 'beneficiaryId', 'occasion', 'occasionDate', 'recurrence', 'reminderDays'];
    const filteredUpdateData: any = {};

    for (const [key, value] of Object.entries(updateData)) {
      if (validFields.includes(key)) {
        filteredUpdateData[key] = value;
      }
    }

    if (Object.keys(filteredUpdateData).length === 0) {
      throw new HttpsError('invalid-argument', 'No valid fields to update');
    }

    if ('recurrence' in filteredUpdateData) {
      const recurrenceValue = String(filteredUpdateData.recurrence);
      filteredUpdateData.recurrence = ['none', 'yearly', 'monthly'].includes(recurrenceValue)
        ? recurrenceValue
        : 'none';
    }

    if ('reminderDays' in filteredUpdateData) {
      const reminderValue = filteredUpdateData.reminderDays;
      filteredUpdateData.reminderDays =
        reminderValue === null || reminderValue === undefined || reminderValue === ''
          ? null
          : Number(reminderValue);
      if (!Number.isFinite(filteredUpdateData.reminderDays) && filteredUpdateData.reminderDays !== null) {
        throw new HttpsError('invalid-argument', 'Invalid reminderDays value');
      }
    }

    if ('occasionDate' in filteredUpdateData) {
      const occasionDateValue = filteredUpdateData.occasionDate;
      filteredUpdateData.occasionDate = occasionDateValue ? new Date(String(occasionDateValue)) : null;
    }

    filteredUpdateData.updatedAt = new Date();

    await db.collection('wishlists').doc(wishlistId).update(filteredUpdateData);

    return { id: wishlistId, ...wishlistData, ...filteredUpdateData };
  } catch (error) {
    logger.error('Error updating wishlist:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to update wishlist');
  }
});

/**
 * Delete Wishlist
 * Replaces: DELETE /api/wishlists/:id
 */
export const deleteWishlist = onCall(publicCallableOptions, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { wishlistId } = request.data;
  if (!wishlistId) {
    throw new HttpsError('invalid-argument', 'Wishlist ID is required');
  }

  try {
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    const wishlistData = wishlistDoc.data();
    if (wishlistData?.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'You can only delete your own wishlists');
    }

    // Delete all items in the wishlist
    const itemsSnapshot = await db
      .collection('wishlistItems')
      .where('wishlistId', '==', wishlistId)
      .get();

    const batch = db.batch();
    itemsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the wishlist
    batch.delete(db.collection('wishlists').doc(wishlistId));

    await batch.commit();

    return { success: true };
  } catch (error) {
    logger.error('Error deleting wishlist:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to delete wishlist');
  }
});

/**
 * Get Wishlist Items
 * Replaces: GET /api/wishlists/:id/items
 */
export const getWishlistItems = onCall(publicCallableOptions, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { wishlistId } = request.data;
  if (!wishlistId) {
    throw new HttpsError('invalid-argument', 'Wishlist ID is required');
  }

  try {
    // Verify user has access to this wishlist
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    const wishlistData = wishlistDoc.data();
    const userId = request.auth.uid;
    const isOwner = wishlistData?.userId === userId;
    const isCollaborator = wishlistData?.isCollaborative && 
      await isUserCollaborator(wishlistId, userId);

    if (!isOwner && !isCollaborator && !wishlistData?.isPublic) {
      throw new HttpsError('permission-denied', 'Access denied to this wishlist');
    }

    const itemsSnapshot = await db
      .collection('wishlistItems')
      .where('wishlistId', '==', wishlistId)
      .orderBy('createdAt', 'desc')
      .get();

    const items = itemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return items;
  } catch (error) {
    logger.error('Error getting wishlist items:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to get wishlist items');
  }
});

/**
 * Add Item to Wishlist
 * Replaces: POST /api/items
 */
export const addWishlistItem = onCall(publicCallableOptions, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { wishlistId, title, description, price, productUrl, imageUrl, store, priority, note } = request.data;

  if (!wishlistId || !title) {
    throw new HttpsError('invalid-argument', 'Wishlist ID and title are required');
  }

  try {
    // Verify user has permission to add items to this wishlist
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    const wishlistData = wishlistDoc.data();
    const userId = request.auth.uid;
    const isOwner = wishlistData?.userId === userId;
    const isCollaborator = wishlistData?.isCollaborative && 
      await isUserCollaborator(wishlistId, userId);

    if (!isOwner && !isCollaborator) {
      throw new HttpsError('permission-denied', 'You do not have permission to add items to this wishlist');
    }

    const affiliateConversion = productUrl ? convertAffiliateUrl(productUrl) : null;

    const itemData = {
      wishlistId,
      title: title.trim(),
      description: description || '',
      price: price || null,
      productUrl: affiliateConversion?.wasConverted ? affiliateConversion.convertedUrl : productUrl || null,
      imageUrl: imageUrl || null,
      store: store || null,
      priority: priority || 1,
      note: note || null,
      addedBy: userId,
      reservedByUserId: null,
      purchasedByUserId: null,
      purchasedAt: null,
      reservedBy: null,
      purchasedBy: null,
      ...(affiliateConversion?.wasConverted
        ? {
            metadata: {
              affiliateConversion: {
                originalUrl: affiliateConversion.originalUrl,
                affiliateProgram: affiliateConversion.program?.name || null,
                convertedAt: new Date().toISOString(),
                commission: affiliateConversion.program?.defaultCommission || 0,
                tagUsed: affiliateConversion.tagUsed || null,
              },
            },
          }
        : {}),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('wishlistItems').add(itemData);

    // Create notifications for collaborative wishlists
    if (wishlistData?.isCollaborative && !isOwner) {
      await notifyWishlistCollaborators(
        wishlistId,
        userId,
        `New item "${title}" was added to the wishlist "${wishlistData.name}"`,
        'item_added'
      );
    }

    return { id: docRef.id, ...itemData };
  } catch (error) {
    logger.error('Error adding wishlist item:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to add wishlist item');
  }
});

/**
 * Reserve Wishlist Item
 * Replaces: POST /api/items/:id/reserve
 */
export const reserveWishlistItem = onCall(publicCallableOptions, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { itemId } = request.data;
  if (!itemId) {
    throw new HttpsError('invalid-argument', 'Item ID is required');
  }

  try {
    const itemDoc = await db.collection('wishlistItems').doc(itemId).get();
    if (!itemDoc.exists) {
      throw new HttpsError('not-found', 'Item not found');
    }

    const itemData = itemDoc.data() || {};
    const wishlistDoc = await db.collection('wishlists').doc(String(itemData.wishlistId || '')).get();
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    const wishlistData = wishlistDoc.data() || {};
    const userId = request.auth.uid;
    const isOwner = wishlistData.userId === userId;
    const isCollaborator = wishlistData.isCollaborative && await isUserCollaborator(wishlistDoc.id, userId);
    const canReserve = isOwner || isCollaborator || !!wishlistData.isPublic;

    if (!canReserve) {
      throw new HttpsError('permission-denied', 'You do not have permission to reserve this item');
    }

    const purchasedByUserId = itemData.purchasedByUserId || itemData.purchasedBy || null;
    if (purchasedByUserId) {
      throw new HttpsError('failed-precondition', 'This item has already been purchased');
    }

    const reservedByUserId = itemData.reservedByUserId || itemData.reservedBy || null;
    if (reservedByUserId && reservedByUserId !== userId) {
      throw new HttpsError('failed-precondition', 'This item is already reserved by another user');
    }

    if (reservedByUserId === userId) {
      return { success: true, id: itemId, ...itemData };
    }

    const updates = {
      reservedByUserId: userId,
      reservedBy: userId,
      updatedAt: new Date()
    };

    await db.collection('wishlistItems').doc(itemId).update(updates);
    return { success: true, id: itemId, ...itemData, ...updates };
  } catch (error) {
    logger.error('Error reserving wishlist item:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to reserve wishlist item');
  }
});

/**
 * Purchase Wishlist Item
 * Replaces: POST /api/items/:id/purchase
 */
export const purchaseWishlistItem = onCall(publicCallableOptions, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { itemId } = request.data;
  if (!itemId) {
    throw new HttpsError('invalid-argument', 'Item ID is required');
  }

  try {
    const itemDoc = await db.collection('wishlistItems').doc(itemId).get();
    if (!itemDoc.exists) {
      throw new HttpsError('not-found', 'Item not found');
    }

    const itemData = itemDoc.data() || {};
    const wishlistDoc = await db.collection('wishlists').doc(String(itemData.wishlistId || '')).get();
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    const wishlistData = wishlistDoc.data() || {};
    const userId = request.auth.uid;
    const isOwner = wishlistData.userId === userId;
    const isCollaborator = wishlistData.isCollaborative && await isUserCollaborator(wishlistDoc.id, userId);
    const canPurchase = isOwner || isCollaborator || !!wishlistData.isPublic;

    if (!canPurchase) {
      throw new HttpsError('permission-denied', 'You do not have permission to purchase this item');
    }

    const purchasedByUserId = itemData.purchasedByUserId || itemData.purchasedBy || null;
    if (purchasedByUserId && purchasedByUserId !== userId) {
      throw new HttpsError('failed-precondition', 'This item has already been purchased by another user');
    }

    if (purchasedByUserId === userId) {
      return { success: true, id: itemId, ...itemData };
    }

    const reservedByUserId = itemData.reservedByUserId || itemData.reservedBy || null;
    if (reservedByUserId && reservedByUserId !== userId) {
      throw new HttpsError('failed-precondition', 'This item is reserved by another user');
    }

    const updates = {
      purchasedByUserId: userId,
      purchasedBy: userId,
      purchasedAt: new Date(),
      reservedByUserId: userId,
      reservedBy: userId,
      updatedAt: new Date()
    };

    await db.collection('wishlistItems').doc(itemId).update(updates);
    return { success: true, id: itemId, ...itemData, ...updates };
  } catch (error) {
    logger.error('Error purchasing wishlist item:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to purchase wishlist item');
  }
});

/**
 * Update Wishlist Item
 * Replaces: PATCH /api/items/:id
 */
export const updateWishlistItem = onCall(publicCallableOptions, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { itemId, updates } = request.data;
  if (!itemId || !updates) {
    throw new HttpsError('invalid-argument', 'Item ID and updates are required');
  }

  try {
    const itemDoc = await db.collection('wishlistItems').doc(itemId).get();
    if (!itemDoc.exists) {
      throw new HttpsError('not-found', 'Item not found');
    }

    const itemData = itemDoc.data();
    const wishlistDoc = await db.collection('wishlists').doc(itemData?.wishlistId).get();
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    if (wishlistDoc.data()?.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'You can only update your own items');
    }

    await db.collection('wishlistItems').doc(itemId).update({
      ...updates,
      updatedAt: new Date()
    });

    return { id: itemId, ...itemData, ...updates };
  } catch (error) {
    logger.error('Error updating wishlist item:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to update wishlist item');
  }
});

/**
 * Delete Wishlist Item
 * Replaces: DELETE /api/items/:id
 */
export const deleteWishlistItem = onCall(publicCallableOptions, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { itemId } = request.data;
  if (!itemId) {
    throw new HttpsError('invalid-argument', 'Item ID is required');
  }

  try {
    const itemDoc = await db.collection('wishlistItems').doc(itemId).get();
    if (!itemDoc.exists) {
      throw new HttpsError('not-found', 'Item not found');
    }

    const itemData = itemDoc.data();
    const wishlistDoc = await db.collection('wishlists').doc(itemData?.wishlistId).get();
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    if (wishlistDoc.data()?.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'You can only delete your own items');
    }

    await db.collection('wishlistItems').doc(itemId).delete();
    return { success: true };
  } catch (error) {
    logger.error('Error deleting wishlist item:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to delete wishlist item');
  }
});

// Helper Functions

async function isUserCollaborator(wishlistId: string, userId: string): Promise<boolean> {
  const collaboratorSnapshot = await db
    .collection('collaborators')
    .where('wishlistId', '==', wishlistId)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  return !collaboratorSnapshot.empty;
}

async function createNotification(userId: string, notificationData: any) {
  await db.collection('notifications').add({
    userId,
    ...notificationData,
    isRead: false,
    createdAt: new Date()
  });
}

async function notifyWishlistCollaborators(
  wishlistId: string, 
  actorUserId: string, 
  message: string, 
  type: string
) {
  const collaboratorsSnapshot = await db
    .collection('collaborators')
    .where('wishlistId', '==', wishlistId)
    .get();

  const notifications = [];
  for (const doc of collaboratorsSnapshot.docs) {
    const collaboratorData = doc.data();
    if (collaboratorData.userId !== actorUserId) {
      notifications.push({
        userId: collaboratorData.userId,
        type,
        title: 'Wishlist Update',
        content: message,
        data: { wishlistId },
        isRead: false,
        createdAt: new Date()
      });
    }
  }

  if (notifications.length > 0) {
    const batch = db.batch();
    notifications.forEach(notification => {
      const docRef = db.collection('notifications').doc();
      batch.set(docRef, notification);
    });
    await batch.commit();
  }
}