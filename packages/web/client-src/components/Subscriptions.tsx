import { Link } from "wouter";
import { ArrowRight, BadgeDollarSign, CalendarDays, CheckCircle2, Gift, Megaphone, Users } from "lucide-react";
import { TIER_LIMITS, TIER_PRICING, type SubscriptionTier } from "@wishlist-wizard/shared";

const MARKETING_TIERS = ["free", "starter", "plus", "creator", "business"] as const;

type TierKey = (typeof MARKETING_TIERS)[number];

type PlanStory = {
  icon: typeof Gift;
  bestFor: string;
  upgradeWhen: string;
  valueProof: string;
  bullets: string[];
  cta: string;
  accent: string;
};

const PLAN_STORIES: Record<TierKey, PlanStory> = {
  free: {
    icon: Gift,
    bestFor: "Occasional wishlists for birthdays, holidays, and personal gift ideas.",
    upgradeWhen: "Stay here when you only need a few active lists and a small number of price alerts.",
    valueProof: "A generous free tier keeps sharing friction low and helps new gift-givers discover the product.",
    bullets: ["3 active wishlists", "5 price-tracked items", "Shared links with purchase visibility"],
    cta: "Start Free",
    accent: "text-rose-700 bg-rose-50 border-rose-100",
  },
  starter: {
    icon: CalendarDays,
    bestFor: "Families and engaged gift-givers managing multiple people and occasions.",
    upgradeWhen: "3 lists or 5 price alerts are no longer enough.",
    valueProof: "One meaningful price drop can cover the annual plan for a family shopper.",
    bullets: ["10 active wishlists", "25 price-tracked items", "Calendar reminders and basic analytics"],
    cta: "Choose Starter",
    accent: "text-teal-700 bg-teal-50 border-teal-100",
  },
  plus: {
    icon: Users,
    bestFor: "Weddings, showers, big family holidays, and serious gift coordination.",
    upgradeWhen: "You need group gifting, many collaborators, or unlimited lists.",
    valueProof: "Preventing one duplicate high-value gift can justify the plan for an event.",
    bullets: ["Unlimited wishlists", "75 price-tracked items", "Group gifting and no ads"],
    cta: "Choose Plus",
    accent: "text-sky-700 bg-sky-50 border-sky-100",
  },
  creator: {
    icon: Megaphone,
    bestFor: "Creators and curators turning product recommendations into measurable lists.",
    upgradeWhen: "You want affiliate commission share and creator analytics.",
    valueProof: "Creators can offset the subscription when recommendations start driving purchases.",
    bullets: ["Unlimited items and tracking", "20% commission share", "Full creator dashboard"],
    cta: "Choose Creator Pro",
    accent: "text-violet-700 bg-violet-50 border-violet-100",
  },
  business: {
    icon: BadgeDollarSign,
    bestFor: "Wedding planners, gifting teams, agencies, and high-volume recommendation workflows.",
    upgradeWhen: "You need seats, API access, dedicated support, or higher commission share.",
    valueProof: "Built for teams that manage gifting as an operational workflow, not a personal list.",
    bullets: ["5 team members", "25K API calls per month", "30% commission share"],
    cta: "Choose Business",
    accent: "text-amber-700 bg-amber-50 border-amber-100",
  },
};

interface SubscriptionsProps {
  variant?: "full" | "preview";
}

function formatPrice(value: number | null): string {
  if (value == null) {
    return "Contact us";
  }

  if (value === 0) {
    return "$0";
  }

  return `$${value.toFixed(2)}`;
}

function formatLimit(value: number): string {
  return value === Number.MAX_SAFE_INTEGER ? "Unlimited" : value.toLocaleString();
}

function getPlanMetrics(tierKey: SubscriptionTier): string {
  const limits = TIER_LIMITS[tierKey];
  const priceHistory = limits.priceHistoryMonths === Number.MAX_SAFE_INTEGER ? "full" : `${limits.priceHistoryMonths} mo`;
  return `${formatLimit(limits.maxWishlists)} lists · ${formatLimit(limits.maxPriceTrackedItems)} tracked · ${priceHistory} history`;
}

export default function Subscriptions({ variant = "full" }: SubscriptionsProps) {
  const isPreview = variant === "preview";

  return (
    <section id="subscriptions" className={`${isPreview ? "bg-slate-50" : "bg-white"} py-14 border-t border-slate-200`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">Subscriptions</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Pick the plan that matches the job you are doing.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Start with a useful free wishlist, then upgrade when you need more occasions,
              more coordination, deeper price tracking, creator revenue, or team operations.
            </p>
          </div>

          {isPreview && (
            <Link
              href="/subscriptions"
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
            >
              Compare Plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          {MARKETING_TIERS.map((tierKey) => {
            const tier = TIER_PRICING[tierKey];
            const story = PLAN_STORIES[tierKey];
            const Icon = story.icon;
            const isHighlighted = tierKey === "plus";

            return (
              <article
                key={tierKey}
                className={`flex h-full flex-col rounded-lg border p-5 shadow-sm transition-all ${
                  isHighlighted
                    ? "border-sky-300 bg-white shadow-sky-100"
                    : "border-slate-200 bg-white"
                }`}
              >
                {isHighlighted && (
                  <div className="mb-4 w-fit rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                    Best for group gifting
                  </div>
                )}

                <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-lg border ${story.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="text-xl font-bold text-slate-950">{tier.displayName}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{story.bestFor}</p>

                <div className="mt-5">
                  <p className="text-3xl font-bold text-slate-950">{formatPrice(tier.monthlyUsd)}</p>
                  <p className="text-sm text-slate-500">
                    per month{tier.annualUsd ? ` · ${formatPrice(tier.annualUsd)}/yr` : ""}
                  </p>
                </div>

                <div className="mt-5 rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Upgrade when</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{story.upgradeWhen}</p>
                </div>

                <div className="mt-5 space-y-3">
                  {story.bullets.map((bullet) => (
                    <div key={bullet} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-teal-700" />
                      <p className="text-sm leading-5 text-slate-700">{bullet}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-600">{story.valueProof}</p>
                <p className="mt-4 text-xs font-medium text-slate-500">{getPlanMetrics(tierKey)}</p>

                <Link
                  href="/register"
                  className={`mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                    isHighlighted
                      ? "bg-sky-700 text-white hover:bg-sky-800"
                      : "bg-slate-950 text-white hover:bg-slate-800"
                  }`}
                >
                  {story.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
