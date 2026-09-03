import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
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
  availableUpgrades: Array<{ tier: SubscriptionTier; pricing: TierPricing; comingSoon?: boolean }>;
}

/** Fetches the current user's subscription tier/status via GET /api/billing/status. */
export function useSubscriptionStatus() {
  const { user } = useAuth();

  return useQuery<SubscriptionStatus>({
    queryKey: ['subscription-status', user?.uid],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      return apiRequest('/api/billing/status') as Promise<SubscriptionStatus>;
    },
    enabled: !!user,
    // Tier rarely changes mid-session; this now also runs on every
    // authenticated page load (via AppLayout's nav gating), not just
    // the Subscription page, so avoid refetch-storms on navigation.
    staleTime: 5 * 60 * 1000,
  });
}
