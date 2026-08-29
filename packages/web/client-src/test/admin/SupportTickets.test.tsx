import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SupportTickets from '@/pages/admin/SupportTickets';

const mockSetLocation = vi.fn();
vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return { ...actual, useLocation: () => ['/app/admin/support-tickets', mockSetLocation] };
});

let mockUser: { getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }> } | null;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/queryClient', () => ({ apiRequest }));

const SAMPLE_TICKET = {
  id: 't1',
  userId: 'user-1',
  userEmail: 'mark@example.com',
  category: 'billing',
  subject: 'Cannot upgrade subscription',
  priority: 'high',
  status: 'open',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  context: { subscriptionTier: 'free' },
};

describe('SupportTickets (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'super_admin' } }) };
    apiRequest.mockResolvedValue({ tickets: [] });
  });

  it('shows a loading state until the super-admin check and initial fetch both resolve', () => {
    mockUser = { getIdTokenResult: vi.fn().mockReturnValue(new Promise(() => {})) };
    render(<SupportTickets />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('redirects a non-super-admin to the dashboard', async () => {
    mockUser = { getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'member' } }) };
    render(<SupportTickets />);

    await waitFor(() => expect(mockSetLocation).toHaveBeenCalledWith('/app/dashboard'));
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('lists tickets with their tier, category, and status badge', async () => {
    apiRequest.mockResolvedValue({ tickets: [SAMPLE_TICKET] });
    render(<SupportTickets />);

    await waitFor(() => expect(screen.getByText('Cannot upgrade subscription')).toBeInTheDocument());
    expect(screen.getByText('mark@example.com')).toBeInTheDocument();
    expect(screen.getByText('free')).toBeInTheDocument();
    expect(screen.getByText('billing')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('shows a dash for a ticket with no subscription tier context', async () => {
    apiRequest.mockResolvedValue({ tickets: [{ ...SAMPLE_TICKET, context: undefined }] });
    render(<SupportTickets />);

    await waitFor(() => expect(screen.getByText('Cannot upgrade subscription')).toBeInTheDocument());
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows an empty state when there are no tickets', async () => {
    render(<SupportTickets />);
    await waitFor(() => expect(screen.getByText('No tickets')).toBeInTheDocument());
  });

  it('opens the reply dialog with the selected ticket', async () => {
    apiRequest.mockResolvedValue({ tickets: [SAMPLE_TICKET] });
    render(<SupportTickets />);
    await waitFor(() => expect(screen.getByText('Cannot upgrade subscription')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Respond' }));

    expect(screen.getByText('Respond to: Cannot upgrade subscription')).toBeInTheDocument();
    expect(screen.getByText('From: mark@example.com')).toBeInTheDocument();
  });

  it('disables Send Reply until a message is typed', async () => {
    apiRequest.mockResolvedValue({ tickets: [SAMPLE_TICKET] });
    render(<SupportTickets />);
    await waitFor(() => expect(screen.getByText('Cannot upgrade subscription')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Respond' }));

    const sendButton = screen.getByRole('button', { name: 'Send Reply' });
    expect(sendButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Your reply…'), { target: { value: 'We are on it!' } });
    expect(sendButton).not.toBeDisabled();
  });

  it('sends the reply, updates the ticket status locally, and closes the dialog', async () => {
    apiRequest.mockResolvedValueOnce({ tickets: [SAMPLE_TICKET] });
    render(<SupportTickets />);
    await waitFor(() => expect(screen.getByText('Cannot upgrade subscription')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Respond' }));
    fireEvent.change(screen.getByPlaceholderText('Your reply…'), { target: { value: 'We are on it!' } });

    apiRequest.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Send Reply' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'Reply sent' }));
    expect(apiRequest).toHaveBeenLastCalledWith('/api/admin/support-tickets/t1/respond', {
      method: 'POST',
      body: { message: 'We are on it!', newStatus: undefined },
    });
    // Dialog closes -- its content unmounts.
    expect(screen.queryByText('From: mark@example.com')).not.toBeInTheDocument();
  });

  it('shows an error toast and keeps the dialog open when the reply fails', async () => {
    apiRequest.mockResolvedValueOnce({ tickets: [SAMPLE_TICKET] });
    render(<SupportTickets />);
    await waitFor(() => expect(screen.getByText('Cannot upgrade subscription')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Respond' }));
    fireEvent.change(screen.getByPlaceholderText('Your reply…'), { target: { value: 'We are on it!' } });

    apiRequest.mockRejectedValueOnce(new Error('Server unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Send Reply' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ title: 'Error', description: 'Server unavailable', variant: 'destructive' })
    );
    expect(screen.getByText('From: mark@example.com')).toBeInTheDocument();
  });
});
