import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useIsAdmin } from '@/hooks/use-is-admin';

let mockUser: { getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }> } | null = null;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe('useIsAdmin', () => {
  it('returns false immediately when signed out', async () => {
    mockUser = null;
    const { result } = renderHook(() => useIsAdmin());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('returns true for a user holding the super_admin claim', async () => {
    mockUser = { getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'super_admin' } }) };
    const { result } = renderHook(() => useIsAdmin());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('returns false for a signed-in non-admin user', async () => {
    mockUser = { getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'member' } }) };
    const { result } = renderHook(() => useIsAdmin());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('starts as null while the token check is in flight', () => {
    mockUser = { getIdTokenResult: vi.fn().mockReturnValue(new Promise(() => {})) };
    const { result } = renderHook(() => useIsAdmin());

    expect(result.current).toBeNull();
  });
});
