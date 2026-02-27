import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import SharedWishlist from '@/pages/SharedWishlist';
import { useQuery } from '@tanstack/react-query';

const mockSetLocation = vi.fn();
const mockUseRoute = vi.fn();

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useRoute: (...args: unknown[]) => mockUseRoute(...args),
    useLocation: () => ['/shared/test-share-id', mockSetLocation],
  };
});

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

describe('SharedWishlist Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseRoute.mockReturnValue([true, { shareId: 'test-share-id' }]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      const key = queryKey?.[0];

      if (typeof key === 'string' && key.startsWith('/api/shared/')) {
        return {
          data: {
            wishlist: {
              id: 1,
              name: 'Shared Birthday List',
              userId: 1,
              shareId: 'test-share-id',
              createdAt: new Date().toISOString(),
            },
            items: [
              {
                id: 1,
                wishlistId: 1,
                title: 'Coffee Grinder',
                price: '$89.00',
                imageUrl: 'https://example.com/grinder.jpg',
                productUrl: 'https://example.com/grinder',
                store: 'Coffee Shop',
                note: '',
                createdAt: new Date().toISOString(),
              },
            ],
          },
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn(),
        };
      }

      if (key === 'wishlist-access') {
        return {
          data: { hasAccess: true, isOwner: false },
          isLoading: false,
        };
      }

      return {
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      };
    });
  });

  it('renders shared wishlist content when share link is valid', () => {
    render(<SharedWishlist />, { pathname: '/shared/test-share-id' });

    expect(screen.getByText('Shared Birthday List')).toBeInTheDocument();
    expect(screen.getByText('Coffee Grinder')).toBeInTheDocument();
  });

  it('shows invalid share link state when shareId format is invalid', async () => {
    mockUseRoute.mockReturnValue([true, { shareId: 'bad share id' }]);

    render(<SharedWishlist />, { pathname: '/shared/bad share id' });

    expect(screen.getByText('Invalid share link')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Back to Home' }));

    expect(mockSetLocation).toHaveBeenCalledWith('/');
  });

  it('shows load error state with retry and home actions', async () => {
    const refetch = vi.fn();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      const key = queryKey?.[0];
      if (typeof key === 'string' && key.startsWith('/api/shared/')) {
        return {
          data: undefined,
          isLoading: false,
          isError: true,
          error: new Error('Service unavailable'),
          refetch,
        };
      }

      return {
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      };
    });

    render(<SharedWishlist />, { pathname: '/shared/test-share-id' });

    expect(screen.getByText('Failed to load shared wishlist')).toBeInTheDocument();
    expect(screen.getByText('Service unavailable')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Go to Home' }));
    expect(mockSetLocation).toHaveBeenCalledWith('/');
  });
});
