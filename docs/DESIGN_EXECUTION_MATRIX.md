# Design-to-Build Execution Matrix

Source of truth for delivery sequencing from product design intent:
1. `docs/PRODUCT_DESIGN.md` (persona outcomes + flow intent)
2. This matrix (execution slices + acceptance)
3. `docs/REQUIREMENTS.md` (implementation status)
4. `docs/requirements-verification.json` (CI enforcement)

Last updated: 2026-03-06

---

## Why this exists

`REQUIREMENTS.md` tracks implementation status, but it does not guarantee persona outcomes from `PRODUCT_DESIGN.md` are complete end-to-end. This matrix converts persona flows into build slices with explicit acceptance tests and owners.

---

## Persona-First Delivery Queue

| Priority | Persona | Design Flow | Outcome to Deliver | Current State | Build Slice (Next) | Verification Signal |
|---|---|---|---|---|---|---|
| P0 | Social Gift-Giver | Flow 4: Buy from Wishlist | Buy + mark purchased without duplicates and with reliable audit | Partial (purchase paths exist; end-to-end confidence low) | Add deterministic E2E for buy + purchased marker + duplicate prevention | `test:e2e:tier1` + smoke users report includes purchase path |
| P0 | Social Gift-Giver | Flow 3: Share Wishlist | Reliable multi-channel sharing from wishlist detail | Partial (link copy works; full share UX coverage unclear) | Add share action coverage and route guard tests for shared links | `test:e2e:smoke` share scenario + route assertions |
| P0 | Occasion Coordinator | Flow 6: Group Gifting Coordination | Commitment tracking visibility and export confidence | Partial | Implement coordinator status panel + commitment summary API contract checks | New integration test for commitments + export payload schema test |
| P1 | Budget-Conscious Shopper | Flow 2 + Flow 3 | Add item + price alert threshold + actionable notifications | Partial | Complete threshold alert flow and back-in-stock/price-drop consistency checks | smoke all functions + targeted price alert tests |
| P1 | TikTok Creator | Flow 5: Creator Dashboard | Trustworthy clicks → conversions → commission visibility | Partial | Add event-to-dashboard reconciliation test and payout readiness checks | analytics integration test + dashboard aggregation test |
| P1 | TikTok Creator | Feature 5 Payout | Creator payout eligibility and hold period logic | Not complete | Implement payout eligibility service + audit trail endpoints | unit tests on payout calculation + integration test |
| P2 | Occasion Coordinator | Flow 6 Budget Guardrails | Budget range policy during commitments | Partial | Enforce min/max budget at API layer and UI hinting | API validation test + E2E commitment boundary test |

## Persona Execution Matrix (Cross-Deliverable)

| Persona | Design Ref | Website Execution | Mobile Execution | Extension Execution | Required Verification |
|---|---|---|---|---|---|
| Social Gift-Giver | `docs/PRODUCT_DESIGN.md#flow-1-create-first-wishlist-individual-user`, `docs/PRODUCT_DESIGN.md#flow-3-share-wishlist`, `docs/PRODUCT_DESIGN.md#flow-4-buy-from-wishlist` | Auth + wishlist CRUD + sharing + purchase markers | Auth-gated wishlists + item actions | Quick add + auth refresh + extraction reliability | `npm run test:e2e:tier1`, `npm run test:users:smoke`, `npm run test:functions:smoke:all` |
| Budget-Conscious Shopper | `docs/PRODUCT_DESIGN.md#flow-2-add-item-to-wishlist-product-discovery` | Item add/edit + price tracking + alerts | Item validation and list integrity | Coupon finder + price comparison | Web price-tracking tests + mobile dialog validation tests + smoke functions |
| Occasion Coordinator | `docs/PRODUCT_DESIGN.md#flow-6-group-gifting-coordination` | Collaboration controls + notification visibility + commitment states | Notification/deeplink reliability and list consistency | Shared-link access support path | Notification tests + collaborator smoke flows + commitments/export checks |
| TikTok Creator | `docs/PRODUCT_DESIGN.md#flow-5-creator-dashboard` | Analytics + monetization funnel reporting | Creator-facing metrics surface parity as mobile expands | Analytics event capture from extension actions | Analytics integration tests + ad KPI summary checks |

---

## Contradictions to resolve first

These are examples where design claims exceed verified implementation confidence:

- `PRODUCT_DESIGN.md` marks mobile push and cross-platform sync as complete in narrative sections while `REQUIREMENTS.md` indicates partial/not implemented for adjacent capability slices.
- Creator dashboard and affiliate payments are described as production-grade outcomes, while payout system is explicitly still pending.
- Group coordination flow is documented as fully real-time and export-ready, but requirements call out partial workflow depth.

Resolution rule: if persona outcome cannot be demonstrated by automated verification, status must not remain `✅`.

---

## Execution policy (effective immediately)

- Every enforced requirement must include:
  - `persona`
  - `flow`
  - `designRef`
- PRs for persona-critical flows must include at least one automated verification artifact.
- Work intake is persona-outcome first (no standalone low-impact feature starts when P0/P1 outcomes are partially verified).

---

## 2-week sprint framing

Week 1:
- Social Gift-Giver flow hardening (share, buy, purchase marking, no duplicates)
- Budget-Conscious Shopper price-alert integrity

Week 2:
- Occasion Coordinator commitments + export stabilization
- Creator analytics reconciliation and payout eligibility groundwork

Exit criteria:
- All P0 rows above become demonstrably `verified` in CI artifacts.
