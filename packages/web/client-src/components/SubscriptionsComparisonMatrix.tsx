import type { ReactNode } from "react";
import { Check, Minus, Infinity } from "lucide-react";
import { TIER_LIMITS, TIER_PRICING, type SubscriptionTier } from "@wishlist-wizard/shared";

const TIERS: SubscriptionTier[] = ["free", "starter", "plus", "creator", "business"];

type MatrixRow = {
  label: string;
  description: string;
  renderValue: (tier: SubscriptionTier) => string | number | boolean | null;
};

function formatTierValue(value: string | number | boolean | null): ReactNode {
  if (value === null || value === false) {
    return <Minus className="h-4 w-4 text-slate-300" />;
  }

  if (value === true) {
    return <Check className="h-4 w-4 text-emerald-600" />;
  }

  if (typeof value === 'number') {
    if (value === Number.MAX_SAFE_INTEGER) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
          <Infinity className="h-4 w-4" /> Unlimited
        </span>
      );
    }

    return value.toLocaleString();
  }

  return value;
}

const rows: MatrixRow[] = [
  {
    label: 'Wishlists',
    description: 'How many active lists a user can own',
    renderValue: (tier) => TIER_LIMITS[tier].maxWishlists,
  },
  {
    label: 'Items per wishlist',
    description: 'Maximum items in a single list',
    renderValue: (tier) => TIER_LIMITS[tier].maxItemsPerWishlist,
  },
  {
    label: 'Price-tracked items',
    description: 'Items that can be monitored for price changes',
    renderValue: (tier) => TIER_LIMITS[tier].maxPriceTrackedItems,
  },
  {
    label: 'Collaborators per wishlist',
    description: 'People who can help manage a list',
    renderValue: (tier) => TIER_LIMITS[tier].maxCollaboratorsPerWishlist,
  },
  {
    label: 'Calendar integration',
    description: 'Connect birthday and event reminders',
    renderValue: (tier) => TIER_LIMITS[tier].calendarEnabled,
  },
  {
    label: 'Data export',
    description: 'Export your wishlist and account data',
    renderValue: (tier) => TIER_LIMITS[tier].dataExportEnabled,
  },
  {
    label: 'Analytics depth',
    description: 'How detailed the usage analytics are',
    renderValue: (tier) => TIER_LIMITS[tier].analyticsDepth,
  },
  {
    label: 'Custom profile URL',
    description: 'Use a branded public profile link',
    renderValue: (tier) => TIER_LIMITS[tier].customProfileUrl,
  },
  {
    label: 'Custom branding',
    description: 'Remove Wishlist Wizard branding',
    renderValue: (tier) => TIER_LIMITS[tier].customBrandingEnabled,
  },
  {
    label: 'API access',
    description: 'Programmatic access for integrations',
    renderValue: (tier) => TIER_LIMITS[tier].apiAccessEnabled,
  },
  {
    label: 'Team members',
    description: 'Seats for shared account management',
    renderValue: (tier) => TIER_LIMITS[tier].maxTeamMembers,
  },
  {
    label: 'Creator dashboard',
    description: 'Advanced creator analytics tools',
    renderValue: (tier) => TIER_LIMITS[tier].creatorDashboardEnabled,
  },
  {
    label: 'Monthly price',
    description: 'Published subscription price',
    renderValue: (tier) => TIER_PRICING[tier].monthlyUsd ?? null,
  },
  {
    label: 'Annual price',
    description: 'Annual billing price',
    renderValue: (tier) => TIER_PRICING[tier].annualUsd ?? null,
  },
  {
    label: 'Trial period',
    description: 'Free trial length',
    renderValue: (tier) => TIER_PRICING[tier].trialDays,
  },
  {
    label: 'Ads',
    description: 'Whether ads are shown on the account',
    renderValue: (tier) => TIER_LIMITS[tier].adsEnabled,
  },
];

export default function SubscriptionsComparisonMatrix() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <p className="uppercase tracking-[0.24em] text-emerald-700 text-sm font-semibold mb-3">
            Compare subscriptions
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            What each subscription includes
          </h2>
          <p className="text-slate-600 max-w-3xl mx-auto">
            A side-by-side view of the limits and capabilities users get at each subscription tier.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-left">
            <thead className="bg-slate-100/80">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-100/95 px-5 py-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Feature
                </th>
                {TIERS.map((tier) => (
                  <th key={tier} className="px-5 py-4 text-sm font-semibold uppercase tracking-wide text-slate-700">
                    {TIER_PRICING[tier].displayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.label} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  <td className="sticky left-0 z-10 bg-inherit px-5 py-4 align-top border-r border-slate-200">
                    <div className="font-semibold text-slate-900">{row.label}</div>
                    <div className="mt-1 text-sm text-slate-500">{row.description}</div>
                  </td>
                  {TIERS.map((tier) => {
                    const tierValue = row.renderValue(tier);

                    return (
                      <td key={`${row.label}-${tier}`} className="px-5 py-4 align-top text-sm text-slate-800">
                        {row.label === 'Monthly price' || row.label === 'Annual price' ? (
                          <span className="font-medium">
                            {typeof tierValue === 'number' ? `$${tierValue.toFixed(2)}` : 'Contact us'}
                          </span>
                        ) : row.label === 'Trial period' ? (
                          <span className="font-medium">{typeof tierValue === 'number' && tierValue > 0 ? `${tierValue} days` : 'None'}</span>
                        ) : row.label === 'Analytics depth' ? (
                          <span className="font-medium capitalize">{String(tierValue)}</span>
                        ) : typeof tierValue === 'boolean' ? (
                          formatTierValue(tierValue)
                        ) : typeof tierValue === 'number' ? (
                          <span className="font-medium">
                            {tierValue === Number.MAX_SAFE_INTEGER ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium"><Infinity className="h-4 w-4" /> Unlimited</span>
                            ) : tierValue.toLocaleString()}
                          </span>
                        ) : tierValue == null ? (
                          <span className="inline-flex items-center gap-1 text-slate-400"><Minus className="h-4 w-4" /> Not included</span>
                        ) : (
                          <span className="font-medium capitalize">{String(tierValue)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-slate-500 text-center">
          Limits are sourced from the shared subscription definitions so the marketing page matches product enforcement.
        </p>
      </div>
    </section>
  );
}
