import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AuditLog from '@/pages/admin/AuditLog';

const mockSetLocation = vi.fn();
vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return { ...actual, useLocation: () => ['/app/admin/audit-log', mockSetLocation] };
});

let mockUser: { getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }> } | null;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/queryClient', () => ({ apiRequest }));

describe('AuditLog (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'super_admin' } }) };
    apiRequest.mockResolvedValue({ entries: [] });
  });

  it('shows a loading state while the super-admin check is in flight', () => {
    mockUser = { getIdTokenResult: vi.fn().mockReturnValue(new Promise(() => {})) };
    render(<AuditLog />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('redirects a non-super-admin to the dashboard and never fetches the log', async () => {
    mockUser = { getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'member' } }) };
    render(<AuditLog />);

    await waitFor(() => expect(mockSetLocation).toHaveBeenCalledWith('/app/dashboard'));
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('redirects a signed-out user to the dashboard', async () => {
    mockUser = null;
    render(<AuditLog />);

    await waitFor(() => expect(mockSetLocation).toHaveBeenCalledWith('/app/dashboard'));
  });

  it('loads and renders audit entries for a super admin', async () => {
    apiRequest.mockResolvedValue({
      entries: [
        {
          id: 'e1',
          action: 'subscription.upgrade',
          actorUid: 'uid-123',
          actorRole: 'admin',
          resourceType: 'subscription',
          resourceId: 'sub-abcdefgh12345',
          reason: 'Manual comp upgrade',
          timestamp: { _seconds: 1735689600 },
        },
      ],
    });

    render(<AuditLog />);

    await waitFor(() => expect(screen.getByText('subscription.upgrade')).toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith('/api/admin/audit-log', {
      method: 'POST',
      body: { pageSize: 100, filter: {} },
    });
    expect(screen.getByText('Manual comp upgrade')).toBeInTheDocument();
    expect(screen.getByText('/sub-abcd')).toBeInTheDocument(); // resourceId truncated to 8 chars
  });

  it('shows an empty-state row when there are no entries', async () => {
    render(<AuditLog />);
    await waitFor(() => expect(screen.getByText('No audit entries found')).toBeInTheDocument());
  });

  it('shows a dash for a null timestamp and reason', async () => {
    apiRequest.mockResolvedValue({
      entries: [
        { id: 'e1', action: 'user.delete', actorUid: 'uid-1', actorRole: 'admin', resourceType: 'user', resourceId: 'user-99999999', reason: undefined, timestamp: null },
      ],
    });
    render(<AuditLog />);

    await waitFor(() => expect(screen.getByText('user.delete')).toBeInTheDocument());
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2); // timestamp AND reason both render '—'
  });

  it('re-fetches with the actor UID filter applied when Apply Filters is clicked', async () => {
    render(<AuditLog />);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText('Filter by actor UID…'), { target: { value: '  uid-42  ' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));
    expect(apiRequest).toHaveBeenLastCalledWith('/api/admin/audit-log', {
      method: 'POST',
      body: { pageSize: 100, filter: { actorUid: 'uid-42' } }, // trimmed
    });
  });

  it('disables the Apply Filters button and shows a loading label while fetching', async () => {
    let resolveFetch: (value: { entries: never[] }) => void;
    apiRequest.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));
    render(<AuditLog />);

    await waitFor(() => expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled());

    resolveFetch!({ entries: [] });
    await waitFor(() => expect(screen.getByRole('button', { name: /apply filters/i })).not.toBeDisabled());
  });
});
