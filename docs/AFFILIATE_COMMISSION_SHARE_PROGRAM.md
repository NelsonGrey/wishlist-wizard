# Affiliate Commission Share Program - Design and Rollout Guide

**Version**: 1.1  
**Date**: May 15, 2026 (design); updated August 8, 2026 for launch status  
**Status**: Launched (2026-07-21) — commission ledger, Stripe Connect payouts, and creator dashboard live on `wishlist-wizard-dev`. See Section 2 and Section 16 for what remains before this is production-verified end-to-end.

---

## 1. Purpose

This document originally defined how an Affiliate Commission Share program should operate for Wishlist Wizard when activated. It was written as a launch blueprint, not a statement of current production behavior. As of 2026-07-21, that blueprint has been substantially implemented and deployed; this revision annotates the document with actual launch status while preserving the original design record for reference. Where the shipped implementation uses different entity/collection names than this blueprint originally proposed, that is called out explicitly (see Section 5).

At a high level, the program:
- Lets the platform earn affiliate commissions from qualifying purchases.
- Shares a configurable portion of those commissions with eligible creators.
- Preserves legal compliance, auditability, and payout accuracy.

---

## 2. Current State (Important)

As of 2026-08-08:
- The commission ledger, Stripe Connect Express payout pipeline, per-creator affiliate
  tracking, idempotent reconciliation (Amazon Associates adapter live), creator dashboard,
  and admin tooling all shipped 2026-07-21 and are deployed to `wishlist-wizard-dev`.
- The program is tier-gated via `creatorDashboardEnabled` /
  `affiliateCommissionShare` in `packages/shared/src/subscription.ts`: enabled for
  Creator (20%) and Business (30%) tiers; disabled (0%) for Free/Starter/Plus.
- **Not yet verified end-to-end in a live environment**: real admin-credential flows
  through `/admin/affiliate`, a real creator-tier dashboard view against a paid test
  account, a live Stripe Connect test-mode onboarding + transfer round trip, and a full
  CSV-to-payout live run. Emulator tests (25+11 assertions) cover the ledger state
  machine, idempotent reimport, and the Amazon CSV adapter pre-deploy.
- Staging and production deployment have not happened yet — only `wishlist-wizard-dev`.
- Given the above, customer-facing marketing copy should still avoid presenting the
  commission-share program as a fully verified, production-hardened feature until the
  remaining items in Section 16 are closed — but internal/product documentation, creator
  dashboard UI, and admin tooling should now describe it as shipped, not "not launched."

---

## 3. Program Scope

### 3.1 In Scope
- Creator eligibility and onboarding.
- Affiliate click tracking and attribution.
- Conversion ingestion and commission calculation.
- Revenue share calculation by plan tier.
- Payout scheduling and execution.
- Tax, compliance, and fraud controls.
- Reporting, reconciliation, and dispute handling.

### 3.2 Out of Scope
- Retailer contract negotiation playbooks.
- Country-by-country legal interpretation (requires counsel).
- Manual backfills for pre-launch historical traffic (optional policy decision).

---

## 4. Program Model

### 4.1 Revenue Flow
1. Creator shares a wishlist/product link.
2. User clicks link instrumented with affiliate attribution metadata.
3. Retailer affiliate network reports qualified events (click/sale/approved commission).
4. Platform receives commission from affiliate network.
5. System computes creator share based on plan policy.
6. Creator payout is issued on schedule after hold period.

### 4.2 Share Policy (shipped)
The "proposed" figures below matched the shipped values exactly and are now live in
`affiliateCommissionShare` per tier in `packages/shared/src/subscription.ts`:
- Free/Starter/Plus: 0%
- Creator: 20%
- Business: 30%
- Enterprise: 0% (negotiated separately per account; not auto-computed)

These are code-enforced tier defaults, not marketing copy — legal/marketing sign-off on
publishing the specific percentages externally is a separate question from whether the
mechanism is built and running (it is).

### 4.3 Payout Principles
- Pay on **approved/settled** commissions only, not raw click estimates.
- Apply reversal handling (returns, cancellations, chargebacks).
- Apply payout hold window (for example, 30 to 60 days after event settlement).
- Enforce minimum payout threshold (for example, $25) to reduce overhead.

---

## 5. Data and Event Architecture

**Naming note**: the entity names in Section 5.1 below are the *original blueprint*
names from the May 2026 design. The shipped 2026-07-21 implementation is Firestore-based
and uses different collection names, mapped here for reference:

| Blueprint name (5.1, original) | Shipped Firestore collection | Notes |
|---|---|---|
| `affiliate_click_events` | `affiliateClicks` | click-level attribution data |
| `affiliate_conversion_events` | *(not a separate collection)* | conversion data lands directly in `commissionLedger` entries via reconciliation import, tracked in `affiliateReportImports` job records |
| `affiliate_commission_ledger` | `commissionLedger` (+ `commissionLedger/{id}/transitions` subcollection) | normalized commission records, with a `Tracked -> Pending -> Approved -> Payable -> Paid` state machine plus a `Reversed` branch |
| `creator_share_ledger` | *(folded into `commissionLedger`)* | each ledger entry carries the creator-owed amount directly rather than a separate share ledger; corrections are `commissionAdjustments` docs, never mutations of the source entry |
| `creator_payouts` | `payoutBatches` (+ `payoutBatches/{id}/items`) | one batch document per creator per payout run, for failure isolation |
| `affiliate_reversals` | *(folded into `commissionAdjustments` and the `Reversed` ledger state)* | no separate reversals collection; reversal is either a state transition or an adjustment doc |

Two collections exist in the shipped system that this blueprint's Section 5.1 did not
originally anticipate:
- `creatorAffiliateTrackingIds` / `affiliateTrackingIdPool` — per-creator affiliate
  tracking ID assignment and the admin-managed pool of tracking IDs (Amazon Associates
  caps tracking IDs at roughly 100 per account, so IDs are pooled and reassignable).
- `creatorPayoutAccounts` — Stripe Connect Express account linkage, payout eligibility,
  and `outstandingClawbackBalanceUsd` for post-payout clawbacks.

### 5.1 Core Entities (original blueprint names — see mapping table above)
- `affiliate_click_events`: click-level attribution data.
- `affiliate_conversion_events`: conversion notifications from networks.
- `affiliate_commission_ledger`: normalized commission records.
- `creator_share_ledger`: creator-owed amounts per event/period.
- `creator_payouts`: payout batches and statuses.
- `affiliate_reversals`: returns/chargebacks/disputes.

### 5.2 Required Fields (Minimum)
- Click: `clickId`, `creatorId`, `wishlistId`, `itemId`, `program`, `destinationUrl`, `timestamp`, `ipHash`, `userAgentHash`.
- Conversion: `networkEventId`, `clickId` (or fallback attribution key), `orderId`, `saleAmount`, `commissionAmount`, `currency`, `status`, `occurredAt`, `reportedAt`.
- Creator Share Ledger: `creatorShareId`, `creatorId`, `sourceCommissionId`, `sharePercent`, `shareAmount`, `eligibilityTier`, `holdUntil`, `status`.
- Payout: `payoutId`, `creatorId`, `periodStart`, `periodEnd`, `grossShare`, `adjustments`, `netPayout`, `currency`, `method`, `providerTransferId`, `status`, `paidAt`.

These fields are conceptually present in the shipped ledger/payout documents, though
exact field names differ in places (e.g. the shipped state machine uses `state` with
values `Tracked`/`Pending`/`Approved`/`Payable`/`Paid`/`Reversed` rather than a generic
`status` string).

### 5.3 Ledger Rules
- Use append-only ledger rows for all monetary events.
- Never mutate historical amounts directly; use adjustment entries.
- Preserve immutable link from payout rows back to source commission rows.

**Shipped behavior confirms this**: `commissionLedger` entries are never mutated once
`Approved`+ except via the defined state transitions, and every correction — including
a clawback against an already-`Paid` entry — is written as a separate
`commissionAdjustments` document rather than an edit to the historical entry. Post-payout
clawbacks net against `creatorPayoutAccounts.outstandingClawbackBalanceUsd`.

---

## 6. Eligibility and Policy Rules

### 6.1 Creator Eligibility
A creator is eligible when all are true:
- Account is active and not suspended.
- Subscription tier qualifies for share.
- Required disclosures accepted.
- Tax profile complete (where required).
- Payout account verified.

### 6.2 Attribution Policy
Define one clear policy before launch:
- Last-click window (example: 24 hours), or
- Program-specific attribution based on network rules.

Policy must be documented and surfaced in creator terms to prevent disputes.

### 6.3 Reversal and Adjustment Policy
- If commission is reversed by network, mirror reversal in creator ledger.
- If payout already issued, apply negative adjustment to next cycle.
- Keep dispute trail and reason codes.

---

## 7. Compliance and Legal Controls

### 7.1 Disclosure
- Require visible affiliate disclosure on creator surfaces where links are promoted.
- Ensure disclosure language meets FTC/region-specific requirements.

### 7.2 Tax and KYC
- Collect tax forms per region (for example, W-9/W-8 flows in US contexts).
- Block payouts until required tax/KYC data is valid.

### 7.3 Terms and Consent
- Publish program terms that cover:
  - Eligibility
  - Share percentages
  - Payout timing
  - Reversal handling
  - Fraud policy
  - Termination rights

### 7.4 Privacy
- Do not store raw PII unnecessarily in click streams.
- Hash or tokenize IP/user agent where possible.
- Apply retention and deletion policies aligned with legal requirements.

---

## 8. Fraud and Risk Controls

### 8.1 Detection Signals
- Abnormal click velocity from single source.
- High click volume with near-zero dwell time.
- Self-referrals or circular referral patterns.
- Sudden conversion spikes inconsistent with baseline.

### 8.2 Automated Guardrails
- Rate limits for click ingestion endpoints.
- Bot filtering and known-signature blocking.
- Manual review queue for suspicious creators/events.
- Temporary payout hold escalation on flagged accounts.

### 8.3 Enforcement
- Freeze payout on high-confidence fraud.
- Reverse pending creator shares for invalid traffic.
- Maintain audit entries for all enforcement actions.

---

## 9. Financial Operations

### 9.1 Reconciliation
On each payout cycle:
1. Reconcile network-reported commissions with internal ledger totals.
2. Reconcile creator ledger with payout queue.
3. Validate FX conversion source and timestamp.
4. Validate failed payout retries and exception queue.

### 9.2 Payout Cadence
Recommended baseline:
- Monthly payout run.
- Hold period for late reversals.
- Minimum threshold before issuing payout.

### 9.3 Reporting
Required reports:
- Creator statement (period earnings, reversals, net payout).
- Finance reconciliation report.
- Program P&L (gross commission vs creator share vs net platform take).
- Fraud and disputes report.

---

## 10. Product and UX Requirements

### 10.1 Creator Dashboard
Should show:
- Clicks, conversions, approved commissions.
- Pending vs payable vs paid balances.
- Reversals/adjustments with reason codes.
- Next payout estimate and expected date.

### 10.2 Admin Controls
Admins need:
- Program enable/disable switches.
- Tier share configuration.
- Fraud review queue.
- Manual adjustment tooling (with audit reason required).
- Payout job controls and rerun tools.

### 10.3 Notifications
Notify creators for:
- Program approval/rejection.
- Payout issued/failed.
- Significant reversals or account holds.

---

## 11. Observability and SLOs

Track at minimum:
- Event ingestion success/failure rates.
- Attribution match rate.
- Reconciliation delta rate.
- Payout failure rate.
- Time-to-resolution for payout incidents.

Recommended alerting thresholds:
- Reconciliation delta > 1% of cycle total.
- Payout failure rate > 2%.
- Attribution match drop > 10% day-over-day.

---

## 12. Launch Readiness Gates

Status as of 2026-08-08 (dev-only deployment; see Section 15 for the full remaining-work
list):
- Legal terms approved. **Not done** — no evidence of formal legal sign-off; treat as open.
- Tax/KYC workflow operational. **Not done** — see Section 15.
- Payout provider integration production-ready. **Partially done** — Stripe Connect
  Express integration is built and emulator-tested; a live test-mode onboarding +
  transfer round trip has not yet been run.
- Ledger and reconciliation pipelines validated. **Done for dev** — emulator-verified
  (ledger state machine + idempotent reimport + Amazon CSV adapter, 25+11 assertions);
  not yet validated against a live retailer report end-to-end.
- Fraud controls tested. **Not done** — see Section 15.
- Admin runbooks documented. **Not done** — `/admin/affiliate` UI exists and is
  functional, but no runbook has been written.
- Incident response and rollback plan approved. **Not done**.
- End-to-end staging dry run completed. **Not done** — only `wishlist-wizard-dev` has the
  backend deployed; staging/production have not been touched.

This means: the mechanism is built and running in dev, and the "not launched" framing
from the original May 2026 version of this document was already the state to change —
but readiness for *public marketing claims* about the program is still gated on the
unchecked items above.

---

## 13. Rollout Plan

Status update: the program has moved past Phase 0 in practice (real backend deployed to
dev, not just synthetic internal scenarios) but has not gone through a formal Phase 1
limited beta or Phase 2 tiered GA — no creator cohort has been invited, no payout cap has
been enforced in production, and no finalized public terms/FAQ have been published. In
effect the current state most closely resembles an extended Phase 0.5: real infrastructure,
dev-only, pre-beta.

### Phase 0 - Internal Validation
- Enable for internal test accounts only.
- Run synthetic click/conversion/payout scenarios.
- **Status**: substantially exceeded — real ledger/payout backend now deployed to dev,
  not just synthetic scenarios, though live Stripe test-mode and live CSV-to-payout runs
  are still outstanding (Section 15).

### Phase 1 - Limited Beta
- Invite-only creator cohort.
- Hard payout cap and close monitoring.
- **Status**: not started.

### Phase 2 - Tiered GA
- Open to Creator and Business tiers.
- Publish finalized terms and public FAQ.
- **Status**: not started. Tier gating mechanism (`creatorDashboardEnabled`) is already
  built and would support this when the program is ready to open up, but no terms/FAQ
  have been published and no formal GA decision has been made.

### Phase 3 - Optimization
- Tune share rates and thresholds based on margin and retention.
- Expand retailer/network coverage.
- **Status**: not started.

---

## 14. Risks and Mitigations

- Attribution gaps: implement deterministic IDs plus fallback strategy.
- Late network reversals: enforce payout hold period and adjustment rules.
- Fraud exposure: combine automated scoring with manual review.
- Regulatory drift: periodic legal review and update cadence.
- Creator trust risk: transparent statements and dispute workflow.

---

## 15. Remaining Work

The core mechanism (commission ledger, per-creator tracking, Stripe Connect payouts,
creator dashboard, admin tooling) shipped 2026-07-21 and is deployed to
`wishlist-wizard-dev`. The items below are genuinely not built, or built but not yet
verified in a live/production setting, and should not be implied as done by the rest of
this document:

### 15.1 Tax and KYC
- No tax form collection flow (W-9/W-8 or equivalent) exists yet.
- No gating that blocks a payout on missing/invalid tax or KYC data.
- Section 7.2's requirements are entirely unbuilt; `creatorPayoutAccounts` currently
  tracks Stripe Connect readiness (`payoutsEnabled`, `stripeConnectedAccountId`) but has
  no tax/KYC fields or checks.

### 15.2 Fraud Automation
- No automated fraud detection signals (click velocity, dwell-time anomalies,
  self-referral detection, conversion-spike detection) are implemented.
- No rate limiting specific to click ingestion, bot filtering, or a manual review queue
  exists yet.
- Section 8 in full remains aspirational; the shipped system relies on Amazon
  Associates' own network-side fraud handling reflected through commission report
  reversals, not platform-side detection.

### 15.3 Phased Rollout
- No formal Phase 1 limited beta has been run (no invited creator cohort, no payout cap
  enforced).
- No Phase 2 tiered GA — no finalized public terms or FAQ have been published.
- See Section 13 for the detailed phase-by-phase status.

### 15.4 Legal, Compliance, and Operational Readiness
- Legal terms covering eligibility, share percentages, payout timing, reversal handling,
  fraud policy, and termination rights have not been formally published (Section 7.3).
- No incident response or rollback plan has been documented for the payout pipeline.
- No admin runbook exists for `/admin/affiliate`, even though the UI itself is
  functional.
- Reconciliation is validated at the emulator level only; no live retailer report has
  been reconciled end-to-end in a deployed environment.

### 15.5 Network Coverage
- Only Amazon Associates has a live reconciliation adapter. The `genericCsv.ts` adapter
  is scaffolded in `packages/functions/src/integrations/affiliateAdapters/` for future
  non-Amazon networks but is not wired to any live retailer program.

### 15.6 Staging and Production
- Only `wishlist-wizard-dev` has the backend deployed. Staging and production have not
  been touched by this work.

---

## 16. Impact of Removing Commission Share from Current Plans

**This section is now largely historical.** It was written when the program was
unlaunched and considered how to message plan comparisons in that state. As of
2026-07-21 the mechanism is live in dev, so "removing" it is no longer the live
question — the live question is what to claim publicly given the dev-only,
not-yet-production-verified status (see Section 15).

Original reasoning (retained for context):
- Core plan value is currently driven by wishlist limits, price tracking, collaboration, analytics depth, API/team features, and ad removal.
- Commission share is an advanced monetization incentive for a smaller creator segment, not a core utility requirement for general subscribers.
- Removing it entirely would have reduced over-promising risk while the operational program was not launch-ready.

Current positioning recommendation:
- Creator dashboard, tier gating, and ledger/payout mechanics can now be described
  internally (product docs, admin tooling, engineering docs) as shipped and functional.
- External/marketing claims about specific commission-share percentages or payout
  reliability should still wait on the Section 15 items — particularly a live Stripe
  Connect round trip, tax/KYC gating, and at least a Phase 1 limited beta — before being
  presented as a fully production-hardened, generally available benefit.

---

## 17. Decision Record

- **Current decision**: Affiliate Commission Share is **launched** (2026-07-21) at the
  infrastructure level — commission ledger, Stripe Connect payouts, per-creator tracking,
  creator dashboard, and admin tooling are built and deployed to `wishlist-wizard-dev`.
  It is not yet production-deployed or fully production-verified end-to-end (see Section 15).
- **Marketing policy**: Internal/product documentation should describe the program as
  shipped. External marketing claims about specific commission-share percentages and
  payout reliability should wait until the Section 15 remaining-work items — tax/KYC
  gating, fraud controls, a verified live Stripe Connect round trip, and a Phase 1 limited
  beta — are closed.
- **Next review checkpoint**: After staging/production deployment and after the Section 15
  items (tax/KYC, fraud automation, live Stripe Connect verification, phased rollout) have
  production sign-off.
