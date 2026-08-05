import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Clock3 } from "lucide-react";
import SubscriptionsSection from "@/components/Subscriptions";
import SubscriptionsComparisonMatrix from "@/components/SubscriptionsComparisonMatrix";

export default function Subscriptions() {
  return (
    <>
      <Helmet>
        <title>Subscriptions | Wishlist Wizard</title>
        <meta name="description" content="Start free, then scale with Wishlist Wizard subscriptions — built for personal gifting, families, creators, and teams." />
        <meta property="og:title" content="Wishlist Wizard Subscriptions" />
        <meta property="og:description" content="Start free, then scale with subscriptions built for personal gifting, families, creators, and teams." />
        <meta property="og:url" content="https://wishlist-wizard.com/subscriptions" />
        <meta name="twitter:title" content="Wishlist Wizard Subscriptions" />
        <meta name="twitter:description" content="Start free, then scale with subscriptions built for personal gifting, families, creators, and teams." />
      </Helmet>
    <div className="flex flex-col">
      <section className="px-4 py-10 sm:px-6 md:py-12 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-lg border border-emerald-100 bg-emerald-900 px-8 py-10 text-center text-white md:py-12">
          <p className="uppercase tracking-[0.24em] text-emerald-100/90 text-sm font-semibold mb-4">
            Subscriptions
          </p>
          <h1 className="text-4xl md:text-[2.8rem] font-extrabold mb-4 leading-tight">
            A plan for every wishlist workflow
          </h1>
          <p className="text-base md:text-lg text-emerald-50 leading-relaxed">
            Start free, then upgrade when you need more occasions, group gifting, richer analytics, creator tools, or team capabilities.
          </p>
        </div>
      </section>

      <section className="site-container pb-4">
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-start">
          <Clock3 className="h-5 w-5 flex-none text-amber-700" aria-hidden="true" />
          <div>
            <p className="font-bold text-amber-950">Creator commission sharing is planned, not currently guaranteed.</p>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              Creator Pro and Business show the proposed program design. Payouts begin only after the program’s partner, legal, tax, accounting, and operational gates are complete.{" "}
              <Link href="/affiliate-commissions" className="font-bold underline underline-offset-2">See how commission sharing will work.</Link>
            </p>
          </div>
        </div>
      </section>

      <SubscriptionsSection />
      <SubscriptionsComparisonMatrix />
    </div>
    </>
  );
}
