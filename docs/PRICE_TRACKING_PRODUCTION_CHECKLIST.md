# Price Tracking — Production Checklist

This checklist defines the production contract for the Price Tracking "killer app" behavior.

## Core Experience Contract

1. Capture item identity at creation time (brand/model/MPN/UPC/EAN + variant fields like color/size/pack). (IN PROGRESS)
2. Return sectioned intelligence from backend for each tracked item:
	- `bestIdenticalOffer`
	- `identicalOffers`
	- `alternatives`
3. Support retailer-specific items (`isRetailerSpecific`) so matching scope can be limited to source retailer when needed.
4. Rank offers using landed price (`price + shipping + fees - discount`) rather than sticker price alone.
5. Keep confidence semantics explicit: `exact`, `strong`, `probable`; reserve best-deal badge for `exact`/`strong`.

## Refresh & Alert Cadence Policy

6. Do not assume blanket "frequent" updates; use policy-based cadence:
	- High intent: every 1-3 hours
	- Normal: every 6-12 hours
	- Low priority: every 24 hours
7. Trigger on-demand refresh when user opens item detail and data is stale.
8. Support configurable alert thresholds (percentage and absolute amount) and notification cooldowns.
9. Enable live web market discovery provider (SerpAPI) in Functions runtime (`SERPAPI_API_KEY` or `SERPAPI_KEY`).
10. Provide manual refresh control in UI and callable backend trigger (`refreshPriceIntelligenceOffers`) for immediate market updates.
11. Run scheduled market refresh (`scheduledRefreshPriceIntelligenceOffers`) every 6 hours with bounded batch size.

## Reliability + Validation

12. Add and maintain API contract smoke tests for `/api/items/:itemId/price-intelligence` shape, auth, and method guards.
13. Add telemetry/SLOs for offer freshness, match confidence distribution, provider success rate, and alert delivery success.
14. Accessibility and performance testing for price intelligence cards/charts on `/app/price-tracking`.

Notes:
- Existing price-history endpoint remains: `/api/items/:id/price-history`.
- Production app route remains: `/app/price-tracking`.
