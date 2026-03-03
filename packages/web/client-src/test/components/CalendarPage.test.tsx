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

vi.mock('@/components/calendar/CalendarSettings', () => ({
  CalendarSettings: () => <div data-testid="calendar-settings">Calendar Settings</div>,
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

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
}: {
  events: QueryState;
  beneficiaries: QueryState;
  wishlists: QueryState;
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

  it('opens settings panel from toolbar button', async () => {
    render(<Calendar />, { pathname: '/calendar' });

    expect(screen.queryByTestId('calendar-settings')).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByTestId('calendar-settings')).toBeInTheDocument();
  });
});
