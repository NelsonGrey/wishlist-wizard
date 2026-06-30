import { Link } from "wouter";
import { ArrowRight, BellRing, CheckCircle2, Gift, Share2, Sparkles } from "lucide-react";

const proofPoints = [
  "Any-store wishlists",
  "Duplicate gift prevention",
  "Price drop alerts",
  "Creator-friendly links",
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0">
        <img
          src="/feature-screenshots/feature-demo.png"
          alt=""
          className="h-full w-full object-cover opacity-[0.24]"
        />
        <div className="absolute inset-0 bg-slate-950/78" />
      </div>

      <div className="relative mx-auto grid min-h-[620px] max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:px-8 lg:py-20">
        <div className="flex max-w-3xl flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-semibold text-teal-100">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Built for every gifting workflow
          </div>

          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            The wishlist platform for gifts people actually want.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
            Wishlist Wizard helps people create shareable lists, coordinate who is buying what,
            catch price drops, and turn product recommendations into trackable storefronts.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg transition-colors hover:bg-amber-300"
            >
              Start a Free Wishlist
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/subscriptions"
              className="inline-flex items-center justify-center rounded-lg border border-white/28 bg-white/10 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/16"
            >
              Find Your Plan
            </Link>
          </div>

          <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 text-sm text-slate-200 sm:grid-cols-2">
            {proofPoints.map((point) => (
              <div key={point} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-300" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center lg:justify-end">
          <div className="w-full max-w-md rounded-lg border border-white/14 bg-white/95 p-5 text-slate-950 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Live gift plan</p>
                <h2 className="mt-1 text-xl font-bold">Emma's Wedding</h2>
              </div>
              <Gift className="h-9 w-9 text-rose-500" />
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Kitchen mixer</h3>
                    <p className="mt-1 text-sm text-slate-600">Mom and Alex are splitting this gift.</p>
                  </div>
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">Reserved</span>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <BellRing className="mt-0.5 h-5 w-5 text-amber-700" />
                  <div>
                    <h3 className="font-semibold">Price drop found</h3>
                    <p className="mt-1 text-sm text-slate-700">Espresso machine dropped from $699 to $579.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <Share2 className="mt-0.5 h-5 w-5 text-sky-600" />
                  <div>
                    <h3 className="font-semibold">Shared with 15 guests</h3>
                    <p className="mt-1 text-sm text-slate-600">Everyone sees what is still available before they buy.</p>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/social-integration-demo"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              See Gift Coordination
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
