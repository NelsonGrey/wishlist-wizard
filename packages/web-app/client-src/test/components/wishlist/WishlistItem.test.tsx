import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../utils';
import WishlistItem from '@/components/WishlistItem'; // Assuming this component exists
import { WishlistItem as WishlistItemType } from '@wishlist-wizard/shared';

describe('WishlistItem Component', () => {
  const mockItem: Partial<WishlistItemType> = {
    id: 1,
    wishlistId: 1,
    title: 'Wireless Headphones',
    price: '$129.99',
    imageUrl: 'https://example.com/headphones.jpg',
    productUrl: 'https://example.com/product/headphones',
    store: 'Electronics Store',
    note: 'Would love these for my commute',
    createdAt: new Date('2023-05-15').toISOString()
  };
  
  // Mock functions for interactions
  const mockOnView = vi.fn();
  const mockOnReserve = vi.fn();
  const mockOnPurchase = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should render item information correctly', () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem as WishlistItemType}
        onView={mockOnView}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isOwner={true}
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
        item={mockItem as WishlistItemType}
        onView={mockOnView}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isOwner={true}
      />
    );
    
    // Assert
    const image = screen.getByAltText(/Wireless Headphones/i);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', mockItem.imageUrl);
  });
  
  it('should handle view/click event to open product page', () => {
    // Arrange
    render(
      <WishlistItem 
        item={mockItem as WishlistItemType}
        onView={mockOnView}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isOwner={true}
      />
    );
    
    // Act
    const viewButton = screen.getByText(/view/i) || screen.getByLabelText(/view/i);
    fireEvent.click(viewButton);
    
    // Assert
    expect(mockOnView).toHaveBeenCalledWith(mockItem.id);
  });
  
  it('should handle reserve button click', () => {
    // Arrange
    render(
      <WishlistItem 
        item={{...mockItem, reservedByUserId: null} as WishlistItemType}
        onView={mockOnView}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isOwner={false}
      />
    );
    
    // Act
    const reserveButton = screen.getByText(/reserve/i);
    fireEvent.click(reserveButton);
    
    // Assert
    expect(mockOnReserve).toHaveBeenCalledWith(mockItem.id);
  });
  
  it('should handle purchase button click', () => {
    // Arrange
    render(
      <WishlistItem 
        item={{...mockItem, purchasedByUserId: null} as WishlistItemType}
        onView={mockOnView}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isOwner={false}
      />
    );
    
    // Act
    const purchaseButton = screen.getByText(/purchase/i) || screen.getByText(/mark as purchased/i);
    fireEvent.click(purchaseButton);
    
    // Assert
    expect(mockOnPurchase).toHaveBeenCalledWith(mockItem.id);
  });
  
  it('should handle edit button click when user is the owner', () => {
    // Arrange
    render(
      <WishlistItem 
        item={mockItem as WishlistItemType}
        onView={mockOnView}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isOwner={true}
      />
    );
    
    // Act
    const editButton = screen.getByLabelText(/edit/i) || screen.getByTitle(/edit/i);
    fireEvent.click(editButton);
    
    // Assert
    expect(mockOnEdit).toHaveBeenCalledWith(mockItem);
  });
  
  it('should handle delete button click when user is the owner', () => {
    // Arrange
    render(
      <WishlistItem 
        item={mockItem as WishlistItemType}
        onView={mockOnView}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isOwner={true}
      />
    );
    
    // Act
    const deleteButton = screen.getByLabelText(/delete/i) || screen.getByTitle(/delete/i);
    fireEvent.click(deleteButton);
    
    // Assert
    expect(mockOnDelete).toHaveBeenCalledWith(mockItem.id);
  });
  
  it('should not show edit and delete buttons for non-owners', () => {
    // Arrange & Act
    render(
      <WishlistItem 
        item={mockItem as WishlistItemType}
        onView={mockOnView}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isOwner={false}
      />
    );
    
    // Assert
    const editButton = screen.queryByLabelText(/edit/i) || screen.queryByTitle(/edit/i);
    const deleteButton = screen.queryByLabelText(/delete/i) || screen.queryByTitle(/delete/i);
    
    expect(editButton).not.toBeInTheDocument();
    expect(deleteButton).not.toBeInTheDocument();
  });
  
  it('should display reserved status when item is reserved', () => {
    // Arrange
    const reservedItem = {
      ...mockItem,
      reservedByUserId: 2
    };
    
    // Act
    render(
      <WishlistItem 
        item={reservedItem as WishlistItemType}
        onView={mockOnView}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isOwner={true}
      />
    );
    
    // Assert
    expect(screen.getByText(/reserved/i)).toBeInTheDocument();
    
    // Reserve button should be disabled or not present
    const reserveButton = screen.queryByText(/reserve/i);
    if (reserveButton) {
      expect(reserveButton).toBeDisabled();
    } else {
      expect(reserveButton).not.toBeInTheDocument();
    }
  });
  
  it('should display purchased status when item is purchased', () => {
    // Arrange
    const purchasedItem = {
      ...mockItem,
      purchasedByUserId: 2,
      purchasedAt: new Date().toISOString()
    };
    
    // Act
    render(
      <WishlistItem 
        item={purchasedItem as WishlistItemType}
        onView={mockOnView}
        onReserve={mockOnReserve}
        onPurchase={mockOnPurchase}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isOwner={true}
      />
    );
    
    // Assert
    expect(screen.getByText(/purchased/i)).toBeInTheDocument();
    
    // Reserve and purchase buttons should be disabled or not present
    const reserveButton = screen.queryByText(/reserve/i);
    const purchaseButton = screen.queryByText(/purchase/i) || screen.queryByText(/mark as purchased/i);
    
    if (reserveButton) {
      expect(reserveButton).toBeDisabled();
    } else {
      expect(reserveButton).not.toBeInTheDocument();
    }
    
    if (purchaseButton) {
      expect(purchaseButton).toBeDisabled();
    } else {
      expect(purchaseButton).not.toBeInTheDocument();
    }
  });
});