import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppOffline } from '@/hooks/useAppOffline';

vi.mock('@shared/firebase-utils', () => ({
  FeatureFlags: { APP_OFFLINE: 'app_offline' },
}));

const initFirebaseMock = vi.fn();
vi.mock('@/lib/firebase', () => ({
  initFirebase: (...args: unknown[]) => initFirebaseMock(...args),
}));

describe('useAppOffline', () => {
  it('starts true (safe default) before the remote config fetch resolves', () => {
    initFirebaseMock.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useAppOffline());
    expect(result.current).toBe(true);
  });

  it('resolves to false once remote config reports app_offline: false', async () => {
    initFirebaseMock.mockResolvedValue({
      remoteConfig: { isFeatureEnabled: vi.fn(() => false) },
    });
    const { result } = renderHook(() => useAppOffline());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('resolves to true when remote config reports app_offline: true', async () => {
    initFirebaseMock.mockResolvedValue({
      remoteConfig: { isFeatureEnabled: vi.fn(() => true) },
    });
    const { result } = renderHook(() => useAppOffline());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('stays true (fail closed) when remoteConfig is null, e.g. Firebase init failed', async () => {
    initFirebaseMock.mockResolvedValue({ remoteConfig: null });
    const { result } = renderHook(() => useAppOffline());
    // Give the effect's .then a tick to (not) fire.
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current).toBe(true);
  });
});
