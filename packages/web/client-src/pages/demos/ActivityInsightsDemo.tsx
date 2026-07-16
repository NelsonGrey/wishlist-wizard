import { Link } from "wouter";
import { BarChart3, TrendingUp, Eye, Share2 } from "lucide-react";

export default function ActivityInsightsDemo() {
  return (
    <div className="py-12 bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-12">
          <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
            Feature Demo
          </p>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Basic Activity Insights
          </h1>
          <p className="text-xl text-slate-600">
            Simple visibility into list engagement. See which items get attention and optimize your sharing strategy.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Analytics Mockup */}
          <div className="flex justify-center">
            <div className="bg-white rounded-lg border border-slate-200 shadow-lg p-6 w-full max-w-sm space-y-6">
              {/* Card Title */}
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">Birthday Wishlist</h3>
                <p className="text-sm text-slate-600">Last 7 days</p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-200">
                  <p className="text-2xl font-bold text-emerald-700">42</p>
                  <p className="text-xs text-slate-600 mt-1">Views</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-200">
                  <p className="text-2xl font-bold text-emerald-700">8</p>
                  <p className="text-xs text-slate-600 mt-1">Shares</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-200">
                  <p className="text-2xl font-bold text-emerald-700">3</p>
                  <p className="text-xs text-slate-600 mt-1">Clicks</p>
                </div>
              </div>

              {/* Simple Chart */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-slate-900 mb-3">Item Performance</p>
                <div className="space-y-3">
                  {[
                    { name: "Wireless Headphones", views: 12, color: "bg-emerald-500" },
                    { name: "Coffee Maker", views: 8, color: "bg-emerald-500" },
                    { name: "Book Set", views: 5, color: "bg-emerald-500" }
                  ].map((item, idx) => (
                    <div key={idx}>
                      <p className="text-xs font-medium text-slate-700 mb-1">{item.name}</p>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className={`${item.color} h-full`} style={{ width: `${(item.views / 12) * 100}%` }}></div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{item.views} views</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-emerald-100 p-3 rounded-lg h-fit">
                  <Eye className="text-emerald-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">View Counts</h3>
                  <p className="text-slate-600 mt-1">See how many people viewed your list and which items got the most attention.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-emerald-100 p-3 rounded-lg h-fit">
                  <Share2 className="text-emerald-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Share Tracking</h3>
                  <p className="text-slate-600 mt-1">Track which shares drove the most engagement. Know what channels work best.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-emerald-100 p-3 rounded-lg h-fit">
                  <TrendingUp className="text-emerald-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Trend Insights</h3>
                  <p className="text-slate-600 mt-1">Simple trend lines show whether your list is gaining momentum or cooling down.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Insights You Get */}
        <div className="bg-white border border-slate-200 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Insights at a Glance</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Which Items Matter Most",
                description: "See which items get clicked and viewed. Focus on popular items for your planning."
              },
              {
                title: "Sharing Effectiveness",
                description: "Know which shares were seen and engaged with. Understand what resonates with your network."
              },
              {
                title: "Engagement Trends",
                description: "Simple trend indicators show if interest is growing or declining over time."
              },
              {
                title: "Viewer Activity",
                description: "See timestamps of when people viewed and shared your lists. Understand timing and patterns."
              }
            ].map((insight, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <h3 className="font-semibold text-slate-900 mb-2">{insight.title}</h3>
                <p className="text-sm text-slate-600">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">How Creators Use These Insights</h2>
          <div className="space-y-4">
            {[
              {
                scenario: "Before an event",
                action: "Check which items are getting attention so you can highlight them in follow-up messages."
              },
              {
                scenario: "Managing multiple lists",
                action: "See which lists drive the most engagement to prioritize curation and updating."
              },
              {
                scenario: "Planning future wishlists",
                action: "Use past engagement patterns to understand what types of items resonate with your audience."
              },
              {
                scenario: "Optimizing sharing strategy",
                action: "Learn which sharing channels and times drive the most views and engagement for future campaigns."
              }
            ].map((useCase, idx) => (
              <div key={idx} className="bg-white border border-emerald-200 rounded-lg p-4">
                <p className="font-semibold text-slate-900 text-sm">{useCase.scenario}</p>
                <p className="text-slate-600 text-sm mt-2">→ {useCase.action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Keep It Simple */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Built for Non-Technical Users</h2>
          <p className="text-slate-700 mb-4">
            No complex analytics jargon. No overwhelming dashboards. Just simple, clear numbers that help you understand engagement and make better decisions about your wishlists. Get the insights you need without the noise.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/app/analytics" className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-8 py-3 text-white font-semibold hover:bg-emerald-800 transition-colors">
            View Your Analytics
          </Link>
          <Link href="/register" className="inline-flex items-center justify-center rounded-lg border-2 border-emerald-700 px-8 py-3 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors">
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
}
