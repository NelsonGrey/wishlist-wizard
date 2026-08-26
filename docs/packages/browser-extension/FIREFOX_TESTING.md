# Firefox Extension Testing Guide

## Prerequisites

**Firebase Configuration:** The extension uses Firebase Authentication REST API. The Firebase API key is already configured in `src/background.js`. No additional setup needed unless you want to use a different Firebase project.

## Quick Start

1. **Build Firefox extension:**
   ```bash
   cd packages/browser-extension
   npm run build:firefox
   ```

2. **Load in Firefox:**
   - Open Firefox
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click **Load Temporary Add-on**
   - Select: `packages/browser-extension/dist/firefox/manifest.json`

3. **Test login:**
   - Click extension icon
   - Enter email (as username) and password
   - Extension authenticates via Firebase Auth REST API

4. **Reload after code changes:**
   - Click the **Reload** button next to the extension in `about:debugging`
   - Or remove and re-add the temporary add-on

## Common Issues

### Module Export Error
**Error:** `The requested module doesn't provide an export named: 'default'`

**Cause:** Vite `?url` import syntax not compatible with Firefox runtime

**Fixed in:** Latest build (removed `?url` imports from popup-bootstrap.js)

### chrome.action is undefined
**Error:** `can't access property "setIcon", chrome.action is undefined`

**Cause:** Firefox MV2 uses `chrome.browserAction` instead of `chrome.action`

**Fixed in:** Latest build (added fallback to browserAction)

### Login Not Working

**Authentication uses Firebase Auth REST API** (no SDK required).

**Check:**
1. Open Firefox DevTools (F12) on the popup
2. Check Console for authentication errors
3. Verify Firebase API key in `src/background.js`
4. Ensure user exists in Firebase Auth Console
5. Check that email/password auth is enabled in Firebase

**Common login errors:**
- `EMAIL_NOT_FOUND`: No user with that email
- `INVALID_PASSWORD`: Incorrect password
- `INVALID_EMAIL`: Email format is incorrect
- `USER_DISABLED`: Account has been disabled
- `TOO_MANY_ATTEMPTS`: Too many failed login attempts

**No CORS or SDK issues:** Uses Firebase REST API which has proper CORS headers and requires no bundled libraries.

### Web Accessible Resources Warning
**Fixed in:** Latest build (changed `web_accessible` to `web_accessible_resources`)

## Testing Checklist

- [ ] Extension loads without manifest errors
- [ ] Popup opens without JavaScript errors
- [ ] Login form appears
- [ ] Can authenticate with valid credentials
- [ ] Product detection works on shopping sites
- [ ] Can add items to wishlist
- [ ] Price comparison tab works
- [ ] Coupon finder tab works

## Development Workflow

1. Make code changes in `src/`
2. Run `npm run build:firefox`
3. Click **Reload** in `about:debugging`
4. Test changes
5. Check Browser Console for errors

## Firefox-Specific Features

### Manifest V2 (vs Chrome's MV3)
- Uses `browser_action` instead of `action`
- Uses `background.scripts` instead of `background.service_worker`
- Uses `web_accessible_resources` as array instead of object
- Different permission model

### API Compatibility
The extension uses a compatibility layer:
- `chrome.action` → Falls back to `chrome.browserAction`
- All Chrome APIs work in Firefox via WebExtensions API

## Debugging

### Background Script Console
1. Go to `about:debugging#/runtime/this-firefox`
2. Find **Wishlist Wizard**
3. Click **Inspect** next to "Manifest URL"
4. Console shows background script logs

### Popup Console
1. Open extension popup
2. Right-click in popup
3. Select **Inspect Element**
4. Console tab shows popup errors

### Content Script Console
1. Navigate to a product page
2. Open DevTools (F12)
3. Console shows content script logs

## Production Build (for AMO submission)

```bash
cd packages/browser-extension
npm run build:firefox
cd dist/firefox
zip -r ../../wishlist-wizard-firefox.zip .
```

Upload `wishlist-wizard-firefox.zip` to Mozilla Add-ons Developer Hub.

## Resources

- [MDN WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [AMO Developer Hub](https://addons.mozilla.org/developers/)
