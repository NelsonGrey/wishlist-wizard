/**
 * "Coming Soon" tier gating
 *
 * Creator-and-above are built but intentionally not open for self-serve
 * purchase yet. These tests pin the single lever (COMING_SOON_TIERS) and the
 * helpers that web / mobile / functions all read from.
 *
 * Run with: npm run test --workspace=@wishlist-wizard/shared
 */

import { describe, it, expect } from 'vitest';
import {
  COMING_SOON_TIERS,
  PURCHASABLE_TIERS,
  isTierComingSoon,
  isTierPurchasable,
  TIER_LIMITS,
  TIER_PRICING,
  type SubscriptionTier,
} from '../subscription';

const ALL_TIERS: SubscriptionTier[] = [
  'free',
  'starter',
  'plus',
  'creator',
  'business',
  'enterprise',
];

describe('COMING_SOON_TIERS', () => {
  it('gates exactly creator, business, and enterprise', () => {
    expect([...COMING_SOON_TIERS].sort()).toEqual(['business', 'creator', 'enterprise']);
  });

  it('never gates the tiers the product is launching with', () => {
    for (const tier of ['free', 'starter', 'plus'] as SubscriptionTier[]) {
      expect(isTierComingSoon(tier)).toBe(false);
    }
  });

  it('does not disable any TIER_LIMITS capability — gating is purchase-only', () => {
    // The whole point: an existing active subscription on a gated tier keeps
    // everything. Guard against someone "also" zeroing the limits.
    expect(TIER_LIMITS.creator.creatorDashboardEnabled).toBe(true);
    expect(TIER_LIMITS.business.apiAccessEnabled).toBe(true);
    expect(TIER_LIMITS.creator.affiliateCommissionShare).toBeGreaterThan(0);
  });
});

describe('PURCHASABLE_TIERS', () => {
  it('is the paid tiers minus the coming-soon ones', () => {
    expect([...PURCHASABLE_TIERS].sort()).toEqual(['plus', 'starter']);
  });

  it('is disjoint from COMING_SOON_TIERS', () => {
    for (const tier of PURCHASABLE_TIERS) {
      expect(COMING_SOON_TIERS).not.toContain(tier);
    }
  });

  it('never contains the free tier', () => {
    expect(PURCHASABLE_TIERS).not.toContain('free');
  });
});

describe('isTierComingSoon / isTierPurchasable', () => {
  it('classifies every known tier consistently', () => {
    for (const tier of ALL_TIERS) {
      const comingSoon = isTierComingSoon(tier);
      const purchasable = isTierPurchasable(tier);
      if (tier === 'free') {
        expect(comingSoon).toBe(false);
        expect(purchasable).toBe(false);
      } else if (comingSoon) {
        expect(purchasable).toBe(false);
      } else {
        expect(purchasable).toBe(true);
      }
    }
  });

  it('tolerates unknown / arbitrary strings without throwing', () => {
    expect(isTierComingSoon('nonsense')).toBe(false);
    expect(isTierPurchasable('nonsense')).toBe(true); // not free, not gated
  });

  it('keeps enterprise (contact-sales, no self-serve price) out of checkout', () => {
    expect(TIER_PRICING.enterprise.monthlyUsd).toBeNull();
    expect(isTierPurchasable('enterprise')).toBe(false);
  });
});
