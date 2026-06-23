import { Link } from "wouter";
import { Chrome, MousePointer, AlertCircle, Award } from "lucide-react";

export default function BrowserExtensionDemo() {
  return (
    <div className="py-12 bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-12">
          <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
            Feature Demo
          </p>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Browser Extension
          </h1>
          <p className="text-xl text-slate-600">
            Capture products from any online store in a single click. Save directly to your wishlists without leaving the page.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Browser Mockup */}
          <div className="flex justify-center">
            <div className="bg-white border border-slate-300 rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
              {/* Browser Chrome */}
              <div className="bg-slate-100 border-b border-slate-300 p-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 mx-2 bg-white border border-slate-300 rounded px-3 py-1 text-xs text-slate-600 flex items-center gap-1">
                  <span>amazon.com › product › ...gift</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center text-white text-xs font-bold">W</div>
                </div>
              </div>

              {/* Page Content */}
              <div className="p-6 bg-slate-50">
                <div className="bg-white rounded-lg p-4 mb-4 border border-slate-200">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-slate-300 to-slate-400 rounded"></div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">Premium Wireless Headphones</h3>
                      <p className="text-sm text-slate-600 mt-1">High-quality audio with noise cancellation</p>
                      <p className="text-lg font-bold text-emerald-700 mt-2">$129.99</p>
                    </div>
                  </div>
                </div>

                {/* Extension Popup Preview */}
                <div className="bg-white border-2 border-emerald-700 rounded-lg p-4 shadow-lg">
                  <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-700 rounded-full"></span>
                    Wishlist Wizard Detected
                  </p>
                  <div className="space-y-2">
                    <button className="w-full bg-emerald-700 text-white rounded py-2 text-sm font-semibold hover:bg-emerald-800">
                      Save to Birthday
                    </button>
                    <button className="w-full border border-emerald-700 text-emerald-700 rounded py-2 text-sm font-semibold hover:bg-emerald-50">
                      View All Lists
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-emerald-100 p-3 rounded-lg h-fit">
                  <MousePointer className="text-emerald-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">One-Click Save</h3>
                  <p className="text-slate-600 mt-1">Right-click any product to save it, or click the extension icon to see smart suggestions.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-blue-100 p-3 rounded-lg h-fit">
                  <Chrome className="text-blue-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Works Everywhere</h3>
                  <p className="text-slate-600 mt-1">Available for Chrome, Firefox, Edge, and Safari. Same experience across all browsers.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-purple-100 p-3 rounded-lg h-fit">
                  <AlertCircle className="text-purple-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Smart Detection</h3>
                  <p className="text-slate-600 mt-1">Automatically extracts product title, price, image, and URL from almost any retail page.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Supported Stores */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Works with Thousands of Stores</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Amazon",
              "Target",
              "Walmart",
              "Best Buy",
              "IKEA",
              "Etsy",
              "eBay",
              "Zappos",
              "Gap",
              "H&M",
              "Nike",
              "Apple",
              "and 1,000+ more..."
            ].map((store, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4 text-center text-slate-700 font-medium hover:bg-emerald-50 transition-colors">
                {store}
              </div>
            ))}
          </div>
        </div>

        {/* Installation Steps */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Setup</h2>
          <div className="space-y-4">
            {[
              "Click 'Download Extension' from our website",
              "Choose your browser (Chrome, Firefox, Edge, or Safari)",
              "Click 'Add to [Browser]' when prompted",
              "Sign in with your Wishlist Wizard account",
              "Start saving products instantly!"
            ].map((step, idx) => (
              <div key={idx} className="flex gap-4 items-start">
                <div className="bg-emerald-700 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <p className="text-slate-700 pt-1">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/extension" className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-8 py-3 text-white font-semibold hover:bg-emerald-800 transition-colors">
            Download Extension
          </Link>
          <Link href="/register" className="inline-flex items-center justify-center rounded-lg border-2 border-emerald-700 px-8 py-3 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors">
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
}
