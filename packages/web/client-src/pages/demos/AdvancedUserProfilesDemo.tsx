import { Link } from "wouter";
import { User, Zap, Target, Heart } from "lucide-react";

export default function AdvancedUserProfilesDemo() {
  return (
    <main className="py-12 bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-12">
          <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
            Feature Demo
          </p>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Advanced User Profiles
          </h1>
          <p className="text-xl text-slate-600">
            Create detailed gift preferences and profiles for everyone you gift for. Personalize recommendations and planning.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Profile Card Mockup */}
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg w-full max-w-sm overflow-hidden">
              {/* Header Banner */}
              <div className="h-24 bg-gradient-to-r from-emerald-500 to-green-500"></div>
              
              {/* Profile Content */}
              <div className="p-6">
                {/* Avatar */}
                <div className="flex justify-center -mt-16 mb-4">
                  <div className="w-32 h-32 rounded-full border-4 border-white bg-slate-300 flex items-center justify-center text-4xl">
                    👩
                  </div>
                </div>

                {/* Name and Details */}
                <h3 className="text-2xl font-bold text-center text-slate-900">Sarah</h3>
                <p className="text-center text-slate-600 mb-1">My Mom</p>
                <p className="text-center text-sm text-slate-500 mb-6">Birthday: May 15</p>

                {/* Preference Sections */}
                <div className="space-y-4 mb-6 border-t pt-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">🎯 Style Preferences</p>
                    <div className="flex flex-wrap gap-2">
                      {["Minimalist", "Modern", "Eco-Friendly"].map((pref) => (
                        <span key={pref} className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                          {pref}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">❤️ Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {["Gardening", "Cooking", "Travel"].map((interest) => (
                        <span key={interest} className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">🚫 Avoid</p>
                    <p className="text-sm text-slate-600">Electronics, anything with batteries</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">💰 Budget Range</p>
                    <p className="text-sm text-slate-600">$25 - $100</p>
                  </div>
                </div>

                <button className="w-full bg-emerald-700 text-white rounded-lg py-2 font-semibold hover:bg-emerald-800">
                  View Profile
                </button>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-emerald-100 p-3 rounded-lg h-fit">
                  <User className="text-emerald-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Rich Profiles</h3>
                  <p className="text-slate-600 mt-1">Store gift preferences, interests, sizes, colors, and budget ranges for each person you gift for.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-blue-100 p-3 rounded-lg h-fit">
                  <Zap className="text-blue-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Smart Recommendations</h3>
                  <p className="text-slate-600 mt-1">Get personalized item suggestions based on stored preferences and past wishlists.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-purple-100 p-3 rounded-lg h-fit">
                  <Heart className="text-purple-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Thoughtful Gifting</h3>
                  <p className="text-slate-600 mt-1">Make every gift more personal by remembering preferences and interests year-round.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Components */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">What You Can Store in Profiles</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                category: "Personal Details",
                items: ["Birthday", "Anniversary", "Relationship", "Photo"]
              },
              {
                category: "Style & Preferences",
                items: ["Favorite colors", "Style tags", "Size information", "Material preferences"]
              },
              {
                category: "Interests & Hobbies",
                items: ["Hobbies", "Sports", "Books/Authors", "Music preferences"]
              },
              {
                category: "Gifting Guidelines",
                items: ["Budget range", "Items to avoid", "Allergen info", "Delivery address"]
              },
              {
                category: "Gift History",
                items: ["Past gifts", "What worked", "What didn't", "Preferences evolution"]
              },
              {
                category: "Notes & Context",
                items: ["Personal notes", "Special requirements", "Timing preferences", "Custom details"]
              }
            ].map((section, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <h3 className="font-semibold text-slate-900 mb-3">{section.category}</h3>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="w-2 h-2 bg-emerald-700 rounded-full"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Benefits of Detailed Profiles</h2>
          <div className="space-y-4">
            {[
              {
                title: "Effortless Planning",
                description: "Recall preferences instantly without needing to remember details year after year."
              },
              {
                title: "Better Gift Ideas",
                description: "Profile data helps generate personalized recommendations aligned with their interests."
              },
              {
                title: "More Thoughtful Gifts",
                description: "Show you really know and care by selecting gifts that match stored preferences."
              },
              {
                title: "Avoid Mistakes",
                description: "Remember budget ranges, things to avoid, and special requirements. Never miss important details."
              },
              {
                title: "Family Knowledge",
                description: "Build a family knowledge base of preferences that can be shared with other gift-givers."
              },
              {
                title: "Simplify Team Gifting",
                description: "Share colleague or employee profiles with your team for coordinated group gifts."
              }
            ].map((benefit, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border border-emerald-100">
                <h3 className="font-semibold text-slate-900 mb-1">{benefit.title}</h3>
                <p className="text-sm text-slate-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/app/user-profile" className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-8 py-3 text-white font-semibold hover:bg-emerald-800 transition-colors">
            Create Profiles
          </Link>
          <Link href="/register" className="inline-flex items-center justify-center rounded-lg border-2 border-emerald-700 px-8 py-3 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors">
            Create Free Account
          </Link>
        </div>
      </div>
    </main>
  );
}
