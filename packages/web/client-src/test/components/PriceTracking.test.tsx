import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import PriceTracking from '@/pages/PriceTracking';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

vi.mock('@/components/price-tracking/PriceAlertsList', () => ({
  default: () => <div data-testid="price-alerts-list">Price alerts</div>,
}));

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

describe('PriceTracking Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupUseQueryMock = ({
    priceDrops,
    isLoadingDrops = false,
    alerts = [],
    volatility,
    isLoadingVolatility = false,
    wishlistItems = [],
    intelligence,
    isLoadingIntelligence = false,
  }: {
    priceDrops?: unknown;
    isLoadingDrops?: boolean;
    alerts?: unknown;
    volatility?: unknown;
    isLoadingVolatility?: boolean;
    wishlistItems?: unknown;
    intelligence?: unknown;
    isLoadingIntelligence?: boolean;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockImplementation((query: any) => {
      const key = query?.queryKey;
      const first = Array.isArray(key) ? String(key[0]) : '';

      if (first === '/api/price-drops') {
        return { data: priceDrops, isLoading: isLoadingDrops, isError: false };
      }

      if (first === '/api/price-alerts') {
        return { data: alerts, isLoading: false, isError: false };
      }

      if (first === '/api/price-volatility') {
        return { data: volatility, isLoading: isLoadingVolatility, isError: false };
      }

      if (first === '/api/wishlist-items') {
        return { data: wishlistItems, isLoading: false, isError: false };
      }

      if (first === '/api/items') {
        return { data: intelligence, isLoading: isLoadingIntelligence, isError: false };
      }

      return { data: undefined, isLoading: false, isError: false };
    });
  };

  it('shows loading placeholders for price drop and volatility sections', async () => {
    setupUseQueryMock({
      priceDrops: undefined,
      isLoadingDrops: true,
      alerts: [{ id: 1, itemId: 11, item: { title: 'Tracked Item' } }],
      volatility: undefined,
      isLoadingVolatility: true,
    });

    render(<PriceTracking />, { pathname: '/app/price-tracking' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /price drops/i }));

    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows empty states when no drops or volatility data exist', async () => {
    setupUseQueryMock({
      priceDrops: [],
      alerts: [],
      volatility: [],
    });

    render(<PriceTracking />, { pathname: '/app/price-tracking' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /price drops/i }));

    expect(screen.getByText(/no significant price drops found/i)).toBeInTheDocument();
    expect(screen.getByText(/no volatility patterns detected yet/i)).toBeInTheDocument();
  });

  it('renders drop and volatility cards when data is available', async () => {
    setupUseQueryMock({
      priceDrops: [
        {
          id: 1,
          title: 'Noise Canceling Headphones',
          previousPrice: '$299.00',
          currentPrice: '$199.00',
          percentDrop: 33,
        },
      ],
      alerts: [{ id: 1, itemId: 11, item: { title: 'Tracked Item' } }],
      volatility: [
        {
          itemId: 11,
          title: 'Volatile Coffee Machine',
          volatilityPercent: 14.2,
          avgAbsoluteChangePercent: 5.6,
          changeCount: 4,
          historyPoints: 12,
          currentPrice: 199.99,
        },
      ],
    });

    render(<PriceTracking />, { pathname: '/app/price-tracking' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /price drops/i }));

    expect(screen.getByText('Noise Canceling Headphones')).toBeInTheDocument();
    expect(screen.getByText('Volatile Coffee Machine')).toBeInTheDocument();
    expect(screen.getByText(/33% off/i)).toBeInTheDocument();
  });
});
