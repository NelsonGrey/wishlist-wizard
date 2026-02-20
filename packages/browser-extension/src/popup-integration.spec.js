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

describe('popup integration smoke', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    buildPopupDom();
    window.close = vi.fn();
  });

  it('routes login button to web login when unauthenticated', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    global.fetch = fetchMock;

    const createSpy = vi.fn();
    const querySpy = vi.fn().mockResolvedValue([{ id: 7, url: 'https://example.com/product/1' }]);

    global.chrome = {
      runtime: {
        getURL: vi.fn(() => 'chrome-extension://abc123/'),
        sendMessage: vi.fn()
      },
      tabs: {
        query: querySpy,
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

    await import('./popup.js?case=unauth');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flush();

    document.getElementById('login-button')?.click();
    await flush();

    expect(querySpy).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(fetchMock).toHaveBeenCalledWith('https://wishlist-wizard.web.app/api/auth/me', {
      method: 'GET',
      credentials: 'include'
    });
    expect(createSpy).toHaveBeenCalledWith({ url: 'https://wishlist-wizard.web.app/login' });
  });

  it('adds detected product to selected wishlist', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith('/api/auth/me')) {
        return { ok: true, json: async () => ({ id: 1, username: 'mark' }) };
      }
      if (url.endsWith('/api/wishlists')) {
        return { ok: true, json: async () => [{ id: 1, name: 'Main Wishlist' }] };
      }
      if (url.endsWith('/api/collaborative-wishlists')) {
        return { ok: true, json: async () => [] };
      }
      if (url.endsWith('/api/extension/add-item')) {
        return { ok: true, json: async () => ({ id: 42 }) };
      }
      return { ok: false, status: 404, json: async () => ({ error: 'not found' }) };
    });
    global.fetch = fetchMock;

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

    global.chrome = {
      runtime: {
        getURL: vi.fn(() => 'chrome-extension://abc123/'),
        sendMessage: vi.fn()
      },
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 9, url: 'https://store.example.com/item/coffee-maker' }]),
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

    await import('./popup.js?case=addflow');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flush();
    await flush();

    const select = document.getElementById('wishlist-select');
    select.value = '1';

    document.getElementById('add-button')?.click();
    await flush();

    const postCall = fetchMock.mock.calls.find(([url]) => url.endsWith('/api/extension/add-item'));
    expect(postCall).toBeTruthy();

    const [, request] = postCall;
    const payload = JSON.parse(request.body);
    expect(payload.wishlistId).toBe(1);
    expect(payload.title).toBe('Coffee Maker');
    expect(payload.store).toBe('Example Store');

    expect(document.getElementById('success-screen')?.classList.contains('hidden')).toBe(false);
  });
});
