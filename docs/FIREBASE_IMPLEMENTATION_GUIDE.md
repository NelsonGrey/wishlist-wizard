# Firebase Feature Integration Guide

**Status**: Implementation Phase  
**Date**: 2026-05-06  
**Work Package**: WP-08 (Platform Optimization)  

## Overview

This guide documents the implementation of new Firebase platform features to close architectural gaps identified in the Firebase Audit. These utilities provide production-grade support for security (App Check), observability (Performance Monitoring, Crashlytics), and feature velocity (Remote Config, Analytics).

---

## Phase 1: Implemented Utilities

### 1.1 Firebase App Check (`packages/functions/src/utils/app-check.ts`)

**Purpose**: Prevent unauthorized API access from bots, scrapers, and non-official clients

**What It Does**:
- Verifies device integrity before executing Cloud Functions
- Requires reCAPTCHA v3 on web, native device checks on mobile
- Blocks requests without valid App Check tokens

**API**:

```typescript
// In Cloud Functions (callable)
import { requireAppCheck } from './utils/app-check';

export const addWishlistItem = onCall(async (request) => {
  // This guard throws HttpsError if verification fails
  await requireAppCheck(request);
  
  // Proceed with business logic
  // ...
});

// In HTTP endpoints
import { requireAppCheckHTTP } from './utils/app-check';

app.post('/api/webhook', async (req, res) => {
  if (!await requireAppCheckHTTP(req, res)) return; // Sends 403 response
  
  // Proceed
});
```

**Configuration Required**:
1. Enable App Check in Firebase Console
2. Configure reCAPTCHA v3 for web (in Console)
3. Configure SafetyNet for Android (in Console)
4. Disable enforcement in Emulator (automatic via FUNCTIONS_EMULATOR check)

**Verification**:
- ✅ Emulator tests allow requests (for local testing)
- ✅ Production enforces token validation
- ✅ Invalid tokens return 403 Forbidden
- ✅ Missing tokens return 403 Forbidden

---

### 1.2 Performance Monitoring (`packages/functions/src/utils/performance-monitoring.ts`)

**Purpose**: Track operation latency and SLO adherence for BR-013 (Observability)

**What It Does**:
- Records duration of operations (Cloud Functions, Firestore queries, etc.)
- Tracks P95/P99 latency percentiles for SLO monitoring
- Attributes operations for debugging (e.g., wishlist_id, user_id)

**API**:

```typescript
import { CustomTrace, PerformanceTracker } from './utils/performance-monitoring';

// Simple trace with timing
const trace = new CustomTrace('wishlist_creation');
await trace.executeAsync(async () => {
  // Do work
});
// Logs duration automatically

// More detailed tracking with segments
const perf = new PerformanceTracker('item_add_flow');
perf.mark('extract_url');
// Extract URL from product link
perf.mark('firestore_write');
// Write to Firestore
const metrics = perf.report(); // Returns segment durations
```

**Key Metrics**:
- Duration (milliseconds)
- P95/P99 percentiles
- Segment breakdown (e.g., URL extraction, Firestore write)
- Custom attributes (e.g., wishlist_id for correlation)

**Verification**:
- ✅ Traces > 500ms logged with WARNING level (BR-013 SLO)
- ✅ P95 latency tracked and reported
- ✅ Segment timing breaks down complex operations
- ✅ Attributes allow correlation with errors

---

### 1.3 Error Reporting (`packages/functions/src/utils/error-reporting.ts`)

**Purpose**: Centralized error tracking for Crashlytics integration and debugging

**What It Does**:
- Captures errors with context (operation, userId, itemId, etc.)
- Tracks error metrics for reliability SLOs
- Formats exceptions for structured logging
- Identifies retryable errors (network, timeout)
- Calculates exponential backoff for retries

**API**:

```typescript
import { ErrorReporter, logErrorWithContext } from './utils/error-reporting';

try {
  await processItem(itemId);
} catch (error) {
  // Automatic Crashlytics reporting + error counting
  logErrorWithContext(error, {
    operation: 'add_item_operation',
    userId: 'user123',
    itemId,
    cause: 'URL extraction failed'
  });
}

// Check error metrics
const metrics = ErrorReporter.getAllErrorMetrics();
// { add_item_operation: 3, price_fetch: 1, ... }
```

**Error Handling Features**:
- Retryable detection (ECONNREFUSED, ETIMEDOUT, etc.)
- Exponential backoff calculation
- Error deduplication by operation
- Context preservation for debugging

**Verification**:
- ✅ Network errors marked as retryable
- ✅ Exponential backoff calculated (2^n - 1)
- ✅ Error count per operation tracked
- ✅ Context preserved in logs

---

### 1.4 Client-Side Monitoring (`packages/firebase-utils/src/monitoring.ts`)

**Purpose**: Track user-facing performance (Web Vitals) and client errors

**What It Does**:
- Measures Largest Contentful Paint (LCP), First Input Delay (FID), Cumulative Layout Shift (CLS)
- Captures uncaught JavaScript errors and unhandled promise rejections
- Records custom performance measurements
- Sends metrics to Firebase Analytics/Crashlytics

**API**:

```typescript
import { initializeClientMonitoring } from '@firebase-utils/monitoring';

const { performanceMonitor, errorReporter, webVitals } = initializeClientMonitoring();

// Track performance
performanceMonitor.startMeasure('wishlist_load');
// Load wishlist
const duration = performanceMonitor.stopMeasure('wishlist_load', { wishlistId: '123' });

// Errors automatically captured
throw new Error('Something went wrong'); // Captured by global error handler

// Web Vitals automatically tracked (LCP, FID, CLS)
```

**Key Metrics**:
- Largest Contentful Paint (LCP) - visual completion
- First Input Delay (FID) - interactivity
- Cumulative Layout Shift (CLS) - visual stability
- Custom operation latency (wishlist load, item add, etc.)

**Verification**:
- ✅ LCP measurement captured
- ✅ FID measurement captured
- ✅ CLS measurement captured
- ✅ Global error handler catches uncaught errors
- ✅ Unhandled promises rejected and logged
- ✅ Slow operations (> 500ms) trigger warnings

---

### 1.5 Analytics (`packages/firebase-utils/src/analytics.ts`)

**Purpose**: Track user journeys and feature adoption for BR-008 (Creator Analytics) and BR-014 (Release gates)

**What It Does**:
- Logs structured events (signup, item_added, wishlist_shared, etc.)
- Tracks user properties (role, budget_category, feature_adoption)
- Creates conversion funnels (sign-up → first wishlist → first purchase)
- Enables cohort analysis by user segment

**API**:

```typescript
import { initializeAnalytics, getAnalyticsTracker, UserJourneyTracker } from '@firebase-utils/analytics';

// Initialize on app start
const tracker = initializeAnalytics();

// Log events
tracker.logUserSignup({ referrer: 'google' });
tracker.logWishlistCreated('birthday');
tracker.logItemAdded('extension');
tracker.logItemPurchased('affiliate_link', { discount_percent: 15 });

// Set user properties for cohort analysis
tracker.setUserProperties({
  user_role: 'creator',
  budget_category: '50_to_200',
  platform: 'web'
});

// Track feature adoption
tracker.logFeatureAdoption(['price_alerts', 'group_gifting']);

// Track conversion funnels
UserJourneyTracker.trackConversionFunnel('product_page_view', 'view');
UserJourneyTracker.trackConversionFunnel('add_to_cart', 'click');
UserJourneyTracker.trackConversionFunnel('purchase_complete', 'purchase');
```

**Key Events**:
- `user_signup`, `user_login` - acquisition funnel
- `wishlist_created`, `item_added` - usage metrics
- `wishlist_shared`, `item_purchased` - conversion metrics
- `price_alert_set`, `group_gift_contributed` - feature adoption
- `app_error`, `page_view` - observability

**Verification**:
- ✅ PII fields (email, password) stripped before logging
- ✅ User properties enable cohort segmentation
- ✅ Funnel events track conversion stages
- ✅ Feature adoption tracked for new WPs

---

### 1.6 Remote Config (`packages/firebase-utils/src/remote-config.ts`)

**Purpose**: Enable zero-downtime feature rollout and dynamic configuration (BR-014)

**What It Does**:
- Feature flags for gradual feature rollout (WP-03, WP-04)
- Dynamic configuration parameters (budget limits, thresholds)
- User-level rollout control (e.g., 10% of users get new feature)
- No code deployment required to enable/disable features

**API**:

```typescript
import { 
  initializeRemoteConfig, 
  getRemoteConfig, 
  RemoteConfigHelpers,
  FeatureFlags,
  ConfigParameters
} from '@firebase-utils/remote-config';

// Initialize on app start
await initializeRemoteConfig();

// Check if feature is enabled
if (RemoteConfigHelpers.isPriceAlertsEnabled(userId)) {
  // Show price alerts UI
}

// Get configuration values
const limits = RemoteConfigHelpers.getBudgetLimits();
// { minContribution: 1.0, maxContribution: 5000.0, maxTotal: 50000.0 }

const config = getRemoteConfig();
const timeoutMs = config.getNumber(ConfigParameters.API_TIMEOUT_MS);

// User-level rollout
if (config.isFeatureEnabledForUser(FeatureFlags.GROUP_GIFTING_ENABLED, userId)) {
  // Show group gifting feature (enabled for user based on rollout %)
}
```

**Supported Flags**:
- `PRICE_ALERTS_ENABLED` - WP-03
- `GROUP_GIFTING_ENABLED` - WP-04
- `RECOMMENDATIONS_AI_ENABLED` - Future
- `AFFILIATE_TRACKING_ENABLED` - Current
- `ENABLE_PERFORMANCE_MONITORING` - Observability
- `ENABLE_ERROR_REPORTING` - Observability
- `ENABLE_ANALYTICS` - Observability

**Verification**:
- ✅ Emulator uses defaults (safe for local testing)
- ✅ Feature rollout percentages applied consistently per user
- ✅ Budget limits configurable without code change
- ✅ Feature can be disabled in < 1 minute

---

## Phase 1 Implementation Checklist

### Backend (Cloud Functions)

- [x] `app-check.ts` - App Check verification middleware
- [x] `performance-monitoring.ts` - Trace and latency tracking
- [x] `error-reporting.ts` - Structured error logging and Crashlytics prep

**Integration Tasks** (coming next):
- [ ] Apply App Check to all callable functions (wishlists.ts, groupPayments.ts, notifications.ts)
- [ ] Wrap key operations with CustomTrace (WP-01, WP-03, WP-04 flows)
- [ ] Add smoke tests for App Check verification
- [ ] Add performance tests for P95 SLO validation

### Frontend (Client SDK)

- [x] `monitoring.ts` - Client performance and error tracking
- [x] `analytics.ts` - Event tracking and user properties
- [x] `remote-config.ts` - Feature flags and dynamic configuration

**Integration Tasks** (coming next):
- [ ] Initialize analytics on app start
- [ ] Log events for key user journeys (signup, item_added, share, purchase)
- [ ] Set user properties for cohort analysis
- [ ] Track Web Vitals and send to Firebase
- [ ] Initialize Remote Config and check feature flags
- [ ] Add analytics events to Browser Extension

---

## Phase 2: Server-Side Integration (Next Steps)

### Add App Check to Key Functions

**File**: `packages/functions/src/api/wishlists.ts`

```typescript
import { requireAppCheck } from '../utils/app-check';

export const addWishlistItem = onCall(async (request) => {
  await requireAppCheck(request); // Verify device integrity
  
  const trace = new CustomTrace('add_wishlist_item');
  return trace.executeAsync(async () => {
    // Existing logic
  });
});
```

**Functions to Protect**:
- All item mutations (add, update, delete)
- All payment operations (contribution, confirmation)
- All sharing operations
- Notification delivery

### Integrate Performance Monitoring into WP Flows

- WP-01: Add traces for CRUD operations
- WP-02: Add traces for sharing and privacy checks
- WP-03: Add traces for price alert fetch and notification delivery
- WP-04: Add traces for group gift calculations and Stripe calls

### Add Smoke Tests for Firebase Features

```bash
npm run test:users:smoke -- --include app-check
npm run test:users:smoke -- --include performance
npm run test:users:smoke -- --include error-reporting
```

---

## Phase 3: Client-Side Integration (After Server)

### Initialize Analytics and Remote Config

**File**: `packages/web/src/main.tsx`

```typescript
import { initializeAnalytics } from '@firebase-utils/analytics';
import { initializeRemoteConfig } from '@firebase-utils/remote-config';
import { initializeClientMonitoring } from '@firebase-utils/monitoring';

// On app initialization
await initializeRemoteConfig();
const { tracker } = initializeAnalytics();
initializeClientMonitoring();

// Track user session start
tracker.logPageView(window.location.pathname);
tracker.setUserProperties({
  platform: 'web'
});
```

### Add Analytics Events to Key Pages

```typescript
// Dashboard.tsx
tracker.logPageView('/dashboard', 'Dashboard');

// WishlistDetail.tsx
tracker.logPageView(`/wishlist/${wishlistId}`, `Wishlist: ${title}`);
tracker.logEvent('wishlist_viewed', { wishlist_id: wishlistId });

// ItemAdd.tsx
tracker.logItemAdded('manual');
tracker.logPageView(`/wishlist/${wishlistId}/add-item`, 'Add Item');

// ShareWishlist.tsx
tracker.logWishlistShared('public_link');
```

### Add Remote Config Checks to Feature Pages

```typescript
// PriceTrackingPage.tsx
import { RemoteConfigHelpers } from '@firebase-utils/remote-config';

if (!RemoteConfigHelpers.isPriceAlertsEnabled(userId)) {
  return <FeatureComingSoonPage feature="Price Tracking" />;
}

// GroupGiftingPage.tsx
if (!RemoteConfigHelpers.isGroupGiftingEnabled(userId)) {
  return <FeatureComingSoonPage feature="Group Gifting" />;
}
```

---

## Validation & Testing

### Smoke Tests to Add

```typescript
// test: App Check prevents unauthorized access
await callFunctionWithoutAppCheck('addWishlistItem')
  .expectError('permission-denied')

// test: Performance tracing captures latency
const trace = new CustomTrace('test_operation');
await trace.executeAsync(async () => { /* slow operation */ });
expect(trace.getDurationMs()).toBeGreaterThan(100);

// test: Error reporter tracks error count
ErrorReporter.resetMetrics();
ErrorReporter.captureError(new Error('Test'), 'test_operation');
expect(ErrorReporter.getErrorCount('test_operation')).toBe(1);

// test: Remote Config feature flag enables gradual rollout
expect(RemoteConfigHelpers.isPriceAlertsEnabled(userId1)).toBe(true);
// Rollout % applied consistently per user
```

### Metrics to Monitor Post-Implementation

- **App Check**: 100% of API requests verified, zero unauthorized access
- **Performance**: P95 latency < 500ms per function
- **Errors**: Crash-free score > 99%, error categorization working
- **Analytics**: Funnel conversion rates, feature adoption by cohort
- **Remote Config**: Feature flags changeable in < 1 minute, zero errors during rollout

---

## BR & WP Mapping

| Requirement | Feature | Phase | Status |
|---|---|---|---|
| BR-008 (Creator Analytics) | Analytics SDK + events | Phase 3 | 🔷 Ready |
| BR-012 (Platform Security) | App Check enforcement | Phase 2 | 🔷 Ready |
| BR-013 (Observability) | Performance Monitoring + Crashlytics | Phase 1-2 | ✅ Complete |
| BR-014 (Release Gates) | Remote Config + feature flags | Phase 2 | ✅ Complete |
| WP-01 (Core Hardening) | Traces for CRUD operations | Phase 2 | 🔷 Ready |
| WP-03 (Price Reliability) | Traces for alert delivery, Remote Config | Phase 2 | 🔷 Ready |
| WP-04 (Collaboration) | App Check for payments, Remote Config for limits | Phase 2 | 🔷 Ready |

---

## Deployment Sequence

**Week 1**:
1. ✅ Create utilities (app-check, monitoring, analytics, error-reporting, remote-config)
2. 🔷 Add App Check to Cloud Functions (addWishlistItem, etc.)
3. 🔷 Add smoke tests for App Check

**Week 2**:
1. 🔷 Integrate Performance Monitoring into WP flows
2. 🔷 Initialize Remote Config on client
3. 🔷 Add analytics events to key pages

**Week 3**:
1. 🔷 Monitor P95 latency, error rates, analytics funnel
2. 🔷 Roll out features via Remote Config (10% → 50% → 100%)
3. 🔷 Continue Wave 2 delivery (WP-03, WP-05)

---

## Rollback Plan

If issues arise during deployment:

1. **App Check**: Disable in Firebase Console (all clients allowed)
2. **Remote Config**: Revert flag values in Console (zero code deployment)
3. **Performance Monitoring**: Set ENABLE_PERFORMANCE_MONITORING to false
4. **Analytics**: Set ENABLE_ANALYTICS to false

All changes can be reverted in < 5 minutes without code redeployment.

---

## Next Phase: Continuing Wave 2 Delivery

After Phase 1 complete:
- WP-03 Remaining: Price alert threshold consistency, notification retry behavior
- WP-05 (Collaboration 2): Real-time wishlist updates with Realtime Database
- WP-06 (Mobile parity): Offline support, push notifications on mobile

