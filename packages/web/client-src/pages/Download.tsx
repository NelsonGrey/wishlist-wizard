import { Helmet } from "react-helmet";
import { Smartphone, Clock, Check, Star, Bell, Camera } from "lucide-react";

// Replace with the real App Store URL once the app is approved.
const APP_STORE_URL = "https://apps.apple.com/app/wishlist-wizard/id000000000";

const IOS_FEATURES = [
  { icon: <Bell className="h-5 w-5 text-emerald-700" />, text: "Price drop alerts delivered to your lock screen" },
  { icon: <Camera className="h-5 w-5 text-emerald-700" />, text: "Scan barcodes and QR codes to add items instantly" },
  { icon: <Check className="h-5 w-5 text-emerald-700" />, text: "Share wishlists and collaborate with family and friends" },
  { icon: <Star className="h-5 w-5 text-emerald-700" />, text: "Full wishlist management synced with the web app" },
];

export default function Download() {
  return (
    <>
      <Helmet>
        <title>Download the App | Wishlist Wizard</title>
        <meta name="description" content="Download the Wishlist Wizard iOS app. Manage wishlists, track prices, and get deal alerts on the go. Android coming soon." />
        <meta property="og:title" content="Download Wishlist Wizard" />
        <meta property="og:description" content="Download the Wishlist Wizard iOS app. Manage wishlists, track prices, and get deal alerts on the go. Android coming soon." />
        <meta property="og:url" content="https://wishlist-wizard.com/download" />
        <meta name="twitter:title" content="Download Wishlist Wizard" />
        <meta name="twitter:description" content="Download the Wishlist Wizard iOS app. Manage wishlists, track prices, and get deal alerts on the go. Android coming soon." />
      </Helmet>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Page heading */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent mb-3">
            Download the App
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Take your wishlists everywhere. Scan products, track prices, and get deal alerts right from your phone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">

          {/* ── iOS ── */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              {/* Apple logo mark */}
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 814 1000" className="w-7 h-7 fill-white" aria-hidden="true">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 405.8 0 315.9 0 239.5c0-137.6 89.8-210.5 178.1-210.5 61.7 0 113.3 40.8 153.4 40.8 39.5 0 101.2-42.8 171.1-42.8zM550.6 94.1c28.3-35.1 48.4-84 48.4-132.9 0-6.9-.6-13.9-1.9-19.5-45.6 1.9-99.2 30.2-131.8 71.9-26.4 31.4-51.3 80.8-51.3 131.4 0 7.5 1.3 15.1 1.9 17.5 3.2.6 8.4 1.3 13.6 1.3 41 0 93.1-28.3 121.1-70z" />
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
              <svg viewBox="0 0 814 1000" className="w-5 h-5 fill-white flex-shrink-0" aria-hidden="true">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 405.8 0 315.9 0 239.5c0-137.6 89.8-210.5 178.1-210.5 61.7 0 113.3 40.8 153.4 40.8 39.5 0 101.2-42.8 171.1-42.8zM550.6 94.1c28.3-35.1 48.4-84 48.4-132.9 0-6.9-.6-13.9-1.9-19.5-45.6 1.9-99.2 30.2-131.8 71.9-26.4 31.4-51.3 80.8-51.3 131.4 0 7.5 1.3 15.1 1.9 17.5 3.2.6 8.4 1.3 13.6 1.3 41 0 93.1-28.3 121.1-70z" />
              </svg>
              Download on the App Store
            </a>
          </div>

          {/* ── Android (Coming Soon) ── */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              {/* Android robot mark */}
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-gray-500" aria-hidden="true">
                  <path d="M17.523 15.341a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-9.046 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0M6.955 6.6a.5.5 0 0 0-.496.572l.79 4.733A2 2 0 0 0 9.226 13.6h5.548a2 2 0 0 0 1.977-1.695l.79-4.733A.5.5 0 0 0 17.045 6.6zm1.94-3.07-.893-1.63a.5.5 0 0 0-.871.478l.905 1.651A7.05 7.05 0 0 0 5 9.6h14a7.05 7.05 0 0 0-3.036-4.572l.905-1.65a.5.5 0 0 0-.871-.478l-.893 1.63A6.96 6.96 0 0 0 12 3.6a6.96 6.96 0 0 0-3.105.93" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-500">Android App</h2>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  <Clock className="h-3.5 w-3.5" />
                  Coming Soon
                </span>
              </div>
            </div>

            <p className="text-gray-500 text-sm mb-6 flex-1">
              We're working on the Android version of Wishlist Wizard. It will have all the same features as the iOS app — price tracking, barcode scanning, collaborative wishlists, and deal alerts.
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
        <div className="mt-10 rounded-xl bg-emerald-900 text-white px-8 py-6 text-center">
          <p className="font-semibold text-lg mb-1">Works across all your devices</p>
          <p className="text-emerald-100 text-sm">
            Your wishlists sync automatically between the iOS app, the web app, and the browser extension — pick up exactly where you left off.
          </p>
        </div>
      </div>
    </>
  );
}
