# API Fix Summary: Chrome Extension Wishlist API Endpoints

## Problem
The browser extension was trying to call HTTP endpoints (`/api/extension/wishlists`, etc.) that don't exist on the backend. The backend has these functions implemented as Firebase Cloud Functions using `onCall` (callable format), not HTTP endpoints. When the extension made HTTP requests, the backend returned HTML error pages instead of JSON, causing parse errors like:

```
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## Root Cause Analysis
1. **Cloud Functions are Callable, Not HTTP**: The backend in `packages/functions/src/api/extension.ts` exports functions using `onCall()`, which creates Firebase callable functions (require SDK Client method `.httpsCallable()`).
2. **Extension uses HTTP Fetch**: The extension's `background.js` tries to call these functions via standard HTTP `fetch()` requests, which doesn't work.
3. **No HTTP Wrappers Existed**: There were no HTTP endpoints exposed to map the extension's HTTP requests to the cloud functions.

## Solution Implemented

### 1. **Created HTTP Wrapper Endpoints** (`packages/functions/src/api/http-extension.ts`)
- New file that exports HTTP endpoints using `onRequest()` 
- Maps extension HTTP requests to the underlying cloud function logic
- Handles Firebase ID token verification from Authorization headers
- Endpoints created:
  - `GET /api/extension/wishlists` → `extensionGetWishlists`
  - `POST /api/extension/wishlists` → `extensionCreateWishlist`
  - `POST /api/extension/items` → `extensionAddItem`
  - `GET /api/extension/recent-items` → `extensionGetRecentItems`
  - `GET /api/extension/wishlists/:wishlistId/items` → `extensionGetWishlistItems`
  - `DELETE /api/extension/items/:itemId` → `extensionDeleteItem`
  - `POST /api/extension/wishlists/:wishlistId/share` → `extensionShareWishlist`

### 2. **Enhanced API Error Logging** (`packages/browser-extension/src/background.js`)
Modified `makeAuthenticatedRequest()` function to:
- Log all API requests with method and URL
- Log response status codes
- Handle HTML error responses gracefully (try JSON parse, fallback to text)
- Detect HTML responses and provide helpful error messages
- Log first 500 chars of error responses for debugging

```javascript
// Added detailed logging like:
console.log(`[API Request] ${method} ${url}`);
console.log(`[API Response] Status: ${status}`);
if (textContent.includes('<!DOCTYPE') || textContent.includes('<html')) {
  throw new Error(`Server error (${status}): Backend returned HTML error page. Check API endpoint: ${url}`);
}
```

### 3. **Exported New Endpoints** (`packages/functions/src/index.ts`)
- Added exports for the 7 new HTTP endpoints in the main Cloud Functions index

## Files Modified

1. **Created**: `/packages/functions/src/api/http-extension.ts` (450+ lines)
   - HTTP wrapper endpoints with token verification
   - Proper CORS headers
   - Error handling for non-JSON responses

2. **Modified**: `/packages/browser-extension/src/background.js`
   - Enhanced `makeAuthenticatedRequest()` with detailed logging
   - Better error handling for HTML responses
   - Added response status logging

3. **Modified**: `/packages/functions/src/index.ts`
   - Added exports for new HTTP endpoints

## Deployment Status

✅ **Cloud Functions**: Deployed with HTTP endpoints (exit code 0)
✅ **Browser Extension**: Rebuilt with improved error logging
✅ **TypeScript**: All code compiles without errors

## Testing Notes

The extension should now:

1. **Successfully fetch wishlists** - HTTP request to `/api/extension/wishlists` returns JSON array
2. **Successfully create wishlists** - POST to `/api/extension/wishlists` creates and returns new wishlist
3. **Successfully add items** - POST to `/api/extension/items` adds items to wishlists
4. **Better error messages** - If API still fails, console logs will show:
   - What URL was requested
   - Actual response status code
   - First 500 chars of response body (useful for debugging)
   - Indication if HTML error page was returned

## Next Steps for Testing

1. **Load the updated extension** in Chrome (from `dist/chrome/`)
2. **Open a product page** (BestBuy, etc.)
3. **Login** in the extension popup
4. **Product should be detected** and popup should transition to wishlist screen
5. **Check console** (Ctrl+Shift+J) for:
   - `[API Request]` logs showing requests are being made
   - `[API Success]` logs showing wishlists are being returned
   - OR error logs with detailed status and response info

## Technical Details

### HTTP Endpoint Structure
```
GET /api/extension/wishlists
  - Authorization: Bearer <idToken>
  - Returns: [{ id, name, description, isPublic, itemCount, createdAt, updatedAt }, ...]

POST /api/extension/wishlists
  - Authorization: Bearer <idToken>
  - Body: { name, description? }
  - Returns: { id, name, description, isPublic, itemCount, createdAt, updatedAt }

POST /api/extension/items
  - Authorization: Bearer <idToken>
  - Body: { wishlistId, title, productUrl?, imageUrl?, price?, store?, addedAt? }
  - Returns: { id, title, productUrl, imageUrl, price, store, addedAt, updatedAt, ... }

DELETE /api/extension/items/:itemId
  - Authorization: Bearer <idToken>
  - Returns: { success: true, message: "Item deleted" }
```

### CORS Headers
All endpoints return CORS headers allowing requests from any origin (suitable for extension):
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET|POST|DELETE|OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Performance Impact

- **Minimal**: HTTP wrappers delegate to same Firestore logic as original callable functions
- **No additional database queries**
- **Same authentication flow** (Firebase ID token verification)

## Rollback Plan

If issues occur with HTTP endpoints:
1. Revert `packages/functions/src/index.ts` (remove HTTP exports)
2. Deploy functions again with `firebase deploy --only functions`
3. Extension will fail with clear error messages indicating missing endpoints (better than HTML parse error)
