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

UI policy:
- Marketing pages and logged-in navigation should promote only these features.
- Phase 2+ features may exist behind direct routes but must not be primary promoted CTAs.

## Phase 2: Intelligence and Monetization Expansion

- Price tracking (basic + advanced multi-retailer)
- Affiliate integrations and creator monetization tools
- AI recommendations
- Creator economy tooling and advanced dashboards
- Group gifting payments

Release policy:
- Validate ad revenue performance before broad price-tracking and affiliate expansion.
- Roll out incrementally behind feature flags and controlled cohorts.

Phase 1 ad KPI gate (must be reviewed weekly before expanding monetization scope):
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
