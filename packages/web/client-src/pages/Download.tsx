import { Helmet } from "react-helmet";
import { Smartphone, Clock, Check, Star, Bell, Camera } from "lucide-react";

// Replace with the real App Store URL once the app is approved.
const APP_STORE_URL = "https://apps.apple.com/app/wishlist-wizard/id000000000";

const IOS_FEATURES = [
  { icon: <Bell className="h-5 w-5 text-emerald-700" />, text: "In-app alerts when tracked prices drop" },
  { icon: <Camera className="h-5 w-5 text-emerald-700" />, text: "Scan items in-store to add them to your wishlists" },
  { icon: <Check className="h-5 w-5 text-emerald-700" />, text: "Share wishlists and collaborate with family and friends" },
  { icon: <Star className="h-5 w-5 text-emerald-700" />, text: "Full wishlist management synced with the web app" },
];

export default function Download() {
  return (
    <>
      <Helmet>
        <title>Download the App | Wishlist Wizard</title>
        <meta name="description" content="Download the Wishlist Wizard iOS app to manage wishlists, scan products, track prices, and share gift ideas on the go. Android coming soon." />
        <meta property="og:title" content="Download Wishlist Wizard" />
        <meta property="og:description" content="Download the Wishlist Wizard iOS app to manage wishlists, scan products, track prices, and share gift ideas on the go. Android coming soon." />
        <meta property="og:url" content="https://wishlist-wizard.com/download" />
        <meta name="twitter:title" content="Download Wishlist Wizard" />
        <meta name="twitter:description" content="Download the Wishlist Wizard iOS app to manage wishlists, scan products, track prices, and share gift ideas on the go. Android coming soon." />
      </Helmet>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Page heading */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-emerald-900 mb-3">
            Take your wishlists with you
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Scan products in-store, manage shared lists, and catch price drops from your phone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">

          {/* ── iOS ── */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              {/* Apple logo mark */}
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">iOS App</h2>
                <p className="text-sm text-emerald-700 font-medium">Available on the App Store</p>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {IOS_FEATURES.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0">{feature.icon}</span>
                  <span className="text-gray-700 text-sm">{feature.text}</span>
                </li>
              ))}
            </ul>

            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-3 text-white font-semibold hover:bg-gray-800 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white flex-shrink-0" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Download on the App Store
            </a>
          </div>

          {/* ── Android (Coming Soon) ── */}
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              {/* Android robot mark */}
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-gray-500" aria-hidden="true">
                  <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-2.86-1.21-6.08-1.21-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-500">Android App</h2>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  <Clock className="h-3.5 w-3.5" />
                  Coming Soon
                </span>
              </div>
            </div>

            <p className="text-gray-500 text-sm mb-6 flex-1">
              We're working on the Android version of Wishlist Wizard. It will include price tracking, barcode scanning, shared wishlists, and deal alerts.
            </p>

            <p className="text-sm text-gray-500 mb-4 font-medium">
              Want to be notified when it launches?
            </p>

            <a
              href="mailto:support@wishlist-wizard.com?subject=Notify%20me%20when%20Android%20is%20available"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-gray-500 font-semibold cursor-not-allowed select-none"
              aria-disabled="true"
              onClick={(e) => e.preventDefault()}
            >
              <Smartphone className="h-5 w-5" />
              Coming Soon on Google Play
            </a>
          </div>

        </div>

        {/* Cross-platform note */}
        <div className="mt-10 rounded-lg bg-emerald-900 text-white px-8 py-6 text-center">
          <p className="font-semibold text-lg mb-1">Works across all your devices</p>
          <p className="text-emerald-100 text-sm">
            Your wishlists sync automatically between the iOS app, the web app, and the browser extension — pick up exactly where you left off.
          </p>
        </div>
      </div>
    </>
  );
}
