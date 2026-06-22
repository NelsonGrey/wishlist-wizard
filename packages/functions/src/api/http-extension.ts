// HTTP Wrapper Endpoints for Browser Extension
// These endpoints wrap the onCall Cloud Functions to provide HTTP endpoints for the browser extension
// Maps HTTP requests to the corresponding Cloud Functions

import { onRequest, Request } from 'firebase-functions/v2/https';
import { Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { ensureFirebaseAdmin } from '../firebase-admin.js';
import { getBearerTokenFromHeaders, getRequestIdentifier, normalizeText } from '../utils/http-normalization.js';

ensureFirebaseAdmin();
const auth = getAuth();
const db = getFirestore();

// Middleware to verify Firebase ID token from Authorization header
async function verifyFirebaseToken(req: Request): Promise<string | null> {
  const token = getBearerTokenFromHeaders(req.headers);
  if (!token) {
    return null;
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    logger.error('Token verification failed:', error);
    return null;
  }
}

// Helper to send JSON response
function sendJson(res: Response, data: any) {
  res.set('Content-Type', 'application/json');
  res.send(data);
}

// Helper to send error response
function sendError(res: Response, code: number, message: string, details?: any) {
  res.set('Content-Type', 'application/json');
  res.status(code).send({
    error: message,
    ...(details && { details })
  });
}

// GET /api/extension/wishlists
export const extensionGetWishlists = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const userId = await verifyFirebaseToken(req);
  if (!userId) {
    sendError(res, 401, 'Unauthorized');
    return;
  }

  try {
    const wishlistsSnapshot = await db
      .collection('wishlists')
      .where('userId', '==', userId)
      .limit(20)
      .get();

    const wishlists = wishlistsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      description: doc.data().description,
      isPublic: doc.data().isPublic,
      itemCount: doc.data().itemCount || 0,
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt
    }))
    .sort((a, b) => {
      const getTime = (value: any): number => {
        if (!value) return 0;
        if (typeof value?.toMillis === 'function') return value.toMillis();
        const parsed = new Date(value).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
      };
      return getTime(b.updatedAt) - getTime(a.updatedAt);
    });

    sendJson(res, wishlists);
  } catch (error) {
    logger.error('Error getting wishlists:', error);
    sendError(res, 500, 'Failed to get wishlists');
  }
});

// POST /api/extension/wishlists
export const extensionCreateWishlist = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const userId = await verifyFirebaseToken(req);
  if (!userId) {
    sendError(res, 401, 'Unauthorized');
    return;
  }

  const { name, description } = req.body;
  if (!name) {
    sendError(res, 400, 'Wishlist name is required');
    return;
  }

  try {
    const now = new Date().toISOString();
    const docRef = db.collection('wishlists').doc();
    
    const wishlistData = {
      userId,
      name,
      description: description || '',
      isPublic: false,
      itemCount: 0,
      createdAt: now,
      updatedAt: now
    };

    await docRef.set(wishlistData);

    sendJson(res, {
      id: docRef.id,
      ...wishlistData
    });
  } catch (error) {
    logger.error('Error creating wishlist:', error);
    sendError(res, 500, 'Failed to create wishlist');
  }
});

// POST /api/extension/items (Add item to wishlist)
export const extensionAddItem = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const userId = await verifyFirebaseToken(req);
  if (!userId) {
    sendError(res, 401, 'Unauthorized');
    return;
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const wishlistId = normalizeText(body.wishlistId);
  const title = normalizeText(body.title);
  const productUrl = normalizeText(body.productUrl) || null;
  const imageUrl = normalizeText(body.imageUrl) || null;
  const price = normalizeText(body.price) || null;
  const store = normalizeText(body.store) || null;
  const note = normalizeText(body.note);
  const addedAt = body.addedAt;
  
  if (!wishlistId || !title) {
    sendError(res, 400, 'Wishlist ID and title are required');
    return;
  }

  try {
    // Verify user owns the wishlist
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    if (!wishlistDoc.exists) {
      sendError(res, 404, 'Wishlist not found');
      return;
    }

    const wishlistData = wishlistDoc.data();
    if (wishlistData?.userId !== userId) {
      sendError(res, 403, 'You can only add items to your own wishlists');
      return;
    }

    // Add item using the same schema the website uses
    const itemRef = db.collection('wishlistItems').doc();
    const now = new Date();

    const itemData = {
      wishlistId,
      title,
      productUrl,
      imageUrl,
      price,
      store,
      note,
      purchased: false,
      reserved: false,
      addedBy: userId,
      createdAt: now,
      updatedAt: now,
      // Keep backward-compatible field for extension analytics display
      addedAt: addedAt || now.toISOString(),
    };

    await itemRef.set(itemData);

    // Update wishlist item count
    await wishlistDoc.ref.update({
      itemCount: (wishlistData?.itemCount || 0) + 1,
      updatedAt: now
    });

    sendJson(res, {
      id: itemRef.id,
      ...itemData
    });
  } catch (error) {
    logger.error('Error adding item:', error);
    sendError(res, 500, 'Failed to add item');
  }
});

// GET /api/extension/recent-items
export const extensionGetRecentItems = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const userId = await verifyFirebaseToken(req);
  if (!userId) {
    sendError(res, 401, 'Unauthorized');
    return;
  }

  try {
    // Get recent items from all user wishlists
    const wishlistsSnapshot = await db
      .collection('wishlists')
      .where('userId', '==', userId)
      .get();

    const items: any[] = [];

    for (const wishlistDoc of wishlistsSnapshot.docs) {
      const itemsSnapshot = await db
        .collection('wishlistItems')
        .where('wishlistId', '==', wishlistDoc.id)
        .limit(10)
        .get();

      itemsSnapshot.docs.forEach(itemDoc => {
        items.push({
          id: itemDoc.id,
          wishlistId: wishlistDoc.id,
          wishlistName: wishlistDoc.data().name,
          ...itemDoc.data()
        });
      });
    }

    // Sort all items by addedAt descending and return top 20
    const recentItems = items
      .sort((a, b) => {
        const getTime = (value: any): number => {
          if (!value) return 0;
          if (typeof value?.toMillis === 'function') return value.toMillis();
          const parsed = new Date(value).getTime();
          return Number.isNaN(parsed) ? 0 : parsed;
        };
        return getTime(b.createdAt || b.addedAt) - getTime(a.createdAt || a.addedAt);
      })
      .slice(0, 20);

    sendJson(res, recentItems);
  } catch (error) {
    logger.error('Error getting recent items:', error);
    sendError(res, 500, 'Failed to get recent items');
  }
});

// GET /api/extension/wishlists/:wishlistId/items
export const extensionGetWishlistItems = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const userId = await verifyFirebaseToken(req);
  if (!userId) {
    sendError(res, 401, 'Unauthorized');
    return;
  }

  const wishlistId = getRequestIdentifier(req, 4, 'wishlistId', 'wishlistId');
  if (!wishlistId) {
    sendError(res, 400, 'Wishlist ID is required');
    return;
  }

  try {
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    if (!wishlistDoc.exists) {
      sendError(res, 404, 'Wishlist not found');
      return;
    }

    if (wishlistDoc.data()?.userId !== userId) {
      sendError(res, 403, 'You do not have access to this wishlist');
      return;
    }

    const itemsSnapshot = await db
      .collection('wishlistItems')
      .where('wishlistId', '==', wishlistId)
      .get();

    const items = itemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .sort((a, b) => {
      const getTime = (value: any): number => {
        if (!value) return 0;
        if (typeof value?.toMillis === 'function') return value.toMillis();
        const parsed = new Date(value).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
      };
      const bAny = b as any;
      const aAny = a as any;
      return getTime(bAny.createdAt || bAny.addedAt) - getTime(aAny.createdAt || aAny.addedAt);
    });

    sendJson(res, items);
  } catch (error) {
    logger.error('Error getting wishlist items:', error);
    sendError(res, 500, 'Failed to get wishlist items');
  }
});

// DELETE /api/extension/items/:itemId
export const extensionDeleteItem = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'DELETE') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const userId = await verifyFirebaseToken(req);
  if (!userId) {
    sendError(res, 401, 'Unauthorized');
    return;
  }

  const itemId = getRequestIdentifier(req, 4, 'itemId', 'itemId');
  if (!itemId) {
    sendError(res, 400, 'Item ID is required');
    return;
  }

  try {
    const itemDoc = await db.collection('wishlistItems').doc(itemId).get();
    if (!itemDoc.exists) {
      sendError(res, 404, 'Item not found');
      return;
    }

    const itemData = itemDoc.data();
    const wishlistIdFromItem = normalizeText(itemData?.wishlistId);
    if (!wishlistIdFromItem) {
      sendError(res, 400, 'Invalid item data');
      return;
    }

    const wishlistDoc = await db.collection('wishlists').doc(wishlistIdFromItem).get();
    if (!wishlistDoc.exists) {
      sendError(res, 404, 'Wishlist not found');
      return;
    }

    if (wishlistDoc.data()?.userId !== userId) {
      sendError(res, 403, 'You can only remove items from your own wishlists');
      return;
    }

    await itemDoc.ref.delete();

    // Update wishlist item count
    const wishlistData = wishlistDoc.data();
    await wishlistDoc.ref.update({
      itemCount: Math.max(0, (wishlistData?.itemCount || 0) - 1),
      updatedAt: new Date()
    });

    sendJson(res, { success: true, message: 'Item deleted' });
  } catch (error) {
    logger.error('Error deleting item:', error);
    sendError(res, 500, 'Failed to delete item');
  }
});

// POST /api/extension/wishlists/:wishlistId/share
export const extensionShareWishlist = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const userId = await verifyFirebaseToken(req);
  if (!userId) {
    sendError(res, 401, 'Unauthorized');
    return;
  }

  const wishlistId = getRequestIdentifier(req, 4, 'wishlistId', 'wishlistId');
  if (!wishlistId) {
    sendError(res, 400, 'Wishlist ID is required');
    return;
  }

  try {
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    if (!wishlistDoc.exists) {
      sendError(res, 404, 'Wishlist not found');
      return;
    }

    if (wishlistDoc.data()?.userId !== userId) {
      sendError(res, 403, 'You can only share your own wishlists');
      return;
    }

    // Update wishlist to be public
    await wishlistDoc.ref.update({
      isPublic: true,
      updatedAt: new Date().toISOString(),
      sharedAt: new Date().toISOString()
    });

    // Generate share URL (base URL depends on deployment environment)
    const baseUrl = process.env.FIREBASE_CONFIG ? 'https://wishlist-wizard-dev.web.app' : 'https://wishlist-wizard.com';
    const shareUrl = `${baseUrl}/wishlist/shared/${wishlistId}`;

    sendJson(res, { shareUrl, wishlistId });
  } catch (error) {
    logger.error('Error sharing wishlist:', error);
    sendError(res, 500, 'Failed to share wishlist');
  }
});
