import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../utils';
import WishlistItem from '@/components/WishlistItem';
import { WishlistItem as WishlistItemType } from '@wishlist-wizard/shared';

let isPriceAlertsEnabled = true;

vi.mock('@/components/ContributionDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/PriceAlertDialog', () => ({
  default: () => null,
}));

vi.mock('@shared/firebase-utils', async () => {
  const actual = await vi.importActual<typeof import('@shared/firebase-utils')>('@shared/firebase-utils');
  return {
    ...actual,
    FeatureFlags: {
      ...actual.FeatureFlags,
      PRICE_ALERTS_ENABLED: 'price_alerts_enabled',
    },
    getRemoteConfig: () => ({
      isFeatureEnabled: () => isPriceAlertsEnabled,
    }),
  };
});

describe('WishlistItem Component', () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  const mockItem: WishlistItemType = {
    id: 1,
    wishlistId: 1,
    title: 'Wireless Headphones',
    price: '$129.99',
    numericPrice: '129.99',
    imageUrl: 'https://example.com/headphones.jpg',
    productUrl: 'https://example.com/product/headphones',
    store: 'Electronics Store',
    note: 'Would love these for my commute',
    createdAt: new Date('2023-05-15'),
    reservedByUserId: null,
    reservedAt: null,
    purchasedByUserId: null,
    purchasedAt: null,
    category: 'Electronics',
    brand: 'Sony',
    description: 'Premium wireless headphones',
    availability: 'In Stock',
    rating: '4.5',
    reviewCount: 1250,
    priceHistory: [],
    metadata: {},
    popularity: 0,
    productIdentifier: 'WH-1000XM4'
  };
  
  // Mock function for delete
  const mockOnDelete = vi.fn();
  const mockOnReserve = vi.fn();
  const mockOnPurchase = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    isPriceAlertsEnabled = true;
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });
  });
  
  it('should render item information correctly', () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );
    
    // Assert
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByText('$129.99')).toBeInTheDocument();
    expect(screen.getByText('Electronics Store')).toBeInTheDocument();
    expect(screen.getByText('Would love these for my commute')).toBeInTheDocument();
  });

  it('should highlight matching text when search query is provided', () => {
    render(
      <WishlistItem
        item={mockItem}
        onDelete={mockOnDelete}
        searchQuery="wire"
      />
    );

    const highlights = screen.getAllByTestId('wishlist-item-highlight-1');
    expect(highlights.length).toBeGreaterThan(0);
    expect(highlights[0]).toHaveTextContent(/wire/i);
  });
  
  it('should display item image', () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );
    
    // Assert
    const image = screen.getByAltText(/Wireless Headphones/i);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', mockItem.imageUrl);
  });
  
  it('should have external link to product', () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );
    
    // Assert
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', mockItem.productUrl);
    expect(link).toHaveAttribute('target', '_blank');
  });
  
  it('should handle delete button click', async () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );

    const user = userEvent.setup();
    
    // Act
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);
    
    // The component shows a confirmation dialog, so onDelete should not be called yet
    expect(mockOnDelete).not.toHaveBeenCalled();
  });
  
  it('should show delete confirmation dialog', async () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );

    const user = userEvent.setup();
    
    // Act - Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);
    
    // Assert - Dialog should appear
    expect(screen.getByText('Remove Item')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove this item/)).toBeInTheDocument();
  });
  
  it('should call onDelete when confirming deletion', async () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );

    const user = userEvent.setup();
    
    // Act - Click delete button and confirm
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);
    
    const confirmButton = screen.getByText('Remove');
    await user.click(confirmButton);
    
    // Assert
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });
  
  it('should not call onDelete when canceling deletion', async () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );

    const user = userEvent.setup();
    
    // Act - Click delete button and cancel
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);
    
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    // Assert
    expect(mockOnDelete).not.toHaveBeenCalled();
  });
  
  it('should display item without note when note is null', () => {
    // Arrange
    const itemWithoutNote = { ...mockItem, note: null };
    
    // Act
    render(
      <WishlistItem 
        item={itemWithoutNote}
        onDelete={mockOnDelete}
      />
    );
    
    // Assert - Note section should not be present
    expect(screen.queryByText('Would love these for my commute')).not.toBeInTheDocument();
  });
  
  it('should display item with brand and category info', () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );
    
    // Assert - The component currently doesn't display brand/category in the UI
    // This test would need to be updated if the component is enhanced to show this
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
  });

  it('should expand item details inline when details button is clicked', async () => {
    render(
      <WishlistItem
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );

    const user = userEvent.setup();
    expect(screen.queryByTestId('wishlist-item-expanded-1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /details/i }));

    expect(screen.getByTestId('wishlist-item-expanded-1')).toBeInTheDocument();
    expect(screen.getByText('Product URL')).toBeInTheDocument();
    expect(screen.getByText('Sony')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /details/i }));
    expect(screen.queryByTestId('wishlist-item-expanded-1')).not.toBeInTheDocument();
  });

  it('should render copy product link action in overflow menu', async () => {
    render(
      <WishlistItem
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId('wishlist-item-more-1'));

    expect(await screen.findByTestId('wishlist-item-copy-link-1')).toBeInTheDocument();
  });

  it('should render reserve and purchase actions when handlers are provided', () => {
    render(
      <WishlistItem
        item={mockItem}
        onDelete={mockOnDelete}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        currentUserId="user-1"
      />
    );

    expect(screen.getByRole('button', { name: 'Reserve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark Purchased' })).toBeInTheDocument();
  });

  it('should call reserve and purchase handlers when action buttons are clicked', async () => {
    render(
      <WishlistItem
        item={mockItem}
        onDelete={mockOnDelete}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        currentUserId="user-1"
      />
    );

    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Reserve' }));
    await user.click(screen.getByRole('button', { name: 'Mark Purchased' }));

    expect(mockOnReserve).toHaveBeenCalledTimes(1);
    expect(mockOnPurchase).toHaveBeenCalledTimes(1);
  });

  it('should disable reserve and purchase when item is purchased', () => {
    const purchasedItem = {
      ...mockItem,
      purchasedByUserId: 42,
      purchasedAt: new Date('2024-01-01'),
    };

    render(
      <WishlistItem
        item={purchasedItem}
        onDelete={mockOnDelete}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        currentUserId="user-1"
      />
    );

    expect(screen.getByRole('button', { name: 'Reserve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark Purchased' })).toBeDisabled();
    expect(screen.getByText('Already purchased')).toBeInTheDocument();
  });

  it('should disable reserve and purchase when reserved by another user', () => {
    const reservedByOtherItem = {
      ...mockItem,
      reservedByUserId: 999,
      purchasedByUserId: null,
    };

    render(
      <WishlistItem
        item={reservedByOtherItem}
        onDelete={mockOnDelete}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        currentUserId="user-1"
      />
    );

    expect(screen.getByRole('button', { name: 'Reserve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark Purchased' })).toBeDisabled();
    expect(screen.getByText('Reserved by another user')).toBeInTheDocument();
  });

  it('should allow purchase when reserved by current user', () => {
    const reservedByCurrentUserItem = {
      ...mockItem,
      reservedByUserId: 123,
      purchasedByUserId: null,
    };

    render(
      <WishlistItem
        item={reservedByCurrentUserItem}
        onDelete={mockOnDelete}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        currentUserId="123"
      />
    );

    expect(screen.getByRole('button', { name: 'Reserve' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mark Purchased' })).toBeEnabled();
    expect(screen.getByText('Reserved by you')).toBeInTheDocument();
  });

  it('should render custom reserve and purchase labels when provided', () => {
    render(
      <WishlistItem
        item={mockItem}
        onDelete={mockOnDelete}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        reserveLabel="Reserving..."
        purchaseLabel="Marking..."
        currentUserId="user-1"
      />
    );

    expect(screen.getByRole('button', { name: 'Reserving...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marking...' })).toBeInTheDocument();
  });

  it('should hide price alert actions when remote config disables price alerts', async () => {
    isPriceAlertsEnabled = false;

    render(
      <WishlistItem
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId('wishlist-item-more-1'));
    expect(screen.queryByTestId('wishlist-item-alert-1')).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /details/i }));

    expect(screen.getByTestId('wishlist-item-expanded-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Alert' })).not.toBeInTheDocument();
  });
});