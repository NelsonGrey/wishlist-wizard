// Firebase Functions - Wishlist API
// Replaces Express.js wishlist routes with Firebase Functions and Firestore

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { ensureFirebaseAdmin } from '../firebase-admin.js';
import { generateId } from '../utils/helpers.js';
import { convertAffiliateUrl } from '../utils/affiliate.js';
import { requireAppCheck } from '../utils/app-check.js';
import { CustomTrace } from '../utils/performance-monitoring.js';
import { logErrorWithContext } from '../utils/error-reporting.js';

ensureFirebaseAdmin();
const db = getFirestore();
const publicCallableOptions = { invoker: 'public' as const };

type WishlistRecipient = {
  type: 'self' | 'person' | 'group';
  name: string;
  members?: string[];
};

function normalizeRecipientInput(rawData: Record<string, any>): { recipient: WishlistRecipient; recipientName: string } {
  const rawRecipient = (rawData.recipient && typeof rawData.recipient === 'object') ? rawData.recipient : {};
  const rawType = String(rawRecipient.type ?? rawData.recipientType ?? 'self').trim().toLowerCase();
  const type: WishlistRecipient['type'] = rawType === 'group' || rawType === 'person' ? rawType : 'self';

  const fallbackName = type === 'self' ? 'Myself' : '';
  const rawName = String(rawRecipient.name ?? rawData.recipientName ?? fallbackName).trim();

  if ((type === 'person' || type === 'group') && !rawName) {
    throw new HttpsError('invalid-argument', 'Recipient name is required for person and group recipients');
  }

  const memberSource = Array.isArray(rawRecipient.members)
    ? rawRecipient.members
    : (Array.isArray(rawData.recipientMembers) ? rawData.recipientMembers : []);

  const members = memberSource
    .map((value: unknown) => String(value || '').trim())
    .filter(Boolean)
    .slice(0, 12);

  const recipient: WishlistRecipient = {
    type,
    name: rawName || fallbackName,
    ...(type === 'group' && members.length > 0 ? { members } : {}),
  };

  return { recipient, recipientName: recipient.name };
}

// Removed unused interfaces - using Firestore document structure and shared types directly

/**
 * Get User's Wishlists
 * Replaces: GET /api/wishlists
 */
export const getUserWishlists = onCall(publicCallableOptions, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const trace = new CustomTrace('get_user_wishlists');
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
    try {
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

    trace.incrementMetric('wishlists_retrieved', wishlists.length);
    return wishlists;
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'get_user_wishlists',
        userId
      });
      throw new HttpsError('internal', 'Failed to get wishlists');
    }
  });
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

  const userId = request.auth.uid;
  const trace = new CustomTrace('get_wishlist_by_id');
  trace.putAttribute('wishlist_id', wishlistId);
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
    try {
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    const wishlistData = wishlistDoc.data();
    
    // Check if user has access to this wishlist
    const isOwner = wishlistData?.userId === userId;
    const collaboratorRole = wishlistData?.isCollaborative
      ? await getCollaboratorRole(wishlistId, userId)
      : null;
    const isCollaborator = collaboratorRole !== null;

    if (!isOwner && !isCollaborator && !wishlistData?.isPublic) {
      throw new HttpsError('permission-denied', 'Access denied to this wishlist');
    }

    trace.incrementMetric('wishlists_read', 1);
    return { id: wishlistDoc.id, ...wishlistData };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'get_wishlist_by_id',
        userId,
        wishlistId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to get wishlist');
    }
  });
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

  const userId = request.auth?.uid;
  const trace = new CustomTrace('get_shared_wishlist');
  trace.putAttribute('share_id', shareId);
  trace.putAttribute('user_id', userId || 'anonymous');

  return trace.executeAsync(async () => {
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

    const isOwner = userId ? wishlistData?.userId === userId : false;
    const collaboratorRole = userId && wishlistData?.isCollaborative
      ? await getCollaboratorRole(wishlistDoc.id, userId)
      : null;
    const isCollaborator = collaboratorRole !== null;

    // Shared links must still respect privacy settings.
    if (!wishlistData?.isPublic && !isOwner && !isCollaborator) {
      throw new HttpsError('permission-denied', 'This shared wishlist is private');
    }

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

    trace.incrementMetric('shared_wishlists_accessed', 1);
    return {
      wishlist: { id: wishlistDoc.id, ...wishlistData },
      items
    };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'get_shared_wishlist',
        userId: userId || 'anonymous',
        shareId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to get shared wishlist');
    }
  });
});

/**
 * Create New Wishlist
 * Replaces: POST /api/wishlists
 */
export const createWishlist = onCall(publicCallableOptions, async (request: CallableRequest) => {
  // WP-01: Verify device integrity before mutation
  await requireAppCheck(request);

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
    recipient,
    recipientType,
    recipientName,
    recipientMembers,
  } = request.data;

  if (!name || name.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'Wishlist name is required');
  }

  const userId = request.auth.uid;
  const trace = new CustomTrace('create_wishlist');
  trace.putAttribute('user_id', userId);
  trace.putAttribute('wishlist_name', name.substring(0, 50));

  return trace.executeAsync(async () => {
    try {
      const validRecurrence = ['none', 'yearly', 'monthly'].includes(String(recurrence))
        ? String(recurrence)
        : 'none';

      const parsedReminderDays =
        reminderDays === null || reminderDays === undefined || reminderDays === ''
          ? null
          : Number(reminderDays);

      const normalizedRecipient = normalizeRecipientInput({
        recipient,
        recipientType,
        recipientName,
        recipientMembers,
      });

      const wishlistData = {
        userId,
        name: name.trim(),
        description: description || '',
        isPublic: !!isPublic,
        isCollaborative: !!isCollaborative,
        beneficiaryId: beneficiaryId || null,
        occasion: occasion || null,
        occasionDate: occasionDate ? new Date(occasionDate) : null,
        recurrence: validRecurrence,
        reminderDays: Number.isFinite(parsedReminderDays) ? parsedReminderDays : null,
        recipient: normalizedRecipient.recipient,
        recipientName: normalizedRecipient.recipientName,
        shareId: generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await db.collection('wishlists').add(wishlistData);
      
      // Create notification for wishlist creation
      await createNotification(userId, {
        type: 'wishlist_created',
        title: 'Wishlist Created',
        content: `Your wishlist "${name}" has been created successfully`,
        data: { wishlistId: docRef.id, wishlistName: name }
      });

      trace.incrementMetric('wishlists_created', 1);
      return { id: docRef.id, ...wishlistData };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'create_wishlist',
        userId,
        wishlistName: name
      });
      throw new HttpsError('internal', 'Failed to create wishlist');
    }
  });
});

/**
 * Update Wishlist
 * Replaces: PATCH /api/wishlists/:id
 */
export const updateWishlist = onCall(publicCallableOptions, async (request: CallableRequest) => {
  // WP-01: Verify device integrity before mutation
  await requireAppCheck(request);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { wishlistId, ...updateData } = request.data;
  if (!wishlistId) {
    throw new HttpsError('invalid-argument', 'Wishlist ID is required');
  }

  const userId = request.auth.uid;
  const trace = new CustomTrace('update_wishlist');
  trace.putAttribute('wishlist_id', wishlistId);
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
    try {
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    const wishlistData = wishlistDoc.data();
    if (wishlistData?.userId !== userId) {
      throw new HttpsError('permission-denied', 'You can only update your own wishlists');
    }

    const validFields = [
      'name',
      'description',
      'isPublic',
      'isCollaborative',
      'beneficiaryId',
      'occasion',
      'occasionDate',
      'recurrence',
      'reminderDays',
      'recipient',
      'recipientType',
      'recipientName',
      'recipientMembers',
    ];
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

    if (
      'recipient' in filteredUpdateData
      || 'recipientType' in filteredUpdateData
      || 'recipientName' in filteredUpdateData
      || 'recipientMembers' in filteredUpdateData
    ) {
      const normalizedRecipient = normalizeRecipientInput(filteredUpdateData);
      filteredUpdateData.recipient = normalizedRecipient.recipient;
      filteredUpdateData.recipientName = normalizedRecipient.recipientName;
      delete filteredUpdateData.recipientType;
      delete filteredUpdateData.recipientMembers;
    }

    filteredUpdateData.updatedAt = new Date();

    await db.collection('wishlists').doc(wishlistId).update(filteredUpdateData);

    trace.incrementMetric('wishlists_updated', 1);
    return { id: wishlistId, ...wishlistData, ...filteredUpdateData };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'update_wishlist',
        userId,
        wishlistId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to update wishlist');
    }
  });
});

/**
 * Delete Wishlist
 * Replaces: DELETE /api/wishlists/:id
 */
export const deleteWishlist = onCall(publicCallableOptions, async (request: CallableRequest) => {
  // WP-01: Verify device integrity before mutation
  await requireAppCheck(request);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { wishlistId } = request.data;
  if (!wishlistId) {
    throw new HttpsError('invalid-argument', 'Wishlist ID is required');
  }

  const userId = request.auth.uid;
  const trace = new CustomTrace('delete_wishlist');
  trace.putAttribute('wishlist_id', wishlistId);
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
    try {
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    const wishlistData = wishlistDoc.data();
    if (wishlistData?.userId !== userId) {
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

    trace.incrementMetric('wishlists_deleted', 1);
    return { success: true };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'delete_wishlist',
        userId,
        wishlistId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to delete wishlist');
    }
  });
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

  const userId = request.auth.uid;
  const trace = new CustomTrace('get_wishlist_items');
  trace.putAttribute('wishlist_id', wishlistId);
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
    try {
    // Verify user has access to this wishlist
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    const wishlistData = wishlistDoc.data();
    const isOwner = wishlistData?.userId === userId;
    const collaboratorRole = wishlistData?.isCollaborative
      ? await getCollaboratorRole(wishlistId, userId)
      : null;
    const isCollaborator = collaboratorRole !== null;

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

    trace.incrementMetric('items_retrieved', items.length);
    return items;
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'get_wishlist_items',
        userId,
        wishlistId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to get wishlist items');
    }
  });
});

/**
 * Add Item to Wishlist
 * Replaces: POST /api/items
 */
export const addWishlistItem = onCall(publicCallableOptions, async (request: CallableRequest) => {
  // WP-01: Verify device integrity before mutation
  await requireAppCheck(request);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const trace = new CustomTrace('add_wishlist_item');
  trace.putAttribute('wishlist_id', request.data.wishlistId || 'unknown');
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
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
      const isOwner = wishlistData?.userId === userId;
      const collaboratorRole = wishlistData?.isCollaborative
        ? await getCollaboratorRole(wishlistId, userId)
        : null;
      const canEditAsCollaborator = hasCollaboratorRole(collaboratorRole, ['owner', 'editor']);

      if (!isOwner && !canEditAsCollaborator) {
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

      trace.incrementMetric('items_added', 1);
      return { id: docRef.id, ...itemData };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'add_wishlist_item',
        userId,
        wishlistId: request.data.wishlistId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to add wishlist item');
    }
  });
});

/**
 * Reserve Wishlist Item
 * Replaces: POST /api/items/:id/reserve
 */
export const reserveWishlistItem = onCall(publicCallableOptions, async (request: CallableRequest) => {
  // WP-01: Verify device integrity before mutation
  await requireAppCheck(request);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { itemId } = request.data;
  if (!itemId) {
    throw new HttpsError('invalid-argument', 'Item ID is required');
  }

  const userId = request.auth.uid;
  const trace = new CustomTrace('reserve_wishlist_item');
  trace.putAttribute('item_id', itemId);
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
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
    const isOwner = wishlistData.userId === userId;
    const collaboratorRole = wishlistData.isCollaborative
      ? await getCollaboratorRole(wishlistDoc.id, userId)
      : null;
    const canReserveAsCollaborator = hasCollaboratorRole(collaboratorRole, ['owner', 'editor', 'commenter']);
    const canReserve = isOwner || canReserveAsCollaborator || !!wishlistData.isPublic;

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
    trace.incrementMetric('items_reserved', 1);
    return { success: true, id: itemId, ...itemData, ...updates };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'reserve_wishlist_item',
        userId,
        itemId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to reserve wishlist item');
    }
  });
});

/**
 * Purchase Wishlist Item
 * Replaces: POST /api/items/:id/purchase
 */
export const purchaseWishlistItem = onCall(publicCallableOptions, async (request: CallableRequest) => {
  // WP-01: Verify device integrity before mutation
  await requireAppCheck(request);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { itemId } = request.data;
  if (!itemId) {
    throw new HttpsError('invalid-argument', 'Item ID is required');
  }

  const userId = request.auth.uid;
  const trace = new CustomTrace('purchase_wishlist_item');
  trace.putAttribute('item_id', itemId);
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
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
    const isOwner = wishlistData.userId === userId;
    const collaboratorRole = wishlistData.isCollaborative
      ? await getCollaboratorRole(wishlistDoc.id, userId)
      : null;
    const canPurchaseAsCollaborator = hasCollaboratorRole(collaboratorRole, ['owner', 'editor', 'commenter']);
    const canPurchase = isOwner || canPurchaseAsCollaborator || !!wishlistData.isPublic;

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
    trace.incrementMetric('items_purchased', 1);
    return { success: true, id: itemId, ...itemData, ...updates };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'purchase_wishlist_item',
        userId,
        itemId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to purchase wishlist item');
    }
  });
});

/**
 * Update Wishlist Item
 * Replaces: PATCH /api/items/:id
 */
export const updateWishlistItem = onCall(publicCallableOptions, async (request: CallableRequest) => {
  // WP-01: Verify device integrity before mutation
  await requireAppCheck(request);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { itemId, updates } = request.data;
  if (!itemId || !updates) {
    throw new HttpsError('invalid-argument', 'Item ID and updates are required');
  }

  const userId = request.auth.uid;
  const trace = new CustomTrace('update_wishlist_item');
  trace.putAttribute('item_id', itemId);
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
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

      const wishlistData = wishlistDoc.data() || {};
      const isOwner = wishlistData.userId === userId;
      const collaboratorRole = wishlistData.isCollaborative
        ? await getCollaboratorRole(String(itemData?.wishlistId || ''), userId)
        : null;
      const canEditAsCollaborator = hasCollaboratorRole(collaboratorRole, ['owner', 'editor']);

      if (!isOwner && !canEditAsCollaborator) {
        throw new HttpsError('permission-denied', 'You do not have permission to update items in this wishlist');
      }

      await db.collection('wishlistItems').doc(itemId).update({
        ...updates,
        updatedAt: new Date()
      });

      trace.incrementMetric('items_updated', 1);
      return { id: itemId, ...itemData, ...updates };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'update_wishlist_item',
        userId,
        itemId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to update wishlist item');
    }
  });
});

/**
 * Delete Wishlist Item
 * Replaces: DELETE /api/items/:id
 */
export const deleteWishlistItem = onCall(publicCallableOptions, async (request: CallableRequest) => {
  // WP-01: Verify device integrity before mutation
  await requireAppCheck(request);

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { itemId } = request.data;
  if (!itemId) {
    throw new HttpsError('invalid-argument', 'Item ID is required');
  }

  const userId = request.auth.uid;
  const trace = new CustomTrace('delete_wishlist_item');
  trace.putAttribute('item_id', itemId);
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
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

      const wishlistData = wishlistDoc.data() || {};
      const isOwner = wishlistData.userId === userId;
      const collaboratorRole = wishlistData.isCollaborative
        ? await getCollaboratorRole(String(itemData?.wishlistId || ''), userId)
        : null;
      const canEditAsCollaborator = hasCollaboratorRole(collaboratorRole, ['owner', 'editor']);

      if (!isOwner && !canEditAsCollaborator) {
        throw new HttpsError('permission-denied', 'You do not have permission to delete items in this wishlist');
      }

      await db.collection('wishlistItems').doc(itemId).delete();
      trace.incrementMetric('items_deleted', 1);
      return { success: true };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'delete_wishlist_item',
        userId,
        itemId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to delete wishlist item');
    }
  });
});

// Helper Functions

type CollaboratorRole = 'owner' | 'editor' | 'commenter' | 'viewer';

function normalizeCollaboratorRole(role: unknown): CollaboratorRole {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'owner' || normalized === 'editor' || normalized === 'commenter' || normalized === 'viewer') {
    return normalized;
  }

  // Backward compatibility: existing collaborator entries without explicit role
  // default to editor privileges, matching previous collaborator behavior.
  return 'editor';
}

async function getCollaboratorRole(wishlistId: string, userId: string): Promise<CollaboratorRole | null> {
  const collaboratorSnapshot = await db
    .collection('collaborators')
    .where('wishlistId', '==', wishlistId)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (collaboratorSnapshot.empty) {
    return null;
  }

  const collaboratorData = collaboratorSnapshot.docs[0].data();
  return normalizeCollaboratorRole(collaboratorData?.role);
}

function hasCollaboratorRole(role: CollaboratorRole | null, allowedRoles: CollaboratorRole[]): boolean {
  return role !== null && allowedRoles.includes(role);
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