// Firebase Functions - Browser Extension API
// Provides Firebase Auth-compatible API for browser extension

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { convertAffiliateUrl } from '../utils/affiliate.js';

const auth = getAuth();
const db = getFirestore();

/**
 * Extension Authentication
 * Validates Firebase ID tokens from browser extension
 */
export const authenticateExtension = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Invalid authentication token');
  }

  try {
    const user = await auth.getUser(request.auth.uid);
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    return {
      authenticated: true,
      user: {
        id: user.uid,
        email: user.email,
        displayName: user.displayName || userData?.displayName,
        photoURL: user.photoURL || userData?.avatarUrl
      }
    };
  } catch (error) {
    logger.error('Extension authentication error:', error);
    throw new HttpsError('unauthenticated', 'Authentication failed');
  }
});

/**
 * Get Extension Wishlists
 * Simplified wishlist endpoint for browser extension
 */
export const getExtensionWishlists = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const userId = request.auth.uid;
    const wishlistsSnapshot = await db
      .collection('wishlists')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();

    const wishlists = wishlistsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      description: doc.data().description,
      isPublic: doc.data().isPublic,
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt
    }));

    return { wishlists };
  } catch (error) {
    logger.error('Error getting extension wishlists:', error);
    throw new HttpsError('internal', 'Failed to get wishlists');
  }
});

/**
 * Add Item from Extension
 * Simplified item addition for browser extension
 */
export const addItemFromExtension = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { wishlistId, title, productUrl, imageUrl, price, store } = request.data;

  if (!wishlistId || !title) {
    throw new HttpsError('invalid-argument', 'Wishlist ID and title are required');
  }

  try {
    // Verify user owns the wishlist
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    if (!wishlistDoc.exists) {
      throw new HttpsError('not-found', 'Wishlist not found');
    }

    const wishlistData = wishlistDoc.data();
    if (wishlistData?.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'You can only add items to your own wishlists');
    }

    const affiliateConversion = productUrl ? convertAffiliateUrl(productUrl) : null;

    const itemData = {
      wishlistId,
      title: title.trim(),
      productUrl: affiliateConversion?.wasConverted ? affiliateConversion.convertedUrl : productUrl || null,
      imageUrl: imageUrl || null,
      price: price || null,
      store: store || null,
      addedBy: request.auth.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (affiliateConversion?.wasConverted) {
      itemData.metadata = {
        affiliateConversion: {
          originalUrl: affiliateConversion.originalUrl,
          affiliateProgram: affiliateConversion.program?.name || null,
          convertedAt: new Date().toISOString(),
          commission: affiliateConversion.program?.defaultCommission || 0,
          tagUsed: affiliateConversion.tagUsed || null,
        },
      };
    }

    const docRef = await db.collection('wishlistItems').add(itemData);

    // Track extension usage analytics
    await trackExtensionUsage(request.auth.uid, 'item_added', {
      wishlistId,
      itemTitle: title,
      store,
      hasUrl: !!productUrl,
      hasImage: !!imageUrl,
      hasPrice: !!price
    });

    return { 
      id: docRef.id, 
      ...itemData,
      success: true,
      message: `Added "${title}" to your wishlist`
    };
  } catch (error) {
    logger.error('Error adding item from extension:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to add item');
  }
});

/**
 * Get Recent Items for Extension
 * Get recently added items across all user's wishlists
 */
export const getExtensionRecentItems = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { limit = 20 } = request.data;

  try {
    const userId = request.auth.uid;
    
    // Get user's wishlists
    const wishlistsSnapshot = await db
      .collection('wishlists')
      .where('userId', '==', userId)
      .get();

    const wishlistIds = wishlistsSnapshot.docs.map(doc => doc.id);

    if (wishlistIds.length === 0) {
      return { items: [] };
    }

    // Get recent items from all wishlists
    const itemsSnapshot = await db
      .collection('wishlistItems')
      .where('wishlistId', 'in', wishlistIds.slice(0, 10)) // Firestore 'in' query limit
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const items = itemsSnapshot.docs.map(doc => {
      const itemData = doc.data();
      const wishlist = wishlistsSnapshot.docs.find(w => w.id === itemData.wishlistId);
      
      return {
        id: doc.id,
        title: itemData.title,
        productUrl: itemData.productUrl,
        imageUrl: itemData.imageUrl,
        price: itemData.price,
        store: itemData.store,
        createdAt: itemData.createdAt,
        wishlistName: wishlist?.data().name || 'Unknown'
      };
    });

    return { items };
  } catch (error) {
    logger.error('Error getting extension recent items:', error);
    throw new HttpsError('internal', 'Failed to get recent items');
  }
});

/**
 * Create Wishlist from Extension
 * Quick wishlist creation for browser extension
 */
export const createExtensionWishlist = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { name } = request.data;

  if (!name || name.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'Wishlist name is required');
  }

  try {
    const wishlistData = {
      userId: request.auth.uid,
      name: name.trim(),
      description: '',
      isPublic: false,
      isCollaborative: false,
      shareId: generateExtensionId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('wishlists').add(wishlistData);

    // Track extension usage
    await trackExtensionUsage(request.auth.uid, 'wishlist_created', {
      wishlistName: name,
      source: 'extension'
    });

    return { 
      id: docRef.id, 
      ...wishlistData,
      success: true,
      message: `Created wishlist "${name}"`
    };
  } catch (error) {
    logger.error('Error creating wishlist from extension:', error);
    throw new HttpsError('internal', 'Failed to create wishlist');
  }
});

/**
 * Delete Item from Extension
 * Remove item from wishlist via extension
 */
export const deleteExtensionItem = onCall(async (request: CallableRequest) => {
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
    
    // Verify user owns the wishlist containing this item
    const wishlistDoc = await db.collection('wishlists').doc(itemData?.wishlistId).get();
    if (!wishlistDoc.exists || wishlistDoc.data()?.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'You can only delete items from your own wishlists');
    }

    await db.collection('wishlistItems').doc(itemId).delete();

    // Track extension usage
    await trackExtensionUsage(request.auth.uid, 'item_deleted', {
      itemTitle: itemData?.title,
      wishlistId: itemData?.wishlistId,
      source: 'extension'
    });

    return { 
      success: true,
      message: `Deleted "${itemData?.title}" from your wishlist`
    };
  } catch (error) {
    logger.error('Error deleting item from extension:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to delete item');
  }
});

/**
 * Share Wishlist from Extension
 * Generates or returns share link
 */
export const shareExtensionWishlist = onCall(async (request: CallableRequest) => {
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
      throw new HttpsError('permission-denied', 'You can only share your own wishlists');
    }

    let shareId = wishlistData?.shareId;
    if (!shareId) {
      shareId = generateExtensionId();
      await db.collection('wishlists').doc(wishlistId).update({ shareId });
    }

    const shareUrl = `https://wishlist-wizard.com/shared/${shareId}`;

    return { shareUrl };
  } catch (error) {
    logger.error('Error sharing wishlist from extension:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to share wishlist');
  }
});

/**
 * Get Extension Analytics
 * Basic usage analytics for extension users
 */
export const getExtensionAnalytics = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const userId = request.auth.uid;
    
    // Get total wishlists
    const wishlistsCount = await db
      .collection('wishlists')
      .where('userId', '==', userId)
      .count()
      .get();

    // Get total items
    const itemsCount = await db
      .collection('wishlistItems')
      .where('addedBy', '==', userId)
      .count()
      .get();

    // Get recent extension activity
    const recentActivity = await db
      .collection('extensionAnalytics')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const activities = recentActivity.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      totalWishlists: wishlistsCount.data().count,
      totalItems: itemsCount.data().count,
      recentActivities: activities
    };
  } catch (error) {
    logger.error('Error getting extension analytics:', error);
    throw new HttpsError('internal', 'Failed to get analytics');
  }
});

/**
 * Track Extension Event
 * Used by browser extension to record analytics events
 */
export const trackExtensionEvent = onCall(async (request: CallableRequest) => {
  const { action, category, label, value, url, timestamp } = request.data || {};

  if (!action) {
    throw new HttpsError('invalid-argument', 'Action is required');
  }

  try {
    await db.collection('extensionAnalytics').add({
      userId: request.auth?.uid || null,
      action,
      category: category || 'extension',
      label: label || null,
      value: value || null,
      url: url || null,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      userAgent: 'browser-extension'
    });

    return { success: true };
  } catch (error) {
    logger.error('Error tracking extension event:', error);
    throw new HttpsError('internal', 'Failed to track extension event');
  }
});

// Helper Functions

function generateExtensionId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

async function trackExtensionUsage(userId: string, action: string, data: any) {
  try {
    await db.collection('extensionAnalytics').add({
      userId,
      action,
      data,
      timestamp: new Date(),
      userAgent: 'browser-extension'
    });
  } catch (error) {
    logger.error('Error tracking extension usage:', error);
    // Don't throw - analytics shouldn't break main functionality
  }
}