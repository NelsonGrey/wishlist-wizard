import { Sparkles } from "lucide-react";
import Footer from "@/components/Footer";

/**
 * Shown in place of the marketing route group when the marketing_offline
 * Remote Config flag is on (see hooks/useMarketingOffline). Legal/support
 * pages, auth pages, and the app itself are not gated by this — see
 * lib/marketingRoutes.ts and AppRouter.tsx's MarketingRoutesGate.
 *
 * Deliberately generic copy ("We'll Be Right Back") rather than "Coming
 * Soon" — this same flag and page get reused post-launch for planned
 * full-site maintenance windows, not just the pre-launch state.
 *
 * Reuses the real Footer (legal links stay reachable, and it inherits any
 * future brand changes automatically) but keeps a bare, nav-less header —
 * every other marketing route is gated too, so there's nowhere for a nav
 * link to usefully go.
 */
export default function MarketingHoldingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="site-container flex items-center py-4">
          <img src="/logo.svg" alt="Wishlist Wizard" className="h-9 w-9 mr-2.5" />
          <span className="font-bold text-xl tracking-tight text-emerald-800">Wishlist Wizard</span>
        </div>
      </header>

      <main className="flex-1 flex items-center bg-white px-4 py-16">
        <div className="site-container">
          <div className="mx-auto max-w-2xl rounded-lg border border-emerald-100 bg-emerald-900 px-6 py-12 text-center text-white shadow-sm sm:px-10 sm:py-16">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/50 bg-white/10 px-4 py-2 text-sm font-semibold text-emerald-50">
              <Sparkles className="h-4 w-4 text-emerald-100" />
              We'll Be Right Back
            </div>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">We'll Be Right Back</h1>
            <p className="mt-4 text-lg leading-7 text-slate-200">
              We're working behind the scenes to make Wishlist Wizard even better. Thanks for your patience.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
