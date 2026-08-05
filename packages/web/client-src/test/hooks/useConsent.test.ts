import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConsent } from '@/hooks/useConsent';

// ---------------------------------------------------------------------------
// Mock dynamic import of analytics so initGA never actually fires in tests
// ---------------------------------------------------------------------------
vi.mock('@/lib/analytics', () => ({
  initGA: vi.fn(),
}));

const STORAGE_KEY = 'ww_consent';

describe('useConsent', () => {
  beforeEach(() => {
    localStorage.clear();
    // Ensure gtag is absent unless a test explicitly sets it
    delete (window as unknown as Record<string, unknown>).gtag;
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('initial state is undecided with analytics and marketing false', () => {
    const { result } = renderHook(() => useConsent());
    expect(result.current.consent.decided).toBe(false);
    expect(result.current.consent.analytics).toBe(false);
    expect(result.current.consent.marketing).toBe(false);
  });

  it('reads initial state from localStorage when a valid value is stored', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ decided: true, analytics: true, marketing: false })
    );
    const { result } = renderHook(() => useConsent());
    expect(result.current.consent.decided).toBe(true);
    expect(result.current.consent.analytics).toBe(true);
    expect(result.current.consent.marketing).toBe(false);
  });

  it('falls back to defaults when localStorage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-valid-json}');
    const { result } = renderHook(() => useConsent());
    expect(result.current.consent.decided).toBe(false);
    expect(result.current.consent.analytics).toBe(false);
    expect(result.current.consent.marketing).toBe(false);
  });

  it('falls back to defaults when localStorage key is absent', () => {
    const { result } = renderHook(() => useConsent());
    expect(result.current.consent.decided).toBe(false);
  });

  // ── acceptAll ─────────────────────────────────────────────────────────────

  it('acceptAll sets decided=true and both flags to true', () => {
    const { result } = renderHook(() => useConsent());
    act(() => result.current.acceptAll());
    expect(result.current.consent).toEqual({
      decided: true,
      analytics: true,
      marketing: true,
    });
  });

  it('acceptAll persists decision to localStorage', () => {
    const { result } = renderHook(() => useConsent());
    act(() => result.current.acceptAll());
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.decided).toBe(true);
    expect(stored.analytics).toBe(true);
    expect(stored.marketing).toBe(true);
  });

  // ── declineAll ────────────────────────────────────────────────────────────

  it('declineAll sets decided=true and both flags to false', () => {
    const { result } = renderHook(() => useConsent());
    act(() => result.current.declineAll());
    expect(result.current.consent).toEqual({
      decided: true,
      analytics: false,
      marketing: false,
    });
  });

  it('declineAll persists decision to localStorage', () => {
    const { result } = renderHook(() => useConsent());
    act(() => result.current.declineAll());
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.decided).toBe(true);
    expect(stored.analytics).toBe(false);
    expect(stored.marketing).toBe(false);
  });

  // ── acceptSelected ────────────────────────────────────────────────────────

  it('acceptSelected({analytics: true, marketing: false}) persists correctly', () => {
    const { result } = renderHook(() => useConsent());
    act(() =>
      result.current.acceptSelected({ analytics: true, marketing: false })
    );
    expect(result.current.consent).toEqual({
      decided: true,
      analytics: true,
      marketing: false,
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.decided).toBe(true);
    expect(stored.analytics).toBe(true);
    expect(stored.marketing).toBe(false);
  });

  it('acceptSelected({analytics: false, marketing: true}) persists correctly', () => {
    const { result } = renderHook(() => useConsent());
    act(() =>
      result.current.acceptSelected({ analytics: false, marketing: true })
    );
    expect(result.current.consent.analytics).toBe(false);
    expect(result.current.consent.marketing).toBe(true);
  });

  // ── gtag integration ──────────────────────────────────────────────────────

  it('calls window.gtag consent update when accepting all', () => {
    const gtagMock = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = gtagMock;

    const { result } = renderHook(() => useConsent());
    act(() => result.current.acceptAll());

    expect(gtagMock).toHaveBeenCalledWith('consent', 'update', expect.objectContaining({
      analytics_storage: 'granted',
      ad_storage: 'granted',
    }));
  });

  it('calls window.gtag consent update with denied when declining all', () => {
    const gtagMock = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = gtagMock;

    const { result } = renderHook(() => useConsent());
    act(() => result.current.declineAll());

    expect(gtagMock).toHaveBeenCalledWith('consent', 'update', expect.objectContaining({
      analytics_storage: 'denied',
      ad_storage: 'denied',
    }));
  });

  it('does not throw when window.gtag is absent', () => {
    delete (window as unknown as Record<string, unknown>).gtag;
    const { result } = renderHook(() => useConsent());
    expect(() => act(() => result.current.acceptAll())).not.toThrow();
  });

  // ── Analytics lazy-load ───────────────────────────────────────────────────

  it('triggers the analytics lazy-import path when analytics is granted', async () => {
    const gtagMock = vi.fn();
    (window as unknown as Record<string, unknown>).gtag = gtagMock;

    const { result } = renderHook(() => useConsent());

    // acceptAll sets analytics:true; with gtag present the hook calls
    // import('../lib/analytics').then(({ initGA }) => initGA()).
    // We verify that branch executes without throwing (initGA is mocked).
    await act(async () => {
      result.current.acceptAll();
      // Allow dynamic import micro-tasks to flush
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(result.current.consent.analytics).toBe(true);
  });
});
