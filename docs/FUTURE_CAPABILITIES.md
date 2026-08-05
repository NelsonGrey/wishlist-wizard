# Future Capabilities

This document tracks features that are partially implemented or not yet built, discovered during a marketing-vs-implementation audit on 2026-06-23. Each item records what was claimed, what's real today, and what needs to be built.

---

## 1. Personalized Recommendations Engine

**Current state:** UI shell exists (`/app/recommendations`), Firestore `recommendations` collection is queried, and the API router exposes `/api/recommendations` — but nothing populates that collection. The page shows whatever is manually inserted into Firestore.

**What was falsely claimed:** "Our recommendation engine analyzes your wishlists to find products you'll love", item analysis by brand/category/price/style, relevance scores, thumbs up/down feedback, price-drop recommendations, "trending products in your favorite categories."

**Status in UI:** Corrected. Page now shows a "Coming Soon" notice. Help dialog rewritten to describe what the page actually does today.

**To build:**
- A scheduled Cloud Function that reads each user's wishlist items and writes scored `recommendations` documents to Firestore (could use SerpAPI for similar product lookups, or OpenAI embeddings for preference matching).
- Thumbs up/down feedback stored back to Firestore so the engine can refine scores.
- A "price drops on tracked items" feed pulled from existing price history data.

---

## 2. Push Notifications / Lock-Screen Alerts

**Current state:** In-app notification bell (`/app/notifications`) is fully functional — Firestore-backed, real-time, mark-as-read. No push delivery is wired.

**What was falsely claimed:** "Price drop alerts delivered to your lock screen" (Download page), "Get alerts on price drops, new items added, or when friends add to shared lists" (MobileAppDemo).

**Status in UI:** Corrected. Download.tsx now says "In-app alerts when tracked prices drop." MobileAppDemo says "Stay updated on wishlist activity and price changes from within the app."

**To build:**
- Firebase Cloud Messaging (FCM) token registration in the iOS app and web app (service worker).
- A Cloud Function triggered on price-drop events that sends an FCM push to the relevant user's registered tokens.
- Opt-in consent UI and notification settings screen.

---

## 3. Email Notifications

**Current state:** No email delivery code exists. A SendGrid stub was noted in `firebase-price-tracking.ts` but is not connected. Email strategy is Nodemailer + Google Workspace SMTP (decided in a prior session).

**What was implied:** Price-drop alerts and event reminders were described generically in ways that imply email delivery alongside in-app.

**To build:**
- A Nodemailer + Google Workspace SMTP transport wired into Firebase Functions.
- Triggered on: price drops, upcoming calendar events (60/30/7 day reminders), new items added to a shared wishlist the user follows.
- Unsubscribe link + preference management in user settings.

---

## 4. Barcode Scanning (Full Implementation)

**Current state:** The iOS Flutter app has a `scan_item_screen.dart` that uses `image_picker` to capture a photo. There is no barcode parsing library — `mobile_scanner` was excluded due to a version conflict with Firebase 12.x (`GTMSessionFetcher`).

**What was falsely claimed:** "Camera scanner detects barcodes automatically", "Scan barcodes and QR codes to add items instantly", "auto-populate item details from retail databases."

**Status in UI:** Corrected. Download.tsx now says "Scan items in-store to add them to your wishlists." MobileAppDemo says "Use your camera to capture and add items on the go."

**To build:**
- Resolve the `mobile_scanner` / `GTMSessionFetcher` version conflict (may require waiting for a Firebase 12.x-compatible release of `mobile_scanner`, or switching to Google ML Kit Barcode Scanning).
- Backend lookup: given a barcode (UPC/EAN), query a product database (e.g., Open Food Facts, UPC Item DB, or SerpAPI shopping) to pre-fill the item title, image, and price.

---

## 5. Android App

**Current state:** No Android-specific code or build configuration exists. The Download page correctly labels it "Coming Soon."

**What was correctly claimed:** "Android coming soon" — this is honestly labeled.

**To build:**
- The Flutter app is cross-platform, so Android support is architecturally ready.
- Needs: `google-services.json` for the Firebase Android project, Google Play Developer account, Play Store listing, and a build/signing workflow.
- The `GTMSessionFetcher` conflict (item 4 above) will need resolution before shipping barcode scanning on Android.

---

## 6. Social Discovery Network

**Current state:** Wishlist sharing via unique link works. Viewers can mark items as purchased. Contact import (Google, Outlook, Facebook, Apple) works. There is no friend graph, no user search, no "discovery" of other users.

**What was falsely claimed:** "Social Network & Discovery" feature name, "Discover people you trust."

**Status in UI:** Corrected. Features.tsx card now reads: "Share wishlists with family and friends via a secure link. Viewers can mark items as purchased so nobody buys duplicates."

**To build (if desired):**
- User search / friend request flow.
- A public or semi-public profile that others can follow.
- A "discover" feed showing public wishlists from people in your network.
- Privacy controls for who can find your profile.

---

## 7. Password-Protected Wishlists

**Current state:** Share links use a unique token (unguessable, not publicly listed). There is no password layer on top of that.

**What was falsely claimed:** "Share links are secure and can be password-protected for sensitive wishlists" (SocialIntegrationDemo security section).

**Status in UI:** Corrected. SocialIntegrationDemo now says "Share links use a unique token — only people with the link can view the wishlist."

**To build:**
- Optional password field on a share link.
- Backend enforces the password check before returning wishlist data.
- Password stored as a bcrypt hash alongside the share document.

---

## 8. iOS App Store Listing

**Current state:** iOS app code exists and is complete. App Store URL is a placeholder: `https://apps.apple.com/app/wishlist-wizard/id000000000`.

**Status:** Not a feature gap — just a pending submission. Once Apple approves the app, update `APP_STORE_URL` in `packages/web/client-src/pages/Download.tsx`.

---

## Audit Summary

| Capability | Today | To Build |
|---|---|---|
| Recommendations engine | UI shell only | Scheduled Cloud Function, scoring, feedback |
| Push notifications | Not built | FCM token reg + trigger function |
| Email notifications | Not built | Nodemailer/SMTP transport + triggers |
| Barcode scanning | Photo capture only | Barcode parsing library + product lookup |
| Android app | Not built | Play Store setup, signing workflow |
| Social discovery | Sharing only | Friend graph, user search, public profiles |
| Password-protected shares | Not built | Password field + bcrypt check |
| iOS App Store | Pending approval | Update URL in Download.tsx when approved |
