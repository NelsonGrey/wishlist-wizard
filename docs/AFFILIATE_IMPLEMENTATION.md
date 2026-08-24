# Affiliate Links and Monetization System - Implementation Summary

## Overview
Wishlist Wizard converts product URLs to affiliate links across 10+ major retailer
programs, and layers a full creator monetization system on top: per-creator commission
attribution, an auditable commission ledger with a defined state machine, idempotent
reconciliation against retailer reports, Stripe Connect Express payouts, a creator-facing
dashboard, and admin tooling. The commission ledger + payout backend shipped 2026-07-21
and is deployed to `wishlist-wizard-dev`.

## Core Components

### 1. AffiliateService (`affiliateService.ts`)
- **Purpose**: Core engine for URL conversion and affiliate program management
- **Features**:
  - Support for 10+ major retailer programs (Amazon, Target, Best Buy, Walmart, eBay, Etsy, Home Depot, Macy's, Nordstrom, Wayfair)
  - Automatic product URL parsing and affiliate link generation
  - Click tracking (`affiliateClicks`)
  - Batch URL conversion capabilities
  - Commission tracking (2-8% across different programs)

### 2. Affiliate API Routes (`affiliate.ts`)
- **Endpoints**:
  - `POST /api/affiliate/convert` - Convert single URL to affiliate link
  - `POST /api/affiliate/batch-convert` - Convert multiple URLs at once
  - `POST /api/affiliate/track-click` - Track clicks for analytics
  - `POST /api/affiliate/convert-wishlist` - Convert entire wishlist URLs
  - `GET /api/affiliate/programs` - Get supported affiliate programs
  - `GET /api/affiliate/stats` - Get conversion and revenue statistics
  - `GET /api/affiliate/disclosure` - Get affiliate disclosure text

### 3. Automatic URL Conversion Middleware
- **Integration**: Added to main item creation route (`/api/items`)
- **Functionality**:
  - Automatically converts product URLs when items are added to wishlists
  - Stores original URL and affiliate program info in item metadata
  - Preserves user experience while enabling monetization
  - Graceful fallback if conversion fails

### 4. Per-Creator Affiliate Attribution
Creators are assigned their own affiliate tracking IDs per network, so commissions can be
attributed back to the creator whose share drove the click, rather than only to the
platform's own account:
- `creatorAffiliateTrackingIds` - per-creator, per-network tracking ID assignment.
- `affiliateTrackingIdPool` - admin-managed pool of tracking IDs, since Amazon (and
  similar networks) cap the number of tracking IDs an account can register (~100 for
  Amazon Associates). Admins add IDs to the pool; assignment draws from it.
- Implemented in `packages/functions/src/api/creatorTracking.ts`.

### 5. Commission Ledger (`commissionLedger.ts`)
- **Purpose**: Auditable, append-only record of every commission event, from first
  network report through payout.
- **State machine**: `Tracked -> Pending -> Approved -> Payable -> Paid`, with a
  `Reversed` branch reachable from any pre-`Paid` state (and, for post-payout clawbacks,
  handled as a separate adjustment rather than a state change on the `Paid` entry).
- **Ledger entries are never mutated once Approved+** except by the defined state
  transitions. Corrections against a ledger entry - including one that has already
  reached `Paid` - are always written as a separate `commissionAdjustments` document,
  never as an edit to the historical entry. Post-payout clawbacks net against
  `creatorPayoutAccounts.outstandingClawbackBalanceUsd` instead of rewriting the paid
  record.
- Each ledger document maintains a `transitions` subcollection recording every state
  change for audit purposes.
- Collections: `commissionLedger`, `commissionAdjustments`.

### 6. Reconciliation (`affiliateReconciliation.ts`)
- Idempotent CSV import of retailer commission reports. Re-running an import against the
  same file is safe and will not create duplicate ledger entries or double-count
  commissions.
- Network-specific parsing is handled by adapters (`packages/functions/src/integrations/affiliateAdapters/`):
  - `amazonAssociates.ts` - live, parses Amazon Associates commission reports.
  - `genericCsv.ts` - scaffolded for future non-Amazon networks; not yet wired to a live
    retailer program.
- Import jobs are tracked in `affiliateReportImports`.

### 7. Stripe Connect Payouts (`payouts.ts`, `creatorPayoutAccount.ts`)
- Creator payout accounts (`creatorPayoutAccounts`) hold Stripe Connect Express account
  linkage and payout eligibility state.
- Payable ledger entries are grouped into one `payoutBatches` document per creator per
  run, so a failure transferring one creator's batch doesn't block or roll back any other
  creator's payout in the same run.
- Runs on a monthly schedule, with a manual admin retry path for failed batches.
- On successful Stripe transfer, batch items move their ledger entries to `Paid` and
  record the Stripe transfer ID.

### 8. Frontend Components

#### Creator Dashboard (`packages/web/client-src/components/creator-dashboard/`)
Mounted at `/app/creator-dashboard`, gated by the `creatorDashboardEnabled` tier flag
(`packages/shared/src/subscription.ts` - `true` for Creator, Business, and Enterprise
tiers; `false` for Free/Starter/Plus). Four panels:
  - `PerformancePanel.tsx` - clicks/conversions performance.
  - `CommissionStatusPanel.tsx` (with `CommissionStateBadge.tsx`) - ledger entries by
    state (Tracked/Pending/Approved/Payable/Paid/Reversed).
  - `PayoutReadinessPanel.tsx` - Stripe Connect onboarding/readiness status.
  - `AdjustmentsPanel.tsx` - commission adjustments and reversal history.
- A free-tier account hitting the route receives a 403-driven `UpgradePrompt` from the
  deployed backend rather than the dashboard content.

#### Admin Tooling (`packages/web/client-src/pages/admin/AffiliateAdmin.tsx`)
Mounted at `/admin/affiliate`:
  - CSV import job management (upload, status, history).
  - Tracking-ID pool management (`affiliateTrackingIdPool`).
  - Payout-batch management (view, manual retry).

#### AffiliateDisclosure (`AffiliateDisclosure.tsx`)
- **Variants**: Compact and detailed disclosure modes
- **Compliance**: FTC-compliant affiliate disclosure language
- **Usage**: Can be embedded anywhere affiliate links are displayed

#### AffiliateIndicator (`AffiliateIndicator.tsx`)
- **Purpose**: Visual indicator for items with affiliate links
- **Features**: Shows affiliate program, commission rate, and hover details
- **Integration**: Can be added to wishlist item displays

## Supported Affiliate Programs

| Program | Commission Rate | Domains Supported |
|---------|----------------|-------------------|
| Amazon Associates | 4% | amazon.com, amazon.co.uk, amazon.ca |
| Target Affiliates | 8% | target.com |
| Best Buy Affiliates | 3% | bestbuy.com |
| Walmart Affiliates | 4% | walmart.com |
| eBay Partner Network | 2% | ebay.com |
| Etsy Affiliates | 5% | etsy.com |
| Home Depot Affiliates | 3% | homedepot.com |
| Macy's Affiliates | 6% | macys.com |
| Nordstrom Affiliates | 2% | nordstrom.com |
| Wayfair Affiliates | 5% | wayfair.com |

Of these, only Amazon Associates currently has a live reconciliation adapter feeding the
commission ledger; the others convert links and estimate commission but are not yet wired
into the ledger/payout pipeline.

## Revenue Model
- **Commission-based**: Earn percentage of sales when users purchase through affiliate links
- **Creator share**: Creator and Business tier users additionally receive a configurable
  share of platform-earned commissions attributed to their tracking IDs (see
  `affiliateCommissionShare` in `packages/shared/src/subscription.ts`: 20% for Creator,
  30% for Business).
- **User-friendly**: No additional cost to users, same product prices
- **Transparent**: Clear disclosure of affiliate relationships
- **Sustainable**: Platform monetization without subscription fees

## Key Features

### Automatic Conversion
- Product URLs automatically converted when items added to wishlists
- Supports batch conversion of existing wishlists
- Maintains original URLs in metadata for transparency

### Analytics & Tracking
- Click tracking for affiliate links (`affiliateClicks`)
- Commission ledger state broken out by stage (Tracked/Pending/Approved/Payable/Paid/Reversed)
- Performance metrics by affiliate program
- Per-creator performance and payout readiness in the creator dashboard

### Privacy & Compliance
- FTC-compliant affiliate disclosures
- User privacy protection in tracking
- Transparent affiliate relationship communication
- Opt-out capabilities for users who prefer

### Developer Tools
- Comprehensive test suite for affiliate functionality, including emulator-verified
  coverage of the ledger state machine, idempotent reimport, and the Amazon CSV adapter
  (25+11 assertions)
- API endpoints for external integrations
- Batch processing capabilities

## Integration Points

### Database Schema
Firestore-backed (not a relational/JSONB store). Key collections:
- `commissionLedger` / `commissionLedger/{id}/transitions` - the state-machine ledger and
  its audit trail.
- `commissionAdjustments` - out-of-band corrections, including post-payout clawbacks.
- `creatorPayoutAccounts` - Stripe Connect linkage, payout eligibility, outstanding
  clawback balance.
- `payoutBatches` / `payoutBatches/{id}/items` - one doc per creator per payout run.
- `creatorAffiliateTrackingIds` / `affiliateTrackingIdPool` - per-creator tracking ID
  assignment and the admin-managed ID pool.
- `affiliateReportImports` - reconciliation import job records.
- `affiliateClicks` - click-level tracking data.

Wishlist items still store affiliate conversion details (original URL, program,
conversion timestamp) in their own `metadata` field:
  ```json
  {
    "affiliateConversion": {
      "originalUrl": "https://amazon.com/dp/B123",
      "affiliateProgram": "Amazon Associates",
      "convertedAt": "2024-01-01T00:00:00Z",
      "commission": 4
    }
  }
  ```

### API Integration
- Integrated into main application router
- Authentication middleware for protected endpoints
- Error handling and graceful degradation
- Comprehensive logging for debugging

### Frontend Integration
- Creator dashboard accessible at `/app/creator-dashboard`, tier-gated
- Admin tooling accessible at `/admin/affiliate`
- Affiliate indicators on wishlist items
- Disclosure components for transparency

## Testing
- Unit tests for core affiliate service functionality
- Integration tests for API endpoints
- Emulator-verified: ledger state machine transitions, idempotent reimport, Amazon CSV
  adapter parsing
- Test coverage for URL conversion, analytics, and batch processing
- Mock data for testing without real affiliate networks

## Deployment Considerations
- Environment variables for affiliate IDs, Stripe Connect secret key, and API keys
- Rate limiting for API endpoints to prevent abuse
- Caching for frequently accessed affiliate programs
- Monitoring for conversion rates and revenue tracking
- Deployed to `wishlist-wizard-dev`; staging/prod rollout pending

## Verification Status
- **Live-verified**: a fresh free-tier account hitting `/app/creator-dashboard` receives a
  real 403-driven `UpgradePrompt` from the deployed dev backend.
- **Emulator-verified pre-deploy**: ledger state machine transitions, idempotent
  reimport, and the Amazon CSV adapter (25+11 assertions).
- **Not yet verified** (open items, not yet exercised end-to-end):
  - Real admin credentials flow through `/admin/affiliate`.
  - A real creator-tier dashboard view against a paid test account.
  - A live Stripe Connect test-mode onboarding + transfer round trip.
  - A full CSV-to-payout live run.

## Benefits
1. **Platform Sustainability**: Generate revenue to support free platform usage
2. **User Value**: No additional costs, same products at same prices
3. **Transparency**: Clear disclosure of affiliate relationships
4. **Creator Incentive**: Auditable, disputable commission sharing for Creator/Business tiers
5. **Scalability**: Support for additional affiliate programs and reconciliation adapters easily added
6. **Analytics**: Detailed insights into user behavior and revenue generation

## Future Enhancements
- Additional affiliate program reconciliation adapters beyond Amazon Associates (the
  `genericCsv.ts` adapter is scaffolded but not yet wired to a live network)
- Staging/production deployment of the commission ledger + payout backend
- Advanced analytics and reporting
- Seasonal promotional tie-ins
- Mobile app affiliate link handling

This comprehensive affiliate and creator payout system provides a solid, auditable
foundation for platform monetization while maintaining user trust and providing value to
all stakeholders.
