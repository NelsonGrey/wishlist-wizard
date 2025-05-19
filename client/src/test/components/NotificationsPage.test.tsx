import { vi, describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import Notifications from '@/pages/Notifications';
import { format } from 'date-fns';

// Mock the API request function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn()
  }
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock useQuery hook
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn().mockReturnValue({
      mutate: vi.fn(),
      isPending: false
    }),
    useQueryClient: vi.fn().mockReturnValue({
      invalidateQueries: vi.fn()
    })
  };
});

describe('Notifications Page', () => {
  const mockDate = new Date('2023-05-19T12:00:00Z');
  const formattedDate = format(mockDate, 'MMM d, yyyy h:mm a');
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation for useQuery
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      data: {
        notifications: [
          {
            id: 1,
            title: 'New Wishlist Created',
            message: 'A new wishlist "Birthday Wishes" has been created by John.',
            isRead: false,
            createdAt: mockDate.toISOString(),
            type: 'wishlist_created',
            actionUrl: '/wishlists/1'
          },
          {
            id: 2,
            title: 'Item Added',
            message: 'Jane added "Wireless Headphones" to the wishlist "Tech Gadgets".',
            isRead: true,
            createdAt: mockDate.toISOString(),
            type: 'item_added',
            actionUrl: '/wishlists/2'
          }
        ],
        unreadCount: 1
      },
      isLoading: false
    });
    
    // Mock useMutation implementations
    const { useMutation } = require('@tanstack/react-query');
    
    // Mark as read mutation
    useMutation.mockReturnValueOnce({
      mutate: vi.fn(),
      isPending: false
    });
    
    // Mark all as read mutation
    useMutation.mockReturnValueOnce({
      mutate: vi.fn(),
      isPending: false
    });
    
    // Delete notification mutation
    useMutation.mockReturnValueOnce({
      mutate: vi.fn(),
      isPending: false
    });
  });

  it('should render the notifications page with headers and notifications', () => {
    // Arrange & Act
    render(<Notifications />, { pathname: '/notifications' });
    
    // Assert
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('New Wishlist Created')).toBeInTheDocument();
    expect(screen.getByText('Item Added')).toBeInTheDocument();
    expect(screen.getByText('A new wishlist "Birthday Wishes" has been created by John.')).toBeInTheDocument();
  });

  it('should show the "Mark all as read" button when there are unread notifications', () => {
    // Arrange & Act
    render(<Notifications />, { pathname: '/notifications' });
    
    // Assert
    expect(screen.getByText('Mark all as read')).toBeInTheDocument();
  });

  it('should not show "Mark all as read" button when all notifications are read', () => {
    // Arrange
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      data: {
        notifications: [
          {
            id: 1,
            title: 'New Wishlist Created',
            message: 'A new wishlist "Birthday Wishes" has been created by John.',
            isRead: true,
            createdAt: mockDate.toISOString(),
            type: 'wishlist_created'
          }
        ],
        unreadCount: 0
      },
      isLoading: false
    });
    
    // Act
    render(<Notifications />, { pathname: '/notifications' });
    
    // Assert
    expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument();
  });

  it('should show formatted date for each notification', () => {
    // Arrange & Act
    render(<Notifications />, { pathname: '/notifications' });
    
    // Assert
    // Each notification should display the formatted date
    const dateElements = screen.getAllByText(formattedDate);
    expect(dateElements.length).toBe(2);
  });

  it('should show the "View" button for notifications with action URLs', () => {
    // Arrange & Act
    render(<Notifications />, { pathname: '/notifications' });
    
    // Assert
    const viewButtons = screen.getAllByText('View');
    expect(viewButtons.length).toBe(2); // Both notifications have actionUrls
  });

  it('should show the "Mark as read" button for unread notifications without action URLs', () => {
    // Arrange
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      data: {
        notifications: [
          {
            id: 1,
            title: 'System Notification',
            message: 'Your account has been updated.',
            isRead: false,
            createdAt: mockDate.toISOString(),
            type: 'system'
            // No actionUrl
          }
        ],
        unreadCount: 1
      },
      isLoading: false
    });
    
    // Act
    render(<Notifications />, { pathname: '/notifications' });
    
    // Assert
    expect(screen.getByText('Mark as read')).toBeInTheDocument();
  });

  it('should trigger mark as read mutation when "Mark as read" button is clicked', async () => {
    // Arrange
    const { useQuery, useMutation } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      data: {
        notifications: [
          {
            id: 1,
            title: 'System Notification',
            message: 'Your account has been updated.',
            isRead: false,
            createdAt: mockDate.toISOString(),
            type: 'system'
            // No actionUrl
          }
        ],
        unreadCount: 1
      },
      isLoading: false
    });
    
    const markAsReadMutation = { mutate: vi.fn() };
    useMutation.mockReturnValueOnce(markAsReadMutation)
      .mockReturnValueOnce({ mutate: vi.fn(), isPending: false })
      .mockReturnValueOnce({ mutate: vi.fn(), isPending: false });
    
    render(<Notifications />, { pathname: '/notifications' });
    const user = userEvent.setup();
    
    // Act
    await user.click(screen.getByText('Mark as read'));
    
    // Assert
    expect(markAsReadMutation.mutate).toHaveBeenCalledWith(1);
  });

  it('should show loading state when isLoading is true', () => {
    // Arrange
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: true
    });
    
    // Act
    render(<Notifications />, { pathname: '/notifications' });
    
    // Assert
    // Should not show any notifications
    expect(screen.queryByText('New Wishlist Created')).not.toBeInTheDocument();
    // Should show loading indicator (implementation-specific)
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should show empty state when there are no notifications', () => {
    // Arrange
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      data: { notifications: [], unreadCount: 0 },
      isLoading: false
    });
    
    // Act
    render(<Notifications />, { pathname: '/notifications' });
    
    // Assert
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    expect(screen.getByText("You'll see notifications about activity on your wishlists here.")).toBeInTheDocument();
  });
});