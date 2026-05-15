import { Link } from "wouter";
import { Smartphone, Zap, Share2, Bell } from "lucide-react";

export default function MobileAppDemo() {
  return (
    <main className="py-12 bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-12">
          <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
            Feature Demo
          </p>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Mobile App
          </h1>
          <p className="text-xl text-slate-600">
            Access your wishlists anywhere, anytime. Capture items on the go and stay synchronized across all your devices.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Phone Mockup */}
          <div className="flex justify-center items-start">
            <div className="bg-black rounded-3xl p-3 shadow-2xl max-w-sm w-full" style={{ aspectRatio: "9/19" }}>
              <div className="bg-white rounded-2xl h-full overflow-hidden flex flex-col">
                {/* Status Bar */}
                <div className="bg-emerald-700 text-white px-6 py-3 text-center text-sm font-semibold">
                  9:41
                </div>
                {/* Phone Content */}
                <div className="flex-1 overflow-auto bg-gradient-to-br from-emerald-50 to-green-50 p-4 flex flex-col">
                  <div className="mb-4">
                    <h2 className="font-bold text-lg text-slate-900">My Wishlists</h2>
                    <p className="text-sm text-slate-600">3 active lists</p>
                  </div>
                  
                  <div className="space-y-3 flex-1">
                    {[
                      { title: "Birthday Gifts", items: 12, color: "bg-emerald-100" },
                      { title: "Tech Wishlist", items: 8, color: "bg-blue-100" },
                      { title: "Home Decor", items: 5, color: "bg-purple-100" }
                    ].map((list) => (
                      <div key={list.title} className={`${list.color} rounded-lg p-4`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-slate-900">{list.title}</p>
                            <p className="text-xs text-slate-600">{list.items} items</p>
                          </div>
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-emerald-700">{list.items}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button className="bg-emerald-700 text-white rounded-lg py-3 font-semibold w-full mt-4">
                    + Add Item
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-emerald-100 p-3 rounded-lg h-fit">
                  <Zap className="text-emerald-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Quick Capture</h3>
                  <p className="text-slate-600 mt-1">Instantly save items you find while shopping. Camera scanner detects barcodes automatically.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-blue-100 p-3 rounded-lg h-fit">
                  <Share2 className="text-blue-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Share on the Move</h3>
                  <p className="text-slate-600 mt-1">Send wishlists to friends and family with one tap. Secure link sharing keeps control in your hands.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-purple-100 p-3 rounded-lg h-fit">
                  <Bell className="text-purple-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Smart Notifications</h3>
                  <p className="text-slate-600 mt-1">Get alerts on price drops, new items added, or when friends add to shared lists.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Key Benefits</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Offline Mode",
                description: "View and manage lists even without an internet connection. Syncs automatically when you reconnect."
              },
              {
                title: "Barcode Scanning",
                description: "Use your phone's camera to scan product barcodes and auto-populate item details from retail databases."
              },
              {
                title: "Cross-Device Sync",
                description: "Changes on your phone instantly appear on web and vice versa. Your data stays perfectly synchronized."
              }
            ].map((benefit, idx) => (
              <div key={idx} className="border-l-4 border-emerald-700 pl-4">
                <h3 className="font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-slate-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/app/dashboard" className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-8 py-3 text-white font-semibold hover:bg-emerald-800 transition-colors">
            Try App Dashboard
          </Link>
          <Link href="/register" className="inline-flex items-center justify-center rounded-lg border-2 border-emerald-700 px-8 py-3 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors">
            Create Free Account
          </Link>
        </div>
      </div>
    </main>
  );
}
