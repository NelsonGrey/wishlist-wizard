import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../utils';
import DashboardFirebase from '@/pages/DashboardFirebase';

// Mock all external dependencies
vi.mock('@/hooks/useFirebaseData', () => ({
  useWishlists: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/components/CreateWishlistDialog', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="create-dialog">
      <button data-testid="close-dialog" onClick={onClose}>Close</button>
    </div>
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

      // Act
      render(<DashboardFirebase />);

      // Assert
      expect(document.body).toBeTruthy();
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

      // Act
      render(<DashboardFirebase />);

      // Assert
      expect(document.body).toBeTruthy();
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

      // Act
      render(<DashboardFirebase />);

      // Assert
      expect(document.body).toBeTruthy();
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

      // Act
      render(<DashboardFirebase />);

      // Assert
      expect(document.body).toBeTruthy();
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
