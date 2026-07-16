/**
 * User — Subscription Management
 *
 * Shows current subscription tier, usage metrics, billing portal, and upgrade options.
 */
import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard, TrendingUp, AlertTriangle, Check, Zap, Users, BarChart3, Code,
} from 'lucide-react';
import type { SubscriptionTier, TierLimits, TierPricing } from '@wishlist-wizard/shared';

interface SubscriptionStatus {
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

interface UpgradeOptionsResponse {
  upgradeTiers: Array<{ tier: SubscriptionTier; pricing: TierPricing }>;
}

const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: 'bg-slate-100 text-slate-900',
  starter: 'bg-blue-100 text-blue-900',
  plus: 'bg-purple-100 text-purple-900',
  creator: 'bg-orange-100 text-orange-900',
  business: 'bg-red-100 text-red-900',
  enterprise: 'bg-black text-white',
};

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  free: <Zap className="h-4 w-4" />,
  starter: <TrendingUp className="h-4 w-4" />,
  plus: <Users className="h-4 w-4" />,
  creator: <BarChart3 className="h-4 w-4" />,
  business: <Code className="h-4 w-4" />,
  enterprise: <CreditCard className="h-4 w-4" />,
};

function formatDate(ts: { _seconds: number } | undefined): string {
  if (!ts) return '—';
  return new Date(ts._seconds * 1000).toLocaleDateString();
}

function getUsagePercent(current: number, limit: number): number {
  if (limit >= Number.MAX_SAFE_INTEGER) return 0;
  return Math.round((current / limit) * 100);
}

export default function Subscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const functions = getFunctions();
  const [redirecting, setRedirecting] = useState(false);

  const { data: subStatus, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['subscription-status', user?.uid],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const fn = httpsCallable<object, SubscriptionStatus>(functions, 'billingStatus');
      const { data } = await fn();
      return data;
    },
    enabled: !!user,
  });

  async function handleUpgrade(tier: SubscriptionTier, billingCycle: 'monthly' | 'annual') {
    setRedirecting(true);
    try {
      const fn = httpsCallable<object, { url: string; sessionId: string }>(
        functions,
        'billingCheckout',
      );
      const { data } = await fn({ tier, billingCycle });
      window.location.href = data.url;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      setRedirecting(false);
    }
  }

  async function handleManageBilling() {
    setRedirecting(true);
    try {
      const fn = httpsCallable<object, { url: string }>(functions, 'billingPortal');
      const { data } = await fn();
      window.location.href = data.url;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      setRedirecting(false);
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="text-muted-foreground">Please sign in to manage your subscription.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading subscription details…</p>
      </div>
    );
  }

  if (!subStatus) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="text-destructive">Failed to load subscription details.</p>
      </div>
    );
  }

  const usagePercent = {
    wishlists: getUsagePercent(subStatus.usage.wishlistsOwned ?? 0, subStatus.limits.maxWishlists),
    items: getUsagePercent(
      subStatus.usage.totalItems ?? 0,
      subStatus.limits.maxItemsPerWishlist * subStatus.limits.maxWishlists,
    ),
    tracked: getUsagePercent(
      subStatus.usage.itemsTracked ?? 0,
      subStatus.limits.maxPriceTrackedItems,
    ),
  };

  const approaching = {
    wishlists: usagePercent.wishlists >= 80,
    tracked: usagePercent.tracked >= 80,
  };

  return (
    <div className="container mx-auto py-6 2xl:py-8 space-y-8 max-w-7xl">
      {/* Current Tier Card */}
      <div>
        <h1 className="text-3xl font-bold mb-6">Subscription & Billing</h1>

        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span>{TIER_ICONS[subStatus.tier]}</span>
                  <span className="capitalize">{subStatus.tier} Plan</span>
                </CardTitle>
                <CardDescription>{subStatus.pricing.tagline}</CardDescription>
              </div>
              <Badge className={`${TIER_COLORS[subStatus.tier]} px-3 py-1.5 text-lg capitalize`}>
                {subStatus.tier}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Billing Info */}
            {subStatus.status !== 'none' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold capitalize">{subStatus.status.replace('_', ' ')}</p>
                </div>
                {subStatus.currentPeriodEnd && (
                  <div>
                    <p className="text-sm text-muted-foreground">Renewal Date</p>
                    <p className="font-semibold">{formatDate(subStatus.currentPeriodEnd)}</p>
                  </div>
                )}
                {subStatus.tier !== 'free' && (
                  <div className="col-span-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManageBilling}
                      disabled={redirecting}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {redirecting ? 'Redirecting…' : 'Manage Billing'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Usage Metrics */}
            <div className="space-y-4">
              <h3 className="font-semibold">Usage & Limits</h3>

              {approaching.wishlists && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You're using {usagePercent.wishlists}% of your wishlist limit.
                    Consider upgrading to create more wishlists.
                  </AlertDescription>
                </Alert>
              )}

              {approaching.tracked && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You're using {usagePercent.tracked}% of your price tracking limit.
                    Upgrade to track more items.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Wishlists</span>
                  <span className="text-muted-foreground">
                    {subStatus.usage.wishlistsOwned ?? 0} / {subStatus.limits.maxWishlists === Number.MAX_SAFE_INTEGER ? '∞' : subStatus.limits.maxWishlists}
                  </span>
                </div>
                <Progress value={usagePercent.wishlists} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Items Tracked for Price</span>
                  <span className="text-muted-foreground">
                    {subStatus.usage.itemsTracked ?? 0} / {subStatus.limits.maxPriceTrackedItems === Number.MAX_SAFE_INTEGER ? '∞' : subStatus.limits.maxPriceTrackedItems}
                  </span>
                </div>
                <Progress value={usagePercent.tracked} className="h-2" />
              </div>

              {subStatus.limits.maxCollaboratorsPerWishlist > 1 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Collaborators per Wishlist</span>
                    <span className="text-muted-foreground">
                      up to {subStatus.limits.maxCollaboratorsPerWishlist}
                    </span>
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="pt-2 border-t">
                <p className="font-semibold text-sm mb-3">Included Features</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {subStatus.limits.adsEnabled === false && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>No Ads</span>
                    </div>
                  )}
                  {subStatus.limits.groupGiftingEnabled && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Group Gifting</span>
                    </div>
                  )}
                  {subStatus.limits.creatorDashboardEnabled && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Creator Dashboard</span>
                    </div>
                  )}
                  {subStatus.limits.analyticsEnabled && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Analytics</span>
                    </div>
                  )}
                  {subStatus.limits.apiAccessEnabled && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>API Access</span>
                    </div>
                  )}
                  {subStatus.limits.dataExportEnabled && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Data Export</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Options */}
      {subStatus.availableUpgrades && subStatus.availableUpgrades.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Upgrade Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subStatus.availableUpgrades.map(({ tier, pricing }) => (
              <Card key={tier} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>{TIER_ICONS[tier]}</span>
                    <span className="capitalize">{tier}</span>
                  </CardTitle>
                  <CardDescription>{pricing.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Annual Price</p>
                    <p className="text-2xl font-bold">${pricing.annualUsd}</p>
                    <p className="text-xs text-muted-foreground">
                      {pricing.annualSavingPercent}% off monthly
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Price</p>
                    <p className="text-lg font-semibold">${pricing.monthlyUsd}/mo</p>
                  </div>
                  <div className="space-y-2 pt-4">
                    <Button
                      className="w-full"
                      onClick={() => handleUpgrade(tier, 'annual')}
                      disabled={redirecting}
                    >
                      {redirecting ? 'Redirecting…' : 'Upgrade Annually'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleUpgrade(tier, 'monthly')}
                      disabled={redirecting}
                    >
                      Upgrade Monthly
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Free Trial Info */}
      {subStatus.tier === 'free' && subStatus.pricing.trialDays > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Upgrade now to get a {subStatus.pricing.trialDays}-day free trial on any paid plan,
            no credit card required to start.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
