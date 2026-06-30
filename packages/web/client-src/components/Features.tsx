import { Link } from "wouter";
import {
  ArrowRight,
  BadgeDollarSign,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Gift,
  HeartHandshake,
  Megaphone,
  Search,
  Share2,
  ShoppingBag,
  Users,
} from "lucide-react";

const personas = [
  {
    icon: Gift,
    label: "Gift recipients",
    title: "Make it easy for friends and family to choose well.",
    story:
      "Create one list for a birthday, holiday, or just-because ideas. Share it once, keep it current, and let buyers mark gifts as purchased.",
    outcome: "Fewer duplicates, fewer awkward guesses, better gifts.",
    plan: "Free",
    href: "/register",
    accent: "text-rose-600 bg-rose-50 border-rose-100",
  },
  {
    icon: CalendarDays,
    label: "Family planners",
    title: "Manage every birthday, holiday, and personal list in one place.",
    story:
      "Track multiple lists across kids, partners, parents, and seasonal shopping. Price alerts help you buy at the right moment.",
    outcome: "More organized gifting without spreadsheet sprawl.",
    plan: "Starter",
    href: "/subscriptions",
    accent: "text-teal-700 bg-teal-50 border-teal-100",
  },
  {
    icon: Users,
    label: "Occasion coordinators",
    title: "Coordinate group gifts without the group-chat confusion.",
    story:
      "For weddings, showers, graduations, and big family events, collaborators can see commitments before they buy.",
    outcome: "Clear ownership, fewer duplicates, smoother events.",
    plan: "Plus",
    href: "/subscriptions",
    accent: "text-sky-700 bg-sky-50 border-sky-100",
  },
  {
    icon: Megaphone,
    label: "Creators",
    title: "Turn product taste into trackable recommendation lists.",
    story:
      "Publish themed wishlists, see clicks and conversions, and use affiliate commission share as your recommendations grow.",
    outcome: "A cleaner path from content to measurable revenue.",
    plan: "Creator Pro",
    href: "/subscriptions",
    accent: "text-violet-700 bg-violet-50 border-violet-100",
  },
];

const workflow = [
  {
    icon: Search,
    title: "Capture ideas anywhere",
    text: "Save products from retailers, mobile shopping, or manual entry before ideas get lost.",
  },
  {
    icon: Share2,
    title: "Share the right list",
    text: "Send one link for the occasion, person, or audience instead of scattered screenshots.",
  },
  {
    icon: HeartHandshake,
    title: "Coordinate buying",
    text: "Viewers can reserve, purchase, or contribute so everyone knows what is covered.",
  },
  {
    icon: BellRing,
    title: "Watch prices",
    text: "Price tracking turns wishlists into a planning tool, not just a static list.",
  },
];

const differentiators = [
  "Works across web, iOS, and browser extension",
  "Supports personal lists, shared occasions, and creator storefronts",
  "Pairs gift coordination with price tracking",
  "Scales from free personal use to teams and API access",
];

export default function Features() {
  return (
    <>
      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">Use cases</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              One platform, four clear reasons to use it.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Whether you are receiving gifts, planning for family, coordinating an event,
              or monetizing recommendations, Wishlist Wizard gives each workflow a clear place to start.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {personas.map((persona) => {
              const Icon = persona.icon;

              return (
                <article key={persona.label} className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-lg border ${persona.accent}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{persona.label}</p>
                  <h3 className="mt-3 text-xl font-bold leading-snug text-slate-950">{persona.title}</h3>
                  <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">{persona.story}</p>
                  <div className="mt-5 rounded-lg bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-950">{persona.outcome}</p>
                    <p className="mt-1 text-sm text-slate-600">Natural plan: {persona.plan}</p>
                  </div>
                  <Link
                    href={persona.href}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-950"
                  >
                    Explore {persona.plan}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">Product story</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              From gift idea to confirmed purchase.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Collect the right ideas, share them cleanly, coordinate buyers, and use price intelligence
              to make each purchase feel smart.
            </p>
            <Link
              href="/extension"
              className="mt-7 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              See the Browser Extension
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {workflow.map((step) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <Icon className="h-6 w-6 text-teal-700" />
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div className="rounded-lg border border-slate-200 bg-slate-950 p-8 text-white">
            <ShoppingBag className="h-9 w-9 text-amber-300" />
            <h2 className="mt-5 text-3xl font-bold tracking-tight">More flexible than single-store wishlists.</h2>
            <p className="mt-4 text-slate-200">
              Wishlist Wizard is not locked to one retailer or one occasion. It combines any-store saving,
              shared gift coordination, price alerts, and creator analytics.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <BadgeDollarSign className="h-9 w-9 text-teal-700" />
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">Make the paid plans feel earned.</h2>
            <div className="mt-5 space-y-3">
              {differentiators.map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-teal-700" />
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
