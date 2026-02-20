import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import WishlistDetail from '@/pages/WishlistDetail';
import { apiRequest } from '@/lib/queryClient';

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
