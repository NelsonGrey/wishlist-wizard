import { Link } from "wouter";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleDollarSign,
  Clock3,
  Gift,
  Landmark,
  Megaphone,
  MousePointerClick,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserCheck,
  Users,
  WalletCards,
} from "lucide-react";

const educationLinks = [
  { href: "/how-it-works", label: "Business model" },
  { href: "/affiliate-commissions", label: "Affiliate commissions" },
  { href: "/creator-program", label: "Creator program" },
] as const;

export function EducationNav({ current }: { current: (typeof educationLinks)[number]["href"] }) {
  return (
    <nav aria-label="How Wishlist Wizard works">
      <div className="site-container grid grid-cols-3 gap-2 border-b border-emerald-100 bg-emerald-50/70 py-3 sm:flex sm:overflow-x-auto">
        {educationLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current === link.href ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center rounded-xl px-2 py-2 text-center text-xs font-semibold leading-tight transition-colors sm:min-h-0 sm:whitespace-nowrap sm:rounded-full sm:px-4 sm:text-sm ${
              current === link.href
                ? "bg-emerald-900 text-white"
                : "border border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-100"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function ProgramStatus() {
  return (
    <aside aria-label="Creator commission program status">
      <div className="site-container flex flex-col gap-3 border-y border-amber-200 bg-amber-50 py-5 sm:flex-row sm:items-start">
        <Clock3 className="h-6 w-6 flex-none text-amber-700" aria-hidden="true" />
        <div>
          <p className="font-bold text-amber-950">Creator commission sharing is a planned program.</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Wishlist Wizard can support affiliate-tagged links, but creator payouts will not begin until partner reporting,
            eligibility, tax, accounting, fraud, and payout controls are fully approved and operational. Published share
            percentages describe the proposed program design, not guaranteed current earnings.
          </p>
        </div>
      </div>
    </aside>
  );
}

const participantCards = [
  {
    icon: Megaphone,
    label: "Creators",
    gives: "Curated recommendations and audience trust",
    receives: "Publishing tools, analytics, and planned revenue sharing",
  },
  {
    icon: Gift,
    label: "Gift-givers",
    gives: "Purchase intent and product discovery",
    receives: "Clear lists, price tracking, and coordination",
  },
  {
    icon: Store,
    label: "Retailers",
    gives: "Products and affiliate marketing commissions",
    receives: "Qualified shoppers and measurable sales",
  },
  {
    icon: Building2,
    label: "Wishlist Wizard",
    gives: "The platform, attribution, and operations",
    receives: "Affiliate, subscription, advertising, and B2B revenue",
  },
] as const;

export function ParticipantExchangeDiagram() {
  return (
    <figure className="rounded-2xl border border-emerald-100 bg-emerald-950 p-5 text-white shadow-sm sm:p-8">
      <figcaption className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">Value exchange diagram</p>
        <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Four participants, each receiving something useful.</h2>
      </figcaption>
      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {participantCards.map(({ icon: Icon, label, gives, receives }) => (
          <div key={label} className="rounded-xl border border-emerald-700/70 bg-emerald-900 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-bold">{label}</h3>
            <dl className="mt-4 space-y-3 text-sm leading-6">
              <div>
                <dt className="font-semibold text-emerald-200">Contributes</dt>
                <dd className="text-emerald-50">{gives}</dd>
              </div>
              <div>
                <dt className="font-semibold text-emerald-200">Receives</dt>
                <dd className="text-emerald-50">{receives}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </figure>
  );
}

const moneyFlowSteps = [
  { icon: Megaphone, eyebrow: "1 · Recommend", title: "Creator publishes a list", text: "A themed wishlist links an audience to relevant products." },
  { icon: MousePointerClick, eyebrow: "2 · Refer", title: "Shopper follows a tagged link", text: "Attribution connects the visit to Wishlist Wizard and the creator." },
  { icon: ShoppingBag, eyebrow: "3 · Purchase", title: "Retailer completes the sale", text: "The shopper pays the normal retail price—there is no added commission fee." },
  { icon: Landmark, eyebrow: "4 · Settle", title: "Network pays Wishlist Wizard", text: "Only qualified, approved commission becomes actual platform revenue." },
  { icon: WalletCards, eyebrow: "5 · Share", title: "Wishlist Wizard pays the creator", text: "An eligible share is calculated after holds, returns, and compliance checks." },
] as const;

export function MoneyFlowDiagram() {
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <figcaption>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Money-flow diagram</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">From recommendation to creator payout.</h2>
        <p className="mt-3 max-w-3xl text-slate-600">
          The retailer funds the original affiliate commission. Wishlist Wizard receives it first and becomes responsible for any creator share.
        </p>
      </figcaption>

      <ol className="mt-8 flex flex-col items-stretch xl:flex-row xl:items-center" aria-label="Affiliate commission money flow">
        {moneyFlowSteps.map(({ icon: Icon, eyebrow, title, text }, index) => (
          <li key={title} className="contents">
            <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4 xl:min-h-52">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>
              <h3 className="mt-2 font-bold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
            {index < moneyFlowSteps.length - 1 && (
              <div className="flex justify-center px-2 py-2 text-emerald-700" aria-hidden="true">
                <ArrowDown className="h-5 w-5 xl:hidden" />
                <ArrowRight className="hidden h-5 w-5 xl:block" />
              </div>
            )}
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function CommissionExample() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <figcaption className="border-b border-slate-200 bg-slate-50 p-5 sm:p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Example calculation</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-950">A 20% share is not 20% of the purchase.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">It is 20% of the affiliate commission Wishlist Wizard actually receives.</p>
      </figcaption>
      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4 p-5 sm:p-7">
          {[
            ["Shopper purchase", "$100.00"],
            ["Illustrative retailer commission", "5%"],
            ["Paid to Wishlist Wizard", "$5.00"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <span className="text-sm text-slate-600">{label}</span>
              <strong className="text-lg text-slate-950">{value}</strong>
            </div>
          ))}
          <p className="text-xs leading-5 text-slate-500">Illustrative only. Actual retailer rates vary by partner, product category, geography, and program terms.</p>
        </div>

        <div className="border-t border-slate-200 bg-emerald-950 p-5 text-white sm:p-7 lg:border-l lg:border-t-0">
          <p className="font-semibold text-emerald-100">Proposed Creator Pro allocation of the $5 commission</p>
          <div className="mt-5 flex h-14 overflow-hidden rounded-xl" aria-label="20 percent to creator and 80 percent to Wishlist Wizard">
            <div className="flex w-1/5 items-center justify-center bg-amber-300 px-2 text-center text-xs font-bold text-amber-950">20%</div>
            <div className="flex w-4/5 items-center justify-center bg-emerald-600 px-2 text-center text-sm font-bold">80%</div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-amber-300/40 bg-amber-200/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Creator</p>
              <p className="mt-2 text-2xl font-bold">$1.00</p>
              <p className="mt-1 text-xs text-emerald-100">20% of $5</p>
            </div>
            <div className="rounded-xl border border-emerald-500 bg-emerald-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">Platform</p>
              <p className="mt-2 text-2xl font-bold">$4.00</p>
              <p className="mt-1 text-xs text-emerald-100">before operating costs</p>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

const settlementSteps = [
  { icon: ReceiptText, state: "Tracked", text: "The network reports a possible qualifying order." },
  { icon: Clock3, state: "Pending", text: "The order remains inside the return and validation window." },
  { icon: BadgeCheck, state: "Approved", text: "The network confirms the commission amount." },
  { icon: ShieldCheck, state: "Payable", text: "Eligibility, tax, fraud, and threshold checks pass." },
  { icon: CircleDollarSign, state: "Paid", text: "The creator receives the net amount in a payout cycle." },
] as const;

export function SettlementTimeline() {
  return (
    <figure className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 sm:p-8">
      <figcaption>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Settlement timeline</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-950">A click is not the same as payable earnings.</h2>
      </figcaption>
      <ol className="mt-7 grid gap-4 md:grid-cols-5">
        {settlementSteps.map(({ icon: Icon, state, text }, index) => (
          <li key={state} className="relative rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-xs font-bold text-emerald-700">0{index + 1}</span>
            </div>
            <h3 className="mt-4 font-bold text-slate-950">{state}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
        <RotateCcw className="mt-0.5 h-5 w-5 flex-none text-rose-700" aria-hidden="true" />
        <p className="text-sm leading-6 text-rose-900"><strong>Reversed:</strong> returns, cancellations, chargebacks, or invalid traffic can remove a pending amount or create an adjustment after payout.</p>
      </div>
    </figure>
  );
}

const creatorJourneySteps = [
  { icon: UserCheck, title: "Qualify", text: "Choose an eligible plan and complete required program, tax, and payout setup." },
  { icon: Megaphone, title: "Publish", text: "Build useful themed lists and share them with clear affiliate disclosures." },
  { icon: Users, title: "Engage", text: "Send audiences to products through attributable Wishlist Wizard links." },
  { icon: ReceiptText, title: "Measure", text: "Review clicks, qualified sales, pending commission, and reversals." },
  { icon: WalletCards, title: "Receive", text: "Get eligible settled earnings after the hold and payout threshold." },
] as const;

export function CreatorJourneyDiagram() {
  return (
    <figure className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm sm:p-8">
      <figcaption>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Creator journey diagram</p>
        <h2 className="mt-3 text-2xl font-bold sm:text-3xl">From creator account to transparent payout.</h2>
      </figcaption>
      <ol className="mt-8 grid gap-4 md:grid-cols-5">
        {creatorJourneySteps.map(({ icon: Icon, title, text }, index) => (
          <li key={title} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <Icon className="h-5 w-5 text-emerald-300" aria-hidden="true" />
              <span className="text-xs font-bold text-slate-400">{index + 1}/5</span>
            </div>
            <h3 className="mt-4 font-bold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function EducationCta({ title, text, primaryHref, primaryLabel }: { title: string; text: string; primaryHref: string; primaryLabel: string }) {
  return (
    <section className="rounded-2xl bg-emerald-900 p-7 text-white sm:p-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
          <p className="mt-3 leading-7 text-emerald-100">{text}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={primaryHref} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-50">
            {primaryLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/subscriptions" className="inline-flex items-center justify-center rounded-lg border border-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">
            Compare plans
          </Link>
        </div>
      </div>
    </section>
  );
}
