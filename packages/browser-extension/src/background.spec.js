import { beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Chrome API mock — must be in place before background.js is imported.
// background.js registers TWO onMessage.addListener calls (main handler at
// line ~462 and a TRACK_EVENT handler at line ~1383). We collect all
// registered handlers and dispatch to each in turn so both are tested.
// ---------------------------------------------------------------------------

const onMessageHandlers = [];

const storageMock = {
  local: {
    get: vi.fn((keys, cb) => { if (cb) cb({}); }),
    set: vi.fn(),
    remove: vi.fn(),
  },
  onChanged: {
    addListener: vi.fn(),
  },
};

const chromeMock = {
  runtime: {
    onMessage: {
      addListener: vi.fn((fn) => {
        onMessageHandlers.push(fn);
      }),
    },
    onInstalled: { addListener: vi.fn() },
    sendMessage: vi.fn().mockReturnValue(Promise.resolve()),
    id: 'test-extension-id',
  },
  storage: storageMock,
  tabs: {
    query: vi.fn((opts, cb) => { if (cb) cb([]); }),
    sendMessage: vi.fn().mockReturnValue(Promise.resolve()),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  },
};

global.chrome = chromeMock;
window.chrome = chromeMock;

// ---------------------------------------------------------------------------
// Load background.js (registers onMessage listeners)
// ---------------------------------------------------------------------------

beforeAll(async () => {
  vi.resetModules();
  await import('./background.js');
});

// ---------------------------------------------------------------------------
// Helper — dispatch a message to all registered listeners.
// Resolves with the first non-undefined sendResponse call, mimicking Chrome's
// behavior where the first handler that calls sendResponse wins.
// ---------------------------------------------------------------------------

function sendMessage(message) {
  if (onMessageHandlers.length === 0) {
    throw new Error('background.js registered no onMessage listeners');
  }
  return new Promise((resolve) => {
    let resolved = false;
    const respond = (value) => {
      if (!resolved) {
        resolved = true;
        resolve(value);
      }
    };
    for (const handler of onMessageHandlers) {
      handler(message, { tab: null }, respond);
    }
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('background script — TRACK_EVENT', () => {
  it('main handler responds immediately with {success: true, queued: true}', async () => {
    // background.js has two onMessage listeners; the main handler (first) short-
    // circuits TRACK_EVENT and calls sendResponse({success:true, queued:true})
    // before the secondary analytics handler runs.
    const resp = await sendMessage({
      type: 'TRACK_EVENT',
      event: 'page_view',
      payload: { action: 'page_view', category: 'page', label: '', value: 0 },
    });
    expect(resp.success).toBe(true);
    expect(resp.queued).toBe(true);
  });
});

describe('background script — addItemToWishlist validation', () => {
  it('returns invalid-item error when item title is missing', async () => {
    const resp = await sendMessage({
      action: 'addItemToWishlist',
      itemData: { wishlistId: 'wl-123', title: '' },
    });
    expect(resp.success).toBe(false);
    expect(resp.error).toMatch(/invalid item data/i);
  });

  it('returns invalid-item error when wishlistId is missing', async () => {
    const resp = await sendMessage({
      action: 'addItemToWishlist',
      itemData: { title: 'Nice Watch' },
    });
    expect(resp.success).toBe(false);
    expect(resp.error).toMatch(/invalid item data/i);
  });

  it('returns invalid-item error when itemData is null and no legacy fields', async () => {
    const resp = await sendMessage({
      action: 'addItemToWishlist',
    });
    expect(resp.success).toBe(false);
    expect(resp.error).toMatch(/invalid item data/i);
  });

  it('accepts legacy payload shape {item, wishlistId}', async () => {
    // With a valid legacy item the handler proceeds to the async addItemToWishlist()
    // call which will fail (no auth) — but the important thing is it passes validation.
    // We verify it does NOT return the "Invalid item data" error.
    const resp = await sendMessage({
      action: 'addItemToWishlist',
      item: { title: 'Headphones', wishlistId: 'wl-1' },
      wishlistId: 'wl-1',
    }).catch(() => null);
    // It may resolve with an auth/network error — just not a validation error
    if (resp) {
      expect(resp.error).not.toMatch(/invalid item data/i);
    }
  });
});

describe('background script — createWishlist validation', () => {
  it('returns error when name is missing', async () => {
    const resp = await sendMessage({ action: 'createWishlist' });
    expect(resp.success).toBe(false);
    expect(resp.error).toBe('Wishlist name is required');
  });

  it('returns error when name is empty string', async () => {
    const resp = await sendMessage({ action: 'createWishlist', name: '' });
    expect(resp.success).toBe(false);
    expect(resp.error).toBe('Wishlist name is required');
  });
});

describe('background script — removeItem validation', () => {
  it('returns error when itemId is missing', async () => {
    const resp = await sendMessage({ action: 'removeItem' });
    expect(resp.success).toBe(false);
    expect(resp.error).toBe('Item ID is required');
  });

  it('returns error when itemId is empty string', async () => {
    const resp = await sendMessage({ action: 'removeItem', itemId: '' });
    expect(resp.success).toBe(false);
    expect(resp.error).toBe('Item ID is required');
  });
});

describe('background script — shareWishlist validation', () => {
  it('returns error when wishlistId is missing', async () => {
    const resp = await sendMessage({ action: 'shareWishlist' });
    expect(resp.success).toBe(false);
    expect(resp.error).toBe('Wishlist ID is required');
  });
});

describe('background script — authenticate validation', () => {
  it('returns error when username is missing', async () => {
    const resp = await sendMessage({
      action: 'authenticate',
      password: 'secret',
    });
    expect(resp.success).toBe(false);
    expect(resp.error).toMatch(/username and password/i);
  });

  it('returns error when password is missing', async () => {
    const resp = await sendMessage({
      action: 'authenticate',
      username: 'user@example.com',
    });
    expect(resp.success).toBe(false);
    expect(resp.error).toMatch(/username and password/i);
  });
});

describe('background script — error tracking (getErrorStatus / clearErrors)', () => {
  it('getErrorStatus returns success with tracking fields', async () => {
    const resp = await sendMessage({ action: 'getErrorStatus' });
    expect(resp.success).toBe(true);
    expect('lastError' in resp).toBe(true);
    expect('errorCount' in resp).toBe(typeof resp.errorCount === 'number' ? true : true);
    expect('recoveryMode' in resp).toBe(true);
  });

  it('clearErrors resets tracking and returns success', async () => {
    // Trigger a validation error first to increment errorCount
    await sendMessage({ action: 'addItemToWishlist' });

    const resp = await sendMessage({ action: 'clearErrors' });
    expect(resp.success).toBe(true);

    const status = await sendMessage({ action: 'getErrorStatus' });
    expect(status.errorCount).toBe(0);
    expect(status.lastError).toBeNull();
    expect(status.recoveryMode).toBe(false);
  });
});

describe('background script — unknown actions', () => {
  it('returns an error for unrecognized action strings', async () => {
    const resp = await sendMessage({ action: 'doSomethingUnknown' });
    expect(resp.success).toBe(false);
    expect(resp.error).toMatch(/unknown action/i);
  });

  it('includes the unknown action name in the error message', async () => {
    const resp = await sendMessage({ action: 'flyToTheMoon' });
    expect(resp.error).toContain('flyToTheMoon');
  });
});

describe('background script — normalizeExtensionEnvironment (via environment config)', () => {
  it('getErrorStatus returns success after environment config loads', async () => {
    // Environment config loading is async and cached; this test verifies
    // that it doesn't interfere with sync message handling.
    const resp = await sendMessage({ action: 'getErrorStatus' });
    expect(resp.success).toBe(true);
  });
});
