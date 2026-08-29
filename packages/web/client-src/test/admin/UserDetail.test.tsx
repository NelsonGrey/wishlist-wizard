import React, { createContext, useContext } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import UserDetail from '@/pages/admin/UserDetail';

// The real app always renders this page inside AppRouter.tsx's
// <TooltipProvider>; reproduce that here rather than in isolation, since
// the page's back button uses <Tooltip>.
function render(ui: React.ReactElement) {
  return rtlRender(<TooltipProvider>{ui}</TooltipProvider>);
}

const mockSetLocation = vi.fn();
vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return { ...actual, useLocation: () => ['/admin/users/u1', mockSetLocation], useParams: () => ({ uid: 'u1' }) };
});

let mockUser: { getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }> } | null;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/queryClient', () => ({ apiRequest }));

// Radix's real Select needs pointer-event support jsdom doesn't fully
// provide; mock it to a plain button-per-option, matching the pattern
// already established in CreateWishlistDialog.test.tsx.
type SelectContextValue = { onValueChange?: (value: string) => void };
const SelectContext = createContext<SelectContextValue>({});
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (value: string) => void }) => (
    <SelectContext.Provider value={{ onValueChange }}>
      <div>{children}</div>
    </SelectContext.Provider>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder || 'select'}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
    const { onValueChange } = useContext(SelectContext);
    return (
      <button type="button" onClick={() => onValueChange?.(value)}>
        {children}
      </button>
    );
  },
}));

const BASE_USER = {
  uid: 'u1',
  email: 'mark@example.com',
  displayName: 'Mark Nelson',
  isSuspended: false,
  subscriptionTier: 'plus',
  subscriptionStatus: 'active',
  usage: { wishlistsOwned: 2, itemsTracked: 10 },
  limits: { maxWishlists: 5 },
};

describe('UserDetail (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'super_admin' } }) };
    apiRequest.mockResolvedValue(BASE_USER);
  });

  it('redirects a non-super-admin to the dashboard', async () => {
    mockUser = { getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'member' } }) };
    render(<UserDetail />);

    await waitFor(() => expect(mockSetLocation).toHaveBeenCalledWith('/app/dashboard'));
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('fetches the user by uid from the route params', async () => {
    render(<UserDetail />);
    await waitFor(() => expect(screen.getByText('mark@example.com')).toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith('/api/admin/users/u1');
  });

  it('shows an error toast and redirects to the user list when the fetch fails', async () => {
    apiRequest.mockRejectedValue(new Error('Not found'));
    render(<UserDetail />);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ title: 'Error', description: 'Not found', variant: 'destructive' })
    );
    expect(mockSetLocation).toHaveBeenCalledWith('/admin/users');
  });

  it('renders profile, subscription, and usage info', async () => {
    render(<UserDetail />);
    await waitFor(() => expect(screen.getByText('mark@example.com')).toBeInTheDocument());

    expect(screen.getByText('Mark Nelson')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument(); // account status badge
    expect(screen.getByText('plus')).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
    expect(screen.getByText('10 / ∞')).toBeInTheDocument(); // no maxPriceTrackedItems limit given
  });

  it('shows the renewal date and truncated Stripe customer id when present', async () => {
    apiRequest.mockResolvedValue({
      ...BASE_USER,
      currentPeriodEnd: { _seconds: 1798761600 },
      stripeCustomerId: 'cus_ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    });
    render(<UserDetail />);
    await waitFor(() => expect(screen.getByText('mark@example.com')).toBeInTheDocument());

    expect(screen.getByText('Next Renewal')).toBeInTheDocument();
    expect(screen.getByText('Stripe Customer').nextElementSibling).toHaveTextContent('cus_ABCDEFGHIJKLMNOP…'); // sliced to 20 chars
  });

  it('navigates back to the user list', async () => {
    render(<UserDetail />);
    await waitFor(() => expect(screen.getByText('mark@example.com')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Back to user list' }));

    expect(mockSetLocation).toHaveBeenCalledWith('/admin/users');
  });

  it('suspends the account and flips the action button to Reinstate', async () => {
    render(<UserDetail />);
    await waitFor(() => expect(screen.getByText('mark@example.com')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Suspend Account' }));
    const confirmButton = screen.getByRole('button', { name: 'Suspend' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Reason for suspension…'), { target: { value: 'Fraud' } });
    expect(confirmButton).not.toBeDisabled();

    apiRequest.mockResolvedValueOnce(undefined);
    fireEvent.click(confirmButton);

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'User suspended' }));
    expect(apiRequest).toHaveBeenLastCalledWith('/api/admin/users/u1/suspend', {
      method: 'POST',
      body: { reason: 'Fraud' },
    });
    expect(screen.getByRole('button', { name: 'Reinstate Account' })).toBeInTheDocument();
  });

  it('reinstates a suspended account directly, with no confirmation dialog', async () => {
    apiRequest.mockResolvedValue({ ...BASE_USER, isSuspended: true });
    render(<UserDetail />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reinstate Account' })).toBeInTheDocument());

    apiRequest.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Reinstate Account' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'User reinstated' }));
    expect(apiRequest).toHaveBeenLastCalledWith('/api/admin/users/u1/unsuspend', {
      method: 'POST',
      body: { reason: 'Admin reinstatement' },
    });
  });

  it('applies a tier override once a new tier and reason are both provided', async () => {
    render(<UserDetail />);
    await waitFor(() => expect(screen.getByText('mark@example.com')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Override Tier' }));
    const applyButton = screen.getByRole('button', { name: 'Apply Change' });
    expect(applyButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'business' }));
    expect(applyButton).toBeDisabled(); // still missing a reason

    fireEvent.change(screen.getByPlaceholderText('Reason for tier change…'), { target: { value: 'Comped by support' } });
    expect(applyButton).not.toBeDisabled();

    apiRequest.mockResolvedValueOnce(undefined);
    fireEvent.click(applyButton);

    await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'Subscription tier updated' }));
    expect(apiRequest).toHaveBeenLastCalledWith('/api/admin/users/u1/subscription', {
      method: 'POST',
      body: { newTier: 'business', reason: 'Comped by support' },
    });
  });

  it('shows an error toast when the tier change request fails', async () => {
    render(<UserDetail />);
    await waitFor(() => expect(screen.getByText('mark@example.com')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Override Tier' }));
    fireEvent.click(screen.getByRole('button', { name: 'enterprise' }));
    fireEvent.change(screen.getByPlaceholderText('Reason for tier change…'), { target: { value: 'VIP' } });

    apiRequest.mockRejectedValueOnce(new Error('Billing service down'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Change' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ title: 'Error', description: 'Billing service down', variant: 'destructive' })
    );
  });
});
