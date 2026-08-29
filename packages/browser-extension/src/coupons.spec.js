import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadCouponsModule() {
  vi.resetModules();
  await import('./coupons.js');
  return window.couponFinder;
}

describe('coupons.js: CouponFinder', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.couponFinder;
    // coupons.js references the bare `chrome` global (not window.chrome) --
    // an actually-absent chrome throws ReferenceError rather than just
    // being undefined, which resolveBaseUrl's try/catch-adjacent code
    // doesn't guard against. Default to an empty stub (no storage API,
    // matching the "chrome.storage unavailable" case) so every test starts
    // from a defined, safe baseline; individual tests override as needed.
    global.chrome = {};
    window.chrome = global.chrome;
    delete global.fetch;
    delete window.fetch;
  });

  describe('init', () => {
    it('accepts product info with a store and stores title/store', async () => {
      const finder = await loadCouponsModule();
      const result = finder.init({ store: 'Target', title: 'Desk Lamp' });

      expect(result).toBe(true);
      expect(finder.store).toBe('Target');
      expect(finder.productTitle).toBe('Desk Lamp');
    });

    it('rejects product info without a store', async () => {
      const finder = await loadCouponsModule();
      expect(finder.init({ title: 'Desk Lamp' })).toBe(false);
    });

    it('defaults productTitle to an empty string when title is omitted', async () => {
      const finder = await loadCouponsModule();
      finder.init({ store: 'Target' });
      expect(finder.productTitle).toBe('');
    });
  });

  describe('getCouponLinks', () => {
    it('returns [] when no store has been set', async () => {
      const finder = await loadCouponsModule();
      expect(finder.getCouponLinks()).toEqual([]);
    });

    it('builds a link for every coupon source, normalized per-source', async () => {
      const finder = await loadCouponsModule();
      finder.init({ store: 'Best Buy' });

      const links = finder.getCouponLinks();

      expect(links).toHaveLength(4);
      expect(links.find((l) => l.name === 'RetailMeNot').url).toBe('https://www.retailmenot.com/view/bestbuy');
      expect(links.find((l) => l.name === 'Honey').url).toBe('https://www.joinhoney.com/shop/best-buy');
    });
  });

  describe('resolveBaseUrl', () => {
    it('falls back to the development URL when chrome.storage is unavailable', async () => {
      const finder = await loadCouponsModule();
      const url = await finder.resolveBaseUrl();
      expect(url).toBe('https://wishlist-wizard-dev.web.app');
    });

    it('resolves the environment-specific URL from chrome.storage.local', async () => {
      const finder = await loadCouponsModule();
      global.chrome = {
        storage: {
          local: {
            get: (keys, cb) => cb({ wwEnvironment: 'production' }),
          },
        },
      };
      window.chrome = global.chrome;

      const url = await finder.resolveBaseUrl();
      expect(url).toBe('https://wishlist-wizard-prod.web.app');
    });

    it('normalizes short-form environment aliases (dev/stage/prod/localhost)', async () => {
      const finder = await loadCouponsModule();
      global.chrome = {
        storage: { local: { get: (keys, cb) => cb({ wwEnvironment: 'stage' }) } },
      };
      window.chrome = global.chrome;

      expect(await finder.resolveBaseUrl()).toBe('https://wishlist-wizard-staging.web.app');
    });

    it('prefers an explicit base URL override when present', async () => {
      const finder = await loadCouponsModule();
      global.chrome = {
        storage: {
          local: {
            get: (keys, cb) => cb({ wwEnvironment: 'production', wwBaseUrlOverride: 'https://custom.example.com' }),
          },
        },
      };
      window.chrome = global.chrome;

      expect(await finder.resolveBaseUrl()).toBe('https://custom.example.com');
    });
  });

  describe('findCoupons', () => {
    it('returns [] and warns when no store has been set', async () => {
      const finder = await loadCouponsModule();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await finder.findCoupons();

      expect(result).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('No store specified'));
    });

    it('guards against a concurrent search already in progress', async () => {
      const finder = await loadCouponsModule();
      finder.init({ store: 'Target' });
      finder.isSearching = true;
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await finder.findCoupons();

      expect(result).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('already in progress'));
    });

    it('returns coupons from a successful response', async () => {
      const finder = await loadCouponsModule();
      finder.init({ store: 'Target', title: 'Desk Lamp' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ code: 'SAVE10' }],
      });
      window.fetch = global.fetch;

      const result = await finder.findCoupons();

      expect(result).toEqual([{ code: 'SAVE10' }]);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/extension/coupons'),
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      );
    });

    it('returns [] when the response is not ok', async () => {
      // As of this writing, /api/extension/coupons does not exist in the
      // backend router at all (unlike /api/extension/price-comparisons,
      // which is real) -- every real-world call takes exactly this path,
      // 404ing and falling back to an empty result. See findCoupons() in
      // coupons.js: any non-ok response is swallowed to `[]`, not surfaced
      // as an error to the caller.
      const finder = await loadCouponsModule();
      finder.init({ store: 'Target' });
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      window.fetch = global.fetch;

      const result = await finder.findCoupons();

      expect(result).toEqual([]);
    });

    it('returns [] and logs when fetch throws', async () => {
      const finder = await loadCouponsModule();
      finder.init({ store: 'Target' });
      global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
      window.fetch = global.fetch;
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await finder.findCoupons();

      expect(result).toEqual([]);
      expect(error).toHaveBeenCalled();
    });

    it('resets isSearching to false after completion, success or failure', async () => {
      const finder = await loadCouponsModule();
      finder.init({ store: 'Target' });
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
      window.fetch = global.fetch;

      await finder.findCoupons();

      expect(finder.isSearching).toBe(false);
    });
  });

  describe('applyCoupon', () => {
    it('returns a failure result when no code is provided', async () => {
      const finder = await loadCouponsModule();
      const result = await finder.applyCoupon('');
      expect(result).toEqual({ success: false, message: 'No coupon code provided' });
    });

    it('returns a failure result when there is no active tab', async () => {
      const finder = await loadCouponsModule();
      global.chrome = { tabs: { query: vi.fn().mockResolvedValue([]) } };
      window.chrome = global.chrome;

      const result = await finder.applyCoupon('SAVE10');

      expect(result).toEqual({ success: false, message: 'No active tab found' });
    });

    it('sends the code to the content script and reports success', async () => {
      const finder = await loadCouponsModule();
      const sendMessage = vi.fn().mockResolvedValue({ success: true });
      global.chrome = {
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 42 }]),
          sendMessage,
        },
      };
      window.chrome = global.chrome;

      const result = await finder.applyCoupon('SAVE10');

      expect(sendMessage).toHaveBeenCalledWith(42, { action: 'applyCoupon', code: 'SAVE10' });
      expect(result).toEqual({ success: true, message: 'Coupon applied successfully' });
    });

    it('surfaces the content script\'s failure message when application fails', async () => {
      const finder = await loadCouponsModule();
      global.chrome = {
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 42 }]),
          sendMessage: vi.fn().mockResolvedValue({ success: false, message: 'No coupon field found' }),
        },
      };
      window.chrome = global.chrome;

      const result = await finder.applyCoupon('SAVE10');

      expect(result).toEqual({ success: false, message: 'No coupon field found' });
    });

    it('falls back to a generic message when the content script throws', async () => {
      const finder = await loadCouponsModule();
      global.chrome = {
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 42 }]),
          sendMessage: vi.fn().mockRejectedValue(new Error('no receiver')),
        },
      };
      window.chrome = global.chrome;
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await finder.applyCoupon('SAVE10');

      expect(result.success).toBe(false);
      expect(result.message).toContain('copying the code');
    });
  });
});
