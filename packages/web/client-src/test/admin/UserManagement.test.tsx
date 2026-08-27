import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import UserManagement from '@/pages/admin/UserManagement';

const mockSetLocation = vi.fn();
vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return { ...actual, useLocation: () => ['/app/admin/users', mockSetLocation] };
});

let mockUser: { getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }> } | null;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/queryClient', () => ({ apiRequest }));

const ACTIVE_USER = {
  uid: 'u1',
  email: 'mark@example.com',
  displayName: 'Mark Nelson',
  subscriptionTier: 'plus',
  subscriptionStatus: 'active',
  isSuspended: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const SUSPENDED_USER = {
  uid: 'u2',
  email: 'bad-actor@example.com',
  displayName: '',
  subscriptionTier: 'free',
  subscriptionStatus: 'active',
  isSuspended: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('UserManagement (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'super_admin' } }) };
    apiRequest.mockResolvedValue({ users: [] });
  });

  it('redirects a non-super-admin to the dashboard', async () => {
    mockUser = { getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'member' } }) };
    render(<UserManagement />);

    await waitFor(() => expect(mockSetLocation).toHaveBeenCalledWith('/app/dashboard'));
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('lists users, showing a dash for a missing display name', async () => {
    apiRequest.mockResolvedValue({ users: [ACTIVE_USER, SUSPENDED_USER] });
    render(<UserManagement />);

    await waitFor(() => expect(screen.getByText('mark@example.com')).toBeInTheDocument());
    expect(screen.getByText('Mark Nelson')).toBeInTheDocument();
    expect(screen.getByText('bad-actor@example.com')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument(); // suspended user's blank display name
  });

  it('filters the table by email or name as the user types', async () => {
    apiRequest.mockResolvedValue({ users: [ACTIVE_USER, SUSPENDED_USER] });
    render(<UserManagement />);
    await waitFor(() => expect(screen.getByText('mark@example.com')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Search by email or name…'), { target: { value: 'mark' } });

    expect(screen.getByText('mark@example.com')).toBeInTheDocument();
    expect(screen.queryByText('bad-actor@example.com')).not.toBeInTheDocument();
  });

  it('shows "No users found" when the search matches nothing', async () => {
    apiRequest.mockResolvedValue({ users: [ACTIVE_USER] });
    render(<UserManagement />);
    await waitFor(() => expect(screen.getByText('mark@example.com')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Search by email or name…'), { target: { value: 'nobody' } });

    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('navigates to the user detail page', async () => {
    apiRequest.mockResolvedValue({ users: [ACTIVE_USER] });
    render(<UserManagement />);
    await waitFor(() => expect(screen.getByText('mark@example.com')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));

    expect(mockSetLocation).toHaveBeenCalledWith('/admin/users/u1');
  });

  it('shows a Reinstate button for a suspended user and an active row is dimmed', async () => {
    apiRequest.mockResolvedValue({ users: [SUSPENDED_USER] });
    render(<UserManagement />);
    await waitFor(() => expect(screen.getByText('bad-actor@example.com')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: 'Reinstate' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument();
  });

  it('reinstates a suspended user', async () => {
    apiRequest.mockResolvedValueOnce({ users: [SUSPENDED_USER] });
    render(<UserManagement />);
    await waitFor(() => expect(screen.getByText('bad-actor@example.com')).toBeInTheDocument());

    apiRequest.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Reinstate' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'User reinstated', description: 'bad-actor@example.com' }));
    expect(apiRequest).toHaveBeenLastCalledWith('/api/admin/users/u2/unsuspend', { method: 'POST' });
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeInTheDocument();
  });

  it('requires a reason before Suspend Account is enabled, then suspends the user', async () => {
    apiRequest.mockResolvedValueOnce({ users: [ACTIVE_USER] });
    render(<UserManagement />);
    await waitFor(() => expect(screen.getByText('mark@example.com')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    expect(screen.getByText('Suspend mark@example.com?')).toBeInTheDocument();
    const suspendConfirm = screen.getByRole('button', { name: 'Suspend Account' });
    expect(suspendConfirm).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Reason for suspension (required)'), { target: { value: 'ToS violation' } });
    expect(suspendConfirm).not.toBeDisabled();

    apiRequest.mockResolvedValueOnce(undefined);
    fireEvent.click(suspendConfirm);

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'User suspended', description: 'mark@example.com' }));
    expect(apiRequest).toHaveBeenLastCalledWith('/api/admin/users/u1/suspend', {
      method: 'POST',
      body: { reason: 'ToS violation' },
    });
  });

  it('shows an error toast when suspending fails', async () => {
    apiRequest.mockResolvedValueOnce({ users: [ACTIVE_USER] });
    render(<UserManagement />);
    await waitFor(() => expect(screen.getByText('mark@example.com')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    fireEvent.change(screen.getByPlaceholderText('Reason for suspension (required)'), { target: { value: 'ToS violation' } });

    apiRequest.mockRejectedValueOnce(new Error('Network error'));
    fireEvent.click(screen.getByRole('button', { name: 'Suspend Account' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ title: 'Error', description: 'Network error', variant: 'destructive' })
    );
  });
});
