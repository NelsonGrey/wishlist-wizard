// Main API router for /api/extension/* endpoints
// Dispatches HTTP requests to the appropriate handler based on method and path

import { onRequest, Request } from 'firebase-functions/v2/https';
import { Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { ensureFirebaseAdmin } from '../firebase-admin.js';
import { getBearerTokenFromHeaders } from '../utils/http-normalization.js';

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

// Main API router function
export const api = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const path = req.path;
  const method = req.method;

  try {
    // Verify authentication for all endpoints
    const userId = await verifyFirebaseToken(req);
    if (!userId) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    // Route requests based on method and path
    if (method === 'GET' && path === '/api/extension/wishlists') {
      // GET /api/extension/wishlists
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
        itemCount: doc.data().itemCount || 0,
        createdAt: doc.data().createdAt,
        updatedAt: doc.data().updatedAt
      }));

      sendJson(res, wishlists);
    } 
    else if (method === 'POST' && path === '/api/extension/wishlists') {
      // POST /api/extension/wishlists - Create new wishlist
      const { name, description } = req.body;
      if (!name) {
        sendError(res, 400, 'Wishlist name is required');
        return;
      }

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
    }
    else if (method === 'POST' && path === '/api/extension/items') {
      // POST /api/extension/items - Add item to wishlist
      const { wishlistId, title, productUrl, imageUrl, price, store, addedAt } = req.body;
      
      if (!wishlistId || !title) {
        sendError(res, 400, 'Wishlist ID and title are required');
        return;
      }

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

      const itemRef = db.collection('wishlistItems').doc();
      const now = new Date();

      const itemData = {
        wishlistId,
        title: String(title).trim(),
        productUrl: productUrl || null,
        imageUrl: imageUrl || null,
        price: price || null,
        store: store || null,
        note: req.body?.note || '',
        purchased: false,
        reserved: false,
        addedBy: userId,
        createdAt: now,
        updatedAt: now,
        addedAt: addedAt || now,
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
    }
    else if (method === 'GET' && path === '/api/extension/recent-items') {
      // GET /api/extension/recent-items
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
    }
    else if (method === 'GET' && path.match(/^\/api\/extension\/wishlists\/[^/]+\/items$/)) {
      // GET /api/extension/wishlists/:wishlistId/items
      const wishlistId = path.split('/')[4];
      
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

      const items = itemsSnapshot.docs
        .map(doc => ({
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
          return getTime((b as any).createdAt || (b as any).addedAt) - getTime((a as any).createdAt || (a as any).addedAt);
        });

      sendJson(res, items);
    }
    else if (method === 'DELETE' && path.match(/^\/api\/extension\/items\/[^/]+$/)) {
      // DELETE /api/extension/items/:itemId
      const itemId = path.split('/')[4];

      const itemDoc = await db.collection('wishlistItems').doc(itemId).get();
      if (!itemDoc.exists) {
        sendError(res, 404, 'Item not found');
        return;
      }

      const itemData = itemDoc.data();
      const wishlistId = itemData?.wishlistId;
      if (!wishlistId) {
        sendError(res, 400, 'Invalid item data');
        return;
      }

      const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
      if (!wishlistDoc.exists) {
        sendError(res, 404, 'Wishlist not found');
        return;
      }

      if (wishlistDoc.data()?.userId !== userId) {
        sendError(res, 403, 'You can only remove items from your own wishlists');
        return;
      }

      await itemDoc.ref.delete();

      const wishlistData = wishlistDoc.data();
      await wishlistDoc.ref.update({
        itemCount: Math.max(0, (wishlistData?.itemCount || 0) - 1),
        updatedAt: new Date()
      });

      sendJson(res, { success: true, message: 'Item deleted' });
    }
    else if (method === 'POST' && path.match(/^\/api\/extension\/wishlists\/[^/]+\/share$/)) {
      // POST /api/extension/wishlists/:wishlistId/share
      const wishlistId = path.split('/')[4];
      
      const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
      if (!wishlistDoc.exists) {
        sendError(res, 404, 'Wishlist not found');
        return;
      }

      if (wishlistDoc.data()?.userId !== userId) {
        sendError(res, 403, 'You can only share your own wishlists');
        return;
      }

      await wishlistDoc.ref.update({
        isPublic: true,
        updatedAt: new Date().toISOString(),
        sharedAt: new Date().toISOString()
      });

      const baseUrl = 'https://wishlist-wizard-dev.web.app';
      const shareUrl = `${baseUrl}/wishlist/shared/${wishlistId}`;

      sendJson(res, { shareUrl, wishlistId });
    }
    else {
      sendError(res, 404, 'Endpoint not found');
    }
  } 
  catch (error: any) {
    logger.error('API Error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

