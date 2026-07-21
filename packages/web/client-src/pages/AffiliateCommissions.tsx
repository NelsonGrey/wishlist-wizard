import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { ArrowRight, BadgeCheck, CircleDollarSign, HelpCircle, ReceiptText, ShieldCheck, ShoppingCart, Store } from "lucide-react";
import {
  CommissionExample,
  EducationCta,
  EducationNav,
  MoneyFlowDiagram,
  ProgramStatus,
  SettlementTimeline,
} from "@/components/education/BusinessEducation";

const FAQ_SCHEMA = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Who pays the affiliate commission?", acceptedAnswer: { "@type": "Answer", text: "The retailer funds the commission, often through an affiliate network, which pays Wishlist Wizard after a qualifying sale is approved." } },
    { "@type": "Question", name: "Does the shopper pay more?", acceptedAnswer: { "@type": "Answer", text: "No. Wishlist Wizard does not add an affiliate commission fee to the shopper's retail purchase price." } },
    { "@type": "Question", name: "Is a creator share based on the sale price?", acceptedAnswer: { "@type": "Answer", text: "No. A creator share is proposed as a percentage of the affiliate commission Wishlist Wizard actually receives." } },
  ],
});

const qualificationCards = [
  { icon: ShoppingCart, title: "A real purchase", text: "A shopper must complete an eligible order—not simply view or click a product." },
  { icon: ReceiptText, title: "Valid attribution", text: "The retailer or network must connect the order to the tagged Wishlist Wizard referral." },
  { icon: BadgeCheck, title: "Partner approval", text: "The commission must pass the partner’s validation, category, and attribution rules." },
  { icon: ShieldCheck, title: "No disqualifying event", text: "Returns, cancellations, chargebacks, self-referrals, and invalid traffic can reverse earnings." },
] as const;

const commissionTypes = [
  ["Retail affiliate commission", "Retailer/network → Wishlist Wizard", "Payment for a qualifying referred retail sale."],
  ["Creator commission share", "Wishlist Wizard → eligible creator", "A proposed percentage of settled platform commission."],
  ["Referral or ambassador incentive", "Program sponsor → promoter", "A separate customer-acquisition program; not the same as retail-sale revenue sharing."],
] as const;

export default function AffiliateCommissions() {
  return (
    <>
      <Helmet>
        <title>Affiliate Commissions Explained | Wishlist Wizard</title>
        <meta name="description" content="Learn who pays Wishlist Wizard affiliate commissions, how creator shares are calculated, and why clicks, sales, approval, and payouts are different stages." />
        <link rel="canonical" href="https://wishlist-wizard.com/affiliate-commissions" />
        <meta property="og:title" content="Wishlist Wizard Affiliate Commissions Explained" />
        <meta property="og:description" content="Follow the money from retailer-funded commission to a proposed creator share." />
        <meta property="og:url" content="https://wishlist-wizard.com/affiliate-commissions" />
        <script type="application/ld+json">{FAQ_SCHEMA}</script>
      </Helmet>

      <EducationNav current="/affiliate-commissions" />

      <section className="bg-slate-950 text-white">
        <div className="site-container grid gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">Affiliate commissions explained</p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">The retailer funds it. Wishlist Wizard receives it. Eligible creators may share it.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">The shopper is never charged an extra affiliate fee. Commission is a retailer-funded marketing expense tied to an approved referral.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <Store className="h-8 w-8 text-emerald-300" aria-hidden="true" />
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">The direct answer</p>
            <p className="mt-3 text-2xl font-bold">Retailer or affiliate network → Wishlist Wizard → eligible creator</p>
            <p className="mt-4 text-sm leading-6 text-slate-300">Each arrow represents a separate accounting event with its own eligibility and settlement rules.</p>
          </div>
        </div>
      </section>

      <ProgramStatus />

      <div className="site-container space-y-12 py-12 lg:py-16">
        <MoneyFlowDiagram />
        <CommissionExample />

        <section>
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">What qualifies</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">Four things must be true before commission is real.</h2>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {qualificationCards.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <Icon className="h-6 w-6 text-emerald-700" aria-hidden="true" />
                <h3 className="mt-4 font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <SettlementTimeline />

        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-7">
            <CircleDollarSign className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold text-slate-950">Three uses of “commission”</h2>
            <p className="mt-3 leading-7 text-slate-600">Affiliate language can be confusing because separate programs use the same word. Wishlist Wizard should always name the exact program and commission base.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {commissionTypes.map(([name, flow, definition]) => (
                <div key={name} className="p-5 sm:grid sm:grid-cols-[0.8fr_1fr_1.4fr] sm:gap-4">
                  <p className="font-bold text-slate-950">{name}</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700 sm:mt-0">{flow}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:mt-0">{definition}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Common questions</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">The details prospects usually want to know.</h2>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {[
              ["Does a shopper pay more?", "No. The retailer charges its normal price. Affiliate compensation comes from the retailer’s marketing arrangement."],
              ["Does every click earn money?", "No. A click is attribution evidence. Commission generally requires an eligible purchase that the retailer later approves."],
              ["Who sends the creator payment?", "Under the proposed model, Wishlist Wizard—not the retailer—would issue the creator’s payout."],
              ["What happens after a return?", "A pending commission can be removed. If already paid, the creator ledger may receive a negative adjustment under the final program terms."],
              ["Are rates always the same?", "No. Retailer rates can vary by partner, product category, geography, time period, and contract."],
              ["Can creators use their own retailer IDs?", "The current business model assumes Wishlist Wizard is the affiliate of record. Any bring-your-own-ID option would require a separate policy."],
            ].map(([question, answer]) => (
              <article key={question} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex gap-3">
                  <HelpCircle className="mt-0.5 h-5 w-5 flex-none text-emerald-700" aria-hidden="true" />
                  <div><h3 className="font-bold text-slate-950">{question}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p></div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-amber-950">What will be finalized before launch</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {["Attribution windows", "Eligible countries", "Final tier share rates", "Hold period and payout threshold", "Fees and currency treatment", "Creator terms and dispute process"].map(item => (
              <div key={item} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-950"><BadgeCheck className="h-4 w-4 text-amber-700" aria-hidden="true" />{item}</div>
            ))}
          </div>
        </section>

        <EducationCta title="See what this means for creators." text="Learn who qualifies, how professional plans fit, what the future dashboard will explain, and which safeguards protect creator earnings." primaryHref="/creator-program" primaryLabel="Explore the creator program" />
      </div>
    </>
  );
}
