// Wishlist Wizard Extension - Web App Auth Bridge
//
// Runs only on the Wishlist Wizard web app's own origin (see manifest.json).
// Relays the signed-in user's Firebase ID token from the page to the
// extension's background script, so the extension can reuse an existing web
// session instead of requiring a separate login. Falls back silently if the
// page isn't logged in — background.js keeps its own REST-based login as a
// fallback for that case.

const WW_AUTH_BRIDGE_EVENT = 'ww:auth-bridge-token';
const WW_REQUEST_TOKEN_EVENT = 'ww:request-auth-token';

function relayTokenToExtension(detail) {
  if (!detail || !detail.token) {
    return;
  }

  try {
    const maybePromise = chrome.runtime.sendMessage({
      type: 'WEB_AUTH_BRIDGE_TOKEN',
      token: detail.token,
      expiresAt: detail.expiresAt || null,
      userEmail: detail.userEmail || null
    });
    if (maybePromise && typeof maybePromise.catch === 'function') {
      maybePromise.catch(() => {
        // Background service worker may be asleep/restarting; non-fatal.
      });
    }
  } catch (error) {
    // Extension context can be invalidated (e.g. during an extension reload).
    // Never let that break the host page.
  }
}

window.addEventListener(WW_AUTH_BRIDGE_EVENT, (event) => {
  relayTokenToExtension(event.detail);
});

// Ask the page for its current auth state as soon as this script attaches —
// covers the case where the page authenticated before the listener above was
// registered (the page also broadcasts proactively on every token refresh).
window.dispatchEvent(new CustomEvent(WW_REQUEST_TOKEN_EVENT));
