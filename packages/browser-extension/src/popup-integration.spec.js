import { beforeEach, describe, expect, it, vi } from 'vitest';

function buildPopupDom() {
  document.body.innerHTML = `
    <div id="loading-screen" class="screen hidden"></div>
    <div id="login-screen" class="screen hidden"></div>
    <div id="product-screen" class="screen hidden">
      <div class="product-info"></div>
      <h1 id="product-title"></h1>
      <div id="product-price"></div>
      <div id="product-store"></div>
      <div id="store-badge"></div>
      <img id="product-image" class="hidden" />
      <div id="store-indicator"></div>
      <div id="debug-info" class="hidden"></div>
      <select id="wishlist-select"></select>
      <textarea id="note-input"></textarea>
      <button id="add-button"></button>
      <button id="compare-prices-button"></button>
      <button id="edit-product-button"></button>
      <div id="edit-product-form" class="hidden"></div>
      <input id="edit-title" />
      <input id="edit-price" />
      <input id="edit-store" />
      <input id="edit-image-url" />
      <div id="manual-entry-instructions" class="hidden"></div>
      <div id="partial-data-notice" class="hidden"></div>
      <button id="update-product-button"></button>
      <button id="force-detection-button"></button>
    </div>
    <div id="success-screen" class="screen hidden"><h2>Success</h2></div>
    <div id="error-screen" class="screen hidden">
      <div id="error-message"></div>
    </div>

    <div id="user-info" class="hidden"></div>
    <span id="username"></span>
    <button id="logout-button" class="hidden"></button>
    <button id="login-button"></button>
    <button id="retry-button"></button>
    <button id="close-button"></button>
    <button id="cancel-button"></button>
    <button id="done-button"></button>
    <button id="view-wishlist-button"></button>
  `;
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

async function initializePopup(modulePath) {
  await import(modulePath);

  if (document.readyState === 'loading') {
    document.dispatchEvent(new Event('DOMContentLoaded'));
  }

  await flush();
  await flush();
}

async function waitForCondition(predicate, timeoutMs = 6000, intervalMs = 20) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Condition not met within timeout');
}

describe('popup integration smoke', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    buildPopupDom();
    window.close = vi.fn();
  });

  it('routes login button to web login when unauthenticated', async () => {
    const createSpy = vi.fn();
    const sendMessageSpy = vi.fn((payload, cb) => {
      if (payload?.action === 'getActiveTab') {
        if (typeof cb === 'function') cb({ success: true, tab: { id: 7, url: 'https://example.com/product/1' } });
        return;
      }
      if (payload?.action === 'isAuthenticated') {
        if (typeof cb === 'function') cb({ success: true, authenticated: false });
        return;
      }
      if (typeof cb === 'function') cb({ success: false });
    });

    global.chrome = {
      runtime: {
        getURL: vi.fn(() => 'chrome-extension://abc123/'),
        sendMessage: sendMessageSpy
      },
      tabs: {
        create: createSpy,
        sendMessage: vi.fn()
      },
      scripting: {
        executeScript: vi.fn()
      },
      storage: {
        local: {
          get: vi.fn((_, cb) => cb({})),
          set: vi.fn()
        }
      }
    };
    window.chrome = global.chrome;

    await initializePopup('./popup.js?case=unauth');

    document.getElementById('login-button')?.click();
    await flush();

    expect(sendMessageSpy).toHaveBeenCalledWith({ action: 'getActiveTab' }, expect.any(Function));
    expect(sendMessageSpy).toHaveBeenCalledWith({ action: 'isAuthenticated' }, expect.any(Function));
    expect(createSpy).toHaveBeenCalledWith({ url: 'https://wishlist-wizard-dev.web.app/login' });
  });

  it('adds detected product to selected wishlist', async () => {
    const sendMessageSpy = vi.fn((tabId, payload) => {
      if (payload?.action === 'getProductInfo') {
        return Promise.resolve({
          success: true,
          extractionMethod: 'generic',
          productInfo: {
            title: 'Coffee Maker',
            price: '59.99',
            imageUrl: 'https://cdn.example.com/item.jpg',
            productUrl: 'https://store.example.com/item/coffee-maker',
            store: 'Example Store'
          }
        });
      }
      return Promise.resolve({ success: false });
    });

    const runtimeSendMessageSpy = vi.fn((payload, cb) => {
      if (payload?.action === 'getActiveTab') {
        if (typeof cb === 'function') cb({ success: true, tab: { id: 9, url: 'https://store.example.com/item/coffee-maker' } });
        return;
      }
      if (payload?.action === 'isAuthenticated') {
        if (typeof cb === 'function') cb({ success: true, authenticated: true, userData: { id: 1, username: 'mark' } });
        return;
      }
      if (payload?.action === 'fetchWishlists') {
        if (typeof cb === 'function') cb({ success: true, wishlists: [{ id: 1, name: 'Main Wishlist' }] });
        return;
      }
      if (payload?.action === 'addItemToWishlist') {
        if (typeof cb === 'function') cb({ success: true, data: { id: 42 } });
        return;
      }
      if (typeof cb === 'function') cb({ success: false });
    });

    global.chrome = {
      runtime: {
        getURL: vi.fn(() => 'chrome-extension://abc123/'),
        sendMessage: runtimeSendMessageSpy
      },
      tabs: {
        create: vi.fn(),
        sendMessage: sendMessageSpy
      },
      scripting: {
        executeScript: vi.fn().mockResolvedValue(undefined)
      },
      storage: {
        local: {
          get: vi.fn((_, cb) => cb({ addedItems: [] })),
          set: vi.fn()
        }
      }
    };
    window.chrome = global.chrome;

    await initializePopup('./popup.js?case=addflow');

    const select = document.getElementById('wishlist-select');
    await waitForCondition(() => select && select.options.length > 0);
    select.value = '1';
    select.dispatchEvent(new Event('change'));

    document.getElementById('add-button')?.click();
    await flush();

    await waitForCondition(() => runtimeSendMessageSpy.mock.calls.some(([payload]) => payload?.action === 'addItemToWishlist'));
    const postCall = runtimeSendMessageSpy.mock.calls.find(([payload]) => payload?.action === 'addItemToWishlist');
    expect(postCall).toBeTruthy();

    const [message] = postCall;
    const payload = message.itemData;
    expect(payload.wishlistId).toBe('1');
    expect(payload.title).toBe('Coffee Maker');
    expect(payload.store).toBe('Example Store');
  }, 15000);
});
