import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Subscription from '@/pages/Subscription';

let mockUser: { uid: string } | null = { uid: 'user-1' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

let mockSubStatus: unknown;
let mockIsLoading = false;
vi.mock('@/hooks/use-subscription-status', () => ({
  useSubscriptionStatus: () => ({ data: mockSubStatus, isLoading: mockIsLoading }),
}));

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/queryClient', () => ({ apiRequest }));

const BASE_PRICING = { tagline: 'For power gifters', annualUsd: 99, monthlyUsd: 9.99, annualSavingPercent: 17, trialDays: 0 };
const BASE_LIMITS = {
  maxWishlists: 10,
  maxItemsPerWishlist: 50,
  maxPriceTrackedItems: 20,
  maxCollaboratorsPerWishlist: 1,
  adsEnabled: true,
  groupGiftingEnabled: false,
  creatorDashboardEnabled: false,
  analyticsEnabled: false,
  apiAccessEnabled: false,
  dataExportEnabled: false,
};
const BASE_STATUS = {
  tier: 'plus' as const,
  status: 'active',
  // priceTrackedItems, not itemsTracked (used here previously) -- that
  // was never the real field name billingStatus() returns, which made
  // the price-tracking usage row always show 0 regardless of real usage.
  usage: { wishlistsOwned: 2, priceTrackedItems: 5, totalItems: 10 },
  limits: BASE_LIMITS,
  pricing: BASE_PRICING,
  availableUpgrades: [],
};

describe('Subscription', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { uid: 'user-1' };
    mockIsLoading = false;
    mockSubStatus = BASE_STATUS;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('prompts sign-in when there is no authenticated user', () => {
    mockUser = null;
    render(<Subscription />);
    expect(screen.getByText('Please sign in to manage your subscription.')).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    mockIsLoading = true;
    render(<Subscription />);
    expect(screen.getByText('Loading subscription details…')).toBeInTheDocument();
  });

  it('shows an error state when the status failed to load', () => {
    mockSubStatus = undefined;
    render(<Subscription />);
    expect(screen.getByText('Failed to load subscription details.')).toBeInTheDocument();
  });

  it('renders the current tier, tagline, and billing status/renewal date', () => {
    mockSubStatus = { ...BASE_STATUS, currentPeriodEnd: { _seconds: 1798761600 } };
    render(<Subscription />);

    expect(screen.getByText('plus Plan')).toBeInTheDocument();
    expect(screen.getByText('For power gifters')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('Renewal Date')).toBeInTheDocument();
  });

  it('hides the billing status block entirely when status is "none"', () => {
    mockSubStatus = { ...BASE_STATUS, tier: 'free', status: 'none' };
    render(<Subscription />);
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /manage billing/i })).not.toBeInTheDocument();
  });

  it('hides Manage Billing for the free tier even if status is not "none"', () => {
    mockSubStatus = { ...BASE_STATUS, tier: 'free', status: 'active' };
    render(<Subscription />);
    expect(screen.queryByRole('button', { name: /manage billing/i })).not.toBeInTheDocument();
  });

  it('opens the billing portal on Manage Billing', async () => {
    render(<Subscription />);
    apiRequest.mockResolvedValueOnce({ url: 'https://billing.stripe.com/portal/abc' });

    fireEvent.click(screen.getByRole('button', { name: /manage billing/i }));

    await waitFor(() => expect(window.location.href).toBe('https://billing.stripe.com/portal/abc'));
    expect(apiRequest).toHaveBeenCalledWith('/api/billing/portal', { method: 'POST' });
  });

  it('shows an error toast and re-enables the button when opening the portal fails', async () => {
    render(<Subscription />);
    apiRequest.mockRejectedValueOnce(new Error('Stripe unavailable'));

    fireEvent.click(screen.getByRole('button', { name: /manage billing/i }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith({ title: 'Error', description: 'Stripe unavailable', variant: 'destructive' })
    );
    expect(screen.getByRole('button', { name: 'Manage Billing' })).not.toBeDisabled();
  });

  describe('Usage & Limits', () => {
    it('shows a percent-based progress readout, with ∞ for unlimited limits', () => {
      mockSubStatus = {
        ...BASE_STATUS,
        usage: { wishlistsOwned: 3, priceTrackedItems: 5, totalItems: 10 },
        limits: { ...BASE_LIMITS, maxWishlists: 10, maxPriceTrackedItems: Number.MAX_SAFE_INTEGER },
      };
      render(<Subscription />);

      expect(screen.getByText('3 / 10')).toBeInTheDocument();
      expect(screen.getByText('5 / ∞')).toBeInTheDocument();
    });

    it('shows an approaching-limit alert at or above 80% usage', () => {
      mockSubStatus = {
        ...BASE_STATUS,
        usage: { wishlistsOwned: 9, priceTrackedItems: 1, totalItems: 9 },
        limits: { ...BASE_LIMITS, maxWishlists: 10 },
      };
      render(<Subscription />);

      expect(screen.getByText(/You're using 90% of your wishlist limit/)).toBeInTheDocument();
    });

    it('does not show the alert below 80% usage', () => {
      mockSubStatus = {
        ...BASE_STATUS,
        usage: { wishlistsOwned: 1, priceTrackedItems: 1, totalItems: 1 },
        limits: { ...BASE_LIMITS, maxWishlists: 10 },
      };
      render(<Subscription />);

      expect(screen.queryByText(/wishlist limit/)).not.toBeInTheDocument();
    });

    it('shows the collaborators row only when the tier allows more than 1', () => {
      mockSubStatus = { ...BASE_STATUS, limits: { ...BASE_LIMITS, maxCollaboratorsPerWishlist: 1 } };
      const { rerender } = render(<Subscription />);
      expect(screen.queryByText('Collaborators per Wishlist')).not.toBeInTheDocument();

      mockSubStatus = { ...BASE_STATUS, limits: { ...BASE_LIMITS, maxCollaboratorsPerWishlist: 5 } };
      rerender(<Subscription />);
      expect(screen.getByText('Collaborators per Wishlist')).toBeInTheDocument();
      expect(screen.getByText('up to 5')).toBeInTheDocument();
    });

    it('lists only the features actually enabled for the tier', () => {
      mockSubStatus = {
        ...BASE_STATUS,
        limits: {
          ...BASE_LIMITS,
          adsEnabled: false, // false -> shows "No Ads"
          groupGiftingEnabled: true,
          creatorDashboardEnabled: false,
          analyticsEnabled: true,
          apiAccessEnabled: false,
          dataExportEnabled: false,
        },
      };
      render(<Subscription />);

      expect(screen.getByText('No Ads')).toBeInTheDocument();
      expect(screen.getByText('Group Gifting')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.queryByText('Creator Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('API Access')).not.toBeInTheDocument();
      expect(screen.queryByText('Data Export')).not.toBeInTheDocument();
    });
  });

  describe('Upgrade options', () => {
    const UPGRADE = { tier: 'business' as const, pricing: { ...BASE_PRICING, tagline: 'For teams', annualUsd: 299, monthlyUsd: 29.99 } };

    it('is hidden when there are no available upgrades', () => {
      mockSubStatus = { ...BASE_STATUS, availableUpgrades: [] };
      render(<Subscription />);
      expect(screen.queryByText('Upgrade Your Plan')).not.toBeInTheDocument();
    });

    it('renders a card per available upgrade with annual/monthly pricing', () => {
      mockSubStatus = { ...BASE_STATUS, availableUpgrades: [UPGRADE] };
      render(<Subscription />);

      expect(screen.getByText('Upgrade Your Plan')).toBeInTheDocument();
      expect(screen.getByText('business')).toBeInTheDocument();
      expect(screen.getByText('$299')).toBeInTheDocument();
      expect(screen.getByText('$29.99/mo')).toBeInTheDocument();
    });

    it('starts an annual checkout session', async () => {
      mockSubStatus = { ...BASE_STATUS, availableUpgrades: [UPGRADE] };
      render(<Subscription />);
      apiRequest.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/annual', sessionId: 's1' });

      fireEvent.click(screen.getByRole('button', { name: 'Upgrade Annually' }));

      await waitFor(() => expect(window.location.href).toBe('https://checkout.stripe.com/annual'));
      expect(apiRequest).toHaveBeenCalledWith('/api/billing/checkout', {
        method: 'POST',
        body: {
          tier: 'business',
          billingCycle: 'annual',
          successUrl: `${window.location.origin}/app/subscription`,
          cancelUrl: `${window.location.origin}/app/subscription`,
        },
      });
    });

    it('starts a monthly checkout session', async () => {
      mockSubStatus = { ...BASE_STATUS, availableUpgrades: [UPGRADE] };
      render(<Subscription />);
      apiRequest.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/monthly', sessionId: 's2' });

      fireEvent.click(screen.getByRole('button', { name: 'Upgrade Monthly' }));

      await waitFor(() => expect(window.location.href).toBe('https://checkout.stripe.com/monthly'));
      expect(apiRequest).toHaveBeenCalledWith('/api/billing/checkout', {
        method: 'POST',
        body: {
          tier: 'business',
          billingCycle: 'monthly',
          successUrl: `${window.location.origin}/app/subscription`,
          cancelUrl: `${window.location.origin}/app/subscription`,
        },
      });
    });

    it('shows an error toast when checkout fails to start', async () => {
      mockSubStatus = { ...BASE_STATUS, availableUpgrades: [UPGRADE] };
      render(<Subscription />);
      apiRequest.mockRejectedValueOnce(new Error('Card declined'));

      fireEvent.click(screen.getByRole('button', { name: 'Upgrade Annually' }));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({ title: 'Error', description: 'Card declined', variant: 'destructive' })
      );
    });
  });

  describe('Free trial banner', () => {
    it('shows for the free tier when a trial is available', () => {
      mockSubStatus = { ...BASE_STATUS, tier: 'free', status: 'none', pricing: { ...BASE_PRICING, trialDays: 14 } };
      render(<Subscription />);
      expect(screen.getByText(/14-day free trial/)).toBeInTheDocument();
    });

    it('is hidden for a paid tier', () => {
      mockSubStatus = { ...BASE_STATUS, tier: 'plus', pricing: { ...BASE_PRICING, trialDays: 14 } };
      render(<Subscription />);
      expect(screen.queryByText(/free trial/)).not.toBeInTheDocument();
    });

    it('is hidden when trialDays is 0', () => {
      mockSubStatus = { ...BASE_STATUS, tier: 'free', status: 'none', pricing: { ...BASE_PRICING, trialDays: 0 } };
      render(<Subscription />);
      expect(screen.queryByText(/free trial/)).not.toBeInTheDocument();
    });
  });
});
