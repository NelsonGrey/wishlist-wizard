import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(async () => {
  await import('./quick-add.js');
});

describe('QuickAdd', () => {
  let quickAdd;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="wishkeeper-tooltip" style="opacity:0"></div>
      <div id="wishkeeper-quick-add-button"></div>
    `;

    const QuickAddCtor = window.quickAdd.constructor;
    quickAdd = new QuickAddCtor();
    quickAdd.baseUrl = 'https://api.example.com';

    vi.restoreAllMocks();
  });

  it('loads default wishlist from API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'wl-1', name: 'Main Wishlist' }]
    });

    const ok = await quickAdd.loadDefaultWishlist();

    expect(ok).toBe(true);
    expect(quickAdd.defaultWishlistId).toBe('wl-1');
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/api/wishlists', {
      method: 'GET',
      credentials: 'include'
    });
  });

  it('short-circuits add when user is not logged in', async () => {
    quickAdd.isLoggedIn = false;

    const result = await quickAdd.quickAddToWishlist();

    expect(result).toBeUndefined();
    expect(document.getElementById('wishkeeper-tooltip')?.textContent).toBe('Please log in to add items to your wishlist');
  });

  it('posts item payload to API on successful quick add', async () => {
    quickAdd.isLoggedIn = true;
    quickAdd.defaultWishlistId = 'wl-1';
    quickAdd.currentProductInfo = {
      title: 'Coffee Maker',
      price: '$59.99',
      imageUrl: 'https://cdn.example.com/item.jpg',
      productUrl: 'https://store.example.com/item/coffee-maker',
      store: 'Example Store'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'item-123' })
    });

    const ok = await quickAdd.quickAddToWishlist();

    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        wishlistId: 'wl-1',
        title: 'Coffee Maker',
        price: '$59.99',
        imageUrl: 'https://cdn.example.com/item.jpg',
        productUrl: 'https://store.example.com/item/coffee-maker',
        store: 'Example Store',
        note: ''
      })
    });
  });
});
