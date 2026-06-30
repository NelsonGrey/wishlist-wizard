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

      <SubscriptionsSection />
      <SubscriptionsComparisonMatrix />
    </div>
    </>
  );
}
