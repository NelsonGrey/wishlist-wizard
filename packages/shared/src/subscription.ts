/**
 * Wishlist Wizard — Subscription Tiers & Limit Definitions
 *
 * This is the single source of truth for what each tier is permitted to do.
 * Both client-side (UI gates) and server-side (API enforcement) import from here.
 *
 * IMPORTANT: Server-side enforcement in Firebase Functions is the authoritative
 * check. Client-side gates are UX conveniences only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SubscriptionTier =
  | 'free'
  | 'starter'
  | 'plus'
  | 'creator'
  | 'business'
  | 'enterprise';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'paused';

export type AdminRole =
  | 'user'
  | 'support_agent'
  | 'billing_admin'
  | 'super_admin'
  | 'read_only';

export type BillingCycle = 'monthly' | 'annual' | 'none';

/** The shape of a user's subscription, mirroring /subscriptions/{uid} in Firestore */
export interface UserSubscription {
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart: Date | string;
  currentPeriodEnd: Date | string;
  trialEnd?: Date | string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date | string;
  affiliateCommissionShare?: number;
  usage: {
    wishlistCount: number;
    priceTrackedItems: number;
    apiCallsThisMonth: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier Limits
// ─────────────────────────────────────────────────────────────────────────────

/** Sentinel value meaning "no limit enforced" */
export const UNLIMITED = Number.MAX_SAFE_INTEGER;

export interface TierLimits {
  /** Maximum number of active wishlists the user may own */
  maxWishlists: number;
  /** Maximum items per wishlist */
  maxItemsPerWishlist: number;
  /** Maximum number of items with active price tracking */
  maxPriceTrackedItems: number;
  /** Maximum collaborators per wishlist */
  maxCollaboratorsPerWishlist: number;
  /** Price history retained in months */
  priceHistoryMonths: number;
  /** Whether ads are displayed */
  adsEnabled: boolean;
  /** Whether group gifting coordination is available */
  groupGiftingEnabled: boolean;
  /** Whether the creator affiliate dashboard is available */
  creatorDashboardEnabled: boolean;
  /** Fraction of platform affiliate commissions paid back to user (0 = none) */
  affiliateCommissionShare: number;
  /** Whether calendar integration is available */
  calendarEnabled: boolean;
  /** Maximum calendars that can be connected (0 = none) */
  maxCalendars: number;
  /** Whether the user can export their data */
  dataExportEnabled: boolean;
  /** Whether the user has API access */
  apiAccessEnabled: boolean;
  /** Maximum API calls per month (0 = none) */
  maxApiCallsPerMonth: number;
  /** Maximum team members (seats) under one account */
  maxTeamMembers: number;
  /** Whether analytics (views/clicks) are shown */
  analyticsEnabled: boolean;
  /** Analytics depth: basic = views only, standard = views+shares+clicks, full = all + platform breakdown */
  analyticsDepth: 'none' | 'basic' | 'standard' | 'full';
  /** Custom profile URL (wishlistwizard.com/[username]) */
  customProfileUrl: boolean;
  /** Whether the user can remove Wishlist Wizard branding */
  customBrandingEnabled: boolean;
  /** Trial period in days (0 = no trial) */
  trialDays: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxWishlists: 3,
    maxItemsPerWishlist: 25,
    maxPriceTrackedItems: 5,
    maxCollaboratorsPerWishlist: 5,
    priceHistoryMonths: 3,
    adsEnabled: true,
    groupGiftingEnabled: false,
    creatorDashboardEnabled: false,
    affiliateCommissionShare: 0,
    calendarEnabled: false,
    maxCalendars: 0,
    dataExportEnabled: false,
    apiAccessEnabled: false,
    maxApiCallsPerMonth: 0,
    maxTeamMembers: 1,
    analyticsEnabled: false,
    analyticsDepth: 'none',
    customProfileUrl: false,
    customBrandingEnabled: false,
    trialDays: 0,
  },

  starter: {
    maxWishlists: 10,
    maxItemsPerWishlist: 75,
    maxPriceTrackedItems: 25,
    maxCollaboratorsPerWishlist: 15,
    priceHistoryMonths: 12,
    adsEnabled: true,
    groupGiftingEnabled: false,
    creatorDashboardEnabled: false,
    affiliateCommissionShare: 0,
    calendarEnabled: true,
    maxCalendars: 1,
    dataExportEnabled: false,
    apiAccessEnabled: false,
    maxApiCallsPerMonth: 0,
    maxTeamMembers: 1,
    analyticsEnabled: true,
    analyticsDepth: 'basic',
    customProfileUrl: true,
    customBrandingEnabled: false,
    trialDays: 14,
  },

  plus: {
    maxWishlists: UNLIMITED,
    maxItemsPerWishlist: 200,
    maxPriceTrackedItems: 75,
    maxCollaboratorsPerWishlist: 50,
    priceHistoryMonths: 24,
    adsEnabled: false,
    groupGiftingEnabled: true,
    creatorDashboardEnabled: false,
    affiliateCommissionShare: 0,
    calendarEnabled: true,
    maxCalendars: UNLIMITED,
    dataExportEnabled: true,
    apiAccessEnabled: false,
    maxApiCallsPerMonth: 0,
    maxTeamMembers: 1,
    analyticsEnabled: true,
    analyticsDepth: 'standard',
    customProfileUrl: true,
    customBrandingEnabled: false,
    trialDays: 14,
  },

  creator: {
    maxWishlists: UNLIMITED,
    maxItemsPerWishlist: UNLIMITED,
    maxPriceTrackedItems: UNLIMITED,
    maxCollaboratorsPerWishlist: UNLIMITED,
    priceHistoryMonths: UNLIMITED,
    adsEnabled: false,
    groupGiftingEnabled: true,
    creatorDashboardEnabled: true,
    affiliateCommissionShare: 0.2,        // 20% of platform-earned commissions
    calendarEnabled: true,
    maxCalendars: UNLIMITED,
    dataExportEnabled: true,
    apiAccessEnabled: true,
    maxApiCallsPerMonth: 1_000,
    maxTeamMembers: 1,
    analyticsEnabled: true,
    analyticsDepth: 'full',
    customProfileUrl: true,
    customBrandingEnabled: false,
    trialDays: 14,
  },

  business: {
    maxWishlists: UNLIMITED,
    maxItemsPerWishlist: UNLIMITED,
    maxPriceTrackedItems: UNLIMITED,
    maxCollaboratorsPerWishlist: UNLIMITED,
    priceHistoryMonths: UNLIMITED,
    adsEnabled: false,
    groupGiftingEnabled: true,
    creatorDashboardEnabled: true,
    affiliateCommissionShare: 0.3,        // 30% of platform-earned commissions
    calendarEnabled: true,
    maxCalendars: UNLIMITED,
    dataExportEnabled: true,
    apiAccessEnabled: true,
    maxApiCallsPerMonth: 25_000,
    maxTeamMembers: 5,
    analyticsEnabled: true,
    analyticsDepth: 'full',
    customProfileUrl: true,
    customBrandingEnabled: true,
    trialDays: 14,
  },

  enterprise: {
    maxWishlists: UNLIMITED,
    maxItemsPerWishlist: UNLIMITED,
    maxPriceTrackedItems: UNLIMITED,
    maxCollaboratorsPerWishlist: UNLIMITED,
    priceHistoryMonths: UNLIMITED,
    adsEnabled: false,
    groupGiftingEnabled: true,
    creatorDashboardEnabled: true,
    affiliateCommissionShare: 0,          // Negotiated separately; not auto-computed
    calendarEnabled: true,
    maxCalendars: UNLIMITED,
    dataExportEnabled: true,
    apiAccessEnabled: true,
    maxApiCallsPerMonth: UNLIMITED,
    maxTeamMembers: UNLIMITED,
    analyticsEnabled: true,
    analyticsDepth: 'full',
    customProfileUrl: true,
    customBrandingEnabled: true,
    trialDays: 0,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Pricing (used by checkout UI)
// ─────────────────────────────────────────────────────────────────────────────

export interface TierPricing {
  monthlyUsd: number | null;              // null = free or contact-us
  annualUsd: number | null;
  annualMonthlyEquivalent: number | null; // annualUsd / 12
  annualSavingPercent: number | null;
  displayName: string;
  tagline: string;
  trialDays: number;                      // 0 = no trial
}

export const TIER_PRICING: Record<SubscriptionTier, TierPricing> = {
  free: {
    monthlyUsd: 0,
    annualUsd: 0,
    annualMonthlyEquivalent: 0,
    annualSavingPercent: null,
    displayName: 'Free',
    tagline: 'Ad-supported. Perfect for occasional wishlists.',
    trialDays: 0,
  },
  starter: {
    monthlyUsd: 3.99,
    annualUsd: 39,
    annualMonthlyEquivalent: 3.25,
    annualSavingPercent: 18,
    displayName: 'Starter',
    tagline: 'For family gift-givers managing multiple occasions.',
    trialDays: 14,
  },
  plus: {
    monthlyUsd: 7.99,
    annualUsd: 79,
    annualMonthlyEquivalent: 6.58,
    annualSavingPercent: 18,
    displayName: 'Plus',
    tagline: 'Group gifting, unlimited wishlists, and richer analytics.',
    trialDays: 14,
  },
  creator: {
    monthlyUsd: 14.99,
    annualUsd: 149,
    annualMonthlyEquivalent: 12.42,
    annualSavingPercent: 17,
    displayName: 'Creator Pro',
    tagline: 'Full creator analytics. Commission sharing planned.',
    trialDays: 14,
  },
  business: {
    monthlyUsd: 29.99,
    annualUsd: 299,
    annualMonthlyEquivalent: 24.92,
    annualSavingPercent: 17,
    displayName: 'Business',
    tagline: 'Team accounts, API access, and dedicated support.',
    trialDays: 14,
  },
  enterprise: {
    monthlyUsd: null,
    annualUsd: null,
    annualMonthlyEquivalent: null,
    annualSavingPercent: null,
    displayName: 'Enterprise',
    tagline: 'Custom pricing. White-label. Unlimited everything.',
    trialDays: 0,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Return the TierLimits for a given tier (defaults to 'free' if unrecognized) */
export function getTierLimits(tier: SubscriptionTier | string): TierLimits {
  return TIER_LIMITS[tier as SubscriptionTier] ?? TIER_LIMITS.free;
}

/** Whether a user at `tier` may create one more wishlist given their current count */
export function canCreateWishlist(tier: SubscriptionTier, currentCount: number): boolean {
  return currentCount < getTierLimits(tier).maxWishlists;
}

/** Whether a user at `tier` may add one more price-tracked item given their current count */
export function canAddPriceTracking(tier: SubscriptionTier, currentTracked: number): boolean {
  return currentTracked < getTierLimits(tier).maxPriceTrackedItems;
}

/** Whether a user at `tier` may add one more item to a wishlist at `currentItemCount` */
export function canAddItemToWishlist(tier: SubscriptionTier, currentItemCount: number): boolean {
  return currentItemCount < getTierLimits(tier).maxItemsPerWishlist;
}

/** Whether a user at `tier` may add one more collaborator given `currentCollaborators` */
export function canAddCollaborator(tier: SubscriptionTier, currentCollaborators: number): boolean {
  return currentCollaborators < getTierLimits(tier).maxCollaboratorsPerWishlist;
}

/**
 * Returns the tier a user should be prompted to upgrade to in order to unlock
 * a feature. Returns null if the current tier already supports it.
 */
export function getUpgradeTierFor(
  feature: keyof TierLimits,
  currentTier: SubscriptionTier,
): SubscriptionTier | null {
  const orderedTiers: SubscriptionTier[] = ['free', 'starter', 'plus', 'creator', 'business', 'enterprise'];
  const currentIdx = orderedTiers.indexOf(currentTier);

  for (let i = currentIdx + 1; i < orderedTiers.length; i++) {
    const candidate = orderedTiers[i];
    const limits = TIER_LIMITS[candidate];
    const value = limits[feature];
    // If the feature is a boolean — look for true; if numeric — look for > current limits
    if (typeof value === 'boolean' && value === true) return candidate;
    if (typeof value === 'number' && value > (TIER_LIMITS[currentTier][feature] as number)) return candidate;
  }
  return null;
}

/**
 * Soft-warning threshold: when the user has used this fraction of a limit,
 * show a "you're approaching your limit" nudge.
 */
export const SOFT_WARNING_THRESHOLD = 0.8;

/** True if the user is within the soft-warning zone for wishlists */
export function isApproachingWishlistLimit(tier: SubscriptionTier, currentCount: number): boolean {
  const max = getTierLimits(tier).maxWishlists;
  if (max === UNLIMITED) return false;
  return currentCount >= Math.floor(max * SOFT_WARNING_THRESHOLD);
}

/** True if the user is within the soft-warning zone for price tracking */
export function isApproachingPriceTrackingLimit(tier: SubscriptionTier, currentTracked: number): boolean {
  const max = getTierLimits(tier).maxPriceTrackedItems;
  if (max === UNLIMITED) return false;
  return currentTracked >= Math.floor(max * SOFT_WARNING_THRESHOLD);
}
