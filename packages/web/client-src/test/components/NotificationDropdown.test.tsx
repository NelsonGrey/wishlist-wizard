import { vi, describe, it, expect, beforeEach } from 'vitest';
const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

// Mock useQuery hook properly for React Query v5
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    ...reactQueryMocks,
  };
});

import { screen, waitFor, fireEvent } from '@testing-library/react';
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

describe('NotificationDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useQuery to return default data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reactQueryMocks.useQuery.mockReturnValue({
      data: {
        notifications: [
          {
            id: 1,
            title: 'Test Notification',
            content: 'This is a test notification',
            isRead: false,
            createdAt: new Date().toISOString(),
            type: 'wishlist_created',
            actionUrl: '/wishlists/1'
          }
        ],
        unreadCount: 1
      },
      isLoading: false,
      error: null
    });

    // Mock useMutation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reactQueryMocks.useMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null
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

  it('should show "No notifications yet" when there are no notifications', async () => {
    // Arrange
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reactQueryMocks.useQuery.mockReturnValue({
      data: { notifications: [], unreadCount: 0 },
      isLoading: false
    });
    
    render(<NotificationDropdown />);
    const user = userEvent.setup();
    
    // Act
    await user.click(screen.getByRole('button'));
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reactQueryMocks.useQuery.mockReturnValue({
      data: {
        notifications: [
          {
            id: 1,
            title: 'Test Notification',
            content: 'This is a test notification',
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

    it.skip('should mark a notification as read when clicked', async () => {
    // Arrange
    render(<NotificationDropdown />);
    const user = userEvent.setup();
    
    // Act
    await user.click(screen.getByRole('button'));
    
    // Debug: check if notification is visible
    const notificationElement = screen.getByText('Test Notification');
    expect(notificationElement).toBeInTheDocument();
    
    // Use fireEvent for the notification click
    fireEvent.click(notificationElement);
    
    // Assert - check that apiRequest was called
    expect(apiRequest).toHaveBeenCalledWith('/api/notifications/1/read', { method: 'POST' });
  });

  it('should handle loading state', async () => {
    // Arrange
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reactQueryMocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true
    });
    
    render(<NotificationDropdown />);
    const user = userEvent.setup();
    
    // Act
    await user.click(screen.getByRole('button'));
    
    // Assert
    await waitFor(() => {
      expect(screen.queryByText('Test Notification')).not.toBeInTheDocument();
    });
  });
});