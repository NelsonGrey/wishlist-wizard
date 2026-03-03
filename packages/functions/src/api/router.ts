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

function parseBody(req: Request): Record<string, any> {
  const body = req.body;
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, any> : {};
    } catch {
      return {};
    }
  }
  return typeof body === 'object' ? body as Record<string, any> : {};
}

function getDateLike(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const parsed = value.toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
    if (method === 'GET' && path === '/api/beneficiaries') {
      const snapshot = await db
        .collection('beneficiaries')
        .where('ownerId', '==', userId)
        .get();

      const beneficiaries = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((entry: any) => !entry.isHidden)
        .sort((left: any, right: any) => {
          const leftTime = getDateLike(left.updatedAt || left.createdAt)?.getTime() || 0;
          const rightTime = getDateLike(right.updatedAt || right.createdAt)?.getTime() || 0;
          return rightTime - leftTime;
        });

      sendJson(res, beneficiaries);
    }
    else if (method === 'GET' && path === '/api/recommendations') {
      const snapshot = await db
        .collection('recommendations')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(40)
        .get();

      const recommendations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      sendJson(res, recommendations);
    }
    else if (method === 'GET' && path.match(/^\/api\/recommendations\/beneficiary\/[^/]+$/)) {
      const beneficiaryId = path.split('/')[4];
      const snapshot = await db
        .collection('recommendations')
        .where('userId', '==', userId)
        .where('targetBeneficiaryId', '==', beneficiaryId)
        .orderBy('createdAt', 'desc')
        .limit(40)
        .get();

      const recommendations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      sendJson(res, recommendations);
    }
    else if (method === 'PATCH' && path.match(/^\/api\/recommendations\/[^/]+\/status$/)) {
      const recommendationId = path.split('/')[3];
      const updates = parseBody(req);
      const recommendationRef = db.collection('recommendations').doc(recommendationId);
      const recommendationDoc = await recommendationRef.get();

      if (!recommendationDoc.exists) {
        sendError(res, 404, 'Recommendation not found');
        return;
      }

      if (recommendationDoc.data()?.userId !== userId) {
        sendError(res, 403, 'You can only update your own recommendations');
        return;
      }

      const patch = {
        ...(typeof updates.isViewed === 'boolean' ? { isViewed: updates.isViewed } : {}),
        ...(typeof updates.isSaved === 'boolean' ? { isSaved: updates.isSaved } : {}),
        ...(typeof updates.isRejected === 'boolean' ? { isRejected: updates.isRejected } : {}),
        updatedAt: new Date(),
      };

      await recommendationRef.update(patch);
      sendJson(res, { success: true, id: recommendationId, ...patch });
    }
    else if (method === 'GET' && path === '/api/privacy/defaults') {
      const defaultsDoc = await db.collection('privacyDefaults').doc(userId).get();
      const defaults = defaultsDoc.exists
        ? defaultsDoc.data()
        : {
            defaultWishlistVisibility: 'private',
            defaultItemVisibility: 'private',
            allowComments: true,
            allowReservations: true,
            requireApproval: false,
          };
      sendJson(res, defaults);
    }
    else if (method === 'GET' && path.match(/^\/api\/privacy\/settings\/(wishlist|item)\/[^/]+$/)) {
      const entityType = path.split('/')[4];
      const entityId = path.split('/')[5];
      const ref = db.collection('privacySettings').doc(`${entityType}:${entityId}`);
      const doc = await ref.get();
      if (!doc.exists) {
        sendError(res, 404, 'Privacy settings not found');
        return;
      }
      const data = doc.data() || {};
      if (data.userId !== userId) {
        sendError(res, 403, 'Access denied');
        return;
      }
      sendJson(res, { id: doc.id, ...data });
    }
    else if (method === 'POST' && path === '/api/privacy/settings') {
      const body = parseBody(req);
      const entityType = String(body.entityType || '').trim();
      const entityId = String(body.entityId || '').trim();

      if (!entityType || !entityId) {
        sendError(res, 400, 'Entity type and entity ID are required');
        return;
      }

      const ref = db.collection('privacySettings').doc(`${entityType}:${entityId}`);
      await ref.set({
        userId,
        entityType,
        entityId,
        visibilityLevel: body.visibilityLevel || 'private',
        customAccessList: Array.isArray(body.customAccessList) ? body.customAccessList : [],
        expirationDate: body.expirationDate || null,
        allowComments: typeof body.allowComments === 'boolean' ? body.allowComments : true,
        allowReservations: typeof body.allowReservations === 'boolean' ? body.allowReservations : true,
        requireApproval: typeof body.requireApproval === 'boolean' ? body.requireApproval : false,
        updatedAt: new Date(),
        createdAt: new Date(),
      }, { merge: true });

      const updated = await ref.get();
      sendJson(res, { id: updated.id, ...updated.data() });
    }
    else if (method === 'PUT' && path.match(/^\/api\/privacy\/settings\/(wishlist|item)\/[^/]+\/access-list$/)) {
      const entityType = path.split('/')[4];
      const entityId = path.split('/')[5];
      const body = parseBody(req);
      const userIds = Array.isArray(body.userIds) ? body.userIds : [];
      const ref = db.collection('privacySettings').doc(`${entityType}:${entityId}`);
      const existing = await ref.get();
      if (existing.exists && existing.data()?.userId !== userId) {
        sendError(res, 403, 'Access denied');
        return;
      }
      await ref.set({ userId, entityType, entityId, customAccessList: userIds, updatedAt: new Date() }, { merge: true });
      sendJson(res, { success: true, customAccessList: userIds });
    }
    else if (method === 'DELETE' && path.match(/^\/api\/privacy\/settings\/(wishlist|item)\/[^/]+$/)) {
      const entityType = path.split('/')[4];
      const entityId = path.split('/')[5];
      const ref = db.collection('privacySettings').doc(`${entityType}:${entityId}`);
      const existing = await ref.get();
      if (existing.exists && existing.data()?.userId !== userId) {
        sendError(res, 403, 'Access denied');
        return;
      }
      await ref.delete();
      sendJson(res, { success: true });
    }
    else if (method === 'POST' && path === '/api/privacy/check-access') {
      const body = parseBody(req);
      const entityType = String(body.entityType || '').trim();
      const entityId = String(body.entityId || '').trim();
      const ref = db.collection('privacySettings').doc(`${entityType}:${entityId}`);
      const doc = await ref.get();

      if (!doc.exists) {
        sendJson(res, { hasAccess: true, requiresApproval: false, isOwner: true });
        return;
      }

      const data = doc.data() || {};
      const isOwner = data.userId === userId;
      const visibilityLevel = String(data.visibilityLevel || 'private');
      const customAccessList = Array.isArray(data.customAccessList) ? data.customAccessList.map(String) : [];
      const hasAccess = isOwner
        || visibilityLevel === 'public'
        || (visibilityLevel === 'custom' && customAccessList.includes(String(userId)));

      sendJson(res, {
        hasAccess,
        requiresApproval: Boolean(data.requireApproval) && !isOwner,
        isOwner,
      });
    }
    else if (method === 'GET' && path === '/api/price-alerts') {
      const snapshot = await db
        .collection('priceAlerts')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

      const alerts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      sendJson(res, alerts);
    }
    else if (method === 'DELETE' && path.match(/^\/api\/price-alerts\/[^/]+$/)) {
      const alertId = path.split('/')[3];
      const ref = db.collection('priceAlerts').doc(alertId);
      const doc = await ref.get();
      if (!doc.exists) {
        sendError(res, 404, 'Price alert not found');
        return;
      }
      if (doc.data()?.userId !== userId) {
        sendError(res, 403, 'Access denied');
        return;
      }
      await ref.delete();
      sendJson(res, { success: true });
    }
    else if (method === 'GET' && path === '/api/price-drops') {
      const snapshot = await db
        .collection('priceHistory')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      const drops = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((entry: any) => Number(entry.change) < 0)
        .map((entry: any) => ({
          id: entry.id,
          title: entry.productTitle || 'Tracked item',
          imageUrl: entry.imageUrl || null,
          price: entry.newPrice,
          currentPrice: entry.newPrice,
          previousPrice: entry.oldPrice,
          dropPercentage: Math.abs(Number(entry.changePercent) || 0),
          percentDrop: Math.abs(Number(entry.changePercent) || 0),
          store: entry.store || null,
        }));
      sendJson(res, drops);
    }
    else if (method === 'GET' && path === '/api/wishlist-items') {
      const wishlistsSnapshot = await db.collection('wishlists').where('userId', '==', userId).limit(100).get();
      const wishlistIds = wishlistsSnapshot.docs.map((doc) => doc.id);

      if (wishlistIds.length === 0) {
        sendJson(res, []);
        return;
      }

      const chunks: string[][] = [];
      for (let index = 0; index < wishlistIds.length; index += 10) {
        chunks.push(wishlistIds.slice(index, index + 10));
      }

      const items: any[] = [];
      for (const chunk of chunks) {
        const itemsSnapshot = await db.collection('wishlistItems').where('wishlistId', 'in', chunk).get();
        itemsSnapshot.docs.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      }

      sendJson(res, items);
    }
    else if (method === 'GET' && path === '/api/extension/wishlists') {
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

