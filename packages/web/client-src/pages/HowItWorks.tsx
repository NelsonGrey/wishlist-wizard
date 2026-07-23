import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { ArrowRight, BadgeDollarSign, Building2, Gift, Megaphone, MonitorCheck, Store, Users } from "lucide-react";
import {
  EducationCta,
  EducationNav,
  ParticipantExchangeDiagram,
  ProgramStatus,
} from "@/components/education/BusinessEducation";

const SCHEMA = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "How Wishlist Wizard Works",
  url: "https://wishlist-wizard.com/how-it-works",
  description: "Understand how Wishlist Wizard creates value for gift-givers, creators, retailers, planners, and teams.",
});

const revenueStreams = [
  { icon: BadgeDollarSign, title: "Affiliate commissions", text: "Retailers or affiliate networks may pay Wishlist Wizard for qualified purchases made through tagged product links.", href: "/affiliate-commissions", link: "See the money flow" },
  { icon: MonitorCheck, title: "Subscriptions", text: "People and teams pay for higher limits, price tracking, collaboration, analytics, API access, and professional tools.", href: "/subscriptions", link: "Compare subscriptions" },
  { icon: Building2, title: "Business partnerships", text: "Brands, agencies, and enterprises can purchase integrations, team access, white-label capabilities, or negotiated services.", href: "/creator-program", link: "Explore professional use" },
  { icon: Store, title: "Free-tier support", text: "Limited advertising and retained affiliate revenue help subsidize useful free accounts without charging list viewers.", href: "/subscriptions", link: "Understand the free plan" },
] as const;

const payorRows = [
  ["Shopper", "The retailer", "The normal product price; Wishlist Wizard does not add an affiliate fee."],
  ["Retailer or affiliate network", "Wishlist Wizard", "An approved commission for a qualifying referred sale."],
  ["Subscriber", "Wishlist Wizard", "A monthly or annual fee for the selected plan and professional capabilities."],
  ["Wishlist Wizard", "Eligible creator", "A proposed share of settled platform commission after program conditions are met."],
  ["Brand or enterprise", "Wishlist Wizard", "A negotiated sponsorship, integration, API, service, or licensing fee."],
] as const;

export default function HowItWorks() {
  return (
    <>
      <Helmet>
        <title>How Wishlist Wizard Works | Business Model Explained</title>
        <meta name="description" content="See how Wishlist Wizard connects gift-givers, creators, retailers, and teams—and understand subscriptions, affiliate commissions, and creator revenue sharing." />
        <link rel="canonical" href="https://wishlist-wizard.com/how-it-works" />
        <meta property="og:title" content="How Wishlist Wizard Works" />
        <meta property="og:description" content="A transparent guide to the Wishlist Wizard business model and value exchange." />
        <meta property="og:url" content="https://wishlist-wizard.com/how-it-works" />
        <script type="application/ld+json">{SCHEMA}</script>
      </Helmet>

      <EducationNav current="/how-it-works" />

      <section>
        <div className="site-container grid gap-10 rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">How the business works</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              Better gifting creates value for everyone involved.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Wishlist Wizard connects people who know what they want, people ready to buy, creators with trusted recommendations, and retailers ready to fulfill the purchase.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/affiliate-commissions" className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-900 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">
                Follow a commission
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/creator-program" className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50">
                See the creator journey
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3" aria-label="Wishlist Wizard participants">
            {[
              [Gift, "Gift-givers", "Create and share"],
              [Users, "Buyers", "Coordinate and purchase"],
              [Megaphone, "Creators", "Curate and recommend"],
              [Store, "Retailers", "Fulfill and reward referrals"],
            ].map(([Icon, title, text]) => {
              const ParticipantIcon = Icon as typeof Gift;
              return (
                <div key={String(title)} className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <ParticipantIcon className="h-6 w-6 text-emerald-700" aria-hidden="true" />
                  <p className="mt-4 font-bold text-slate-950">{String(title)}</p>
                  <p className="mt-1 text-sm text-slate-600">{String(text)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ProgramStatus />

      <div className="site-container space-y-12 py-12 lg:py-16">
        <ParticipantExchangeDiagram />

        <section>
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">How Wishlist Wizard earns revenue</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Four complementary business engines.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">The model combines transaction-driven revenue with predictable subscriptions and professional services.</p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {revenueStreams.map(({ icon: Icon, title, text, href, link }) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <Icon className="h-7 w-7 text-emerald-700" aria-hidden="true" />
                <h3 className="mt-4 text-xl font-bold text-slate-950">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{text}</p>
                <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950">
                  {link}<ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Who pays whom?</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">Every payment has a different purpose.</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-white text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr><th className="px-6 py-4">Payor</th><th className="px-6 py-4">Recipient</th><th className="px-6 py-4">What the payment covers</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payorRows.map(([payor, recipient, purpose]) => (
                  <tr key={`${payor}-${recipient}`}>
                    <td className="px-6 py-4 font-semibold text-slate-950">{payor}</td>
                    <td className="px-6 py-4 text-slate-700">{recipient}</td>
                    <td className="px-6 py-4 text-sm leading-6 text-slate-600">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-7">
            <Gift className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold text-slate-950">Why keep a useful free plan?</h2>
            <p className="mt-3 leading-7 text-slate-600">Free lists make sharing easy, introduce new gift-givers to the platform, and can generate affiliate-supported activity without putting an advertisement on the recipient’s shared-list experience.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-7 text-white">
            <MonitorCheck className="h-8 w-8 text-emerald-300" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">Why charge subscriptions?</h2>
            <p className="mt-3 leading-7 text-slate-300">Price monitoring, extensive lists, collaboration, analytics, API calls, and team operations create recurring cost and professional value. Subscriptions make heavy usage sustainable and predictable.</p>
          </div>
        </section>

        <EducationCta title="Choose the path that matches your role." text="Start with the commission explainer if you want to understand the money, or compare plans when you are ready to choose a workflow." primaryHref="/affiliate-commissions" primaryLabel="Understand commissions" />
      </div>
    </>
  );
}
