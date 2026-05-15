import { Link } from "wouter";
import { LayoutList, Filter, Archive, Share2 } from "lucide-react";

export default function WishlistManagementDemo() {
  return (
    <main className="py-12 bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-12">
          <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
            Feature Demo
          </p>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Wishlist Management
          </h1>
          <p className="text-xl text-slate-600">
            Organize all your wishlists in one place. Create, manage, and prioritize items across multiple lists and occasions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Wishlist Mockup */}
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 w-full max-w-sm space-y-4">
              {/* List Header */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-bold text-slate-900">My Wishlists</h3>
                <button className="text-sm text-emerald-700 font-semibold hover:underline mt-2">+ Create New List</button>
              </div>

              {/* Wishlist Items */}
              {[
                { title: "Birthday Gifts", count: 12, priority: "high", color: "border-red-500" },
                { title: "Home Office Upgrades", count: 8, priority: "medium", color: "border-yellow-500" },
                { title: "Vacation Must-Haves", count: 15, priority: "low", color: "border-green-500" },
                { title: "Tech Wishlist", count: 5, priority: "high", color: "border-purple-500" }
              ].map((list, idx) => (
                <div key={idx} className={`border-l-4 ${list.color} p-4 rounded hover:bg-slate-50 transition-colors`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-slate-900">{list.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      list.priority === 'high' ? 'bg-red-100 text-red-700' :
                      list.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {list.priority}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{list.count} items</p>
                </div>
              ))}
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-emerald-100 p-3 rounded-lg h-fit">
                  <LayoutList className="text-emerald-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Multiple Lists</h3>
                  <p className="text-slate-600 mt-1">Create unlimited wishlists for different people, occasions, or purposes. Organize exactly how you want.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-blue-100 p-3 rounded-lg h-fit">
                  <Filter className="text-blue-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Smart Sorting</h3>
                  <p className="text-slate-600 mt-1">Sort by priority, price, date added, or custom order. Filter and search items instantly.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-purple-100 p-3 rounded-lg h-fit">
                  <Share2 className="text-purple-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Easy Sharing</h3>
                  <p className="text-slate-600 mt-1">Share individual lists or batch-share multiple lists with one click.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Management Features */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">List Management Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Item Prioritization",
                description: "Mark items as must-have, nice-to-have, or maybe. Reorganize with drag-and-drop.",
                icon: "📌"
              },
              {
                title: "Notes & Details",
                description: "Add custom notes, colors, or tags to items for quick identification and organization.",
                icon: "📝"
              },
              {
                title: "Price Tracking",
                description: "Monitor price changes on items. Get alerts when prices drop on your wishlist items.",
                icon: "💰"
              },
              {
                title: "Bulk Actions",
                description: "Select multiple items to edit, share, or delete all at once. Save time with batch operations.",
                icon: "⚡"
              },
              {
                title: "List Collaboration",
                description: "Let others add items to your wishlist. Collaborative list building for group planning.",
                icon: "👥"
              },
              {
                title: "Archive Old Lists",
                description: "Keep your dashboard clean by archiving completed or outdated wishlists. Easy to restore.",
                icon: "📦"
              }
            ].map((feature, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <p className="text-3xl mb-3">{feature.icon}</p>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Organize For Every Occasion</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              "Birthday Gifts",
              "Holidays",
              "Home Remodeling",
              "Travel Packing",
              "Wedding Registry",
              "New Baby",
              "Professional Development",
              "Kids Wish Lists",
              "Hobby Gear",
              "Gaming Setup",
              "Self-Care",
              "Pet Supplies"
            ].map((occasion, idx) => (
              <div key={idx} className="bg-white border border-emerald-200 rounded-lg p-4 text-center font-medium text-slate-900 hover:bg-emerald-100 transition-colors">
                {occasion}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/app/dashboard" className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-8 py-3 text-white font-semibold hover:bg-emerald-800 transition-colors">
            Start Creating Lists
          </Link>
          <Link href="/register" className="inline-flex items-center justify-center rounded-lg border-2 border-emerald-700 px-8 py-3 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors">
            Create Free Account
          </Link>
        </div>
      </div>
    </main>
  );
}
