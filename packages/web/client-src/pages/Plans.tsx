import PlansSection from "@/components/Plans";
import PlansComparisonMatrix from "@/components/PlansComparisonMatrix";

export default function Plans() {
  return (
    <div className="flex flex-col">
      <section className="bg-gradient-to-br from-emerald-700 via-green-700 to-teal-700 text-white py-14 md:py-16">
        <div className="container mx-auto px-4 text-center max-w-4xl">
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
