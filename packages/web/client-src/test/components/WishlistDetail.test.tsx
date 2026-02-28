import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import WishlistDetail from '@/pages/WishlistDetail';
import { apiRequest } from '@/lib/queryClient';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-1' },
  }),
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useRoute: vi.fn(() => [true, { id: '1' }]),
    useLocation: vi.fn(() => ['/wishlist/1', vi.fn()]),
  };
});

describe('WishlistDetail Item CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/wishlist/1');
  });

  it('opens shared wishlist page from header action', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('wishlist-detail-open-shared'));

    expect(openSpy).toHaveBeenCalledWith(
      `${window.location.origin}/shared/test-share-id`,
      '_blank',
      'noopener,noreferrer'
    );

    openSpy.mockRestore();
  });

  it('renders mobile summary share action', async () => {
    render(<WishlistDetail />);

    expect(await screen.findByTestId('wishlist-detail-mobile-share')).toBeInTheDocument();
  });

  it('renders sticky mobile quick actions', async () => {
    render(<WishlistDetail />);

    expect(await screen.findByTestId('wishlist-detail-mobile-add-item')).toBeInTheDocument();
    expect(await screen.findByTestId('wishlist-detail-mobile-sticky-share')).toBeInTheDocument();
  });

  it('renders last updated metadata', async () => {
    render(<WishlistDetail />);

    expect(await screen.findByTestId('wishlist-detail-last-updated')).toHaveTextContent(/Last updated:/i);
  });

  it('renders item sort control', async () => {
    render(<WishlistDetail />);

    expect(await screen.findByTestId('wishlist-detail-sort-trigger')).toBeInTheDocument();
  });

  it('filters items by search term', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.type(await screen.findByTestId('wishlist-detail-search-input'), 'Another');

    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
  });

  it('clears search filter and restores item list', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.type(await screen.findByTestId('wishlist-detail-search-input'), 'Another');
    await user.click(await screen.findByTestId('wishlist-detail-search-clear'));

    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
  });

  it('hydrates search from query params', async () => {
    window.history.replaceState({}, '', '/wishlist/1?q=Another');
    render(<WishlistDetail />);

    await screen.findByTestId('wishlist-detail-title');
    const input = await screen.findByTestId('wishlist-detail-search-input');
    expect(input).toHaveValue('Another');
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
  });

  it('shows and handles mobile scroll-to-top action', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(window, 'scrollY', {
      value: 500,
      writable: true,
      configurable: true,
    });

    render(<WishlistDetail />);
    window.dispatchEvent(new Event('scroll'));

    const user = userEvent.setup();
    const button = await screen.findByTestId('wishlist-detail-mobile-scroll-top');
    await user.click(button);

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    scrollToSpy.mockRestore();
  });

  it('creates an item from Add Item dialog', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add item/i }));

    await user.type(screen.getByLabelText('Title'), 'New Test Item');
    await user.type(screen.getByLabelText('Price'), '$19.99');
    await user.type(screen.getByLabelText('Store'), 'Demo Store');
    await user.type(screen.getByLabelText('Product URL'), 'https://example.com/new-item');
    await user.type(screen.getByLabelText('Image URL'), 'https://example.com/new-item.png');
    await user.type(screen.getByLabelText('Note (optional)'), 'test note');

    await user.click(screen.getByRole('button', { name: 'Add Item' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/api/items', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('trims item fields before creating an item', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add item/i }));

    await user.type(screen.getByLabelText('Title'), '  Trimmed Title  ');
    await user.type(screen.getByLabelText('Price'), '  $20.00  ');
    await user.type(screen.getByLabelText('Store'), '  Demo Store  ');
    await user.type(screen.getByLabelText('Product URL'), '  https://example.com/trimmed-item  ');
    await user.type(screen.getByLabelText('Image URL'), '  https://example.com/trimmed-item.png  ');
    await user.type(screen.getByLabelText('Note (optional)'), '  keep note  ');

    await user.click(screen.getByRole('button', { name: 'Add Item' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/items',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            title: 'Trimmed Title',
            price: '$20.00',
            store: 'Demo Store',
            productUrl: 'https://example.com/trimmed-item',
            imageUrl: 'https://example.com/trimmed-item.png',
            note: 'keep note',
          }),
        })
      );
    });
  });

  it('shows inline validation when required fields are missing', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add item/i }));
    await user.click(screen.getByRole('button', { name: 'Add Item' }));

    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Price is required.')).toBeInTheDocument();
    expect(screen.getByText('Product URL is required.')).toBeInTheDocument();
    expect(screen.getByText('Image URL is required.')).toBeInTheDocument();
    expect(screen.getByText('Store is required.')).toBeInTheDocument();
  });

  it('shows inline validation for invalid price and URL formats', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add item/i }));

    await user.type(screen.getByLabelText('Title'), 'Bad Formats Item');
    await user.type(screen.getByLabelText('Price'), 'abc');
    await user.type(screen.getByLabelText('Store'), 'Demo Store');
    await user.type(screen.getByLabelText('Product URL'), 'not-a-url');
    await user.type(screen.getByLabelText('Image URL'), 'still-not-a-url');

    await user.click(screen.getByRole('button', { name: 'Add Item' }));
    expect(screen.getByText('Use 99.99 or $99.99.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Price'));
    await user.type(screen.getByLabelText('Price'), '$12.34');
    await user.click(screen.getByRole('button', { name: 'Add Item' }));
    expect(screen.getByText('Enter a valid URL.')).toBeInTheDocument();
  });

  it('edits an existing item from the item row action', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    const editButtons = await screen.findAllByRole('button', { name: /edit item/i });
    await user.click(editButtons[0]);

    const titleInput = screen.getByLabelText('Title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Item Title');

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/api/items/1', expect.objectContaining({ method: 'PATCH' }));
    });
  });
});
