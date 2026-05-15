/**
 * Subscription Tier Guard
 *
 * Server-side enforcement of subscription limits.
 * Import these helpers into any Cloud Function that creates or modifies
 * a metered resource (wishlists, price alerts, collaborators, etc.).
 *
 * All limit checks read from /subscriptions/{uid} which is kept in sync
 * by Stripe webhooks. The user document's subscriptionTier field is a
 * denormalized fast-read copy; this module uses the authoritative source.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import {
  SubscriptionTier,
  TierLimits,
  TIER_LIMITS,
  canCreateWishlist,
  canAddPriceTracking,
  canAddItemToWishlist,
  canAddCollaborator,
} from '@wishlist-wizard/shared';
import { ensureFirebaseAdmin } from '../firebase-admin.js';

ensureFirebaseAdmin();
const db = getFirestore();

// ─────────────────────────────────────────────────────────────────────────────
// Tier resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a user's active subscription tier.
 * Falls back to 'free' if no subscription document exists or if the
 * subscription is canceled/past_due beyond a grace period.
 */
export async function getUserTier(uid: string): Promise<SubscriptionTier> {
  try {
    const subDoc = await db.collection('subscriptions').doc(uid).get();
    if (!subDoc.exists) return 'free';

    const data = subDoc.data()!;
    const status: string = data.status ?? 'canceled';
    const tier: SubscriptionTier = data.tier ?? 'free';

    // Active statuses that retain paid features
    if (['active', 'trialing'].includes(status)) return tier;

    // past_due: grant a 3-day grace period before downgrading experience
    if (status === 'past_due') {
      const periodEnd: Date = data.currentPeriodEnd?.toDate?.() ?? new Date(0);
      const gracePeriodEnd = new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000);
      if (new Date() < gracePeriodEnd) return tier;
    }

    return 'free';
  } catch (err) {
    logger.error('getUserTier: Firestore error, defaulting to free', { uid, err });
    return 'free';
  }
}

/** Return the TierLimits for a user, fetching their tier from Firestore */
export async function getUserLimits(uid: string): Promise<TierLimits> {
  const tier = await getUserTier(uid);
  return TIER_LIMITS[tier];
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage counters
// ─────────────────────────────────────────────────────────────────────────────

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Atomically increment a usage counter. Safe for concurrent calls. */
export async function incrementUsage(
  uid: string,
  field: 'wishlistsOwned' | 'priceAlertsActive' | 'apiCallsTotal' | 'collaboratorsInvited',
  delta: number = 1,
): Promise<void> {
  const ref = db.collection('usageMetrics').doc(uid);
  await ref.set(
    {
      userId: uid,
      period: currentPeriod(),
      [field]: FieldValue.increment(delta),
      lastUpdated: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/** Fetch current usage metrics for a user */
export async function getUserUsage(uid: string): Promise<Record<string, number>> {
  const ref = db.collection('usageMetrics').doc(uid);
  const doc = await ref.get();
  if (!doc.exists) return { wishlistsOwned: 0, priceAlertsActive: 0, apiCallsTotal: 0 };
  const data = doc.data()!;
  return {
    wishlistsOwned: data.wishlistsOwned ?? 0,
    priceAlertsActive: data.priceAlertsActive ?? 0,
    apiCallsTotal: data.apiCallsTotal ?? 0,
    collaboratorsInvited: data.collaboratorsInvited ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Limit enforcement helpers — throw HttpsError if limit exceeded
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify the user can create a new wishlist. Throws `resource-exhausted` if not.
 * Call this before writing the new wishlist document.
 */
export async function assertCanCreateWishlist(uid: string): Promise<void> {
  const [tier, usage] = await Promise.all([getUserTier(uid), getUserUsage(uid)]);
  const currentCount = usage.wishlistsOwned;

  if (!canCreateWishlist(tier, currentCount)) {
    const limit = TIER_LIMITS[tier].maxWishlists;
    throw new HttpsError(
      'resource-exhausted',
      `You have reached the ${limit}-wishlist limit on your ${tier} plan. ` +
        'Upgrade to create more wishlists.',
      { tier, limit, currentCount, upgradeRequired: true },
    );
  }
}

/**
 * Verify the user can add one more price-tracked item. Throws if not.
 */
export async function assertCanAddPriceTracking(uid: string): Promise<void> {
  const [tier, usage] = await Promise.all([getUserTier(uid), getUserUsage(uid)]);
  const currentTracked = usage.priceAlertsActive;

  if (!canAddPriceTracking(tier, currentTracked)) {
    const limit = TIER_LIMITS[tier].maxPriceTrackedItems;
    throw new HttpsError(
      'resource-exhausted',
      `You have reached the ${limit}-item price tracking limit on your ${tier} plan. ` +
        'Upgrade to track more items.',
      { tier, limit, currentTracked, upgradeRequired: true },
    );
  }
}

/**
 * Verify the user can add one more item to a wishlist.
 * Requires the current item count for that specific wishlist.
 */
export async function assertCanAddItemToWishlist(
  uid: string,
  currentItemCount: number,
): Promise<void> {
  const tier = await getUserTier(uid);

  if (!canAddItemToWishlist(tier, currentItemCount)) {
    const limit = TIER_LIMITS[tier].maxItemsPerWishlist;
    throw new HttpsError(
      'resource-exhausted',
      `This wishlist has reached the ${limit}-item limit on your ${tier} plan. ` +
        'Upgrade to add more items.',
      { tier, limit, currentItemCount, upgradeRequired: true },
    );
  }
}

/**
 * Verify the user can add one more collaborator to a wishlist.
 * Requires the current collaborator count for that specific wishlist.
 */
export async function assertCanAddCollaborator(
  uid: string,
  currentCollaboratorCount: number,
): Promise<void> {
  const tier = await getUserTier(uid);

  if (!canAddCollaborator(tier, currentCollaboratorCount)) {
    const limit = TIER_LIMITS[tier].maxCollaboratorsPerWishlist;
    throw new HttpsError(
      'resource-exhausted',
      `This wishlist has reached the ${limit}-collaborator limit on your ${tier} plan. ` +
        'Upgrade to add more collaborators.',
      { tier, limit, currentCollaboratorCount, upgradeRequired: true },
    );
  }
}

/**
 * Verify the user's tier supports a boolean feature (group gifting, API access, etc.).
 */
export async function assertFeatureEnabled(
  uid: string,
  feature: keyof TierLimits,
  featureDisplayName: string,
): Promise<void> {
  const tier = await getUserTier(uid);
  const limits = TIER_LIMITS[tier];
  const value = limits[feature];

  const isEnabled =
    typeof value === 'boolean' ? value :
    typeof value === 'number' ? value > 0 : false;

  if (!isEnabled) {
    throw new HttpsError(
      'permission-denied',
      `${featureDisplayName} is not available on your ${tier} plan. Upgrade to access this feature.`,
      { tier, feature, upgradeRequired: true },
    );
  }
}

/**
 * Verify the calling user is authenticated. Returns uid.
 * Re-exported here so subscription-aware functions only need one import.
 */
export function requireAuth(request: CallableRequest): string {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  return request.auth.uid;
}
