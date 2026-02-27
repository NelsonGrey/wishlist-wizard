import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import Recommendations from '@/pages/Recommendations';
import { useQuery } from '@tanstack/react-query';

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
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
    });
  });

  it('shows wishlist selector when wishlists load successfully', () => {
    render(<Recommendations />);

    expect(screen.getByText('Select wishlist for adding items')).toBeInTheDocument();
  });

  it('shows loading state while wishlists are loading', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Recommendations />);

    expect(screen.getByText('Loading wishlists...')).toBeInTheDocument();
  });

  it('shows error state and retries wishlist query', async () => {
    const refetch = vi.fn();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Service unavailable'),
      refetch,
    });

    render(<Recommendations />);

    expect(screen.getByText('Failed to load wishlists. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Service unavailable')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when user has no wishlists', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Recommendations />);

    expect(screen.getByText('No wishlists yet.')).toBeInTheDocument();
  });
});
