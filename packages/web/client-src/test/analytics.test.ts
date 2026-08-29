import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// analytics.ts reads import.meta.env.VITE_FIREBASE_PROJECT_ID into a
// module-level constant (IS_PROD_PROJECT) evaluated once at import time, so
// each test that cares about that gate stubs the env var and re-imports via
// vi.resetModules() rather than mutating the already-evaluated constant.
async function loadAnalytics() {
  vi.resetModules();
  return import('@/lib/analytics');
}

describe('analytics.ts', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('trackPageView', () => {
    it('pushes a page_view event onto window.dataLayer', async () => {
      window.dataLayer = [];
      document.title = 'Wishlist Wizard - Home';
      const { trackPageView } = await loadAnalytics();

      trackPageView('/wishlists');

      expect(window.dataLayer).toEqual([
        { event: 'page_view', page_path: '/wishlists', page_title: 'Wishlist Wizard - Home' },
      ]);
    });

    it('initializes dataLayer when it does not already exist', async () => {
      // @ts-expect-error -- simulating GTM not having run yet
      delete window.dataLayer;
      const { trackPageView } = await loadAnalytics();

      trackPageView('/settings');

      expect(Array.isArray(window.dataLayer)).toBe(true);
      expect(window.dataLayer).toHaveLength(1);
    });

    it('appends to an existing dataLayer rather than replacing it', async () => {
      window.dataLayer = [{ event: 'gtm.js' }];
      const { trackPageView } = await loadAnalytics();

      trackPageView('/dashboard');

      expect(window.dataLayer).toHaveLength(2);
      expect(window.dataLayer[0]).toEqual({ event: 'gtm.js' });
    });
  });

  describe('trackEvent', () => {
    it('calls window.gtag with the event and its category/label/value', async () => {
      const gtag = vi.fn();
      window.gtag = gtag;
      const { trackEvent } = await loadAnalytics();

      trackEvent('click', 'wishlist', 'add-item', 3);

      expect(gtag).toHaveBeenCalledWith('event', 'click', {
        event_category: 'wishlist',
        event_label: 'add-item',
        value: 3,
      });
    });

    it('does not throw when window.gtag is not defined', async () => {
      // @ts-expect-error -- simulating GTM not having loaded gtag yet
      delete window.gtag;
      const { trackEvent } = await loadAnalytics();

      expect(() => trackEvent('click')).not.toThrow();
    });

    it('does not attempt backend tracking outside the production project', async () => {
      vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'wishlist-wizard-dev');
      window.gtag = vi.fn();
      vi.doMock('@/lib/queryClient', () => ({ apiRequest: vi.fn() }));
      const { trackEvent } = await loadAnalytics();
      const { apiRequest } = await import('@/lib/queryClient');

      trackEvent('click');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(apiRequest).not.toHaveBeenCalled();
      vi.doUnmock('@/lib/queryClient');
    });

    it('posts to /api/analytics/track when running in the production project', async () => {
      vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'wishlist-wizard-prod');
      window.gtag = vi.fn();
      const apiRequest = vi.fn().mockResolvedValue(undefined);
      vi.doMock('@/lib/queryClient', () => ({ apiRequest }));
      const { trackEvent } = await loadAnalytics();

      trackEvent('purchase', 'checkout', 'gold-tier', 9.99);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(apiRequest).toHaveBeenCalledWith('/api/analytics/track', {
        method: 'POST',
        body: { action: 'purchase', category: 'checkout', label: 'gold-tier', value: 9.99 },
      });
      vi.doUnmock('@/lib/queryClient');
    });

    it('swallows backend tracking failures without throwing', async () => {
      vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'wishlist-wizard-prod');
      window.gtag = vi.fn();
      const apiRequest = vi.fn().mockRejectedValue(new Error('network down'));
      vi.doMock('@/lib/queryClient', () => ({ apiRequest }));
      const { trackEvent } = await loadAnalytics();

      expect(() => trackEvent('click')).not.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 0));
      vi.doUnmock('@/lib/queryClient');
    });
  });
});
