import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { ArrowRight, BadgeCheck, BarChart3, FileCheck2, Fingerprint, Landmark, Megaphone, ShieldAlert, SlidersHorizontal, WalletCards } from "lucide-react";
import {
  CommissionExample,
  CreatorJourneyDiagram,
  EducationCta,
  EducationNav,
  ProgramStatus,
} from "@/components/education/BusinessEducation";

const creatorPlans = [
  ["Free / Starter / Plus", "Personal and coordination workflows", "No creator share", "Wishlist, tracking, sharing, and plan-specific collaboration"],
  ["Creator Pro", "$14.99/mo or $149/yr", "Proposed 20%", "Unlimited creator workflow, full analytics, profile, and 1K API calls/month"],
  ["Business", "$29.99/mo or $299/yr", "Proposed 30%", "Five team seats, full analytics, branding, and 25K API calls/month"],
  ["Enterprise", "Negotiated", "Negotiated", "Custom scale, service, white-label, data, and affiliate arrangements"],
] as const;

const dashboardCards = [
  { icon: BarChart3, title: "Performance", text: "List views, product clicks, conversion rate, and retailer breakdown." },
  { icon: Landmark, title: "Commission status", text: "Estimated, pending, approved, payable, paid, and reversed amounts kept visibly separate." },
  { icon: WalletCards, title: "Payout readiness", text: "Threshold progress, hold dates, next estimated payout, and payout history." },
  { icon: SlidersHorizontal, title: "Adjustments", text: "Returns, chargebacks, fraud holds, and manual corrections with clear reason codes." },
] as const;

const eligibility = [
  [Fingerprint, "Verified identity and payout account", "The payee must be identifiable and able to receive funds in an eligible market."],
  [FileCheck2, "Tax and program documents complete", "Required tax forms, creator terms, and affiliate disclosures must be accepted."],
  [BadgeCheck, "Eligible active subscription", "The account must be active on a plan included in the launched creator-share policy."],
  [ShieldAlert, "Traffic meets program rules", "Self-referrals, bots, misleading promotion, and invalid traffic can trigger holds or removal."],
] as const;

export default function CreatorProgram() {
  return (
    <>
      <Helmet>
        <title>Creator Program | Wishlist Wizard</title>
        <meta name="description" content="Learn how the planned Wishlist Wizard Creator Program will combine curated wishlists, analytics, affiliate attribution, and transparent commission sharing." />
        <link rel="canonical" href="https://wishlist-wizard.com/creator-program" />
        <meta property="og:title" content="Wishlist Wizard Creator Program" />
        <meta property="og:description" content="Turn product recommendations into organized, measurable creator lists with a transparent planned earnings model." />
        <meta property="og:url" content="https://wishlist-wizard.com/creator-program" />
      </Helmet>

      <EducationNav current="/creator-program" />

      <section className="overflow-hidden">
        <div className="site-container grid gap-10 rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 py-12 text-white lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-200">Creator program</p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Turn trusted recommendations into organized, measurable creator lists.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50">Build themed product collections, understand what audiences respond to, and prepare for a transparent revenue-sharing program tied to qualified retail sales.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/subscriptions" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-50">Compare creator plans<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <Link href="/affiliate-commissions" className="inline-flex items-center justify-center rounded-lg border border-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">Understand commission math</Link>
            </div>
          </div>
          <div className="relative rounded-2xl border border-emerald-700 bg-emerald-900/70 p-7 shadow-2xl">
            <Megaphone className="h-9 w-9 text-amber-300" aria-hidden="true" />
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200">Designed for</p>
            <ul className="mt-4 space-y-3 text-emerald-50">
              {["Product reviewers and gift curators", "Lifestyle, home, tech, and hobby creators", "Wedding planners and recommendation teams", "Agencies managing multiple creator workflows"].map(item => (
                <li key={item} className="flex gap-3"><BadgeCheck className="mt-0.5 h-5 w-5 flex-none text-amber-300" aria-hidden="true" />{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <ProgramStatus />

      <div className="site-container space-y-12 py-12 lg:py-16">
        <CreatorJourneyDiagram />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Plans and proposed sharing</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">Professional tools scale with the creator’s workflow.</h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">Subscription fees pay for platform access and capabilities. They do not guarantee traffic, sales, or commission.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-6 py-4">Plan</th><th className="px-6 py-4">Price / purpose</th><th className="px-6 py-4">Commission share</th><th className="px-6 py-4">Professional value</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {creatorPlans.map(([plan, price, share, value]) => (
                  <tr key={plan}><td className="px-6 py-5 font-bold text-slate-950">{plan}</td><td className="px-6 py-5 text-sm text-slate-700">{price}</td><td className="px-6 py-5"><span className={`rounded-full px-3 py-1 text-sm font-bold ${share.includes("Proposed") ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{share}</span></td><td className="px-6 py-5 text-sm leading-6 text-slate-600">{value}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <CommissionExample />

        <section>
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Creator dashboard design</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">Earnings should be explainable, not mysterious.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">When launched, the dashboard should distinguish audience activity from retailer-approved money and trace every adjustment.</p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboardCards.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-6 w-6 text-emerald-700" aria-hidden="true" /><h3 className="mt-4 font-bold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6 sm:p-8">
          <div className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Eligibility and trust</p><h2 className="mt-3 text-3xl font-bold text-slate-950">Four gates protect creators, shoppers, and partners.</h2></div>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {eligibility.map(([Icon, title, text]) => {
              const EligibilityIcon = Icon as typeof Fingerprint;
              return <article key={String(title)} className="rounded-xl border border-emerald-100 bg-white p-5"><EligibilityIcon className="h-6 w-6 text-emerald-700" aria-hidden="true" /><h3 className="mt-4 font-bold text-slate-950">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{String(text)}</p></article>;
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">What creators control</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              {["The usefulness and accuracy of their recommendations", "How and where lists are promoted", "Clear affiliate disclosures", "Audience trust and engagement", "Compliance with creator and retailer rules"].map(item => <li key={item} className="flex gap-3"><BadgeCheck className="mt-0.5 h-5 w-5 flex-none text-emerald-700" aria-hidden="true" />{item}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-7 text-white shadow-sm">
            <h2 className="text-2xl font-bold">What Wishlist Wizard controls</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
              {["Affiliate tagging and creator attribution", "Retailer report ingestion and reconciliation", "Eligibility and fraud review", "Transparent ledgers and statements", "Payout scheduling, support, and disputes"].map(item => <li key={item} className="flex gap-3"><BadgeCheck className="mt-0.5 h-5 w-5 flex-none text-emerald-300" aria-hidden="true" />{item}</li>)}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-amber-950">No earnings guarantee</h2>
          <p className="mt-3 max-w-4xl leading-7 text-amber-900">Creator earnings depend on attributable qualified sales, retailer rates, approval, returns, compliance, and final program rules. Paying for Creator Pro or Business provides tools and eligibility under the proposed model; it does not purchase or guarantee commission income.</p>
        </section>

        <EducationCta title="Build the workflow before monetization launches." text="Creators can start organizing recommendation lists and compare professional capabilities now, while commission sharing remains clearly identified as planned." primaryHref="/register" primaryLabel="Create a free account" />
      </div>
    </>
  );
}
