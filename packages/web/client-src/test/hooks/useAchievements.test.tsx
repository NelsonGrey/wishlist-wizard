import React, { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAchievements } from '@/hooks/use-achievements';

let mockUser: { uid: string } | null = { uid: 'user-1' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/queryClient', () => ({ apiRequest }));

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useAchievements', () => {
  it('is disabled (does not fetch) when there is no authenticated user', async () => {
    mockUser = null;
    const { result } = renderHook(() => useAchievements(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('fetches /api/achievements for a signed-in user', async () => {
    mockUser = { uid: 'user-1' };
    apiRequest.mockResolvedValue({
      achievements: { firstWishlist: { earned: true, tier: 1, count: 0 } },
      computedAt: '2026-08-27T00:00:00.000Z',
    });
    const { result } = renderHook(() => useAchievements(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith('/api/achievements');
    expect(result.current.data?.achievements.firstWishlist.earned).toBe(true);
  });

  it('surfaces an error when the request rejects', async () => {
    mockUser = { uid: 'user-1' };
    apiRequest.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useAchievements(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
