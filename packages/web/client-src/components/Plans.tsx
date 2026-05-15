import { Link } from "wouter";
import { TIER_PRICING } from "@wishlist-wizard/shared";

const MARKETING_TIERS = ["free", "starter", "plus", "creator", "business"] as const;

function formatPrice(value: number | null): string {
  if (value == null) {
    return "Contact us";
  }

  if (value === 0) {
    return "$0";
  }

  return `$${value.toFixed(2)}`;
}

export default function Plans() {
  return (
    <section id="plans" className="py-12 bg-white border-t border-emerald-100/70">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-800 to-green-700 bg-clip-text text-transparent">
            Plans That Scale With You
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Start free, then unlock more wishlists, collaboration, tracking, and analytics as your gifting workflow grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
          {MARKETING_TIERS.map((tierKey) => {
            const tier = TIER_PRICING[tierKey];
            const isHighlighted = tierKey === "plus";

            return (
              <article
                key={tierKey}
                className={`rounded-2xl border p-6 shadow-sm transition-all ${
                  isHighlighted
                    ? "border-emerald-300 bg-emerald-50/60 shadow-emerald-100"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-slate-900">{tier.displayName}</h3>
                  <p className="text-sm text-slate-600 mt-2 min-h-[2.5rem]">{tier.tagline}</p>
                </div>

                <div className="mb-4">
                  <p className="text-3xl font-bold text-slate-900">{formatPrice(tier.monthlyUsd)}</p>
                  <p className="text-sm text-slate-500">per month</p>
                </div>

                <div className="mb-6 text-sm text-slate-600">
                  <p>Annual: {formatPrice(tier.annualUsd)}</p>
                  {tier.annualSavingPercent ? <p>Save {tier.annualSavingPercent}% yearly</p> : <p>No commitment required</p>}
                  {tier.trialDays > 0 ? <p>{tier.trialDays}-day free trial</p> : <p>Get started immediately</p>}
                </div>

                <Link
                  href={tierKey === "free" ? "/register" : "/register"}
                  className={`block text-center rounded-lg px-4 py-2 font-medium transition-colors ${
                    isHighlighted
                      ? "bg-emerald-700 text-white hover:bg-emerald-800"
                      : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  {tierKey === "free" ? "Start Free" : "Choose Plan"}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
