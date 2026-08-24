# Wishlist Wizard - Product Design & Feature Specifications

**Version**: 1.1  
**Last Updated**: July 16, 2026  
**Status**: 🟡 CORE LOOP FUNCTIONAL, RECOVERY IN PROGRESS — a 2026-07-16 audit found the product materially behind this document's prior claims (docs contradicted themselves, several "Complete" features were dead/disconnected code, and the entire authenticated web app was accidentally gated out of production by unrelated automation). A same-day recovery pass fixed the production gate, removed the dead/duplicate code found, and reconnected several disconnected features (see per-feature notes below). Every "Status" line in this document was re-verified against the actual code; treat it as ground truth over any status claims elsewhere in `docs/`.  
**Owner**: Mark Nelson

---

## 🎁 Product Vision

**Vision Statement**: "Make gifting joyful, effortless, and rewarding for everyone - givers, receivers, and the ecosystem around them."

**Product Positioning**: Wishlist Wizard is a multi-platform gifting platform that transforms how people discover, share, coordinate, and monetize wishlists. Aimed at gift-givers, occasion planners, content creators, and everyone in between, it's the central hub for all gifting occasions.

**Core Value Proposition**:
- **For Receivers**: Never get duplicate gifts, always receive what you want
- **For Givers**: Save hours finding perfect gifts, coordinate group contributions, track price drops
- **For Creators**: Monetize your taste/recommendations through affiliate commissions
- **For Platforms**: One seamless experience across web, mobile, and browser extension

---

## 🎨 Design Language & UX Principles

### Design Principles

1. **Joyful & Celebratory**: Gifting is happy; UI should feel festive, not corporate
2. **Effortless Sharing**: One-click to share across all platforms (WhatsApp, TikTok, Instagram, Discord)
3. **Trust & Transparency**: Clear affiliate disclosure, price tracking accuracy, fraud prevention
4. **Creator-First**: Prioritize features that enable earnings and growth
5. **Mobile-Native**: Designed for mobile first, enhanced on desktop

### Visual Language

**Color Palette**:
- Primary: Emerald (#047857) - trusted, polished, optimistic, and distinctive
- Primary Dark: Deep Emerald (#065F46) - premium depth and strong contrast
- Accent: Warm Gold (#F59E0B) - magic, delight, calls to action, and monetization
- Success: Green (#10B981) - purchased, confirmed contributions
- Alert: Amber (#F59E0B) - price drops, limited inventory
- Social: Platform colors only inside clearly identified sharing actions

**Typography**:
- Headers: Rounded Sans (Poppins, Outfit) - friendly, modern, bold
- Body: System fonts (SF Pro iOS, Roboto Android) - legible, lightweight
- Emphasis: Bold weights and size hierarchy for scanning

**UI Components**:
- Wishlist cards: Vibrant, image-heavy, gradient overlays
- Item cards: Product photo large, price prominent, price drop badge
- Share buttons: Multi-color (WhatsApp green, TikTok black, etc.)
- Creator badges: Gold/silver badge on profiles, monetization indicators

---

## 👥 User Personas & Use Cases

### Persona 1: "Social Gift-Giver"

**Scenario**: Birthday coming up, needs gift idea

1. Receives text: "Hey, what should we get Sarah for her birthday?"
2. Opens Wishlist Wizard → searches "Sarah" or enters link
3. Views Sarah's birthday wishlist (10+ items, price-tracked)
4. Spots item with recent price drop ($120 → $95) 💰
5. Taps [Buy] → redirected to Amazon with affiliate link
6. Purchases item, comes back to WW → marks as "Purchased" (prevents duplicates)
7. Message in group chat: "Got her the Dyson vacuum! See you at her party 🎉"

**Pain Points Addressed**:
- Duplicate gifts (visibility prevents)
- Decision fatigue (pre-curated list)
- Price comparison (price tracking shows deals)
- Coordination (group can see purchases)

---

### Persona 2: "TikTok Creator"

**Scenario**: Building personal brand around product recommendations

1. Creates TikTok style video: "7 Best Amazon Gadgets Under $50" 
2. In WW, creates curated wishlist with those 7 gadgets
3. Embeds wishlist link in TikTok bio + community posts
4. Followers click link, browse wishlist, click through to buy
5. WW tracks clicks and purchases → creator earns commission
6. Views dashboard: "47 clicks last week, 3 purchases = $12.50 commission"
7. Scales: Builds 5 wishlists (electronics, fitness, home, fashion, budget finds)
8. Monthly affiliate income: $500+ (passive income from content)

**Pain Points Addressed**:
- Monetization friction (hard without large following)
- Link tracking (affiliate program requires signup per platform)
- Income transparency (can't track which products convert)
- Scalability (limited by follower count, platform restrictions)

---

### Persona 3: "Occasion Coordinator"

**Scenario**: Planning sister's wedding, coordinating 15 guests' gifts

1. Creates wishlist on WW: "Emma's Wedding"
2. Shares link with 15 invited family members
3. Each guest picks items, marks as "Committing" ($50-200 commitment)
4. Group chat shows live updates: "Mom committed to wine set, Alex committed to kitchen mixer"
5. Avoids buying duplicates (visible who's buying what)
6. Tracks budget: Most committed to $50-100 items
7. Export list: PDF of who's buying what, for coordination
8. Post-wedding: References list for registry details

**Pain Points Addressed**:
- Coordination chaos (spreadsheets, multiple messages)
- Duplicate prevention (unclear who's buying what)
- Budget management (enforce price ranges)
- Follow-up (easy to track who confirmed)

---

### Persona 4: "Budget-Conscious Shopper"

**Scenario**: Loves deals, uses WW for price tracking

1. Adds items they'd like to buy to personal wishlist (not sharing)
2. Enables price alerts: "Notify me if drops below $50"
3. Adds items monthly, builds list of 100+ wish items
4. Gets notification: "FitBit dropped to $49.99!" → buys now
5. Over year, saves $200 by catching price drops
6. Occasionally shares list with friends: "If you need ideas, here's what I like"

**Pain Points Addressed**:
- Price monitoring (manually checking each site tedious)
- Impulse buying (knowing best price helps budget)
- Sharing casually (not formal, but nice to have option)

---

## 🎮 Core User Flows

### Flow 1: Create First Wishlist (Individual User)

```
[Home Screen] → [+ New Wishlist]
  ↓
[Wishlist Setup]
  ├→ Occasion: Birthday / Holiday / Wedding / Just Because
  ├→ Beneficiary: Me / Someone (enter name)
  ├→ Visibility: Private / Shared (if shared, set access)
  ├→ Cover image: Camera / Photo library / None
  └→ [Create Wishlist]
  ↓
[Empty Wishlist]
  ├→ [+ Add Items] 
  │   ├→ Option A: Browser extension (if installed)
  │   ├→ Option B: Paste product link
  │   ├→ Option C: Search product name
  │   └→ Option D: Manual entry
  └→ [Share] (optional, can share anytime)
```

**Expected Time**: 2-3 minutes to create, start adding items

---

### Flow 2: Add Item to Wishlist (Product Discovery)

```
User finds product while browsing (Amazon, Etsy, etc.)
  ↓
[Option A: Via Browser Extension]
  ├→ Browser extension icon → [+WishList]
  ├→ Select wishlist (dropdown)
  └→ [Add] → Auto-fetches product details
  ↓
[Option B: Paste Link]
  ├→ Copy product URL → WW app
  ├→ [+ Add Items] → Paste link
  ├→ [Fetch Details] → Product details auto-populated
  ├→ Edit if needed (adjust title, price, notes)
  └→ Choose wishlist → [Save]
  ↓
[Option C: Search & Add]
  ├→ [+ Add Items] → Search product name
  ├→ Hover/tap → Product preview
  ├→ [Add to wishlist]
  └→ Wishlist updated
  ↓
[Item Added]
  ├→ Toast: "Added to Birthday Wishlist"
  ├→ Price tracked automatically
  ├→ Notification if price drops
  └→ Share button ready
```

**Expected Frequency**: User adds 3-5 items when building wishlist

---

### Flow 3: Share Wishlist

```
Wishlist Created
  ↓
[Share Options - bottom sheet/modal]
  ├→ [Copy Link] → Clipboard (shareable everywhere)
  ├→ [WhatsApp] → Pre-filled message with link
  ├→ [Facebook] → Share to wall/messenger
  ├→ [Instagram] → Copy link for story/bio
  ├→ [TikTok] → Copy link for bio/community
  ├→ [Discord] → Share in Discord server
  ├→ [Email] → Send to contacts
  ├→ [SMS] → Text link to phone number
  ├→ [Twitter] → Share with followers
  └→ [Copy to Clipboard]
  ↓
[Link Shared]
  ├→ Recipient receives link
  ├→ Clicks link → App or web landing page
  └→ [View Wishlist] → Full visualization
```

**Share Types**:
- Public link (anyone with link can view)
- Private link (shareable but not discoverable)
- Invite-only (send email invites, approved access)

---

### Flow 4: Buy from Wishlist

```
Recipient viewing shared wishlist
  ↓
[Item Card Display]
  ├→ Product image (large)
  ├→ Product name + description
  ├→ Price: Current price (if price-tracked, show % drop if any)
  ├→ Retailer info (Amazon, Etsy, etc.)
  ├→ [View Details] → Full specs from retailer
  └→ [Buy Now] → Tap to purchase
  ↓
[User Taps "Buy Now"]
  ├→ Affiliate link clicked (WW gets commission)
  └→ Redirect to Amazon/Etsy (affiliate tracking ID in URL)
  ↓
[Customer Journey - External Site]
  ├→ Customer on Amazon/Etsy
  ├→ Adds to cart, continues shopping
  ├→ Purchases items
  └→ Affiliate commission tracked (30 days)
  ↓
[Back in WV App]
  ├→ Notify group: "Alex purchased..."
  ├→ Mark item as "Purchased" (prevent duplicates)
  └→ Wishlist updated live
```

**Monetization**: WV earns affiliate commission (3-15% depending on retailer)

---

### Flow 5: Creator Dashboard

```
Creator logged in
  ↓
[Creator Dashboard]
  ├→ Overview Stats
  │   ├→ Total clicks: 1,240
  │   ├→ Conversion rate: 8%
  │   ├→ Total commissions earned: $1,250
  │   └→ This month: $560
  │
  ├→ My Wishlists (5 lists)
  │   ├→ "Best Electronics Under $100" - 245 clicks, 18 purchases, $245 commission
  │   ├→ "Fitness Gear" - 156 clicks, 9 purchases, $120 commission
  │   ├→ "Home Essentials" - 342 clicks, 25 purchases, $380 commission
  │   └── [Create New Wishlist]
  │
  ├→ Analytics (detailed)
  │   ├→ By platform (TikTok clicks: 600, Instagram: 400, YouTube: 240)
  │   ├→ By promotion (video #1 had 300 clicks)
  │   └→ Revenue trend (chart)
  │
  ├→ Payout Management
  │   ├→ Total earned: $1,250
  │   ├→ Available to payout: $950 (after 30-day hold)
  │   ├→ [Request Payout] → Paypal/Bank transfer
  │   └── Next payout date: 2026-03-15
  │
  └─→ Settings
      ├→ Affiliate preferences
      ├→ Payment method
      └→ Creator profile (public, followers can find you)
```

**Key Metrics Tracked**: Clicks, conversions, commission per wishlist, historical trends

---

### Flow 6: Group Gifting Coordination

```
Wedding/Event Planner creates event wishlist
  ↓
[Add Beneficiary & Event Details]
  ├→ Beneficiary: "Emma & David (wedding)"
  ├→ Event date: June 2026
  ├→ Invited guests: 25 people (send invites)
  ├→ Budget range: $50-$200 per person
  └→ Coordination mode: Enabled (show commitments)
  ↓
[Share with Guests]
  ├→ Email invites sent → Guests click link
  └→ Guests see wishlist + "Commit" button
  ↓
[Guest Actions upon receiving invite]
  ├→ View wishlist (all 50+ items)
  ├→ Scroll through (sorted by price, category)
  ├→ [Tap to Commit] → "I'll buy this for $80-120"
  ├→ Item marks "Committed" (visible to all invited)
  └→ Confirmation: "You're contributing the Dyson vacuum!"
  ↓
[Coordinator View - Real-time Updates]
  ├→ "Mom committed to wine set"
  ├→ "Alex committed to kitchen mixer"
  ├→ "Sarah committed to linens"
  ├→ Visual: checklist showing coverage
  ├→ Alert: "3 guests haven't committed yet"
  └→ Export: List of what everyone's buying
  ↓
[Post-Purchase]
  ├→ Coordinator exports final report
  ├→ Sends to all: "Here's what everyone's buying"
  └→ Avoid duplicates at last minute
```

**Features**: Real-time visibility, commitment tracking, budget enforcement, duplicate prevention

---

## 🏗️ Feature Specifications

### Feature 1: Wishlist Creation & Management

**Status**: ✅ Complete in `wishlist-wizard-dev`, config wired for staging/prod but unverified there — the authenticated `/app/*` route block in `packages/web/client-src/AppRouter.tsx` was found accidentally gated out of production by an unrelated cross-project automation commit (2026-05-06); the gate was removed 2026-07-16 and production now matches dev/staging. A 2026-07-18 audit (`docs/WISHLIST_WIZARD_GO_LIVE.md` §1.15) found the `createWishlist` Cloud Function unconditionally enforces Firebase App Check while the web client never initialized it — confirmed via plain `curl` calls against both dev and staging. Fixed the same day (§1.16): the user set up App Check and provided a reCAPTCHA site key, the client SDK is now wired for web and iOS, and `createWishlist` was verified live end-to-end against `wishlist-wizard-dev`. The user then configured App Check for staging and production too (same site key); the site key is now wired into all three real web deploy paths and the corresponding GitHub secrets are set, but staging/production were deliberately not live-verified this round — dev is the only environment confirmed working end-to-end.

**Wishlist Types**:
- **Personal Wishlist**: "Things I want" (private by default, can share)
- **Event Wishlist**: "Wedding gifts", "Birthday party" (shareable, occasion-focused)
- **Gift Registry**: "Honeymoon registry", "Baby registry" (formal, gift list for event)
- **Inspiration Board**: "Home decor ideas", "Fashion picks" (more casual, mood-board style)

**Wishlist Properties**:
```json
{
  "id": "wishlist_123",
  "name": "Emma's Wedding",
  "beneficiary": "Emma & David",
  "occasion": "Wedding",
  "createdAt": "2026-01-15",
  "visibility": "public",
  "shareLink": "ww.co/w/abc123",
  "itemCount": 47,
  "items": [...],
  "owner": "user_456",
  "coverImage": "url...",
  "description": "We love garden-themed home items!",
  "settings": {
    "allowComments": true,
    "allowCommitments": true,
    "budgetMin": 50,
    "budgetMax": 200,
    "coordinationMode": true
  }
}
```

**CRUD Operations**:
- Create: Name, occasion, beneficiary, cover image, visibility
- Read: View own wishlists, shared wishlists (if authorized)
- Update: Edit any property, reorder items
- Delete: Soft delete (archive), hard delete (permanent)

---

### Feature 2: Product Catalog & Linking

**Status**: 🟡 Partial — Browser Extension, Manual Entry, and Paste Link (auto-fetch title/price/image from a URL via `fetchProductPreview`) all work on web. Search is not yet implemented (see Feature 4 for the extension's own retailer-coverage caveats).

**Supported E-Commerce Platforms**:
- Amazon (largest, multiple regions)
- Etsy (handmade, collectibles)
- Walmart (groceries, home goods)
- Target (general retail)
- Best Buy (electronics)
- Wayfair (home & furniture)
- Shopify stores (custom retailers)
- eBay (broad, collectibles)
- Specialty retailers (Nike, Sephora, etc.)

**Product Data Captured**:
```json
{
  "title": "Dyson V15 Detect Vacuum",
  "url": "https://amzn.to/...",
  "retailer": "Amazon",
  "image": "url...",
  "price": {
    "current": 99.99,
    "original": 149.99,
    "currency": "USD"
  },
  "rating": 4.7,
  "reviewCount": 2340,
  "description": "...",
  "specs": [...],
  "inStock": true
}
```

**Adding Items**:
- **Browser Extension** (fastest, auto-captures from any site)
- **Paste Link** (manual, fetch product details from API)
- **Search** (search retailer catalogs, curated results)
- **Manual Entry** (rare, fallback for unsupported sites)

---

### Feature 3: Price Tracking & Alerts

**Status**: 🟡 Partial — comparison-shopping (multi-retailer price offers, refreshed every 6h via SerpAPI) is live and deployed. Personal price-drop alerts (the feature described below) are implemented in code but **not deployed** — no production path currently creates or triggers an alert.

**Price History Tracking**:
- Poll each item weekly (more freq for popular items)
- Store price history (chart shows trend over time)
- Detect price drops, price increases, out-of-stock
- User-specific alert thresholds (notify if drops below $X)

**Analytics**:
- Price drop rate: "35% off in last 30 days"
- Best price seen: "$79.99 on 2026-01-20"
- Current price with history: Chart showing price trend

**Notifications**:
- "Price Drop! 🎉 Dyson Vacuum now $99.99 (was $149.99) 33% off!"
- "Back in stock! Dyson Vacuum available now"
- "Limited inventory: Only 2 left in stock"

**Features**:
- Frequency control (daily digest vs. instant)
- Alert threshold (notify if falls below X)
- Historical charts (see price trend over 3-6 months)

---

### Feature 4: Browser Extension

**Status**: 🟡 Partial, but the core "killer app" flow is now genuinely real, verified live, and covered by a committed automated test suite (2026-07-18, see `docs/WISHLIST_WIZARD_GO_LIVE.md` §1.12–§1.13 for the full history): click the floating button on any website → product auto-detected (JSON-LD structured data preferred, CSS-selector/heuristic fallback otherwise) → toolbar popup opens pre-filled → pick or create a wishlist → save via Cloud Functions. Coupon Finder and Price Comparison remain UI-only, calling backend endpoints that don't exist (deferred, see `docs/WISHLIST_WIZARD_GO_LIVE.md` Part 5). The per-site settings gear described below doesn't exist.

**Core Functionality**:
1. **One-Click Add**: Floating button on product pages → auto-detects the product and hands it straight to the toolbar popup, pre-filled (fixed 2026-07-18 — previously the button showed a fake success checkmark but the message it sent had no listener anywhere, so nothing was ever saved)
2. **Auto-Detection**: Identifies product on page (price, image, title) — deep parsing for Amazon/Target/Walmart adapters; real JSON-LD `Product` schema parsing (title/price/image) for every other site, falling back further to CSS-selector heuristics only when no structured data is present. A second bug found while adding unit tests (2026-07-18): the extraction call was missing an `await`, so this enhanced/JSON-LD path was silently unreachable in the running extension the whole time — fixed, and now covered by both unit and E2E tests.
3. **Site Coverage**: Runs on all http(s) websites, not a fixed retailer list (broadened 2026-07-18 from ~16 hardcoded domains)
4. **Fallback Mode**: Manual entry if auto-detection fails
5. **Price Comparison**: 🔴 Not functional — UI calls a backend endpoint that isn't implemented
6. **Coupon Finder**: 🔴 Not functional — same reason as above

**UI/UX**:
- Floating button (bottom-right, minimalist icon)
- Popup overlay (wishlist selector, price preview) — opens automatically via `chrome.action.openPopup()` on Chrome/Edge when supported by the browser context; always reachable manually via the toolbar icon regardless
- Success toast ("Added to Electronics Wishlist")
- Settings gear icon (enable/disable per site) — 🔴 not implemented
- Two broken/dead legacy "quick add" code paths removed 2026-07-18: an "Enable One-Click Add" button that posted to a non-existent unauthenticated endpoint, and an entirely orphaned `QuickAdd` class that was loaded into every popup session but never activated

**Technical**:
- Content script injects features on product pages
- Background script handles API calls
- Storage syncs across browser instances
- Auth: Firebase Authentication (ID token + refresh). A content-script bridge (`web-auth-bridge.js`) now relays the signed-in web app session into the extension when that tab is open, so a separate login is only needed if the user isn't already signed in on the web app in that browser.

**Supported Browsers**:
- Chrome/Brave (85+)
- Firefox (78+)
- Edge (85+)
- Safari (14+) - planned

---

### Feature 5: Affiliate & Creator Program

**Status**: ✅ Shipped 2026-07-21 — affiliate tracking (link rewriting, click/conversion logging, revenue aggregation), commission ledger, Stripe Connect creator payouts, and the tier-gated creator dashboard are all deployed and live-verified against a real backend.

**Affiliate Tracking**:
- Unique link per retailer (Amazon, Etsy, etc.)
- Tracking ID embedded in link
- 30-day cookie (purchase must complete within 30 days)
- Event-based tracking: Click → Purchase → Commission

**Commission Structure**:
| Retailer | Commission | Status |
|----------|-----------|--------|
| Amazon | 3-5% | ✅ Integrated |
| Etsy | 6-8% | ✅ Integrated |
| Walmart | 6-8% | ✅ Integrated |
| Target | 5-7% | ✅ Integrated |
| Best Buy | 3-4% | ✅ Integrated |
| Custom Retailers | 5-15% | ✅ Case-by-case |

**Creator Dashboard** (see Flow 5) — ✅ Shipped, `/app/creator-dashboard` (tier-gated on `creatorDashboardEnabled`):
- Performance, commission status, payout readiness, and adjustments panels
- Admin tooling at `/admin/affiliate`

**Payment Processing** — ✅ Shipped via Stripe Connect Express:
- Payout batches (`payoutBatches`), one per creator per run, monthly scheduled + manual admin retry
- Post-payout clawback nets against `creatorPayoutAccounts.outstandingClawbackBalanceUsd`
- Note: current implementation is Stripe Connect Express only — PayPal/direct bank transfer/check are not
  supported payout methods; minimum payout and hold-period specifics should be confirmed against
  `packages/functions/src/api/payouts.ts` rather than assumed from this doc

---

### Feature 6: Achievements & Rewards (v1)

**Status**: ✅ Shipped 2026-07-23, `/app/achievements`.

Real computed-on-read backend (`GET /api/achievements`) — not stored/precomputed fake data. Merge-never-
regress semantics: an earned achievement or tier can never be taken away on a later recompute.

**v1 scope (12 achievements)**: 7 Foundation-tier + Tracker + Extension Power User + Gift Giver + Well-Loved
+ Sharer. Reward surface: Trophy Case / tier badges in `UserProfile.tsx`.

**Deferred to a later phase**: Bargain Hunter, Wishlist Builder, Group Organizer, Chip In, Collaborator, and
a Creator track — not yet implemented. See `docs/Achievements_And_Rewards_Design.md` for the full design and
as-built notes.

---

### Feature 6: Mobile App (iOS & Android)

**Status**: 🟡 Partial — real Flutter/Firebase client with a working App Store release pipeline (Xcode project, Fastlane, TestFlight/App Store GitHub Actions workflow). Sharing, push notifications, and offline support are now live (see below). Still thin: 4 tabs (Home, Wishlists, Notifications, Profile), no Shared-with-Me, no Creator Mode. A 2026-07-18 audit (`docs/WISHLIST_WIZARD_GO_LIVE.md` §1.14) found and fixed a bug where `createWishlist()` always reported failure to the user despite genuinely succeeding server-side, added injectable test doubles (`mocktail`) and 9 regression-proven unit tests for the provider's write paths, and wired (but has not yet populated) CI secrets needed to actually run the existing logged-in integration test suite. Also (§1.16): wired the `firebase_app_check` client SDK (DeviceCheck/App Attest for release, debug provider for simulators) to match App Check enforcement now turned on in `wishlist-wizard-dev`, and found/fixed a real launch-blocking crash (`[core/duplicate-app]`) surfaced during live iOS simulator verification. **Android is on hold indefinitely** (2026-07-18, user decision) — no physical Android device is available, which is required both for real device testing and for Google Play Store submission, independent of any code readiness.

**Screens**:
1. **Home Feed**: dashboard-style recent wishlists / stats / quick actions (not a browse/discover feed)
2. **My Wishlists**: all user wishlists
3. **Shared with Me**: 🔴 does not exist
4. **Wishlist Detail / Item Detail**: item detail is a bottom sheet on the wishlists screen, not a separate screen
5. **Profile**: minimal — avatar, name, subscription management, logout
6. **Creator Mode**: 🔴 does not exist

**Key Features**:
- Cross-platform sync (web ↔ mobile, same Firebase account) — real
- Offline support — ✅ Firestore's native offline persistence is explicitly enabled at startup. (The old REST-based `SyncProvider`/`SyncService` was found wired to a hardcoded personal-machine IP left over from before the Firebase migration — it was left disconnected rather than revived, since the backend it targets no longer exists.)
- Push notifications — ✅ `FCMService` is now initialized at startup; tokens are saved to the backend via `saveFCMToken`
- Social sharing — ✅ `SocialShareService` is now wired to a share button on the live wishlist screen (WhatsApp, Instagram, TikTok, Facebook, email, generic OS share sheet). Discord sharing is still not implemented.
- Touch-optimized UI (large buttons, minimal scrolling)

**Technologies**:
- iOS & Android: **Flutter + Dart**, Provider for state management, `go_router` for navigation
- Firebase SDK for backend (Firestore, Auth, FCM)

---

### Feature 7: Notifications & Communication

**Status**: 🟡 Partial — Push (FCM) and in-app are real end-to-end for item add/reserve/purchase events. Email is implemented (Nodemailer/SMTP) but only called from an undeployed code path, so it doesn't currently send in production. SMS is not implemented. Social/milestone/event-related notification types have no triggering feature behind them yet (see Feature 5 and Social network & discovery).

**Notification Types**:
1. **Price Drops**: "Item dropped to $49.99 (save $30!)"
2. **Availability**: "Item now in stock"
3. **Social**: "Alex liked your wishlist", "Friend left a comment"
4. **Event-Related**: "Emma's wedding is in 60 days"
5. **Reminders**: "Your sister's birthday is tomorrow"
6. **Milestone**: "Your wishlist reached 100 views!"

**Delivery Channels**:
- In-app (badge count, notification center)
- Push notifications (iOS/Android)
- Email digests (daily, weekly, never)
- SMS (critical only, opt-in)

**Settings**:
- Toggle per notification type
- Delivery schedule (instant, daily digest, weekly)
- Quiet hours (no notifications 10 PM - 8 AM)
- Per-wishlist preferences (e.g., quiet for archived wishlists)

---

## 📱 Platform-Specific Considerations

### Web

**Framework**: React, Vite, TypeScript
**Key Features**:
- Full responsiveness (desktop-first, mobile-optimized)
- Drag-and-drop wishlist reordering
- Bulk edit (upload CSV of items)
- Advanced filters (price range, retailer, category)
- Analytics dashboard (for creators, detailed charts)

**Target Browsers**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

### iOS

**Framework**: Flutter + Dart (not native SwiftUI — see Feature 6)
**Apple-Specific Features** — 🟡 Planned, no code exists yet (would require native platform channels beyond Flutter's default template):
- Siri Shortcuts ("Add [item] to my [wishlist]")
- App Clips (share wish without full app install)
- iCloud sync (across user devices)
- Handoff (continue on macOS)

**Target**: iOS 16+ (matches the actual `IPHONEOS_DEPLOYMENT_TARGET` in the Xcode project)

---

### Android

**Framework**: Flutter + Dart (not native Jetpack Compose)
**Google-Specific Features** — 🟡 Planned, no code exists yet:
- Google Assistant integration (voice add to wishlist)
- Widgets (home screen wishlist widget)
- Share Sheet integration (system-level sharing)

**Target**: Android 8.0+

---

### Browser Extension

**Platform Support**:
- Chrome/Chromium (Brave, Edge, Opera)
- Firefox
- Safari (planned)

**Key Features** (see Feature 4):
- One-click add
- Auto-detection
- Price comparison
- Coupon finding

---

## 🗺️ Information Architecture

```
Home / Dashboard
├── Trending Today
│   ├── Top 10 wishlists (by views/interactions)
│   ├── Price drops featured
│   └── Seasonal/holiday themes
│
├── Friends' Activity (if social enabled)
│   ├── "Alex created Birthday wishlist"
│   ├── "Sarah bought leather jacket"
│   └── Browse friends' wishlists
│
├── Quick Actions
│   ├── [+ New Wishlist]
│   ├── [Search Wishlist]
│   └── [Upload CSV]
│
└── Navigation (Bottom Tab / Sidebar)
    ├── Home / Discover
    ├── My Wishlists
    ├── For Me (shared with me)
    ├── Creator (if creator)
    ├── Profile
    └── Settings

My Wishlists Screen
├── Filter tabs: All / Personal / Events / Registries
├── Wishlist cards (grid or list view)
│   ├── Cover image, name, item count
│   ├── Last updated, views count
│   └── [Tap to open, swipe for actions]
└── [+ New Wishlist] button

Wishlist Detail Screen
├── Header (cover image, name, beneficiary)
├── Stats button: Views, likes, shares
├── Tabs:
│   ├── Items (main grid/list)
│   │   ├── Filter (price, retailer, status)
│   │   ├── Sort (price low-high, newest, popular)
│   │   └── Item cards with price, image, retailer
│   ├── Details (description, occasion, budget)
│   ├── Sharing (see who has access, invite more)
│   └─  Comments (if enabled)
├── Floating Action Buttons:
│   ├── [+ Add Item] (primary)
│   ├── [Share] (secondary)
│   └── [Menu] (more options)

Item Detail Screen
├── Product image (gallery, swipeable)
├── Product info (name, retailer, rating)
├── Pricing
│   ├── Current price (prominent)
│   ├── Original price (if on sale)
│   ├── Your price (if logged in with alert threshold)
│   └── Price history chart
├── Details
│   ├── Description, specs, reviews
│   ├── Stock status
│   └── Related items
└── Actions
    ├── [Buy Now] (primary, affiliate link)
    ├── [Add/Remove from Wishlist]
    ├── [Share]
    └── [Compare Price] (across retailers)

Creator Dashboard
├── Overview
│   ├── Total clicks, conversions, commission
│   ├── This month vs. last month
│   └── Revenue trend chart
│
├── My Wishlists
│   ├── Per-wishlist analytics
│   │   ├── Clicks, conversions, commission
│   │   ├── Top performing items
│   │   └── Traffic source breakdown
│   └── Create new wishlist button
│
├── Analytics (detailed)
│   ├── Traffic by platform (TikTok, Instagram, YouTube, etc.)
│   ├── Traffic by wishlist
│   ├── Conversion funnel
│   └── Custom date range
│
├── Payout Management
│   ├── Total earned, available to payout
│   ├── Payment history
│   ├── [Request Payout]
│   └── Tax info / 1099 forms
│
└── Settings
    ├── Payment method
    ├── Creator profile (public link, bio, avatar)
    └── Preferences

Profile / Settings
├── Account
│   ├── Email, password
│   ├── Phone (optional, for SMS alerts)
│   ├── Avatar, display name
│   └── Bio (public if creator)
│
├── Notifications
│   ├── Price drops, availability
│   ├── Social (comments, mentions)
│   ├── Reminders (upcoming occasions)
│   └── Email digest frequency
│
├── Privacy & Data
│   ├── Wishlist visibility (default)
│   ├── Data export (GDPR)
│   ├── Privacy policy
│   └── Terms of service
│
├── Affiliate Settings (if creator)
│   ├── Payment method
│   ├── Tax info
│   └── Payout frequency
│
└── Support
    ├── FAQ
    ├── Contact support
    └── Report bug / feedback
```

---

## 🎯 Feature Prioritization

| Feature | Impact | Effort | Priority | Status |
|---------|--------|--------|----------|--------|
| Wishlist CRUD | Critical | Medium | P0 | ✅ Complete |
| Item management (add/remove) | Critical | Medium | P0 | ✅ Complete |
| Public sharing & links | Critical | Low | P0 | ✅ Complete (web and mobile) |
| Price tracking | High | Medium | P2 | 🟡 Partial (comparison-shopping live; personal alerts undeployed) |
| Browser extension | High | High | P1 | 🟡 Partial (core add-flow real; coupon/price-compare and 40+ retailer coverage are not) |
| Mobile app (iOS/Android) | Critical | High | P0 | 🟡 Partial (Flutter, not native — see Feature 6) |
| Affiliate monetization | High | High | P2 | 🟡 Partial (click/conversion tracking real, no payout system) |
| Creator dashboard | Medium | High | P1 | 🟡 Planned (no code yet) |
| Group coordination (commitments) | Medium | Medium | P2 | 🟡 Partial |
| Calendar integration | Medium | High | P1 | 🟡 Partial (OAuth + event sync genuinely implemented; depends on provider credentials being configured) |
| Social network and discovery | Medium | High | P1 | 🟡 Planned (a demo page only) |
| Personalized recommendations | Low | Very High | P3 | 🟡 Partial (Firestore-backed, not model-backed — "AI" framing intentionally avoided in public copy) |
| AR visualization | Low | Very High | P4 | ⏸️ Future |
| Custom level editor | N/A | N/A | N/A | N/A |

---

## 🚀 Launch & Rollout

### Pre-Launch (Week 1-2)

- ✅ Closed beta with 100 users (test core flows)
- ✅ App Store/Play Store listings
- ✅ Browser extension (Chrome Web Store, Firefox Add-ons)
- ✅ Landing page optimized for SEO
- ✅ Creator onboarding docs & partner agreements

### Launch Day

- ✅ App Store + Play Store release
- ✅ Browser extension availability
- ✅ Web app public (Firebase Hosting)
- ✅ Social media blitz (TikTok, Instagram, Twitter)
- ✅ Influencer seeding (100 micro-influencers)

### Post-Launch (Week 3+)

- ✅ Monitor crashes (target: <0.1% error rate)
- ✅ User feedback surveys (in-app, email)
- ✅ Creator program outreach (recruitment, support)
- ✅ Iterate based on data (which features resonate)
- ✅ Weekly updates (bug fixes, small features)

---

## 📊 Phased Roadmap

### Phase 1: MVP (Core Platform)
- ✅ Web app + Mobile apps (iOS/Android)
- ✅ Wishlist CRUD + sharing
- ✅ Item management (add from link, search)
- ✅ Browser extension (product adding)
- ✅ Basic analytics (view counts)
- 🟡 Calendar integrations (Google, Outlook, Apple)
- 🟡 Social network and discovery (public profiles, discovery)

**Target Metrics**: 1M wishlists, 200K MAU, 60%+ share rate, 35%+ calendar activation

---

### Phase 2: Creator Economy & Intelligence (Year 1-2, Q2-Q3 2026)
- 🟡 Creator marketplace (discover top creators)
- 🟡 Advanced analytics (per-wishlist, per-item ROI)
- 🟡 Creator tools (bulk edit, CSV import, templates)
- 🟡 AI recommendations (gift ideas based on recipient)
- 🟡 Group gifting payments (PayPal/Stripe integration)
- 🟡 Price tracking (basic + advanced multi-retailer alerts)
- 🟡 Affiliate integration (Amazon, Etsy, Walmart)

**Target Metrics**: 10K creators, 10M wishlists, validated ad revenue baseline, controlled rollout of paid price tracking

---

### Phase 3: Ecosystem & Platforms (Year 2-3, Q4 2026+)
- ⏸️ Brand partnerships (exclusive wishlists, collaborations)
- ⏸️ White-label solutions (retailers embed WV wishlists)
- ⏸️ AR visualization (preview items in space)
- ⏸️ Conversational AI (chatbot-based wishlist creation)
- ⏸️ Social commerce integrations (TikTok Shop, Instagram Shop)

---

## 🔒 Accessibility & Compliance

### WCAG 2.1 AA Compliance
- ✅ Text contrast (≥ 4.5:1)
- ✅ Keyboard navigation (full site keyboard-accessible)
- ✅ Alt text (all images have descriptive alt text)
- ✅ Color-blind friendly (not color-only indicators)
- ✅ VoiceOver/TalkBack support

### GDPR/CCPA Compliance
- ✅ User data export (wishlist data, personal data)
- ✅ Right to be forgotten (account + all wishlists deletion)
- ✅ Transparent privacy policy
- ✅ Affiliate link disclosure (FTC requirement)
- ✅ Cookie consent (EU requirement)

### Fraud Prevention
- ✅ Affiliate fraud detection (duplicate clicks, bot prevention)
- ✅ Payment fraud prevention (Stripe validation)
- ✅ Bot protection (CAPTCHA on signup if triggered)
- ✅ Creator KYC (Know Your Creator - tax info verification)

---

## 📲 Success Metrics & KPIs

| Metric | Target Y1 | Target Y3 | Measurement |
|--------|-----------|-----------|-------------|
| **Monthly Active Users** | 200K | 2M | Firebase Analytics |
| **Wishlists Created** | 1M | 10M | Database |
| **Affiliate Clicks** | 5M | 100M+ | Tracking links |
| **Affiliate Revenue** | $5.88M | $150M | Merchant APIs |
| **Creators** | 5K | 50K | Registration |
| **Creator MRR Top 100** | $500 avg | $5K avg | Payout data |
| **D30 Retention (free)** | 40% | 45% | Cohort analysis |
| **Premium Conversion** | 5% | 8% | Stripe |
| **Affiliate Conversion Rate** | 5% | 8% | Analytics |
| **App Rating** | 4.5+ stars | 4.7+ stars | App stores |

---

**Product Design Owner**: Mark Nelson  
**Last Updated**: July 16, 2026  
**Design Status**: 🟡 Core loop functional, recovery in progress — see per-feature status above
