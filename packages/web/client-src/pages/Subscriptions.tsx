import { Helmet } from "react-helmet";
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
      <section className="py-10 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl bg-emerald-900 text-white rounded-2xl px-8 py-10 md:py-12 text-center">
          <p className="uppercase tracking-[0.24em] text-emerald-100/90 text-sm font-semibold mb-4">
            Subscriptions
          </p>
          <h1 className="text-4xl md:text-[2.8rem] font-extrabold mb-4 leading-tight">
            A subscription for every wishlist workflow
          </h1>
          <p className="text-base md:text-lg text-emerald-50 leading-relaxed">
            Start free, then scale into shared gifting, richer analytics, creator tools, and team capabilities when you need them.
          </p>
        </div>
      </section>

      <SubscriptionsSection />
      <SubscriptionsComparisonMatrix />
    </div>
    </>
  );
}
