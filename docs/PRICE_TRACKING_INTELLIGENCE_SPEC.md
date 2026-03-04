# Price Tracking Intelligence Spec

## Goal
Price Tracking acts as a decision engine, not only a price log:
- Find the best deal for the **identical item** when possible.
- Respect retailer exclusivity when an item is retailer-specific.
- Present intelligent **alternatives** with clear rationale.

## Definitions
- **Identical**: same product identity (brand + model + global/merchant identifiers such as MPN/UPC/EAN), including variant match (size/color/pack/region where applicable).
- **Retailer-specific**: item is private-label, exclusive SKU, or otherwise constrained to source retailer matching.
- **Alternative**: not identical, but near-fit based on spec/profile similarity and quality band.

## Confidence Model
- `exact`: identifier-level match (global IDs or canonical merchant SKU mapping).
- `strong`: high-confidence fingerprint match (brand + model + key specs/variant).
- `probable`: title/spec similarity without full identity proof.

Best-deal highlighting should only use `exact` and `strong`.

## Landed Price Policy
Comparison must use landed price:
- `landedPrice = basePrice + shipping + fees - discounts`

When available, include flags in ranking/filters:
- `membershipRequired`
- `sellerTrust`
- `counterfeitRisk`
- `returnWindowDays`
- `warrantyIncluded`
- `inStock`

## API Contract
### GET `/api/items/:itemId/price-intelligence`
Response shape:
- `itemId`, `title`, `basePrice`, `isRetailerSpecific`, `sourceRetailer`
- `sections.bestIdenticalOffer`
- `sections.identicalOffers[]`
- `sections.alternatives[]`
- `confidencePolicy`
- `metadata` (checked timestamp, counts)

### GET `/api/price-alerts`
Each alert should expose policy fields usable by UI:
- `thresholdPercent`
- `thresholdAmount`
- `cooldownMinutes`
- `alertCadence` (`high|normal|low`)
- `quietHours` (`startHour`, `endHour`, `timezone`) or `null`

### PATCH `/api/price-alerts/:alertId`
Owner-only policy update endpoint with validation.

Accepted fields:
- `targetPrice` (positive number)
- `thresholdPercent` (0..100)
- `thresholdAmount` (>=0)
- `cooldownMinutes` (integer 5..1440)
- `alertCadence` (`high|normal|low`)
- `quietHours` object or `null`
- `active` (boolean)

## Runtime Dispatch Enforcement

When a price alert transitions to `triggered=true`, notification dispatch now enforces:
- **Cooldown gate**: if `lastNotifiedAt` is within `cooldownMinutes`, the send is skipped.
- **Alert quiet-hours gate**: if current time (in `quietHours.timezone`) is within the quiet window, send is deferred.

Alert docs record processing metadata:
- `lastNotifiedAt`
- `lastNotificationStatus` (`sent|skipped|failed|deferred_quiet_hours|skipped_cooldown`)
- `lastNotificationSuppressedAt`
- `lastNotificationSuppressedReason`
- `notificationDeferred`

## Deferred Replay

Deferred alerts are replayed by scheduled backend processing (`replayDeferredPriceAlerts`) every 15 minutes:
- scans alerts where `triggered=true` and `notificationDeferred=true`
- re-checks cooldown and quiet-hours gates
- sends once outside quiet-hours window
- updates `lastNotificationSource` (`triggered_update` or `deferred_replay`) for traceability

## Refresh Cadence Policy
Default frequency is policy-based, not one-size-fits-all:
- High intent: every 1-3 hours
- Normal: every 6-12 hours
- Low priority: daily

Also refresh on-demand when item detail opens and cached result is stale.

## User Controls
- Target price
- Alert threshold by percent and/or absolute amount
- Quiet hours and cooldown
- Retailer-specific lock toggle (when item permits)

## Guardrails
- Clearly label confidence on each offer.
- Do not mix alternatives into identical offers list.
- Preserve explainability: include a short `rationale` for alternatives.
- If identity is uncertain, degrade to `probable` and avoid best-deal badge.
