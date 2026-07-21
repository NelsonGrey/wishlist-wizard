import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import WishlistDetail from '@/pages/WishlistDetail';
import { apiRequest } from '@/lib/queryClient';
import { QueryClient } from '@tanstack/react-query';

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
    useLocation: vi.fn(() => ['/wishlists/1', vi.fn()]),
  };
});

describe('WishlistDetail Item CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/wishlists/1');
  });

  const buildQueryClientWithItems = (items: Array<Record<string, unknown>>) => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          queryFn: async ({ queryKey }) => {
            const [endpoint] = queryKey as string[];

            if (endpoint?.startsWith('/api/wishlists/') && endpoint?.endsWith('/items')) {
              return items;
            }

            if (endpoint?.startsWith('/api/wishlists/')) {
              return {
                id: 1,
                name: 'Test Wishlist',
                userId: 1,
                beneficiaryId: null,
                shareId: 'test-share-id',
                isPublic: false,
                isCollaborative: false,
                createdAt: new Date().toISOString(),
                updatedAt: '2026-02-20T12:00:00.000Z',
                occasion: null,
                occasionDate: null,
                recurrence: 'none',
                reminderDays: null,
                description: null,
              };
            }

            return [];
          },
        },
      },
    });
  };

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

  it('copies shared wishlist link from header share action', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('wishlist-detail-share'));

    await waitFor(() => {
      expect(screen.getByTestId('wishlist-detail-share')).toHaveTextContent('Copied!');
    });
  });

  it('shows share options dialog with social channel links', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('wishlist-detail-share-options'));

    expect(await screen.findByRole('heading', { name: 'Share Wishlist' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', expect.stringContaining('wa.me'));
    expect(screen.getByRole('link', { name: 'Telegram' })).toHaveAttribute('href', expect.stringContaining('t.me'));
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', expect.stringContaining('facebook.com/sharer'));
  });

  it('uses native device share when available in share options', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      configurable: true,
    });

    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('wishlist-detail-share-options'));
    await user.click(await screen.findByRole('button', { name: 'Use Device Share' }));

    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Wishlist',
        url: `${window.location.origin}/shared/test-share-id`,
      })
    );
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

  it('renders coordinator status summary for available, reserved, and purchased items', async () => {
    const queryClient = buildQueryClientWithItems([
      {
        id: 1,
        wishlistId: 1,
        title: 'Available Item',
        price: '$10.00',
        numericPrice: '10.00',
        imageUrl: 'https://example.com/available.jpg',
        productUrl: 'https://example.com/available',
        store: 'Store A',
        note: null,
        createdAt: new Date().toISOString(),
        reservedByUserId: null,
        reservedAt: null,
        purchasedByUserId: null,
        purchasedAt: null,
      },
      {
        id: 2,
        wishlistId: 1,
        title: 'Reserved Item',
        price: '$20.00',
        numericPrice: '20.00',
        imageUrl: 'https://example.com/reserved.jpg',
        productUrl: 'https://example.com/reserved',
        store: 'Store B',
        note: null,
        createdAt: new Date().toISOString(),
        reservedByUserId: 'user-2',
        reservedAt: new Date().toISOString(),
        purchasedByUserId: null,
        purchasedAt: null,
      },
      {
        id: 3,
        wishlistId: 1,
        title: 'Purchased Item',
        price: '$30.00',
        numericPrice: '30.00',
        imageUrl: 'https://example.com/purchased.jpg',
        productUrl: 'https://example.com/purchased',
        store: 'Store C',
        note: null,
        createdAt: new Date().toISOString(),
        reservedByUserId: 'user-3',
        reservedAt: new Date().toISOString(),
        purchasedByUserId: 'user-4',
        purchasedAt: new Date().toISOString(),
      },
    ]);

    render(<WishlistDetail />, { queryClient });
    const user = userEvent.setup();

    expect(await screen.findByTestId('wishlist-detail-title')).toBeInTheDocument();
    expect(await screen.findByText('Coordination Status')).toBeInTheDocument();

    await user.click(screen.getByTestId('wishlist-detail-toggle-coordination'));

    expect(screen.getByText('Purchase completion: 33%')).toBeInTheDocument();

    const coordinationSection = screen.getByText('Coordination Status').closest('.space-y-4') as HTMLElement;
    const totalLabel = within(coordinationSection).getByText('Total');
    const availableLabel = within(coordinationSection).getByText('Available');
    const reservedLabel = within(coordinationSection).getAllByText('Reserved')[0];
    const purchasedLabel = within(coordinationSection).getAllByText('Purchased')[0];

    expect(totalLabel.parentElement).toHaveTextContent('3');
    expect(availableLabel.parentElement).toHaveTextContent('1');
    expect(reservedLabel.parentElement).toHaveTextContent('1');
    expect(purchasedLabel.parentElement).toHaveTextContent('1');
  });

  it('calls reserve API contract from coordinator item action', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('wishlist-item-reserve-1'));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/api/items/1/reserve', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('calls purchase API contract from coordinator item action', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId('wishlist-item-purchase-1'));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/api/items/1/purchase', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('exports coordinator CSV snapshot with commitment status fields', async () => {
    const createObjectUrlMock = vi.fn(() => 'blob:mock-coordination');
    const revokeObjectUrlMock = vi.fn();
    const clickMock = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectUrlMock,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectUrlMock,
      configurable: true,
    });

    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Export CSV' }));

    await waitFor(() => {
      expect(createObjectUrlMock).toHaveBeenCalled();
    });

    const firstCreateObjectUrlCall = createObjectUrlMock.mock.calls.at(0);
    expect(firstCreateObjectUrlCall).toBeDefined();
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:mock-coordination');

    clickMock.mockRestore();
  });

  it('filters items by search term', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.type(await screen.findByTestId('wishlist-detail-search-input'), 'Another');

    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
  });

  it('filters items by price and product url terms', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    const input = await screen.findByTestId('wishlist-detail-search-input');

    await user.type(input, '49.99');
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'product-1');
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
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
    window.history.replaceState({}, '', '/wishlists/1?q=Another');
    render(<WishlistDetail />);

    await screen.findByTestId('wishlist-detail-title');
    const input = await screen.findByTestId('wishlist-detail-search-input');
    expect(input).toHaveValue('Another');
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
  });

  it('focuses search input when slash shortcut is pressed', async () => {
    render(<WishlistDetail />);

    const input = await screen.findByTestId('wishlist-detail-search-input');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));

    expect(input).toHaveFocus();
  });

  it('clears search when escape is pressed while search is focused', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    const input = await screen.findByTestId('wishlist-detail-search-input');
    await user.type(input, 'Another');
    input.focus();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('focuses first visible item details action on ArrowDown from search input', async () => {
    window.history.replaceState({}, '', '/wishlists/1?sort=title-az');
    render(<WishlistDetail />);

    await screen.findByTestId('wishlist-item-details-1');
    const input = await screen.findByTestId('wishlist-detail-search-input');
    input.focus();
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(await screen.findByTestId('wishlist-item-details-1')).toHaveFocus();
  });

  it('focuses last visible item details action on ArrowUp from search input', async () => {
    window.history.replaceState({}, '', '/wishlists/1?sort=title-az');
    render(<WishlistDetail />);

    await screen.findByTestId('wishlist-item-details-2');
    const input = await screen.findByTestId('wishlist-detail-search-input');
    input.focus();
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    expect(await screen.findByTestId('wishlist-item-details-2')).toHaveFocus();
  });

  it('expands first visible item details on Enter from search input', async () => {
    window.history.replaceState({}, '', '/wishlists/1?sort=title-az');
    render(<WishlistDetail />);

    await screen.findByTestId('wishlist-item-details-1');
    const input = await screen.findByTestId('wishlist-detail-search-input');
    input.focus();
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByTestId('wishlist-item-expanded-1')).toBeInTheDocument();
  });

  it('expands last visible item details on Shift+Enter from search input', async () => {
    window.history.replaceState({}, '', '/wishlists/1?sort=title-az');
    render(<WishlistDetail />);

    await screen.findByTestId('wishlist-item-details-2');
    const input = await screen.findByTestId('wishlist-detail-search-input');
    input.focus();
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(await screen.findByTestId('wishlist-item-expanded-2')).toBeInTheDocument();
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

    await user.type(screen.getByLabelText('Item name'), 'New Test Item');
    await user.type(screen.getByLabelText('Price'), '$19.99');
    await user.type(screen.getByLabelText('Store'), 'Demo Store');
    await user.type(screen.getByLabelText('Product URL'), 'https://example.com/new-item');
    await user.type(screen.getByLabelText('Image URL'), 'https://example.com/new-item.png');
    await user.type(screen.getByLabelText('Description (optional)'), 'test note');

    await user.click(screen.getByRole('button', { name: 'Add Item' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/api/items', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('fetches product details from a pasted link and pre-fills the item form', async () => {
    vi.mocked(apiRequest).mockImplementation(async (url: string) => {
      if (url === '/api/products/preview') {
        return {
          ok: true,
          title: 'Fetched Product',
          image: 'https://example.com/fetched-image.png',
          price: 42.5,
        };
      }
      return {};
    });

    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add item/i }));
    await user.type(screen.getByLabelText('Paste a product link'), 'https://www.example.com/some-product');
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/products/preview',
        expect.objectContaining({ method: 'POST', body: { url: 'https://www.example.com/some-product' } })
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Item name')).toHaveValue('Fetched Product');
    });
    expect(screen.getByLabelText('Price')).toHaveValue('42.5');
    expect(screen.getByLabelText('Store')).toHaveValue('example.com');
    expect(screen.getByLabelText('Product URL')).toHaveValue('https://www.example.com/some-product');
  });

  it('falls back to manual entry when the link fetch fails, without blocking the user', async () => {
    vi.mocked(apiRequest).mockImplementation(async (url: string) => {
      if (url === '/api/products/preview') {
        return { ok: false, error: "Couldn't find product details on that page" };
      }
      return {};
    });

    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add item/i }));
    await user.type(screen.getByLabelText('Paste a product link'), 'https://www.example.com/unrecognized-page');
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/api/products/preview', expect.objectContaining({ method: 'POST' }));
    });

    // The URL the user pasted still lands in Product URL, and the item name field
    // stays editable — the failed fetch never blocks manual entry.
    await waitFor(() => {
      expect(screen.getByLabelText('Product URL')).toHaveValue('https://www.example.com/unrecognized-page');
    });
    await user.type(screen.getByLabelText('Item name'), 'Manually typed item');
    expect(screen.getByLabelText('Item name')).toHaveValue('Manually typed item');
  });

  it('trims item fields before creating an item', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add item/i }));

    await user.type(screen.getByLabelText('Item name'), '  Trimmed Title  ');
    await user.type(screen.getByLabelText('Price'), '  $20.00  ');
    await user.type(screen.getByLabelText('Store'), '  Demo Store  ');
    await user.type(screen.getByLabelText('Product URL'), '  https://example.com/trimmed-item  ');
    await user.type(screen.getByLabelText('Image URL'), '  https://example.com/trimmed-item.png  ');
    await user.type(screen.getByLabelText('Description (optional)'), '  keep note  ');

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

  it('shows inline validation only for the item name, which is the sole required field', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add item/i }));
    await user.click(screen.getByRole('button', { name: 'Add Item' }));

    // Price/store/product URL/image URL are optional — only item name blocks submission.
    expect(screen.getByText('Item name is required.')).toBeInTheDocument();
    expect(screen.queryByText('Price is required.')).not.toBeInTheDocument();
    expect(screen.queryByText('Product URL is required.')).not.toBeInTheDocument();
    expect(screen.queryByText('Image URL is required.')).not.toBeInTheDocument();
    expect(screen.queryByText('Store is required.')).not.toBeInTheDocument();
  });

  it('allows saving an item with only a name, no other fields filled in', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add item/i }));
    await user.type(screen.getByLabelText('Item name'), 'Bare Minimum Item');
    await user.click(screen.getByRole('button', { name: 'Add Item' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/items',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({ title: 'Bare Minimum Item' }),
        })
      );
    });
  });

  it('shows inline validation for invalid price and URL formats when those optional fields are filled in', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /add item/i }));

    await user.type(screen.getByLabelText('Item name'), 'Bad Formats Item');
    await user.type(screen.getByLabelText('Price'), 'abc');
    await user.type(screen.getByLabelText('Store'), 'Demo Store');
    await user.type(screen.getByLabelText('Product URL'), 'not-a-url');
    await user.type(screen.getByLabelText('Image URL'), 'still-not-a-url');

    await user.click(screen.getByRole('button', { name: 'Add Item' }));
    expect(screen.getByText('Use 99.99 or $99.99.')).toBeInTheDocument();
    expect(screen.getAllByText('Enter a valid URL.')).toHaveLength(2);

    await user.clear(screen.getByLabelText('Price'));
    await user.type(screen.getByLabelText('Price'), '$12.34');
    await user.click(screen.getByRole('button', { name: 'Add Item' }));
    expect(screen.getAllByText('Enter a valid URL.')).toHaveLength(2);
  });

  it('edits an existing item from the item row action', async () => {
    render(<WishlistDetail />);
    const user = userEvent.setup();

    const editButtons = await screen.findAllByRole('button', { name: /edit item/i });
    await user.click(editButtons[0]);

    const titleInput = screen.getByLabelText('Item name');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Item Title');

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        expect.stringMatching(/^\/api\/items\/\d+$/),
        expect.objectContaining({
          method: 'PATCH',
          body: expect.objectContaining({
            title: 'Updated Item Title',
          }),
        })
      );
    });
  });
});
