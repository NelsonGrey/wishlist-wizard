import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import { ensureFirebaseAdmin } from '../firebase-admin.js';
import { requireAuthenticatedUser } from '../utils/auth-guards.js';

ensureFirebaseAdmin();
const db = getFirestore();

const serpApiSecret = defineSecret('SERPAPI_API_KEY');
const INTELLIGENCE_REFRESH_MINUTES = 360;
const SCHEDULED_BATCH_LIMIT = 25;

function getSerpApiKey(): string {
  const secretValue = String(serpApiSecret.value() || '').trim();
  if (secretValue) return secretValue;
  return String(process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || '').trim();
}

type MarketOffer = {
  title: string | null;
  store: string;
  productUrl: string | null;
  thumbnailUrl: string | null;
  price: number;
  totalPrice: number;
  shippingCost: number;
  sellerRating: number | null;
  reviewCount: number | null;
  condition: string | null;
  matchType: 'strong' | 'probable';
  matchConfidence: number;
  source: 'serpapi-google-shopping';
  availability: string | null;
  scrapedAt: string;
};

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toEpochMs(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : 0;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  return 0;
}

function normalizeRetailerKey(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;

  let normalized = text.toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');
  normalized = normalized.split('/')[0];
  normalized = normalized.split('?')[0];
  normalized = normalized.split('#')[0];
  normalized = normalized.replace(/\.(com|net|org|co\.uk)$/g, '');
  normalized = normalized.replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, '');
  return normalized || null;
}

function buildSearchQuery(item: Record<string, unknown>): string {
  const title = normalizeText(item.title) || '';
  const brand = normalizeText(item.brand) || normalizeText((item.productIdentity as Record<string, unknown> | undefined)?.brand) || '';
  const model = normalizeText(item.model) || normalizeText((item.productIdentity as Record<string, unknown> | undefined)?.model) || '';
  const sku = normalizeText(item.sku) || normalizeText((item.productIdentity as Record<string, unknown> | undefined)?.sku) || '';

  return [title, brand, model, sku].map((value) => value.trim()).filter(Boolean).join(' ').trim();
}

async function fetchSerpApiOffers(itemId: string, item: Record<string, unknown>): Promise<MarketOffer[]> {
  const serpApiKey = getSerpApiKey();
  if (!serpApiKey) return [];

  const query = buildSearchQuery(item);
  if (!query) return [];

  try {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_shopping');
    url.searchParams.set('q', query);
    url.searchParams.set('hl', 'en');
    url.searchParams.set('gl', 'us');
    url.searchParams.set('num', '15');
    url.searchParams.set('api_key', serpApiKey);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      logger.warn('SerpAPI response was not OK', { itemId, status: response.status });
      return [];
    }

    const payload = await response.json() as Record<string, unknown>;
    const shoppingResults = Array.isArray(payload.shopping_results) ? payload.shopping_results : [];
    const normalizedTitle = (normalizeText(item.title) || '').toLowerCase();

    return shoppingResults
      .map((result: unknown) => {
        const entry = (result || {}) as Record<string, unknown>;
        const title = normalizeText(entry.title) || normalizeText(item.title);
        const store = normalizeText(entry.source) || normalizeText(entry.seller) || normalizeText(entry.store);
        const productUrl = normalizeText(entry.link) || normalizeText(entry.product_link);
        const thumbnailUrl = normalizeText(entry.thumbnail) || normalizeText(entry.thumbnail_url);
        const extractedPrice = toNumber(entry.extracted_price) ?? toNumber(entry.price);
        const shippingCost = toNumber(entry.shipping) ?? 0;
        const sellerRating = toNumber(entry.rating) ?? toNumber(entry.seller_rating);
        const reviewCount = toNumber(entry.reviews) ?? toNumber(entry.review_count);
        const condition = normalizeText(entry.condition) || normalizeText(entry.product_condition);
        const deliveryText = normalizeText(entry.delivery) || normalizeText((entry.extensions as unknown[] | undefined)?.[0]);
        const titleText = (title || '').toLowerCase();
        const strongTitleMatch = normalizedTitle && titleText
          ? (titleText.includes(normalizedTitle) || normalizedTitle.includes(titleText))
          : false;

        if (!store || extractedPrice === null || extractedPrice <= 0) {
          return null;
        }

        return {
          title,
          store,
          productUrl,
          thumbnailUrl,
          price: extractedPrice,
          totalPrice: extractedPrice + shippingCost,
          shippingCost,
          sellerRating,
          reviewCount,
          condition,
          matchType: strongTitleMatch ? 'strong' : 'probable',
          matchConfidence: strongTitleMatch ? 0.9 : 0.7,
          source: 'serpapi-google-shopping' as const,
          availability: deliveryText,
          scrapedAt: new Date().toISOString(),
        };
      })
      .filter((offer): offer is MarketOffer => Boolean(offer));
  } catch (error) {
    logger.error('SerpAPI fetch failed', { itemId, error });
    return [];
  }
}

function hasFreshWebOffers(existingOffers: Array<Record<string, unknown>>): boolean {
  return existingOffers.some((offer) => {
    if (normalizeText(offer.source) !== 'serpapi-google-shopping') return false;
    const ageMs = Date.now() - toEpochMs(offer.scrapedAt || offer.updatedAt || offer.createdAt);
    return ageMs >= 0 && ageMs < INTELLIGENCE_REFRESH_MINUTES * 60 * 1000;
  });
}

async function refreshOffersForItem(itemId: string, item: Record<string, unknown>, forceRefresh: boolean): Promise<{ refreshed: boolean; created: number; updated: number }> {
  const existingSnapshot = await db.collection('priceOffers').where('itemId', '==', itemId).limit(200).get();
  const existingOffers: Array<Record<string, unknown>> = existingSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Record<string, unknown>),
  }));

  if (!forceRefresh && hasFreshWebOffers(existingOffers)) {
    return { refreshed: false, created: 0, updated: 0 };
  }

  const fetchedOffers = await fetchSerpApiOffers(itemId, item);
  if (fetchedOffers.length === 0) {
    return { refreshed: false, created: 0, updated: 0 };
  }

  const seen = new Set<string>();
  const signatureToExisting = new Map<string, Record<string, unknown>>();
  existingOffers.forEach((offer) => {
    const key = normalizeRetailerKey(offer.store) || String(offer.store || '').toLowerCase();
    const price = toNumber(offer.totalPrice) ?? toNumber(offer.price) ?? -1;
    const signature = `${key}|${price}`;
    seen.add(signature);
    signatureToExisting.set(signature, offer);
  });

  let created = 0;
  let updated = 0;
  for (const offer of fetchedOffers) {
    const key = normalizeRetailerKey(offer.store) || offer.store.toLowerCase();
    const signature = `${key}|${offer.totalPrice}`;
    if (seen.has(signature)) {
      const existing = signatureToExisting.get(signature);
      const existingId = normalizeText(existing?.id);
      const shouldEnrich = Boolean(
        existingId && (
          !normalizeText(existing?.productUrl) ||
          !normalizeText(existing?.thumbnailUrl) ||
          !normalizeText(existing?.availability) ||
          !normalizeText(existing?.condition) ||
          toNumber(existing?.sellerRating) === null ||
          toNumber(existing?.reviewCount) === null
        )
      );

      if (existingId && shouldEnrich) {
        await db.collection('priceOffers').doc(existingId).set({
          title: offer.title,
          productUrl: offer.productUrl,
          thumbnailUrl: offer.thumbnailUrl,
          availability: offer.availability,
          condition: offer.condition,
          sellerRating: offer.sellerRating,
          reviewCount: offer.reviewCount,
          scrapedAt: offer.scrapedAt,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        updated += 1;
      }
      continue;
    }

    seen.add(signature);
    await db.collection('priceOffers').add({
      itemId,
      title: offer.title,
      store: offer.store,
      productUrl: offer.productUrl,
      matchType: offer.matchType,
      matchConfidence: offer.matchConfidence,
      isAlternative: false,
      price: offer.price,
      shippingCost: offer.shippingCost,
      fees: 0,
      discountAmount: 0,
      totalPrice: offer.totalPrice,
      inStock: true,
      availability: offer.availability,
      condition: offer.condition,
      thumbnailUrl: offer.thumbnailUrl,
      sellerRating: offer.sellerRating,
      reviewCount: offer.reviewCount,
      source: offer.source,
      scrapedAt: offer.scrapedAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    created += 1;
  }

  return { refreshed: created > 0 || updated > 0, created, updated };
}

async function requireWishlistVisibilityForUser(itemId: string, uid: string): Promise<Record<string, unknown>> {
  const itemDoc = await db.collection('wishlistItems').doc(itemId).get();
  if (!itemDoc.exists) {
    throw new HttpsError('not-found', 'Item not found');
  }

  const item = (itemDoc.data() || {}) as Record<string, unknown>;
  const wishlistId = normalizeText(item.wishlistId);
  if (!wishlistId) {
    throw new HttpsError('not-found', 'Wishlist not found');
  }

  const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
  if (!wishlistDoc.exists) {
    throw new HttpsError('not-found', 'Wishlist not found');
  }

  const wishlist = (wishlistDoc.data() || {}) as Record<string, unknown>;
  const ownerId = normalizeText(wishlist.userId) || normalizeText(wishlist.ownerId) || '';
  const collaborators = Array.isArray(wishlist.collaborators) ? wishlist.collaborators.map((value) => String(value)) : [];
  const canAccess = ownerId === uid || collaborators.includes(uid) || Boolean(wishlist.isPublic);

  if (!canAccess) {
    throw new HttpsError('permission-denied', 'Access denied');
  }

  return item;
}

export const refreshPriceIntelligenceOffers = onCall({ secrets: [serpApiSecret] }, async (request: CallableRequest) => {
  const uid = requireAuthenticatedUser(request);
  const itemId = normalizeText((request.data || {}).itemId);
  const forceRefresh = Boolean((request.data || {}).forceRefresh ?? true);

  if (!itemId) {
    throw new HttpsError('invalid-argument', 'itemId is required');
  }

  const item = await requireWishlistVisibilityForUser(itemId, uid);
  const result = await refreshOffersForItem(itemId, item, forceRefresh);

  return {
    success: true,
    itemId,
    refreshed: result.refreshed,
    offersCreated: result.created,
    offersUpdated: result.updated,
    providerEnabled: Boolean(getSerpApiKey()),
  };
});

export const scheduledRefreshPriceIntelligenceOffers = onSchedule({
  schedule: 'every 6 hours',
  region: 'us-central1',
  timeoutSeconds: 540,
  memory: '512MiB',
  secrets: [serpApiSecret],
}, async () => {
  if (!getSerpApiKey()) {
    logger.warn('Skipping scheduled intelligence refresh because SERPAPI key is missing');
    return;
  }

  const snapshot = await db.collection('wishlistItems').limit(SCHEDULED_BATCH_LIMIT).get();
  let refreshedItems = 0;
  let createdOffers = 0;

  for (const doc of snapshot.docs) {
    const item = (doc.data() || {}) as Record<string, unknown>;
    const itemId = doc.id;

    try {
      const result = await refreshOffersForItem(itemId, item, false);
      if (result.refreshed) {
        refreshedItems += 1;
        createdOffers += result.created;
      }
    } catch (error) {
      logger.error('Scheduled intelligence refresh failed for item', { itemId, error });
    }
  }

  logger.info('Scheduled intelligence refresh complete', {
    scannedItems: snapshot.size,
    refreshedItems,
    createdOffers,
  });
});
