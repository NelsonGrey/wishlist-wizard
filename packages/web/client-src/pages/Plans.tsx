import PlansSection from "@/components/Plans";
import PlansComparisonMatrix from "@/components/PlansComparisonMatrix";

export default function Plans() {
  return (
    <div className="flex flex-col">
      <section className="py-10 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl bg-emerald-900 text-white rounded-2xl px-8 py-10 md:py-12 text-center">
          <p className="uppercase tracking-[0.24em] text-emerald-100/90 text-sm font-semibold mb-4">
            Pricing
          </p>
          <h1 className="text-4xl md:text-[2.8rem] font-extrabold mb-4 leading-tight">
            Plans for every wishlist workflow
          </h1>
          <p className="text-base md:text-lg text-emerald-50 leading-relaxed">
            Start free, then scale into shared gifting, richer analytics, creator tools, and team capabilities when you need them.
          </p>
        </div>
      </section>

      <PlansSection />
      <PlansComparisonMatrix />
    </div>
  );
}
