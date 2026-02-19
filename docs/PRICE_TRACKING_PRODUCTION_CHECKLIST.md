# Price Tracking — Production Checklist

This checklist contains concrete steps to move the `PriceTracking` feature from demo/partial state into production-ready status.

1. Protect `/app/price-tracking` behind authentication and ensure it renders in the `AppLayout`. (IMPLEMENTED)
2. Wire server-side price history endpoints (authenticated): `/api/items/:id/price-history`.
3. Add server-side validation, rate-limiting, and caching for price history ingestion.
4. Add backend job to fetch and persist historical prices (cron or event-driven collector).
5. Add API contract tests and Playwright E2E tests for the full flow (create alert → record price → display history).
6. Add telemetry and SLOs for price ingestion and API latency.
7. Accessibility and performance testing for charts and responsive layouts.

Notes:
- The `PriceHistory` component already guards against invalid dates and handles empty/error states.
- Keep demo route at `/price-tracking-demo` for marketing; production app route is `/app/price-tracking`.
