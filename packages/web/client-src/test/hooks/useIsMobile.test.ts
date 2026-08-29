import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';

function stubMatchMedia(matches: boolean) {
  const listeners: Array<() => void> = [];
  const mql = {
    matches,
    addEventListener: vi.fn((_event: string, cb: () => void) => listeners.push(cb)),
    removeEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return { mql, fireChange: () => listeners.forEach((cb) => cb()) };
}

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: originalInnerWidth });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: originalInnerWidth });
  });

  it('returns true when the viewport is narrower than the mobile breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
    stubMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('returns false when the viewport is at or above the mobile breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    stubMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('updates when the media query change listener fires', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    const { fireChange } = stubMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });
    act(() => {
      fireChange();
    });

    expect(result.current).toBe(true);
  });

  it('removes the media query listener on unmount', () => {
    const { mql } = stubMatchMedia(false);
    const { unmount } = renderHook(() => useIsMobile());

    unmount();

    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
