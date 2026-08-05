# Affiliate Commission Share Program - Design and Rollout Guide

**Version**: 1.0  
**Date**: May 15, 2026  
**Status**: Not launched (design-ready)

---

## 1. Purpose

This document defines how an Affiliate Commission Share program should operate for Wishlist Wizard when activated. It is intentionally written as a launch blueprint, not a statement of current production behavior.

At a high level, the program would:
- Let the platform earn affiliate commissions from qualifying purchases.
- Share a configurable portion of those commissions with eligible creators.
- Preserve legal compliance, auditability, and payout accuracy.

---

## 2. Current State (Important)

As of this document date:
- The platform has affiliate-related components and tracking paths in code.
- The commission share program is **not** operationally enabled end-to-end.
- Customer-facing plan messaging should not claim active commission sharing until all readiness gates in this document are met.

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

### 4.2 Proposed Share Policy
- Free/Starter/Plus: 0%
- Creator: configurable default (example: 20%)
- Business: configurable default (example: 30%)

Do not hardcode these percentages in legal or marketing copy until finance/legal approval and payout viability are confirmed.

### 4.3 Payout Principles
- Pay on **approved/settled** commissions only, not raw click estimates.
- Apply reversal handling (returns, cancellations, chargebacks).
- Apply payout hold window (for example, 30 to 60 days after event settlement).
- Enforce minimum payout threshold (for example, $25) to reduce overhead.

---

## 5. Data and Event Architecture

### 5.1 Core Entities
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

### 5.3 Ledger Rules
- Use append-only ledger rows for all monetary events.
- Never mutate historical amounts directly; use adjustment entries.
- Preserve immutable link from payout rows back to source commission rows.

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

All gates must be green before marketing claims go live:
- Legal terms approved.
- Tax/KYC workflow operational.
- Payout provider integration production-ready.
- Ledger and reconciliation pipelines validated.
- Fraud controls tested.
- Admin runbooks documented.
- Incident response and rollback plan approved.
- End-to-end staging dry run completed.

---

## 13. Rollout Plan

### Phase 0 - Internal Validation
- Enable for internal test accounts only.
- Run synthetic click/conversion/payout scenarios.

### Phase 1 - Limited Beta
- Invite-only creator cohort.
- Hard payout cap and close monitoring.

### Phase 2 - Tiered GA
- Open to Creator and Business tiers.
- Publish finalized terms and public FAQ.

### Phase 3 - Optimization
- Tune share rates and thresholds based on margin and retention.
- Expand retailer/network coverage.

---

## 14. Risks and Mitigations

- Attribution gaps: implement deterministic IDs plus fallback strategy.
- Late network reversals: enforce payout hold period and adjustment rules.
- Fraud exposure: combine automated scoring with manual review.
- Regulatory drift: periodic legal review and update cadence.
- Creator trust risk: transparent statements and dispute workflow.

---

## 15. Impact of Removing Commission Share from Current Plans

Short answer: **No immediate material effect on core plan utility** for most users today.

Why:
- Core plan value is currently driven by wishlist limits, price tracking, collaboration, analytics depth, API/team features, and ad removal.
- Commission share is an advanced monetization incentive for a smaller creator segment, not a core utility requirement for general subscribers.
- Removing it now reduces over-promising risk while the operational program is not fully launch-ready.

Potential impact to watch:
- Reduced attractiveness for creator acquisition in the short term.
- Lower differentiation against creator-economy tools until the program launches.

Recommended positioning now:
- Keep creator analytics/dashboard messaging where accurate.
- Remove commission-share claims from plan comparison and pricing copy until readiness gates are complete.
- Reintroduce commission-share messaging only after formal launch approval.

---

## 16. Decision Record

- **Current decision**: Treat Affiliate Commission Share as planned but not launched.
- **Marketing policy**: Do not advertise active commission-share percentages until production readiness gates are complete.
- **Next review checkpoint**: After payout, compliance, and reconciliation workstreams have production sign-off.
