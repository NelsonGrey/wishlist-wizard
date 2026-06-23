import { Link } from "wouter";
import { Users, Share2, Lock, Gift } from "lucide-react";

export default function SocialIntegrationDemo() {
  return (
    <main className="py-12 bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-12">
          <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
            Feature Demo
          </p>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Social Integration
          </h1>
          <p className="text-xl text-slate-600">
            Share wishlists securely with friends and family. Coordinate group gifts and avoid duplicate purchases.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Sharing Flow */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Sarah's Birthday</h3>
                <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
                  Shared
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-4">Items: 12 • Viewers: 5 • Status: Open</p>
              <div className="space-y-2 mb-4">
                {[
                  { name: "You", role: "Owner", color: "bg-emerald-100" },
                  { name: "Mom", role: "Viewer", color: "bg-blue-100" },
                  { name: "Dad", role: "Viewer", color: "bg-purple-100" },
                  { name: "Aunt Jane", role: "Viewer", color: "bg-pink-100" }
                ].map((person) => (
                  <div key={person.name} className={`${person.color} rounded-lg p-3 flex items-center justify-between`}>
                    <div>
                      <p className="font-medium text-slate-900">{person.name}</p>
                      <p className="text-xs text-slate-600">{person.role}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-600">✓</span>
                  </div>
                ))}
              </div>
              <button className="w-full bg-emerald-700 text-white rounded-lg py-2 font-semibold hover:bg-emerald-800">
                Copy Share Link
              </button>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-emerald-100 p-3 rounded-lg h-fit">
                  <Share2 className="text-emerald-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Easy Sharing</h3>
                  <p className="text-slate-600 mt-1">Generate a unique link and share via email, text, or social media. No login required for viewers.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-blue-100 p-3 rounded-lg h-fit">
                  <Users className="text-blue-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Coordinated Gifting</h3>
                  <p className="text-slate-600 mt-1">Viewers can mark items as "purchased" so others know what's been covered and avoid duplicates.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-purple-100 p-3 rounded-lg h-fit">
                  <Lock className="text-purple-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Privacy Controls</h3>
                  <p className="text-slate-600 mt-1">Choose who can view, mark purchases, or leave comments. Revoke access anytime.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Perfect For</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Family Gift Planning",
                description: "Grandparents, parents, and siblings stay coordinated on birthdays and holidays without last-minute surprises.",
                emoji: "👨‍👩‍👧‍👦"
              },
              {
                title: "Wedding Registries",
                description: "Couples share their wishlist with extended family and friends who contribute from anywhere.",
                emoji: "💍"
              },
              {
                title: "Group Celebrations",
                description: "Coordinate a group gift where multiple people chip in toward one high-ticket item.",
                emoji: "🎉"
              },
              {
                title: "Office Secret Santa",
                description: "Employees share gift preferences anonymously, making gift selection thoughtful and fun.",
                emoji: "🎅"
              }
            ].map((useCase, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <p className="text-4xl mb-3">{useCase.emoji}</p>
                <h3 className="font-semibold text-slate-900 mb-2">{useCase.title}</h3>
                <p className="text-sm text-slate-600">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Trust */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Security & Privacy</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Unique Share Links",
                description: "Share links use a unique token — only people with the link can view the wishlist."
              },
              {
                title: "Permission Control",
                description: "You decide exactly what viewers can see and do. Revoke access at any time."
              },
              {
                title: "Purchase Tracking",
                description: "See what's been marked as purchased so the group stays coordinated."
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border border-emerald-100">
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/app/dashboard" className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-8 py-3 text-white font-semibold hover:bg-emerald-800 transition-colors">
            Try Sharing Now
          </Link>
          <Link href="/register" className="inline-flex items-center justify-center rounded-lg border-2 border-emerald-700 px-8 py-3 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors">
            Create Free Account
          </Link>
        </div>
      </div>
    </main>
  );
}
