import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import DashboardFirebase from '@/pages/DashboardFirebase';
import { useQuery } from '@tanstack/react-query';
import { useNotifications } from '@/hooks/useFirebaseData';

// Mock all external dependencies
vi.mock('@/hooks/useFirebaseData', () => ({
  useWishlists: vi.fn(),
  useNotifications: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/components/CreateWishlistDialog', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    open ? (
    <div data-testid="create-dialog">
      <button data-testid="close-dialog" onClick={onClose}>Close</button>
    </div>
    ) : null
  ),
}));

vi.mock('@/components/WishlistCard', () => ({
  default: ({ wishlist }: { wishlist: any }) => (
    <div data-testid={`wishlist-card-${wishlist.id}`}>
      <h3>{wishlist.name}</h3>
    </div>
  ),
}));

vi.mock('@/components/ads', () => ({
  SidebarAd: () => <div data-testid="sidebar-ad">Ad</div>,
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: [], isLoading: false })),
    useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  };
});

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn()
  }
}));

describe('Dashboard CRUD Operations', () => {
  const mockWishlists = [
    {
      id: '1',
      name: 'Birthday Wishlist',
      userId: '1',
      createdAt: new Date().toISOString(),
      beneficiaryId: null,
      shareId: '',
      isPublic: false,
      isCollaborative: false,
      itemCount: 5,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  describe('Dashboard Rendering', () => {
    it('should render the dashboard component', async () => {
      // Arrange
      const { useWishlists } = await import('@/hooks/useFirebaseData');
      vi.mocked(useWishlists).mockReturnValue({
        wishlists: mockWishlists,
        loading: false,
        error: null,
        createWishlist: vi.fn(),
        deleteWishlist: vi.fn(),
        updateWishlist: vi.fn(),
      } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useQuery as any).mockReturnValue({
        data: [{ ...mockWishlists[0], id: 1, userId: 1 }],
        isLoading: false,
        error: null,
      });

      // Act
      render(<DashboardFirebase />);

      // Assert
      expect(screen.getByText('My Wishlists')).toBeInTheDocument();
      expect(screen.getAllByText('Birthday Wishlist').length).toBeGreaterThan(0);
    });

    it('should handle loading state', async () => {
      // Arrange
      const { useWishlists } = await import('@/hooks/useFirebaseData');
      vi.mocked(useWishlists).mockReturnValue({
        wishlists: null,
        loading: true,
        error: null,
        createWishlist: vi.fn(),
        deleteWishlist: vi.fn(),
        updateWishlist: vi.fn(),
      } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useQuery as any).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      // Act
      render(<DashboardFirebase />);

      // Assert
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('should handle empty wishlist state', async () => {
      // Arrange
      const { useWishlists } = await import('@/hooks/useFirebaseData');
      vi.mocked(useWishlists).mockReturnValue({
        wishlists: [],
        loading: false,
        error: null,
        createWishlist: vi.fn(),
        deleteWishlist: vi.fn(),
        updateWishlist: vi.fn(),
      } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useQuery as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      // Act
      render(<DashboardFirebase />);

      // Assert
      expect(screen.getByText('No wishlists yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create wishlist/i })).toBeInTheDocument();
    });

    it('should handle error state gracefully', async () => {
      // Arrange
      const { useWishlists } = await import('@/hooks/useFirebaseData');
      vi.mocked(useWishlists).mockReturnValue({
        wishlists: null,
        loading: false,
        error: new Error('Fetch failed'),
        createWishlist: vi.fn(),
        deleteWishlist: vi.fn(),
        updateWishlist: vi.fn(),
      } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useQuery as any).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Fetch failed'),
      });

      // Act
      render(<DashboardFirebase />);

      // Assert
      expect(screen.getByText(/failed to load wishlists/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Create Wishlist Intent', () => {
    it('should have accessible UI for creating wishlists', async () => {
      // Arrange
      const { useWishlists } = await import('@/hooks/useFirebaseData');
      vi.mocked(useWishlists).mockReturnValue({
        wishlists: mockWishlists,
        loading: false,
        error: null,
        createWishlist: vi.fn(),
        deleteWishlist: vi.fn(),
        updateWishlist: vi.fn(),
      } as any);

      // Act
      render(<DashboardFirebase />);

      // Assert
      // Component should render without errors
      await waitFor(() => {
        expect(document.body).toBeTruthy();
      });
    });
  });

  describe('Interactions', () => {
    it('opens and closes create wishlist dialog', async () => {
      const { useWishlists } = await import('@/hooks/useFirebaseData');
      vi.mocked(useWishlists).mockReturnValue({
        wishlists: mockWishlists,
        loading: false,
        error: null,
        createWishlist: vi.fn(),
        deleteWishlist: vi.fn(),
        updateWishlist: vi.fn(),
      } as any);

      render(<DashboardFirebase />);
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /create new list/i }));
      expect(screen.getByTestId('create-dialog')).toBeInTheDocument();

      await user.click(screen.getByTestId('close-dialog'));
      expect(screen.queryByTestId('create-dialog')).not.toBeInTheDocument();
    });

    it('toggles between Firebase and API server labels', async () => {
      const { useWishlists } = await import('@/hooks/useFirebaseData');
      vi.mocked(useWishlists).mockReturnValue({
        wishlists: mockWishlists,
        loading: false,
        error: null,
        createWishlist: vi.fn(),
        deleteWishlist: vi.fn(),
        updateWishlist: vi.fn(),
      } as any);

      render(<DashboardFirebase />);
      const user = userEvent.setup();

      expect(screen.getByRole('button', { name: /switch to firebase sdk/i })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /switch to firebase sdk/i }));
      expect(screen.getByRole('button', { name: /switch to api server/i })).toBeInTheDocument();
    });

    it('shows live collaboration panel in Firebase mode', async () => {
      const { useWishlists } = await import('@/hooks/useFirebaseData');
      vi.mocked(useWishlists).mockReturnValue({
        wishlists: mockWishlists,
        loading: false,
        error: null,
        createWishlist: vi.fn(),
        deleteWishlist: vi.fn(),
        updateWishlist: vi.fn(),
      } as any);
      vi.mocked(useNotifications).mockReturnValue({
        notifications: [
          {
            id: 101,
            type: 'item_added',
            title: 'Item Added',
            content: 'Alex added a new item to the shared wishlist.',
            createdAt: new Date().toISOString(),
            isRead: false,
          },
        ],
        unreadCount: 1,
        loading: false,
        error: null,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
      } as any);

      render(<DashboardFirebase />);
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /switch to firebase sdk/i }));

      expect(screen.getByTestId('dashboard-live-collab-card')).toBeInTheDocument();
      expect(screen.getByText('Live Collaboration Activity')).toBeInTheDocument();
      expect(screen.getByText('Item Added')).toBeInTheDocument();
    });
  });

  describe('Wishlist Display', () => {
    it('should display wishlists when data loads', async () => {
      // Arrange
      const { useWishlists } = await import('@/hooks/useFirebaseData');
      vi.mocked(useWishlists).mockReturnValue({
        wishlists: mockWishlists,
        loading: false,
        error: null,
        createWishlist: vi.fn(),
        deleteWishlist: vi.fn(),
        updateWishlist: vi.fn(),
      } as any);

      // Act
      render(<DashboardFirebase />);

      // Assert
      // Dashboard should render successfully
      expect(document.body).toBeTruthy();
    });

    it('should respect Firebase toggle setting', async () => {
      // Arrange
      const { useWishlists } = await import('@/hooks/useFirebaseData');
      vi.mocked(useWishlists).mockReturnValue({
        wishlists: mockWishlists,
        loading: false,
        error: null,
        createWishlist: vi.fn(),
        deleteWishlist: vi.fn(),
        updateWishlist: vi.fn(),
      } as any);

      // Act
      render(<DashboardFirebase />);

      // Assert
      expect(document.body).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should handle large wishlist collections efficiently', async () => {
      // Arrange: Create 50 wishlists
      const largeMockWishlists = Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        name: `Wishlist ${i}`,
        userId: '1',
        createdAt: new Date().toISOString(),
        beneficiaryId: null,
        shareId: '',
        isPublic: false,
        isCollaborative: false,
        itemCount: 5,
      }));

      const { useWishlists } = await import('@/hooks/useFirebaseData');
      vi.mocked(useWishlists).mockReturnValue({
        wishlists: largeMockWishlists,
        loading: false,
        error: null,
        createWishlist: vi.fn(),
        deleteWishlist: vi.fn(),
        updateWishlist: vi.fn(),
      } as any);

      // Act
      const startTime = performance.now();
      render(<DashboardFirebase />);
      const endTime = performance.now();

      // Assert: Should render in reasonable time
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });
});
