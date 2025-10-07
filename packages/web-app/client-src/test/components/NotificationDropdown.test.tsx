import { vi, describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import { NotificationDropdown } from '@/components/ui/NotificationDropdown';
import { apiRequest } from '@/lib/queryClient';

// Mock the API request function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn()
  }
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
    })
  };
});

describe('NotificationDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation for useQuery
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      data: {
        notifications: [
          {
            id: 1,
            title: 'Test Notification',
            message: 'This is a test notification',
            isRead: false,
            createdAt: new Date().toISOString(),
            type: 'wishlist_created',
            actionUrl: '/wishlists/1'
          }
        ],
        unreadCount: 1
      },
      isLoading: false
    });
  });

  it('should render the notification bell with unread count badge', () => {
    // Arrange & Act
    render(<NotificationDropdown />);
    
    // Assert
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should open the popover when clicked', async () => {
    // Arrange
    render(<NotificationDropdown />);
    const user = userEvent.setup();
    
    // Act
    await user.click(screen.getByRole('button'));
    
    // Assert
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('This is a test notification')).toBeInTheDocument();
  });

  it('should show "No notifications yet" when there are no notifications', () => {
    // Arrange
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      data: { notifications: [], unreadCount: 0 },
      isLoading: false
    });
    
    // Act
    render(<NotificationDropdown />);
    const user = userEvent.setup();
    
    // Assert - Open the popover to check content
    user.click(screen.getByRole('button'));
    expect(screen.queryByText('No notifications yet')).toBeInTheDocument();
  });

  it('should show "Mark all as read" button when there are unread notifications', async () => {
    // Arrange
    render(<NotificationDropdown />);
    const user = userEvent.setup();
    
    // Act
    await user.click(screen.getByRole('button'));
    
    // Assert
    expect(screen.getByText('Mark all as read')).toBeInTheDocument();
  });

  it('should not show "Mark all as read" button when all notifications are read', async () => {
    // Arrange
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      data: {
        notifications: [
          {
            id: 1,
            title: 'Test Notification',
            message: 'This is a test notification',
            isRead: true,
            createdAt: new Date().toISOString()
          }
        ],
        unreadCount: 0
      },
      isLoading: false
    });
    
    render(<NotificationDropdown />);
    const user = userEvent.setup();
    
    // Act
    await user.click(screen.getByRole('button'));
    
    // Assert
    expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument();
  });

  it('should mark a notification as read when clicked', async () => {
    // Arrange
    const { useMutation } = require('@tanstack/react-query');
    const markAsReadMutation = { mutate: vi.fn() };
    useMutation.mockReturnValueOnce(markAsReadMutation);
    
    render(<NotificationDropdown />);
    const user = userEvent.setup();
    
    // Act
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Test Notification'));
    
    // Assert
    expect(markAsReadMutation.mutate).toHaveBeenCalledWith(1);
  });

  it('should handle loading state', () => {
    // Arrange
    const { useQuery } = require('@tanstack/react-query');
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: true
    });
    
    // Act
    render(<NotificationDropdown />);
    const user = userEvent.setup();
    
    // Assert
    user.click(screen.getByRole('button'));
    // Should show loading indicator
    expect(screen.queryByText('Test Notification')).not.toBeInTheDocument();
  });
});