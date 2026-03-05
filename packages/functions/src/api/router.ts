// Main API router for /api/extension/* endpoints
// Dispatches HTTP requests to the appropriate handler based on method and path

import { onRequest, Request } from 'firebase-functions/v2/https';
import { Response } from 'express';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { ensureFirebaseAdmin } from '../firebase-admin.js';
import { getBearerTokenFromHeaders } from '../utils/http-normalization.js';

ensureFirebaseAdmin();
const auth = getAuth();
const db = getFirestore();

type AuthenticatedApiUser = {
  uid: string;
  token: DecodedIdToken;
};

// Middleware to verify Firebase ID token from Authorization header
async function verifyFirebaseToken(req: Request): Promise<AuthenticatedApiUser | null> {
  const token = getBearerTokenFromHeaders(req.headers);
  if (!token) {
    return null;
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      token: decodedToken,
    };
  } catch (error) {
    logger.error('Token verification failed:', error);
    return null;
  }
}

async function isAdminApiUser(user: AuthenticatedApiUser): Promise<boolean> {
  if (user.token.admin === true || user.token.role === 'admin') {
    return true;
  }

  const userDoc = await db.collection('users').doc(user.uid).get();
  const userData = userDoc.exists ? userDoc.data() : null;
  return Boolean(userData?.isAdmin || userData?.role === 'admin');
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

function toNumberLike(value: any): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.\-]/g, '').trim();
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toBooleanLike(value: any, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return defaultValue;
}

function normalizeTextLike(value: any): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRetailerKey(value: any): string | null {
  const text = normalizeTextLike(value);
  if (!text) return null;

  let normalized = text.toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');
  normalized = normalized.split('/')[0];
  normalized = normalized.split('?')[0];
  normalized = normalized.split('#')[0];

  if (normalized.endsWith('.com')) normalized = normalized.slice(0, -4);
  if (normalized.endsWith('.co.uk')) normalized = normalized.slice(0, -6);
  if (normalized.endsWith('.net')) normalized = normalized.slice(0, -4);
  if (normalized.endsWith('.org')) normalized = normalized.slice(0, -4);

  normalized = normalized.replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  if (!normalized) return null;

  const compact = normalized.replace(/\s+/g, '');
  if (compact === 'appleinc') return 'apple';
  return compact;
}

function computeLandedPrice(offer: any): number | null {
  const total = toNumberLike(offer?.totalPrice);
  if (total !== null) return total;

  const base = toNumberLike(offer?.price) ?? toNumberLike(offer?.currentPrice);
  if (base === null) return null;

  const shipping = toNumberLike(offer?.shippingCost) ?? 0;
  const fees = toNumberLike(offer?.fees) ?? 0;
  const discount = toNumberLike(offer?.discountAmount) ?? 0;
  const landed = base + shipping + fees - discount;
  return Number.isFinite(landed) ? Number(landed.toFixed(2)) : null;
}

function normalizeOffer(offerDoc: any) {
  const source = offerDoc || {};
  const matchType = normalizeTextLike(source.matchType)?.toLowerCase() || 'probable';
  const confidence = toNumberLike(source.matchConfidence);
  const landedPrice = computeLandedPrice(source);

  return {
    ...source,
    matchType,
    matchConfidence: confidence,
    landedPrice,
    isAlternative: toBooleanLike(source.isAlternative, false),
    membershipRequired: toBooleanLike(source.membershipRequired, false),
    sellerRating: toNumberLike(source.sellerRating),
    inStock: toBooleanLike(source.inStock, true),
    warrantyIncluded: toBooleanLike(source.warrantyIncluded, false),
    returnWindowDays: toNumberLike(source.returnWindowDays),
    counterfeitRisk: normalizeTextLike(source.counterfeitRisk) || 'unknown',
    sellerTrust: normalizeTextLike(source.sellerTrust) || 'unknown',
  };
}

function parseIntegerLike(value: any): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
}

function normalizeAlertPolicy(alert: any) {
  const thresholdPercent = toNumberLike(alert?.thresholdPercent);
  const thresholdAmount = toNumberLike(alert?.thresholdAmount);
  const cooldownMinutes = parseIntegerLike(alert?.cooldownMinutes);
  const alertCadence = normalizeTextLike(alert?.alertCadence)?.toLowerCase();
  const quietHoursRaw = alert?.quietHours && typeof alert.quietHours === 'object' ? alert.quietHours : null;

  const quietStart = parseIntegerLike(quietHoursRaw?.startHour);
  const quietEnd = parseIntegerLike(quietHoursRaw?.endHour);
  const quietTimezone = normalizeTextLike(quietHoursRaw?.timezone);

  return {
    thresholdPercent: thresholdPercent ?? null,
    thresholdAmount: thresholdAmount ?? null,
    cooldownMinutes: cooldownMinutes ?? 60,
    alertCadence: ['high', 'normal', 'low'].includes(String(alertCadence)) ? alertCadence : 'normal',
    quietHours: quietStart !== null && quietEnd !== null && quietTimezone
      ? { startHour: quietStart, endHour: quietEnd, timezone: quietTimezone }
      : null,
  };
}

function validateQuietHours(quietHours: any): { valid: boolean; reason?: string } {
  if (!quietHours || typeof quietHours !== 'object') {
    return { valid: false, reason: 'quietHours must be an object with startHour, endHour, and timezone' };
  }

  const startHour = parseIntegerLike(quietHours.startHour);
  const endHour = parseIntegerLike(quietHours.endHour);
  const timezone = normalizeTextLike(quietHours.timezone);

  if (startHour === null || endHour === null || !timezone) {
    return { valid: false, reason: 'quietHours requires integer startHour/endHour and timezone' };
  }
  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
    return { valid: false, reason: 'quietHours startHour/endHour must be in range 0..23' };
  }

  return { valid: true };
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
    const authenticatedUser = await verifyFirebaseToken(req);
    if (!authenticatedUser) {
      sendError(res, 401, 'Unauthorized');
      return;
    }
    const userId = authenticatedUser.uid;

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
        .limit(40)
        .get();

      const recommendations = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((left: any, right: any) => {
          const leftTime = getDateLike(left.createdAt)?.getTime() || 0;
          const rightTime = getDateLike(right.createdAt)?.getTime() || 0;
          return rightTime - leftTime;
        })
        .slice(0, 40);
      sendJson(res, recommendations);
    }
    else if (method === 'GET' && path.match(/^\/api\/recommendations\/beneficiary\/[^/]+$/)) {
      const beneficiaryId = path.split('/')[4];
      const snapshot = await db
        .collection('recommendations')
        .where('userId', '==', userId)
        .where('targetBeneficiaryId', '==', beneficiaryId)
        .limit(40)
        .get();

      const recommendations = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((left: any, right: any) => {
          const leftTime = getDateLike(left.createdAt)?.getTime() || 0;
          const rightTime = getDateLike(right.createdAt)?.getTime() || 0;
          return rightTime - leftTime;
        })
        .slice(0, 40);
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
        const defaultsDoc = await db.collection('privacyDefaults').doc(userId).get();
        const defaults = defaultsDoc.exists
          ? defaultsDoc.data() || {}
          : {
              defaultWishlistVisibility: 'private',
              defaultItemVisibility: 'private',
              allowComments: true,
              allowReservations: true,
              requireApproval: false,
            };

        const fallbackVisibility = entityType === 'wishlist'
          ? String(defaults.defaultWishlistVisibility || 'private')
          : String(defaults.defaultItemVisibility || 'private');

        sendJson(res, {
          id: `${entityType}:${entityId}`,
          userId,
          entityType,
          entityId,
          visibilityLevel: fallbackVisibility,
          customAccessList: [],
          expirationDate: null,
          allowComments: typeof defaults.allowComments === 'boolean' ? defaults.allowComments : true,
          allowReservations: typeof defaults.allowReservations === 'boolean' ? defaults.allowReservations : true,
          requireApproval: typeof defaults.requireApproval === 'boolean' ? defaults.requireApproval : false,
          createdAt: null,
          updatedAt: null,
          isDefaultFallback: true,
        });
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
    else if (method === 'POST' && path.match(/^\/api\/privacy\/settings\/(wishlist|item)\/[^/]+\/access-list\/add$/)) {
      const entityType = path.split('/')[4];
      const entityId = path.split('/')[5];
      const body = parseBody(req);
      const userIdToAdd = String(body.userId || '').trim();

      if (!userIdToAdd) {
        sendError(res, 400, 'userId is required');
        return;
      }

      const ref = db.collection('privacySettings').doc(`${entityType}:${entityId}`);
      const existing = await ref.get();
      if (existing.exists && existing.data()?.userId !== userId) {
        sendError(res, 403, 'Access denied');
        return;
      }

      const currentList = Array.isArray(existing.data()?.customAccessList)
        ? existing.data()!.customAccessList.map(String)
        : [];
      const nextList = Array.from(new Set([...currentList, userIdToAdd]));

      await ref.set({ userId, entityType, entityId, customAccessList: nextList, updatedAt: new Date() }, { merge: true });
      sendJson(res, { success: true, customAccessList: nextList });
    }
    else if (method === 'DELETE' && path.match(/^\/api\/privacy\/settings\/(wishlist|item)\/[^/]+\/access-list\/[^/]+$/)) {
      const entityType = path.split('/')[4];
      const entityId = path.split('/')[5];
      const userIdToRemove = String(path.split('/')[7] || '').trim();

      if (!userIdToRemove) {
        sendError(res, 400, 'userId is required');
        return;
      }

      const ref = db.collection('privacySettings').doc(`${entityType}:${entityId}`);
      const existing = await ref.get();
      if (existing.exists && existing.data()?.userId !== userId) {
        sendError(res, 403, 'Access denied');
        return;
      }

      const currentList = Array.isArray(existing.data()?.customAccessList)
        ? existing.data()!.customAccessList.map(String)
        : [];
      const nextList = currentList.filter((id: string) => id !== userIdToRemove);

      await ref.set({ userId, entityType, entityId, customAccessList: nextList, updatedAt: new Date() }, { merge: true });
      sendJson(res, { success: true, customAccessList: nextList });
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
        .limit(100)
        .get();

      const alerts = snapshot.docs
        .map((doc) => {
          const data: any = { id: doc.id, ...doc.data() };
          const normalizedPolicy = normalizeAlertPolicy(data);
          return {
            ...data,
            targetPrice: toNumberLike(data.targetPrice),
            currentPrice: toNumberLike(data.currentPrice),
            thresholdPercent: normalizedPolicy.thresholdPercent,
            thresholdAmount: normalizedPolicy.thresholdAmount,
            cooldownMinutes: normalizedPolicy.cooldownMinutes,
            alertCadence: normalizedPolicy.alertCadence,
            quietHours: normalizedPolicy.quietHours,
          };
        })
        .sort((left: any, right: any) => {
          const leftTime = getDateLike(left.createdAt)?.getTime() || 0;
          const rightTime = getDateLike(right.createdAt)?.getTime() || 0;
          return rightTime - leftTime;
        })
        .slice(0, 100);
      sendJson(res, alerts);
    }
    else if (method === 'GET' && path === '/api/price-alerts/replay-status') {
      const isAdmin = await isAdminApiUser(authenticatedUser);
      if (!isAdmin) {
        sendError(res, 403, 'Admin role required');
        return;
      }

      const replayStateDoc = await db.collection('systemJobs').doc('priceAlertReplay').get();
      const replayState = replayStateDoc.exists ? replayStateDoc.data() || {} : {};

      const statusPayload = {
        cursorDocId: normalizeTextLike(replayState.cursorDocId),
        lastRunAt: getDateLike(replayState.lastRunAt)?.toISOString() || null,
        replayBatchSize: parseIntegerLike(replayState.replayBatchSize) ?? null,
        replayMaxPagesPerRun: parseIntegerLike(replayState.replayMaxPagesPerRun) ?? null,
        replayMaxDeferredAgeHours: parseIntegerLike(replayState.replayMaxDeferredAgeHours) ?? null,
        lastRunStats: {
          processed: parseIntegerLike(replayState.lastRunStats?.processed) ?? 0,
          sent: parseIntegerLike(replayState.lastRunStats?.sent) ?? 0,
          stillDeferred: parseIntegerLike(replayState.lastRunStats?.stillDeferred) ?? 0,
          skipped: parseIntegerLike(replayState.lastRunStats?.skipped) ?? 0,
          expired: parseIntegerLike(replayState.lastRunStats?.expired) ?? 0,
          pagesProcessed: parseIntegerLike(replayState.lastRunStats?.pagesProcessed) ?? 0,
        },
      };

      sendJson(res, statusPayload);
    }
    else if (method === 'PATCH' && path.match(/^\/api\/price-alerts\/[^/]+$/)) {
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

      const body = parseBody(req);
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };
      let hasChanges = false;

      if (body.targetPrice !== undefined) {
        const parsedTarget = toNumberLike(body.targetPrice);
        if (parsedTarget === null || parsedTarget <= 0) {
          sendError(res, 400, 'targetPrice must be a positive number');
          return;
        }
        updateData.targetPrice = Number(parsedTarget.toFixed(2));
        hasChanges = true;
      }

      if (body.thresholdPercent !== undefined) {
        const parsed = toNumberLike(body.thresholdPercent);
        if (parsed === null || parsed < 0 || parsed > 100) {
          sendError(res, 400, 'thresholdPercent must be between 0 and 100');
          return;
        }
        updateData.thresholdPercent = Number(parsed.toFixed(2));
        hasChanges = true;
      }

      if (body.thresholdAmount !== undefined) {
        const parsed = toNumberLike(body.thresholdAmount);
        if (parsed === null || parsed < 0) {
          sendError(res, 400, 'thresholdAmount must be a non-negative number');
          return;
        }
        updateData.thresholdAmount = Number(parsed.toFixed(2));
        hasChanges = true;
      }

      if (body.cooldownMinutes !== undefined) {
        const parsed = parseIntegerLike(body.cooldownMinutes);
        if (parsed === null || parsed < 5 || parsed > 1440) {
          sendError(res, 400, 'cooldownMinutes must be an integer between 5 and 1440');
          return;
        }
        updateData.cooldownMinutes = parsed;
        hasChanges = true;
      }

      if (body.alertCadence !== undefined) {
        const cadence = normalizeTextLike(body.alertCadence)?.toLowerCase();
        if (!cadence || !['high', 'normal', 'low'].includes(cadence)) {
          sendError(res, 400, 'alertCadence must be one of: high, normal, low');
          return;
        }
        updateData.alertCadence = cadence;
        hasChanges = true;
      }

      if (body.active !== undefined) {
        updateData.active = toBooleanLike(body.active, true);
        hasChanges = true;
      }

      if (body.quietHours !== undefined) {
        if (body.quietHours === null) {
          updateData.quietHours = null;
          hasChanges = true;
        } else {
          const validation = validateQuietHours(body.quietHours);
          if (!validation.valid) {
            sendError(res, 400, validation.reason || 'Invalid quietHours payload');
            return;
          }

          updateData.quietHours = {
            startHour: parseIntegerLike(body.quietHours.startHour),
            endHour: parseIntegerLike(body.quietHours.endHour),
            timezone: normalizeTextLike(body.quietHours.timezone),
          };
          hasChanges = true;
        }
      }

      if (!hasChanges) {
        sendError(res, 400, 'No valid policy fields provided');
        return;
      }

      await ref.update(updateData);
      const updated = await ref.get();
      const updatedData = updated.data() || {};
      sendJson(res, {
        success: true,
        id: updated.id,
        ...updatedData,
        ...normalizeAlertPolicy(updatedData),
      });
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
        .limit(50)
        .get();

      const drops = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((left: any, right: any) => {
          const leftTime = getDateLike(left.timestamp)?.getTime() || 0;
          const rightTime = getDateLike(right.timestamp)?.getTime() || 0;
          return rightTime - leftTime;
        })
        .slice(0, 50)
        .filter((entry: any) => Number(entry.change) < 0)
        .map((entry: any) => ({
          id: entry.id,
          title: entry.productTitle || 'Tracked item',
          imageUrl: entry.imageUrl || null,
          price: entry.newPrice,
          currentPrice: entry.newPrice,
          previousPrice: entry.oldPrice,
          landedPrice: computeLandedPrice(entry),
          dropPercentage: Math.abs(Number(entry.changePercent) || 0),
          percentDrop: Math.abs(Number(entry.changePercent) || 0),
          store: entry.store || null,
          inStock: toBooleanLike(entry.inStock, true),
          availability: normalizeTextLike(entry.availability) || null,
        }));
      sendJson(res, drops);
    }
    else if (method === 'GET' && path.match(/^\/api\/items\/[^/]+\/price-intelligence$/)) {
      const itemId = path.split('/')[3];
      const itemDoc = await db.collection('wishlistItems').doc(itemId).get();

      if (!itemDoc.exists) {
        sendError(res, 404, 'Item not found');
        return;
      }

      const item = itemDoc.data() || {};
      const wishlistId = String(item.wishlistId || '').trim();
      if (!wishlistId) {
        sendError(res, 404, 'Wishlist not found');
        return;
      }

      const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
      if (!wishlistDoc.exists) {
        sendError(res, 404, 'Wishlist not found');
        return;
      }

      const wishlistData = wishlistDoc.data() || {};
      const wishlistOwnerId = String(wishlistData.userId || wishlistData.ownerId || '').trim();
      const isOwner = wishlistOwnerId === userId;
      const collaboratorIds = Array.isArray(wishlistData.collaborators) ? wishlistData.collaborators.map(String) : [];
      const canView = isOwner || collaboratorIds.includes(String(userId)) || Boolean(wishlistData.isPublic);

      if (!canView) {
        sendError(res, 403, 'Access denied');
        return;
      }

      const offersSnapshot = await db.collection('priceOffers').where('itemId', '==', itemId).limit(150).get();
      const alternativesSnapshot = await db.collection('itemAlternatives').where('itemId', '==', itemId).limit(100).get();

      const allOffers = offersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...normalizeOffer(doc.data()) }))
        .sort((left: any, right: any) => {
          const leftPrice = left.landedPrice ?? Number.POSITIVE_INFINITY;
          const rightPrice = right.landedPrice ?? Number.POSITIVE_INFINITY;
          return leftPrice - rightPrice;
        });

      const isRetailerSpecific = toBooleanLike(item.isRetailerSpecific, false)
        || toBooleanLike(item.productIdentity?.isRetailerSpecific, false)
        || toBooleanLike(item.offerTracking?.retailerSpecificOnly, false);
      const sourceStore = normalizeTextLike(item.store || item.productIdentity?.sourceRetailer);
      const sourceStoreKey = normalizeRetailerKey(sourceStore);

      const scopedIdenticalOffers = allOffers.filter((offer: any) => {
        if (offer.isAlternative) return false;
        if (isRetailerSpecific && sourceStoreKey) {
          const offerStoreKey = normalizeRetailerKey(offer.store);
          return offerStoreKey === sourceStoreKey;
        }
        return true;
      });

      const identicalOffers = scopedIdenticalOffers.filter((offer: any) =>
        offer.matchType === 'exact' || offer.matchType === 'strong' || offer.matchType === 'probable'
      );
      const highConfidenceIdentical = identicalOffers.filter((offer: any) =>
        offer.matchType === 'exact' || offer.matchType === 'strong'
      );

      const alternativesFromOffers = allOffers.filter((offer: any) => offer.isAlternative);
      const alternativesFromCollection = alternativesSnapshot.docs.map((doc) => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          ...data,
          rationale: normalizeTextLike(data.rationale) || 'Similar specs and value profile',
          qualityBand: normalizeTextLike(data.qualityBand) || 'comparable',
          similarityScore: toNumberLike(data.similarityScore),
          landedPrice: computeLandedPrice(data),
          store: normalizeTextLike(data.store),
          inStock: toBooleanLike(data.inStock, true),
        };
      });

      const alternatives = [...alternativesFromOffers, ...alternativesFromCollection]
        .sort((left: any, right: any) => {
          const rightSimilarity = toNumberLike(right.similarityScore) ?? 0;
          const leftSimilarity = toNumberLike(left.similarityScore) ?? 0;
          if (rightSimilarity !== leftSimilarity) return rightSimilarity - leftSimilarity;
          const leftPrice = left.landedPrice ?? Number.POSITIVE_INFINITY;
          const rightPrice = right.landedPrice ?? Number.POSITIVE_INFINITY;
          return leftPrice - rightPrice;
        })
        .slice(0, 20);

      const basePrice = toNumberLike(item.numericPrice) ?? toNumberLike(item.price) ?? null;
      const bestIdentical = highConfidenceIdentical[0] || identicalOffers[0] || null;

      sendJson(res, {
        itemId,
        title: item.title || null,
        basePrice,
        isRetailerSpecific,
        sourceRetailer: sourceStore,
        sections: {
          bestIdenticalOffer: bestIdentical,
          identicalOffers: identicalOffers.slice(0, 30),
          alternatives,
        },
        confidencePolicy: {
          bestDealEligibleMatchTypes: ['exact', 'strong'],
          probableShownSeparately: true,
        },
        metadata: {
          checkedAt: new Date().toISOString(),
          offersConsidered: allOffers.length,
          alternativesConsidered: alternatives.length,
        },
      });
    }
    else if (method === 'GET' && path === '/api/wishlist-items') {
      const [ownedSnapshot, legacyOwnedSnapshot, collaboratorSnapshot] = await Promise.all([
        db.collection('wishlists').where('userId', '==', userId).limit(200).get(),
        db.collection('wishlists').where('ownerId', '==', userId).limit(200).get(),
        db.collection('wishlists').where('collaborators', 'array-contains', userId).limit(200).get(),
      ]);

      const wishlistIds = Array.from(new Set([
        ...ownedSnapshot.docs.map((doc) => doc.id),
        ...legacyOwnedSnapshot.docs.map((doc) => doc.id),
        ...collaboratorSnapshot.docs.map((doc) => doc.id),
      ]));

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
      const {
        wishlistId,
        title,
        productUrl,
        imageUrl,
        price,
        store,
        addedAt,
        brand,
        model,
        manufacturer,
        sku,
        mpn,
        upc,
        ean,
        color,
        size,
        packSize,
        variant,
        description,
        isRetailerSpecific,
        retailerSpecificReason,
        desiredCondition,
      } = req.body;
      
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
        numericPrice: toNumberLike(price),
        store: store || null,
        description: description || null,
        isRetailerSpecific: toBooleanLike(isRetailerSpecific, false),
        retailerSpecificReason: retailerSpecificReason || null,
        productIdentity: {
          brand: normalizeTextLike(brand),
          model: normalizeTextLike(model),
          manufacturer: normalizeTextLike(manufacturer),
          sku: normalizeTextLike(sku),
          mpn: normalizeTextLike(mpn),
          upc: normalizeTextLike(upc),
          ean: normalizeTextLike(ean),
          color: normalizeTextLike(color),
          size: normalizeTextLike(size),
          packSize: normalizeTextLike(packSize),
          variant: normalizeTextLike(variant),
          sourceRetailer: normalizeTextLike(store),
          isRetailerSpecific: toBooleanLike(isRetailerSpecific, false),
        },
        offerTracking: {
          preferredCheckCadence: 'normal',
          desiredCondition: normalizeTextLike(desiredCondition) || 'new',
          retailerSpecificOnly: toBooleanLike(isRetailerSpecific, false),
          matchTypesEligibleForBestDeal: ['exact', 'strong'],
        },
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

