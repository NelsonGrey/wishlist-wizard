import { Link } from "wouter";
import { ArrowRight, BellRing, CheckCircle2, Gift, Share2, Sparkles } from "lucide-react";

const proofPoints = ["Any-store wishlists", "Duplicate gift prevention", "Price drop alerts", "Creator-friendly links"];

export default function Hero() {
  return (
    <section className="compact-laptop-section bg-white py-8 2xl:py-10">
      <div className="site-container">
        <div className="compact-laptop-panel grid grid-cols-1 gap-8 rounded-lg border border-emerald-100 bg-emerald-900 px-6 py-10 text-white shadow-sm sm:px-8 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 2xl:gap-10 2xl:px-10 2xl:py-16">
          <div className="flex max-w-3xl flex-col justify-center">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200/50 bg-white/10 px-4 py-2 text-sm font-semibold text-emerald-50 2xl:mb-6">
              <Sparkles className="h-4 w-4 text-emerald-100" />
              Built for every gifting workflow
            </div>

            <h1 className="max-w-4xl text-4xl font-extrabold leading-tight lg:text-5xl 2xl:text-6xl">The wishlist platform for gifts people actually want.</h1>

            <p className="mt-4 max-w-2xl text-lg leading-7 text-slate-200 2xl:mt-6 2xl:text-xl 2xl:leading-8">
              Wishlist Wizard helps people create shareable lists, coordinate who is buying what, catch price drops, and turn product recommendations into trackable storefronts.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row 2xl:mt-8">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-emerald-900 shadow-lg transition-colors hover:bg-emerald-50"
              >
                Start a Free Wishlist
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/subscriptions"
                className="inline-flex items-center justify-center rounded-lg border border-white/40 bg-emerald-800 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Find Your Plan
              </Link>
            </div>

            <div className="mt-6 grid max-w-2xl grid-cols-1 gap-2 text-sm text-slate-200 sm:grid-cols-2 2xl:mt-8 2xl:gap-3">
              {proofPoints.map(point => (
                <div key={point} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-100" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center lg:justify-end">
            <div className="w-full max-w-md rounded-lg border border-white/14 bg-white/95 p-5 text-slate-950 shadow-2xl">
              <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Live gift plan</p>
                  <h2 className="mt-1 text-xl font-bold">Emma's Wedding</h2>
                </div>
                <Gift className="h-9 w-9 text-emerald-700" />
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">Kitchen mixer</h3>
                      <p className="mt-1 text-sm text-slate-600">Mom and Alex are splitting this gift.</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Reserved</span>
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <BellRing className="mt-0.5 h-5 w-5 text-emerald-700" />
                    <div>
                      <h3 className="font-semibold">Price drop found</h3>
                      <p className="mt-1 text-sm text-slate-700">Espresso machine dropped from $699 to $579.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <Share2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                    <div>
                      <h3 className="font-semibold">Shared with 15 guests</h3>
                      <p className="mt-1 text-sm text-slate-600">Everyone sees what is still available before they buy.</p>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href="/social-integration-demo"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
              >
                See Gift Coordination
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
