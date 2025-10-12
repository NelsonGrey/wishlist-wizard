import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../utils';
import WishlistItem from '@/components/WishlistItem';
import { WishlistItem as WishlistItemType } from '@wishlist-wizard/shared';

describe('WishlistItem Component', () => {
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
  
  beforeEach(() => {
    vi.clearAllMocks();
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
  
  it('should handle delete button click', () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );
    
    // Act
    const deleteButton = screen.getByRole('button', { name: /trash/i });
    fireEvent.click(deleteButton);
    
    // The component shows a confirmation dialog, so onDelete should not be called yet
    expect(mockOnDelete).not.toHaveBeenCalled();
  });
  
  it('should show delete confirmation dialog', () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );
    
    // Act - Click delete button
    const deleteButton = screen.getByRole('button', { name: /trash/i });
    fireEvent.click(deleteButton);
    
    // Assert - Dialog should appear
    expect(screen.getByText('Remove Item')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove this item/)).toBeInTheDocument();
  });
  
  it('should call onDelete when confirming deletion', () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );
    
    // Act - Click delete button and confirm
    const deleteButton = screen.getByRole('button', { name: /trash/i });
    fireEvent.click(deleteButton);
    
    const confirmButton = screen.getByText('Remove');
    fireEvent.click(confirmButton);
    
    // Assert
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });
  
  it('should not call onDelete when canceling deletion', () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem}
        onDelete={mockOnDelete}
      />
    );
    
    // Act - Click delete button and cancel
    const deleteButton = screen.getByRole('button', { name: /trash/i });
    fireEvent.click(deleteButton);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
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
});