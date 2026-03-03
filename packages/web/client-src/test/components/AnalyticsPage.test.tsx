// Mock useQuery hook properly for React Query v5
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../utils';
import Analytics from '@/pages/Analytics';
import { useQuery } from '@tanstack/react-query';

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

describe('Analytics Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders derived analytics metrics from real events without seeded defaults', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any)
      .mockReturnValueOnce({
        data: {
          summary: {
            totalEvents: 12,
            byCategory: {
              analytics: 8,
              conversion: 4,
            },
          },
        },
        isLoading: false,
        isError: false,
      })
      .mockReturnValueOnce({
        data: {
          events: [
            { id: '1', action: 'affiliate_click', category: 'analytics', value: 0, createdAt: '2026-03-01T12:00:00Z' },
            { id: '2', action: 'outbound_click', category: 'analytics', value: 0, createdAt: '2026-03-01T13:00:00Z' },
            { id: '3', action: 'purchase', category: 'conversion', value: 0, createdAt: '2026-03-01T14:00:00Z' },
            { id: '4', action: 'commission_recorded', category: 'commission', value: 21.75, createdAt: '2026-03-01T15:00:00Z' },
          ],
        },
        isLoading: false,
        isError: false,
      });

    render(<Analytics />, { pathname: '/analytics' });

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('$21.75')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('shows loading state while analytics queries are pending', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any)
      .mockReturnValueOnce({
        data: undefined,
        isLoading: true,
        isError: false,
      })
      .mockReturnValueOnce({
        data: undefined,
        isLoading: true,
        isError: false,
      });

    render(<Analytics />, { pathname: '/analytics' });

    expect(screen.getByText('Loading analytics data...')).toBeInTheDocument();
  });

  it('shows a friendly error state when analytics data fails to load', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any)
      .mockReturnValueOnce({
        data: undefined,
        isLoading: false,
        isError: true,
      })
      .mockReturnValueOnce({
        data: undefined,
        isLoading: false,
        isError: false,
      });

    render(<Analytics />, { pathname: '/analytics' });

    expect(screen.getByText('We couldn\'t load analytics data right now. Please try again.')).toBeInTheDocument();
  });
});
