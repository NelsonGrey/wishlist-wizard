import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMarketingOffline } from '@/hooks/useMarketingOffline';

vi.mock('@shared/firebase-utils', () => ({
  FeatureFlags: { MARKETING_OFFLINE: 'marketing_offline' },
}));

const initFirebaseMock = vi.fn();
vi.mock('@/lib/firebase', () => ({
  initFirebase: (...args: unknown[]) => initFirebaseMock(...args),
}));

describe('useMarketingOffline', () => {
  it('starts true (safe default) before the remote config fetch resolves', () => {
    initFirebaseMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useMarketingOffline());
    expect(result.current).toBe(true);
  });

  it('resolves to false once remote config reports marketing_offline: false', async () => {
    initFirebaseMock.mockResolvedValue({
      remoteConfig: { isFeatureEnabled: vi.fn(() => false) },
    });
    const { result } = renderHook(() => useMarketingOffline());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('is independent of app_offline — checks its own flag key', async () => {
    const isFeatureEnabled = vi.fn((flag: string) => flag === 'app_offline');
    initFirebaseMock.mockResolvedValue({ remoteConfig: { isFeatureEnabled } });
    const { result } = renderHook(() => useMarketingOffline());
    await waitFor(() => expect(isFeatureEnabled).toHaveBeenCalledWith('marketing_offline'));
    expect(result.current).toBe(false);
  });
});
