import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import RecommendationCard from '@/components/recommendations/RecommendationCard';
import { apiRequest } from '@/lib/queryClient';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

describe('RecommendationCard interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls parent add handler once without issuing extra status API call', async () => {
    const onAddToWishlist = vi.fn().mockResolvedValue(true);

    render(
      <RecommendationCard
        recommendation={{
          id: 101,
          title: 'Noise Cancelling Headphones',
          imageUrl: 'https://example.com/headphones.jpg',
          price: '$199.99',
          productUrl: 'https://example.com/headphones',
          store: 'Audio Store',
          description: 'Premium over-ear wireless headphones.',
          relevanceScore: 90,
          matchReason: 'Matches your recent audio gift interests',
          isSaved: false,
          isRejected: false,
        }}
        onAddToWishlist={onAddToWishlist}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /add noise cancelling headphones to selected wishlist/i }));

    await waitFor(() => {
      expect(onAddToWishlist).toHaveBeenCalledTimes(1);
    });

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('shows saved state and disables add interaction for already-saved recommendation', async () => {
    const onAddToWishlist = vi.fn();

    render(
      <RecommendationCard
        recommendation={{
          id: 202,
          title: 'Smart Coffee Maker',
          imageUrl: 'https://example.com/coffee.jpg',
          price: '$89.99',
          productUrl: 'https://example.com/coffee',
          store: 'Home Store',
          description: 'Programmable coffee maker with app control.',
          relevanceScore: 84,
          matchReason: 'Fits your kitchen gadgets wishlist pattern',
          isSaved: true,
          isRejected: false,
        }}
        onAddToWishlist={onAddToWishlist}
      />
    );

    const addButton = screen.getByRole('button', { name: /add smart coffee maker to selected wishlist/i });
    expect(addButton).toBeDisabled();
    expect(addButton).toHaveTextContent('Saved');

    const user = userEvent.setup();
    await user.click(addButton);

    expect(onAddToWishlist).not.toHaveBeenCalled();
  });
});
