import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import Recommendations from '@/pages/Recommendations';
import { useQuery } from '@tanstack/react-query';

type QueryState = {
  data: unknown;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: ReturnType<typeof vi.fn>;
};

const setQueryStates = ({
  wishlists,
  beneficiaries,
}: {
  wishlists: QueryState;
  beneficiaries: QueryState;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useQuery as any).mockImplementation(({ queryKey }: { queryKey: string[] }) => {
    if (queryKey?.[0] === '/api/wishlists') {
      return wishlists;
    }

    if (queryKey?.[0] === '/api/beneficiaries') {
      return beneficiaries;
    }

    return {
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
  });
};

vi.mock('@/components/recommendations/RecommendationsSection', () => ({
  default: () => <div data-testid="recommendations-section">Recommendations Section</div>,
}));

vi.mock('@/components/help/RecommendationsHelp', () => ({
  RecommendationsHelp: () => <div data-testid="recommendations-help">Help</div>,
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

describe('Recommendations Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    setQueryStates({
      wishlists: {
        data: [
          {
            id: 1,
            name: 'Birthday Wishlist',
            userId: 1,
            beneficiaryId: null,
            shareId: 'share-1',
            isPublic: false,
            isCollaborative: false,
            createdAt: new Date().toISOString(),
            occasion: null,
            occasionDate: null,
            recurrence: 'none',
            reminderDays: null,
            description: null,
          },
        ],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
      beneficiaries: {
        data: [{ id: 10, name: 'Alex' }],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
    });
  });

  it('shows wishlist selector when wishlists load successfully', () => {
    render(<Recommendations />);

    expect(screen.getByText('Choose a wishlist directly in the recommendations card when adding items.')).toBeInTheDocument();
  });

  it('shows loading state while wishlists are loading', () => {
    setQueryStates({
      wishlists: {
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
      beneficiaries: {
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
    });

    render(<Recommendations />);

    expect(screen.getByText('Loading wishlists...')).toBeInTheDocument();
  });

  it('shows error state and retries wishlist query', async () => {
    const refetch = vi.fn();

    setQueryStates({
      wishlists: {
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Service unavailable'),
        refetch,
      },
      beneficiaries: {
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
    });

    render(<Recommendations />);

    expect(screen.getByText('Failed to load wishlists. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Service unavailable')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when user has no wishlists', () => {
    setQueryStates({
      wishlists: {
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
      beneficiaries: {
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
    });

    render(<Recommendations />);

    expect(screen.getByText('No wishlists yet.')).toBeInTheDocument();
  });

  it('renders recommendation focus selector', () => {
    render(<Recommendations />);

    expect(screen.getByText('Recommendation focus')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Select recommendation focus' })).toBeInTheDocument();
  });
});
