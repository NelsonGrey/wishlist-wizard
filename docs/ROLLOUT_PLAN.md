# Rollout Plan

## Purpose

This document is the source of truth for which features are promoted in the website/app experience by phase.

## Phase 1: Core Platform (Promoted Now)

- Web app + mobile apps
- Wishlist CRUD + item management
- Public sharing + collaboration basics
- Browser extension capture flow
- Calendar integration (events, reminders, external connections)
- Social network and discovery (public profiles/discovery and trusted sharing)
- Basic analytics
- Price tracking (basic + advanced multi-retailer) — shipped
- Affiliate integrations and creator monetization tools — shipped 2026-07-21 (commission ledger state
  machine, Stripe Connect Express payouts, creator dashboard at `/app/creator-dashboard`, admin tooling at
  `/admin/affiliate`)
- Achievements & rewards (v1) — shipped 2026-07-23, computed on read, `/app/achievements`
- Mobile native in-app purchases (StoreKit/Play Billing, replacing Stripe checkout on mobile)

UI policy:
- Marketing pages and logged-in navigation should promote only these features.
- Phase 3+ features may exist behind direct routes but must not be primary promoted CTAs.

## Phase 2: Intelligence and Monetization Expansion (remaining)

- AI recommendations
- Group gifting payments
- Advanced creator monetization dashboards beyond v1 (deeper analytics, more payout networks)

Release policy:
- Roll out incrementally behind feature flags and controlled cohorts.

Ad KPI gate (reviewed weekly; was satisfied before affiliate/creator monetization launched 2026-07-21, and applies to any further monetization expansion):
- Viewable impressions: >= 1,000 in trailing 7 days.
- Viewability rate: >= 60% in trailing 7 days.
- Estimated ad revenue: >= $5.00 in trailing 7 days.
- Config health: `ad_slot_config_missing` and `ad_slot_render_failed` trending down week-over-week.

Measurement source:
- Use backend callable `getAdRevenueSummary` (`/api/analytics/ad-revenue-summary`) as the reporting source of truth.
- Prefer global aggregation (`includeGlobal: true`) for admins; fallback to scoped user data where permissions require.

## Phase 3: Ecosystem and Platform Expansion

- Brand partnerships
- White-label solutions
- AR visualization
- Conversational AI
- Social commerce platform integrations

## Content and Navigation Rules

- Remove promotional references to features that are not in the active phase.
- Keep roadmap language consistent across `README.md`, `docs/BUSINESS_REQUIREMENTS.md`, and `docs/PRODUCT_DESIGN.md`.
- Update this file first when phase strategy changes.
