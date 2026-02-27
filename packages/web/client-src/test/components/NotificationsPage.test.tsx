// Mock useQuery hook properly for React Query v5
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(),
  };
});

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import Notifications from '@/pages/Notifications';
import { format } from 'date-fns';
import { useQuery, useMutation } from '@tanstack/react-query';

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

describe('Notifications Page', () => {
  const mockDate = new Date('2023-05-19T12:00:00Z');
  const formattedDate = format(mockDate, 'MMM d, yyyy h:mm a');
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useQuery to return default data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: {
        notifications: [
          {
            id: 1,
            title: 'New Wishlist Created',
            content: 'A new wishlist "Birthday Wishes" has been created by John.',
            isRead: false,
            createdAt: mockDate.toISOString(),
            type: 'wishlist_created',
            actionUrl: '/wishlists/1'
          },
          {
            id: 2,
            title: 'Item Added',
            content: 'Jane added "Wireless Headphones" to the wishlist "Tech Gadgets".',
            isRead: true,
            createdAt: mockDate.toISOString(),
            type: 'item_added',
            actionUrl: '/wishlists/2'
          }
        ],
        unreadCount: 1
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    
    // Mock useMutation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useMutation as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false
    });
  });

  it('should render the notifications page with headers and notifications', () => {
    // Arrange & Act
    render(<Notifications />, { pathname: '/notifications' });
    
    // Assert - Use getAllByText to get all matches and verify at least one exists
    const notificationTexts = screen.getAllByText('Notifications');
    expect(notificationTexts.length).toBeGreaterThan(0);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: {
        notifications: [
          {
            id: 1,
            title: 'New Wishlist Created',
            content: 'A new wishlist "Birthday Wishes" has been created by John.',
            isRead: true,
            createdAt: mockDate.toISOString(),
            type: 'wishlist_created'
          }
        ],
        unreadCount: 0
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    
    // Act
    render(<Notifications />, { pathname: '/notifications' });
    
    // Assert - Button should be hidden when there are no unread notifications
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: {
        notifications: [
          {
            id: 1,
            title: 'System Notification',
            content: 'Your account has been updated.',
            isRead: false,
            createdAt: mockDate.toISOString(),
            type: 'system'
            // No actionUrl
          }
        ],
        unreadCount: 1
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    
    // Act
    render(<Notifications />, { pathname: '/notifications' });
    
    // Assert
    expect(screen.getByText('Mark as read')).toBeInTheDocument();
  });

  it('should trigger mark as read mutation when "Mark as read" button is clicked', async () => {
    // Arrange
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: {
        notifications: [
          {
            id: 1,
            title: 'System Notification',
            content: 'Your account has been updated.',
            isRead: false,
            createdAt: mockDate.toISOString(),
            type: 'system'
            // No actionUrl
          }
        ],
        unreadCount: 1
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    
    const markAsReadMutation = { mutate: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useMutation as any).mockReturnValue(markAsReadMutation);
    
    render(<Notifications />, { pathname: '/notifications' });
    const user = userEvent.setup();
    
    // Act
    await user.click(screen.getByText('Mark as read'));
    
    // Assert
    expect(markAsReadMutation.mutate).toHaveBeenCalledWith(1);
  });

  it('should show loading state when isLoading is true', () => {
    // Arrange
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    
    // Act
    render(<Notifications />, { pathname: '/notifications' });
    
    // Assert
    // Should not show any notifications
    expect(screen.queryByText('New Wishlist Created')).not.toBeInTheDocument();
    // Should show loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show empty state when there are no notifications', () => {
    // Arrange
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: { notifications: [], unreadCount: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    
    // Act
    render(<Notifications />, { pathname: '/notifications' });
    
    // Assert
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    expect(screen.getByText("You'll see notifications about activity on your wishlists here.")).toBeInTheDocument();
  });

  it('should render safely when notification timestamp is invalid', () => {
    // Arrange
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: {
        notifications: [
          {
            id: 7,
            title: 'Corrupt Notification',
            content: 'This notification has an invalid timestamp.',
            isRead: false,
            createdAt: 'not-a-valid-date',
            type: 'system',
          },
        ],
        unreadCount: 1,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    // Act
    render(<Notifications />, { pathname: '/notifications' });

    // Assert
    expect(screen.getByText('Corrupt Notification')).toBeInTheDocument();
    expect(screen.getByText('Unknown time')).toBeInTheDocument();
  });

  it('should show query error state and retry action', async () => {
    const refetch = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network down'),
      refetch,
    });

    render(<Notifications />, { pathname: '/notifications' });

    expect(screen.getByText('Unable to load notifications')).toBeInTheDocument();
    expect(screen.getByText('Network down')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
