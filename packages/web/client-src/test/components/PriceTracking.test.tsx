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

  it('shows loading placeholders for price drop and volatility sections', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any)
      .mockReturnValueOnce({ data: undefined, isLoading: true })
      .mockReturnValueOnce({
        data: [{ id: 1, itemId: 11, item: { title: 'Tracked Item' } }],
        isLoading: false,
      })
      .mockReturnValueOnce({ data: undefined, isLoading: true });

    render(<PriceTracking />, { pathname: '/app/price-tracking' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /price drops/i }));

    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows empty states when no drops or volatility data exist', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any)
      .mockReturnValueOnce({ data: [], isLoading: false })
      .mockReturnValueOnce({ data: [], isLoading: false })
      .mockReturnValueOnce({ data: [], isLoading: false });

    render(<PriceTracking />, { pathname: '/app/price-tracking' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /price drops/i }));

    expect(screen.getByText(/no significant price drops found/i)).toBeInTheDocument();
    expect(screen.getByText(/no volatility patterns detected yet/i)).toBeInTheDocument();
  });

  it('renders drop and volatility cards when data is available', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any)
      .mockReturnValueOnce({
        data: [
          {
            id: 1,
            title: 'Noise Canceling Headphones',
            previousPrice: '$299.00',
            currentPrice: '$199.00',
            percentDrop: 33,
          },
        ],
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: [{ id: 1, itemId: 11, item: { title: 'Tracked Item' } }],
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: [
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
        isLoading: false,
      });

    render(<PriceTracking />, { pathname: '/app/price-tracking' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /price drops/i }));

    expect(screen.getByText('Noise Canceling Headphones')).toBeInTheDocument();
    expect(screen.getByText('Volatile Coffee Machine')).toBeInTheDocument();
    expect(screen.getByText(/33% off/i)).toBeInTheDocument();
  });
});
