# Secret Sauce Boundary Map

This document identifies the parts of Wishlist Wizard that should stay backend-only if the repository is made public.

## Rule of Thumb

- Public repo: UI, schemas, non-sensitive contracts, docs, and build scripts.
- Private Firebase boundary: ranking, scoring, matching, monetization logic, pricing intelligence, fraud checks, and any code that reveals product strategy.

## Backend-Only Components

### 1. Affiliate monetization

- **Files:** `packages/functions/src/api/affiliate.ts`, `packages/functions/src/utils/affiliate.ts`
- **Why it is sensitive:** Reveals partner domains, conversion rules, commission logic, and reporting logic.
- **What to expose publicly:** Callable function names and request/response shapes only.
- **Keep private:** Conversion rules, program matching, tracking, and revenue aggregation.

### 2. Price intelligence

- **Files:** `packages/functions/src/api/priceIntelligenceRefresh.ts`, `packages/functions/src/api/priceHistory.ts`
- **Why it is sensitive:** Reveals scraping/search strategy, merchant matching, and product intelligence heuristics.
- **What to expose publicly:** A simple API contract for price lookup and refresh.
- **Keep private:** SERP/API keys, matching heuristics, freshness rules, and refresh cadence.

### 3. Analytics and revenue modeling

- **Files:** `packages/functions/src/api/analytics.ts`
- **Why it is sensitive:** Reveals ad KPI assumptions, revenue estimation, and conversion monitoring.
- **What to expose publicly:** High-level analytics endpoints.
- **Keep private:** Metric formulas, thresholds, and revenue modeling logic.

### 4. Subscription and payment logic

- **Files:** `packages/functions/src/api/subscriptions.ts`, `packages/functions/src/api/groupPayments.ts`, `packages/functions/src/api/stripe.ts`
- **Why it is sensitive:** Reveals tiering strategy, pricing architecture, checkout behavior, and payment guardrails.
- **What to expose publicly:** Subscription status and checkout entrypoints.
- **Keep private:** Tier logic, Stripe secrets, customer mapping, and contribution rules.

### 5. Contact and calendar enrichment

- **Files:** `packages/functions/src/api/contacts.ts`, `packages/functions/src/api/calendar.ts`
- **Why it is sensitive:** Reveals scoring, deduplication, and enrichment logic.
- **What to expose publicly:** Calendar/contact feature endpoints.
- **Keep private:** Scoring formulas, provider routing, merge rules, and token handling.

### 6. Wishlist business rules

- **Files:** `packages/functions/src/api/wishlists.ts`, `packages/functions/src/business/wishlist.ts`, `packages/functions/src/utils/subscription-guard.ts`
- **Why it is sensitive:** Reveals feature gating, ranking, and entitlement rules.
- **What to expose publicly:** Basic CRUD interfaces.
- **Keep private:** Tier gates, recommendation logic, and limit enforcement strategy.

### 7. App-specific operational logic

- **Files:** `packages/functions/src/api/mobile.ts`, `packages/functions/src/api/sync.ts`, `packages/functions/src/api/extension.ts`
- **Why it is sensitive:** Reveals integration flow and device sync behavior.
- **What to expose publicly:** Stable function contracts.
- **Keep private:** Device matching, sync reconciliation, and hidden validation rules.

## Firebase API Boundary

The repo already has a Firebase Functions API layer:

- `packages/functions/src/index.ts`
- `packages/functions/src/api/*`
- `docs/API_REFERENCE.md`

That is the right place to keep the proprietary logic while the public repo only documents the interface.

## Public-Release Hygiene

- Remove tracked logs, exports, or runner artifacts before publishing.
- Keep workflow permissions minimal.
- Avoid documenting internal heuristics, scoring formulas, or vendor selection rules in public docs.
- Move any remaining business logic from client code into callable Cloud Functions where possible.
