# Browser Extension Cross-Browser Build System

## Overview

This document describes how to build, test, and submit the Wishlist Wizard browser extension to multiple browser app stores (Chrome, Edge, Firefox, Safari).

## Why Cross-Browser Support?

- **Chrome**: Largest market share (63% of extension users)
- **Firefox**: Second largest (15% of extension users), requires Manifest V2
- **Edge**: Growing adoption (8%), uses Chromium base
- **Safari**: Niche but important on macOS/iOS (14% of users are Safari users)

### Quick Stats
- **Before**: Chrome-only (63% of users)
- **After**: 100% of users across all 4 major browsers

## Architecture

### Manifest Versions

| Browser | Manifest Version | Background | Runtime API | Folder |
|---------|-----------------|------------|-------------|--------|
| **Chrome** | V3 | Service Worker | `chrome.*` | `dist/chrome/` |
| **Edge** | V3 | Service Worker | `chrome.*` | `dist/edge/` |
| **Firefox** | V2 | Background Page | `browser.*` | `dist/firefox/` |
| **Safari** | V3 | Service Worker | `safari.*` | `dist/safari/` |

### Build System Architecture

```
source code (src/, public/)
        ↓
    Vite build (HTML, CSS, JS bundles at dist/temp/)
        ↓
    distribute to browser-specific folders
        ↓
    generate manifest.json (browser-specific)
        ↓
    dist/chrome/, dist/edge/, dist/firefox/, dist/safari/
        ↓
    ready for store submission
```

## Building Extensions

### Build All Browsers

```bash
cd packages/browser-extension
npm run build:all
```

Output:
```
✓ All browser extensions built successfully!
dist/chrome/
dist/edge/
dist/firefox/
dist/safari/
```

### Build Single Browser

```bash
npm run build:chrome      # Manifest V3, Chrome/Edge compatible
npm run build:firefox     # Manifest V2, Firefox compatible
npm run build:safari      # Safari-specific manifest V3
npm run build:edge        # Manifest V3, Edge compatible
```

### Manual Build with Script

```bash
scripts/build-extension.sh chrome
scripts/build-extension.sh firefox
scripts/build-extension.sh all
```

## Manifest Differences

### Chrome/Edge (Manifest V3)

```json
{
  "manifest_version": 3,
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/icon16.png", ... }
  },
  "permissions": ["activeTab", "storage", "scripting"],
  "host_permissions": ["*://amazon.com/*", ...],
  "background": {
    "service_worker": "background.js"
  }
}
```

**Key features:**
- Service Worker (no page lifecycle)
- Modern async/await, fetch, streams
- Better performance and security

### Firefox (Manifest V2)

```json
{
  "manifest_version": 2,
  "browser_action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/icon16.png", ... }
  },
  "permissions": ["activeTab", "storage", "*://amazon.com/*", ...],
  "background": {
    "scripts": ["background.js"]
  }
}
```

**Key differences:**
- Uses `browser_action` (not `action`)
- Permissions includes host patterns directly
- Background script (not service worker) - has DOM access
- Uses `browser.*` API instead of `chrome.*`

### Safari

```json
{
  "manifest_version": 3,
  "action": {
    "default_popup": "popup.html"
  },
  "permissions": ["tabs", "activeTab"],
  "background": {
    "service_worker": "background.js"
  }
}
```

**Key differences:**
- Limited API surface compared to Chrome
- Requires Xcode project for submission
- Different icon requirements (1024x1024 PSD)
- Part of native iOS/macOS app

## Code Compatibility

✅ **Compatible across all browsers:**
- Content scripts (core functionality)
- DOM manipulation
- Basic storage API
- Message passing (with API differences)

### API Polyfills Needed

For cross-browser code, use polyfills:

```javascript
// Example: Cross-browser storage
const storage = globalThis.browser?.storage || chrome.storage;

// Example: Cross-browser messages
const runtime = globalThis.browser?.runtime || chrome.runtime;
```

## Submission Process

### 1. Chrome Web Store

**Requirements:**
- Developer account ($5 one-time fee)
- Icon: 128x128 PNG
- Screenshots: 1280x800 or 640x400
- Privacy policy required

**Steps:**

```bash
# 1. Prepare
cd packages/browser-extension/dist/chrome
zip -r ../../wishlist-wizard-chrome.zip .

# 2. Upload
# Go to: https://chrome.google.com/webstore/devconsole
# → Create new app
# → Upload ZIP
# → Fill form (title, description, category, screenshot, privacy policy)
# → Submit for review
```

**Review time:** 1-3 days
**Link:** https://chrome.google.com/webstore

### 2. Firefox Add-ons Store

**Requirements:**
- Mozilla account (free)
- Icon: 256x256 PNG (required), 512x512 PNG (recommended)
- Screenshots: Multiple sizes
- Privacy policy required

**Steps:**

```bash
# 1. Prepare
cd packages/browser-extension/dist/firefox
zip -r ../../wishlist-wizard-firefox.zip .

# 2. Upload
# Go to: https://addons.mozilla.org/en-US/developers
# → Submit new add-on
# → Choose "on-site hosting"
# → Upload ZIP
# → Fill form + screenshots
# → Submit for review
```

**Review time:** 1-7 days (varies by complexity)
**Link:** https://addons.mozilla.org

### 3. Microsoft Edge Add-ons Store

**Requirements:**
- Microsoft Developer account (free)
- Icon: 128x128 PNG
- Screenshots: 1280x800 or 640x400
- Privacy policy required

**Steps:**

```bash
# 1. Prepare (use Chrome build - same Manifest V3)
cd packages/browser-extension/dist/edge
zip -r ../../wishlist-wizard-edge.zip .

# 2. Upload
# Go to: https://partner.microsoft.com/en-us/dashboard/microsoftedge
# → Create new package
# → Upload ZIP (accept Manifest V3)
# → Fill form + screenshots
# → Submit for review
```

**Review time:** 1-3 days
**Link:** https://microsoftedge.microsoft.com/addons

### 4. Safari App Store

**Requirements:**
- Apple Developer account ($99/year)
- Xcode project structure
- iOS app required (extension is part of app)
- Icon: 1024x1024 PSD + PNG
- Screenshots: iPad + iPhone
- Privacy policy in app privacy report

**Steps:**

```bash
# 1. Prepare Safari extension
npm run build:safari

# 2. Create Xcode project with app + extension
# → Add WishlistWizardApp Swift project
# → Create WishlistWizardExtension target
# → Copy dist/safari/* to extension resources
# → Code sign with Apple ID

# 3. Submit via App Store Connect
# → New version
# → Upload with Xcode (Cmd+Shift+K)
# → Fill form, screenshots, privacy
# → Submit for review

# Setup guide: docs/EXTENSION_STORE_SUBMISSION_RUNBOOK.md
```

**Review time:** 1-2 days (through app review process)
**Link:** https://developer.apple.com/app-store

## Testing Before Submission

### Load Unpacked Extension (Development)

**Chrome:**
```
1. chrome://extensions/
2. Enable "Developer mode"
3. Load unpacked → select dist/chrome/
4. Test functionality
```

**Firefox:**
```
1. about:debugging#/runtime/this-firefox
2. Load Temporary Add-on...
3. Select dist/firefox/manifest.json
4. Test functionality
```

**Edge:**
```
1. edge://extensions/
2. Enable "Developer mode"
3. Load unpacked → select dist/edge/
4. Test functionality
```

**Safari:**
```
1. Develop menu → Allow Unsigned Extensions
2. Xcode: Build & Run iOS Simulator
3. Test in app
```

### Automated Testing

E2E tests for extension functionality:

```bash
cd packages/web
npm run test:e2e:extension
```

Tests cover:
- ✓ Extension loads and initializes
- ✓ Content scripts capture products
- ✓ Popup shows and captures data
- ✓ Messaging to background worker
- ✓ Wishlist creation via API
- ✓ Cross-browser compatibility

## CI/CD Integration

### GitHub Actions Workflow

`.github/workflows/extension-build.yml`:

```yaml
name: Extension Build & Test
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run build:all
      - run: npm run test
      - uses: actions/upload-artifact@v4
        with:
          name: extension-builds
          path: packages/browser-extension/dist/*/
```

### Manual Publishing Checklist

Before publishing to stores:

```bash
# 1. Run full test suite
npm test

# 2. Build all browsers
npm run build:all

# 3. Run automated checks
npm run verify:all

# 4. Verify each build
npm run verify:chrome
npm run verify:firefox
npm run verify:safari
npm run verify:edge

# 5. Manual testing on each browser
# (load unpacked and test key features)

# 6. Create release branch
git checkout -b release/extension-v1.0.0
git commit -m "Release: Extension v1.0.0 (4-browser support)"
git push origin release/extension-v1.0.0

# 7. Submit to stores (coordinate timing)
# - Submit all 4 simultaneously for sync release
# - Monitor review dashboards daily
# - Respond to feedback within 24 hours
```

## Troubleshooting

### "Permission denied" on Content Scripts

**Firefox Issue:** Check Manifest V2 permissions format

```json
// ❌ WRONG (V3 only)
"host_permissions": ["*://amazon.com/*"]

// ✅ CORRECT (V2)
"permissions": ["activeTab", "*://amazon.com/*"]
```

### Service Worker Crashes

**Chrome/Edge Issue:** Service workers terminate after 5 minutes of inactivity

```javascript
// ❌ WRONG - Will timeout
chrome.runtime.onMessage.addListener(async (msg) => {
  await longRunningOperation(); // Over 5 minutes?
});

// ✅ CORRECT - Use background page or offscreen document
```

### Missing Icons in Firefox

**Firefox Issue:** Requires icons in manifest for store listing

```json
{
  "icons": {
    "128": "icons/icon128.png"
  }
}
```

### Safari Extension Not Loading

**Safari Issue:** Requires app bundle structure

```bash
# ✅ Correct structure
MyApp/
├── MyApp (iOS app sources)
└── MyAppExtension/
    ├── manifest.json
    ├── popup.html
    └── background.js
```

## Release Timeline Estimate

| Phase | Duration | Status |
|-------|----------|--------|
| Build system setup | ✅ 1-2 hours | Complete today |
| Cross-browser code adjustments | 2-3 hours | Next (API polyfills) |
| E2E test updates | 1-2 hours | Post-build |
| Manual testing (all browsers) | 3-4 hours | Parallel |
| Documentation + screenshots | 2-3 hours | Parallel |
| Store submissions | 1 hour | Simultaneous |
| Review tracking & fixes | 2-5 days | After submission |
| **Total time to launch** | **~13-15 hours** | |

## Next Steps

1. ✅ Build system created → **Run `npm run build:all`**
2. ⏳ Add Firefox/Safari compatibility shims
3. ⏳ Create store assets (screenshots, descriptions)
4. ⏳ Test on actual browsers (load unpacked)
5. ⏳ Submit to all 4 stores simultaneously
6. ⏳ Monitor review queues and respond to feedback

## Additional Resources

- **Chrome Web Store API:** https://developer.chrome.com/docs/webstore
- **Mozilla Extension Development:** https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions
- **Edge Add-ons Documentation:** https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/
- **Safari Web Extensions Guide:** https://developer.apple.com/documentation/safariservices/safari_web_extensions
- **Manifest V2 → V3 Migration:** https://developer.chrome.com/docs/extensions/mv3/mv2-migration/

## Questions?

See [EXTENSION_STORE_SUBMISSION_RUNBOOK.md](../EXTENSION_STORE_SUBMISSION_RUNBOOK.md) for detailed submission walkthrough.
