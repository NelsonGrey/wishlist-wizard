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

  const mockAnalyticsQueries = (overrides?: {
    summary?: { isLoading?: boolean; isError?: boolean; data?: unknown };
    events?: { isLoading?: boolean; isError?: boolean; data?: unknown };
    adSummary?: { isLoading?: boolean; isError?: boolean; data?: unknown };
    adTrend?: { isLoading?: boolean; isError?: boolean; data?: unknown };
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      const key = Array.isArray(queryKey) ? queryKey[0] : undefined;

      if (key === '/api/analytics/summary') {
        return {
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
          ...(overrides?.summary || {}),
        };
      }

      if (key === '/api/analytics/events') {
        return {
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
          ...(overrides?.events || {}),
        };
      }

      if (key === '/api/analytics/ad-revenue-summary') {
        return {
          data: {
            summary: {
              windowDays: 30,
              ecpmUsd: 8,
              rendered: 1200,
              viewableImpressions: 1000,
              clickSignals: 25,
              clickThroughRate: 2.5,
              viewabilityRate: 83.33,
              renderFailures: 0,
              configMissing: 0,
              estimatedRevenueUsd: 8,
            },
          },
          isLoading: false,
          isError: false,
          ...(overrides?.adSummary || {}),
        };
      }

      if (key === '/api/analytics/ad-kpi-snapshots') {
        return {
          data: {
            snapshots: [
              {
                id: '2026-03-01',
                date: '2026-03-01',
                ecpmUsd: 8,
                metrics: {
                  rendered: 1200,
                  viewableImpressions: 1000,
                  clickSignals: 25,
                  clickThroughRate: 2.5,
                  viewabilityRate: 83.33,
                  estimatedRevenueUsd: 8,
                },
              },
            ],
          },
          isLoading: false,
          isError: false,
          ...(overrides?.adTrend || {}),
        };
      }

      return {
        data: undefined,
        isLoading: false,
        isError: false,
      };
    });
  };

  it('renders derived analytics metrics from real events without seeded defaults', () => {
    mockAnalyticsQueries();

    render(<Analytics />, { pathname: '/analytics' });

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('$21.75')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getByText('Ad-Only Monetization Snapshot')).toBeInTheDocument();
    expect(screen.getAllByText('1000').length).toBeGreaterThan(0);
    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.getAllByText('$8.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2.50%').length).toBeGreaterThan(0);
    expect(screen.getByText('Daily Ad KPI Trend (14 days)')).toBeInTheDocument();
    expect(screen.getByText('2026-03-01')).toBeInTheDocument();
  });

  it('shows loading state while analytics queries are pending', () => {
    mockAnalyticsQueries({
      summary: {
        data: undefined,
        isLoading: true,
        isError: false,
      },
      events: {
        data: undefined,
        isLoading: true,
        isError: false,
      },
      adSummary: {
        data: undefined,
        isLoading: true,
        isError: false,
      },
      adTrend: {
        data: undefined,
        isLoading: true,
        isError: false,
      },
    });

    render(<Analytics />, { pathname: '/analytics' });

    expect(screen.getByText('Loading analytics data...')).toBeInTheDocument();
  });

  it('shows a friendly error state when analytics data fails to load', () => {
    mockAnalyticsQueries({
      summary: {
        data: undefined,
        isLoading: false,
        isError: true,
      },
    });

    render(<Analytics />, { pathname: '/analytics' });

    expect(screen.getByText('We couldn\'t load analytics data right now. Please try again.')).toBeInTheDocument();
  });

  it('shows admin-only message when ad KPI trend endpoint is unavailable', () => {
    mockAnalyticsQueries({
      adTrend: {
        data: undefined,
        isLoading: false,
        isError: true,
      },
    });

    render(<Analytics />, { pathname: '/analytics' });

    expect(screen.getByText('Daily KPI trends are available to admin users.')).toBeInTheDocument();
  });
});
