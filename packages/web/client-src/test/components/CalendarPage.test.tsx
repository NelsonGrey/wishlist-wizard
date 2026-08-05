import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import Calendar from '@/pages/Calendar';
import { useQuery } from '@tanstack/react-query';

vi.mock('react-big-calendar', () => ({
  Calendar: () => <div data-testid="calendar-grid">Calendar Grid</div>,
  dateFnsLocalizer: () => ({
    formats: {},
    firstOfWeek: () => 0,
    format: () => '',
  }),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: '100', email: 'mark@example.com', displayName: 'Mark Nelson', photoURL: null },
  }),
}));

vi.mock('@/components/calendar/CalendarSettings', () => ({
  CalendarSettings: () => <div data-testid="calendar-settings">Calendar Settings</div>,
}));

type QueryState = {
  data: unknown;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch?: ReturnType<typeof vi.fn>;
};

const setQueryStates = ({
  events,
  beneficiaries,
  wishlists,
  subscriptionStatus,
}: {
  events: QueryState;
  beneficiaries: QueryState;
  wishlists: QueryState;
  subscriptionStatus?: { calendarEnabled: boolean };
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useQuery as any).mockImplementation(({ queryKey }: { queryKey: string[] }) => {
    if (queryKey?.[0] === '/api/calendar/events') {
      return {
        ...events,
        data: events.data ?? [],
        refetch: events.refetch ?? vi.fn(),
      };
    }

    if (queryKey?.[0] === '/api/beneficiaries') {
      return {
        ...beneficiaries,
        data: beneficiaries.data ?? [],
        refetch: beneficiaries.refetch ?? vi.fn(),
      };
    }

    if (queryKey?.[0] === '/api/wishlists') {
      return {
        ...wishlists,
        data: wishlists.data ?? [],
        refetch: wishlists.refetch ?? vi.fn(),
      };
    }

    if (queryKey?.[0] === 'subscription-status') {
      return {
        data: { limits: { calendarEnabled: subscriptionStatus?.calendarEnabled ?? false } },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      };
    }

    return {
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
  });
};

describe('Calendar Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // selectedTab syncs to the URL via history.replaceState, and jsdom's
    // window.location persists across tests in this file — reset it so a
    // tab switch in one test doesn't leak into the next test's initial tab.
    window.history.replaceState(null, '', '/calendar');

    setQueryStates({
      events: {
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      },
      beneficiaries: {
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      },
      wishlists: {
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      },
    });
  });

  it('shows loading state while calendar events are loading', () => {
    setQueryStates({
      events: {
        data: [],
        isLoading: true,
        isError: false,
      },
      beneficiaries: {
        data: [],
        isLoading: false,
        isError: false,
      },
      wishlists: {
        data: [],
        isLoading: false,
        isError: false,
      },
    });

    render(<Calendar />, { pathname: '/calendar' });

    expect(screen.getByText('Loading calendar events…')).toBeInTheDocument();
  });

  it('shows error state with retry action when events fail to load', async () => {
    const refetch = vi.fn();

    setQueryStates({
      events: {
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Calendar service unavailable'),
        refetch,
      },
      beneficiaries: {
        data: [],
        isLoading: false,
        isError: false,
      },
      wishlists: {
        data: [],
        isLoading: false,
        isError: false,
      },
    });

    render(<Calendar />, { pathname: '/calendar' });

    expect(screen.getByText('Unable to load calendar events.')).toBeInTheDocument();
    expect(screen.getByText('Calendar service unavailable')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows an upgrade prompt on the Connections tab for a tier without calendar sync', async () => {
    render(<Calendar />, { pathname: '/calendar' });

    const user = userEvent.setup();
    await user.click(screen.getByTestId('calendar-tab-connections'));

    expect(await screen.findByText('External calendar sync is a paid feature')).toBeInTheDocument();
    expect(screen.queryByTestId('calendar-settings')).not.toBeInTheDocument();
  });

  it('shows the connections UI on the Connections tab for a tier with calendar sync', async () => {
    setQueryStates({
      events: { data: [], isLoading: false, isError: false, error: null },
      beneficiaries: { data: [], isLoading: false, isError: false },
      wishlists: { data: [], isLoading: false, isError: false },
      subscriptionStatus: { calendarEnabled: true },
    });

    render(<Calendar />, { pathname: '/calendar' });

    const user = userEvent.setup();
    await user.click(screen.getByTestId('calendar-tab-connections'));

    expect(await screen.findByTestId('calendar-settings')).toBeInTheDocument();
  });

  it('merges wishlist occasion dates into the upcoming events list', async () => {
    setQueryStates({
      events: { data: [], isLoading: false, isError: false, error: null },
      beneficiaries: { data: [], isLoading: false, isError: false },
      wishlists: {
        data: [
          {
            id: 42,
            name: "Mark's Birthday List",
            occasion: 'Birthday',
            occasionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            recurrence: 'none',
          },
        ],
        isLoading: false,
        isError: false,
      },
    });

    render(<Calendar />, { pathname: '/calendar' });

    expect(await screen.findByText("Mark's Birthday List (Birthday)")).toBeInTheDocument();
  });
});
