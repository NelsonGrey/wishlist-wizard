import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// adsense.ts tracks script-load state (adSenseLoaded/adSenseLoading) in
// module-level `let` bindings, so each test that cares about a clean slate
// re-imports a fresh module instance via vi.resetModules().
async function loadAdsenseModule() {
  vi.resetModules();
  return import('@/lib/adsense');
}

describe('adsense.ts', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    // @ts-expect-error -- test cleanup
    delete window.gtag;
    // @ts-expect-error -- test cleanup
    delete window.adsbygoogle;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadAdSense', () => {
    it('creates and appends the AdSense script, resolving true on load', async () => {
      const mod = await loadAdsenseModule();

      const promise = mod.loadAdSense('ca-pub-123');
      const script = document.head.querySelector('script[src*="googlesyndication.com"]') as HTMLScriptElement;
      expect(script).toBeTruthy();
      expect(script.src).toContain('client=ca-pub-123');
      expect(script.async).toBe(true);
      expect(script.crossOrigin).toBe('anonymous');

      script.onload?.(new Event('load'));
      await expect(promise).resolves.toBe(true);
    });

    it('rejects when the script fails to load', async () => {
      const mod = await loadAdsenseModule();
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const promise = mod.loadAdSense('ca-pub-123');
      const script = document.head.querySelector('script[src*="googlesyndication.com"]') as HTMLScriptElement;
      script.onerror?.(new Event('error'));

      await expect(promise).rejects.toBe(false);
    });

    it('resolves immediately without appending a script when one already exists', async () => {
      const existing = document.createElement('script');
      existing.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-existing';
      document.head.appendChild(existing);
      const mod = await loadAdsenseModule();

      const result = await mod.loadAdSense('ca-pub-123');

      expect(result).toBe(true);
      expect(document.head.querySelectorAll('script[src*="googlesyndication.com"]')).toHaveLength(1);
    });

    it('resolves true immediately on a second call once already loaded', async () => {
      const mod = await loadAdsenseModule();
      const first = mod.loadAdSense('ca-pub-123');
      const script = document.head.querySelector('script[src*="googlesyndication.com"]') as HTMLScriptElement;
      script.onload?.(new Event('load'));
      await first;

      // No new script should be appended for a second call.
      const result = await mod.loadAdSense('ca-pub-123');

      expect(result).toBe(true);
      expect(document.head.querySelectorAll('script[src*="googlesyndication.com"]')).toHaveLength(1);
    });

    it('a concurrent second call waits for the in-flight load to finish rather than appending another script', async () => {
      const mod = await loadAdsenseModule();

      const first = mod.loadAdSense('ca-pub-123');
      const second = mod.loadAdSense('ca-pub-123');
      expect(document.head.querySelectorAll('script[src*="googlesyndication.com"]')).toHaveLength(1);

      const script = document.head.querySelector('script[src*="googlesyndication.com"]') as HTMLScriptElement;
      script.onload?.(new Event('load'));

      await expect(first).resolves.toBe(true);
      await expect(second).resolves.toBe(true);
    });
  });

  describe('initializeAdSense', () => {
    it('does nothing when disabled', async () => {
      const mod = await loadAdsenseModule();
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});

      mod.initializeAdSense({ enabled: false });

      expect(log).toHaveBeenCalledWith('[AdSense] Disabled by configuration');
      expect(document.head.querySelector('script[src*="googlesyndication.com"]')).toBeNull();
    });

    it('sets default consent to denied when personalizedAds/gdprConsent are false, then loads the script', async () => {
      const mod = await loadAdsenseModule();
      const gtag = vi.fn();
      window.gtag = gtag;

      mod.initializeAdSense({ enabled: true, publisherId: 'ca-pub-777' });

      expect(gtag).toHaveBeenCalledWith('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
      });
      expect(document.head.querySelector('script[src*="client=ca-pub-777"]')).toBeTruthy();
    });

    it('grants consent when privacy settings allow it', async () => {
      const mod = await loadAdsenseModule();
      const gtag = vi.fn();
      window.gtag = gtag;

      mod.initializeAdSense({
        enabled: true,
        privacy: { gdprConsent: true, ccpaConsent: true, personalizedAds: true },
      });

      expect(gtag).toHaveBeenCalledWith('consent', 'default', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted',
      });
    });

    it('does not call gtag when it is not defined', async () => {
      const mod = await loadAdsenseModule();
      expect(() => mod.initializeAdSense({ enabled: true })).not.toThrow();
    });
  });

  describe('useAdSense', () => {
    it('does not attempt to load AdSense when disabled', async () => {
      const mod = await loadAdsenseModule();
      const { result } = renderHook(() => mod.useAdSense({ enabled: false }));

      expect(result.current.isLoading).toBe(false);
      expect(document.head.querySelector('script[src*="googlesyndication.com"]')).toBeNull();
    });

    it('loads AdSense on mount and reflects the loaded state', async () => {
      const mod = await loadAdsenseModule();
      const { result } = renderHook(() => mod.useAdSense({ enabled: true, publisherId: 'ca-pub-1' }));

      await waitFor(() => expect(result.current.isLoading).toBe(true));
      const script = document.head.querySelector('script[src*="googlesyndication.com"]') as HTMLScriptElement;
      act(() => {
        script.onload?.(new Event('load'));
      });

      await waitFor(() => expect(result.current.isLoaded).toBe(true));
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('surfaces an error state when loading fails', async () => {
      const mod = await loadAdsenseModule();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => mod.useAdSense({ enabled: true, publisherId: 'ca-pub-1' }));

      const script = document.head.querySelector('script[src*="googlesyndication.com"]') as HTMLScriptElement;
      act(() => {
        script.onerror?.(new Event('error'));
      });

      await waitFor(() => expect(result.current.error).toBeTruthy());
      expect(result.current.isLoading).toBe(false);
    });

    it('updatePlacements merges into the existing placements config', async () => {
      const mod = await loadAdsenseModule();
      const { result } = renderHook(() => mod.useAdSense({ enabled: false }));

      act(() => {
        result.current.updatePlacements({ modal: true });
      });

      expect(result.current.config.placements.modal).toBe(true);
      expect(result.current.config.placements.header).toBe(true); // untouched fields survive the merge
    });

    it('updatePrivacySettings updates config, and calls gtag consent update only once loaded', async () => {
      const mod = await loadAdsenseModule();
      const gtag = vi.fn();
      window.gtag = gtag;
      const { result } = renderHook(() => mod.useAdSense({ enabled: false }));

      act(() => {
        result.current.updatePrivacySettings({ personalizedAds: true });
      });

      expect(result.current.config.privacy.personalizedAds).toBe(true);
      // Not loaded (enabled: false, hook never ran loadAdSense) -- consent
      // update is gated on isLoaded, so gtag must not have been called.
      expect(gtag).not.toHaveBeenCalled();
    });
  });

  describe('pushAd', () => {
    it('does nothing when adsbygoogle is not defined', async () => {
      const mod = await loadAdsenseModule();
      expect(() => mod.pushAd()).not.toThrow();
    });

    it('does nothing when AdSense has not finished loading, even if adsbygoogle exists', async () => {
      const mod = await loadAdsenseModule();
      const push = vi.fn();
      window.adsbygoogle = { push } as unknown as unknown[];

      mod.pushAd();

      expect(push).not.toHaveBeenCalled();
    });

    it('pushes an empty object to the queue once loaded', async () => {
      const mod = await loadAdsenseModule();
      const first = mod.loadAdSense('ca-pub-1');
      const script = document.head.querySelector('script[src*="googlesyndication.com"]') as HTMLScriptElement;
      script.onload?.(new Event('load'));
      await first;

      const push = vi.fn();
      window.adsbygoogle = { push } as unknown as unknown[];
      mod.pushAd();

      expect(push).toHaveBeenCalledWith({});
    });
  });

  describe('refreshAds', () => {
    it('clears and re-pushes every .adsbygoogle element once loaded', async () => {
      const mod = await loadAdsenseModule();
      const first = mod.loadAdSense('ca-pub-1');
      const script = document.head.querySelector('script[src*="googlesyndication.com"]') as HTMLScriptElement;
      script.onload?.(new Event('load'));
      await first;

      document.body.innerHTML = '<div class="adsbygoogle">old ad</div><div class="adsbygoogle">old ad 2</div>';
      const push = vi.fn();
      window.adsbygoogle = { push } as unknown as unknown[];

      mod.refreshAds();

      expect(document.querySelectorAll('.adsbygoogle')[0].innerHTML).toBe('');
      expect(push).toHaveBeenCalledTimes(2);
    });

    it('does nothing when AdSense has not loaded', async () => {
      const mod = await loadAdsenseModule();
      document.body.innerHTML = '<div class="adsbygoogle">old ad</div>';
      const push = vi.fn();
      window.adsbygoogle = { push } as unknown as unknown[];

      mod.refreshAds();

      expect(push).not.toHaveBeenCalled();
    });
  });

  describe('detectAdBlocker', () => {
    it('resolves a boolean and cleans up its probe element', async () => {
      const mod = await loadAdsenseModule();

      const result = await mod.detectAdBlocker();

      expect(typeof result).toBe('boolean');
      expect(document.querySelector('.adsbox')).toBeNull();
    });
  });
});
