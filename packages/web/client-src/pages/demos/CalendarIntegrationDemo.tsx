import { Link } from "wouter";
import { Calendar, Bell, Clock, CheckCircle } from "lucide-react";

export default function CalendarIntegrationDemo() {
  return (
    <main className="py-12 bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-12">
          <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">
            Feature Demo
          </p>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Calendar Integration
          </h1>
          <p className="text-xl text-slate-600">
            Never miss an important date. Sync your wishlists with birthdays, anniversaries, and special events.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Calendar Mockup */}
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 w-full max-w-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 text-lg">May 2026</h3>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-slate-100 rounded">&lt;</button>
                  <button className="p-2 hover:bg-slate-100 rounded">&gt;</button>
                </div>
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-6 text-center text-xs font-semibold text-slate-600 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, idx) => {
                  const day = idx - 3;
                  const isCurrentMonth = day > 0 && day <= 31;
                  const isEvent = [5, 12, 18, 25].includes(day);
                  
                  return (
                    <div
                      key={idx}
                      className={`
                        aspect-square flex items-center justify-center rounded
                        ${!isCurrentMonth ? "text-slate-300" : ""}
                        ${isEvent ? "bg-emerald-700 text-white font-semibold" : ""}
                        ${isCurrentMonth && !isEvent ? "border border-slate-200 hover:bg-slate-50" : ""}
                      `}
                    >
                      {isCurrentMonth ? day : ""}
                    </div>
                  );
                })}
              </div>

              {/* Events */}
              <div className="mt-6 space-y-3 border-t pt-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-emerald-900">May 5 - Sarah's Birthday</p>
                  <p className="text-xs text-emerald-700">12 items in wishlist</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-blue-900">May 18 - Mom's Anniversary</p>
                  <p className="text-xs text-blue-700">8 items in wishlist</p>
                </div>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-emerald-100 p-3 rounded-lg h-fit">
                  <Calendar className="text-emerald-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Sync Your Calendars</h3>
                  <p className="text-slate-600 mt-1">Connect to Google Calendar, Outlook, or Apple Calendar to sync events with your wishlists.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-blue-100 p-3 rounded-lg h-fit">
                  <Bell className="text-blue-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Smart Reminders</h3>
                  <p className="text-slate-600 mt-1">Get notified weeks in advance so you have plenty of time to shop and plan.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="bg-purple-100 p-3 rounded-lg h-fit">
                  <Clock className="text-purple-700" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Auto-Sync Updates</h3>
                  <p className="text-slate-600 mt-1">Calendar events automatically match your wishlist updates. Everything stays perfectly aligned.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">How It Works</h2>
          <div className="space-y-6">
            {[
              {
                time: "60 days before",
                title: "Early Reminder",
                description: "Get your first notification so you can start building the wishlist."
              },
              {
                time: "30 days before",
                title: "Mid-Point Check-In",
                description: "Second reminder with a summary of items and planning tips."
              },
              {
                time: "7 days before",
                title: "Final Countdown",
                description: "Shared wishlist reminder for friends and family to purchase."
              },
              {
                time: "Event day",
                title: "Celebration Day",
                description: "View of all items purchased and shared thank-you tracking."
              }
            ].map((step, idx) => (
              <div key={idx} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  {idx < 3 && <div className="w-1 h-20 bg-emerald-200 mt-2"></div>}
                </div>
                <div className="pb-6">
                  <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">{step.time}</p>
                  <h3 className="text-lg font-semibold text-slate-900 mt-1">{step.title}</h3>
                  <p className="text-slate-600 mt-2">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supported Calendars */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Supported Calendars</h2>
          <p className="text-slate-600 mb-6">Connect one of these calendar services to sync important dates with your wishlists.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              { name: "Google Calendar", desc: "Sign in with Google to sync your events" },
              { name: "Outlook", desc: "Connect your Microsoft account" },
              { name: "Apple Calendar", desc: "Subscribe via iCal URL" },
            ].map((cal) => (
              <div key={cal.name} className="bg-white border border-emerald-200 rounded-lg p-4 hover:bg-emerald-100 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="text-emerald-600 flex-shrink-0" size={16} />
                  <span className="font-medium text-slate-900">{cal.name}</span>
                </div>
                <p className="text-xs text-slate-500 pl-6">{cal.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500">More calendar integrations coming soon.</p>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/app/calendar" className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-8 py-3 text-white font-semibold hover:bg-emerald-800 transition-colors">
            Try Calendar Integration
          </Link>
          <Link href="/register" className="inline-flex items-center justify-center rounded-lg border-2 border-emerald-700 px-8 py-3 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors">
            Create Free Account
          </Link>
        </div>
      </div>
    </main>
  );
}
