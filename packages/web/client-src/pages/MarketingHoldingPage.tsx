import { Sparkles } from "lucide-react";

/**
 * Shown in place of the marketing route group when the marketing_offline
 * Remote Config flag is on (see hooks/useMarketingOffline). Legal/support
 * pages, auth pages, and the app itself are not gated by this — see
 * lib/marketingRoutes.ts and AppRouter.tsx's MarketingRoutesGate.
 */
export default function MarketingHoldingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="site-container flex items-center space-x-2 py-4">
          <Sparkles className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">Wishlist Wizard</span>
          <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            Coming Soon
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center mx-auto w-full max-w-[var(--site-content-width)] bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-20">
        <div className="text-center max-w-2xl">
          <Sparkles className="h-16 w-16 text-blue-600 mx-auto mb-6" />
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Something Amazing is
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Coming Soon</span>
          </h1>
          <p className="text-xl text-gray-600">
            We're building the ultimate wishlist management platform that makes shopping,
            sharing, and gifting more delightful than ever before.
          </p>
        </div>
      </main>

      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="site-container text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-lg font-bold">Wishlist Wizard</span>
          </div>
          <p className="text-sm text-gray-400">Coming soon to a browser near you.</p>
        </div>
      </footer>
    </div>
  );
}
