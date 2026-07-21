import { getFunctions, httpsCallable } from 'firebase/functions';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { SubscriptionTier, TierLimits, TierPricing } from '@wishlist-wizard/shared';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  status: string;
  currentPeriodStart?: { _seconds: number };
  currentPeriodEnd?: { _seconds: number };
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  usage: Record<string, number>;
  limits: TierLimits;
  pricing: TierPricing;
  availableUpgrades: Array<{ tier: SubscriptionTier; pricing: TierPricing }>;
}

/** Fetches the current user's subscription tier/status via the billingStatus callable. */
export function useSubscriptionStatus() {
  const { user } = useAuth();
  const functions = getFunctions();

  return useQuery<SubscriptionStatus>({
    queryKey: ['subscription-status', user?.uid],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const fn = httpsCallable<object, SubscriptionStatus>(functions, 'billingStatus');
      const { data } = await fn();
      return data;
    },
    enabled: !!user,
    // Tier rarely changes mid-session; this now also runs on every
    // authenticated page load (via AppLayout's nav gating), not just
    // the Subscription page, so avoid refetch-storms on navigation.
    staleTime: 5 * 60 * 1000,
  });
}
