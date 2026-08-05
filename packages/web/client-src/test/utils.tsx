import React, { PropsWithChildren } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { vi } from 'vitest';

// Mock the apiRequest function to prevent real API calls in tests
vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual('@/lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn(async (url: string) => {
      // Mock responses based on URL patterns
      if (url.includes('/api/privacy/settings/')) {
        return {
          id: 1,
          userId: 1,
          entityType: 'item',
          entityId: 1,
          visibilityLevel: 'public',
          customAccessList: [],
          allowComments: true,
          allowReservations: true,
          requireApproval: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      
      if (url.includes('/api/privacy/defaults')) {
        return {
          defaultWishlistVisibility: 'public',
          defaultItemVisibility: 'public',
          allowComments: true,
          allowReservations: true,
          requireApproval: false,
        };
      }
      
      // Default mock response for any other API calls
      return {};
    }),
  };
});

// Create a custom render function that includes providers
function customRender(
  ui: React.ReactElement,
  options?: RenderOptions & { 
    queryClient?: QueryClient;
    pathname?: string;
  }
) {
  const { 
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          queryFn: async ({ queryKey }) => {
            // Default query function for tests - return mock data based on query key
            const [endpoint] = queryKey as string[];
            
            if (endpoint?.startsWith('/api/wishlists/') && endpoint?.endsWith('/items')) {
              // Mock wishlist items data
              return [
                {
                  id: 1,
                  title: 'Test Item 1',
                  price: '$29.99',
                  numericPrice: '29.99',
                  store: 'Test Store',
                  imageUrl: 'https://example.com/image1.jpg',
                  productUrl: 'https://example.com/product-1',
                  note: null,
                  category: null,
                  brand: null,
                  description: null,
                  availability: null,
                  rating: null,
                  reviewCount: null,
                  priceHistory: [],
                  metadata: {},
                  popularity: 0,
                  productIdentifier: null,
                  reservedByUserId: null,
                  reservedAt: null,
                  purchasedByUserId: null,
                  purchasedAt: null,
                  wishlistId: 1,
                  createdAt: new Date().toISOString(),
                },
                {
                  id: 2,
                  title: 'Test Item 2', 
                  price: '$49.99',
                  numericPrice: '49.99',
                  store: 'Another Store',
                  imageUrl: 'https://example.com/image2.jpg',
                  productUrl: 'https://example.com/product-2',
                  note: null,
                  category: null,
                  brand: null,
                  description: null,
                  availability: null,
                  rating: null,
                  reviewCount: null,
                  priceHistory: [],
                  metadata: {},
                  popularity: 0,
                  productIdentifier: null,
                  reservedByUserId: null,
                  reservedAt: null,
                  purchasedByUserId: null,
                  purchasedAt: null,
                  wishlistId: 1,
                  createdAt: new Date().toISOString(),
                }
              ];
            }

            if (endpoint?.startsWith('/api/wishlists/')) {
              return {
                id: 1,
                name: 'Test Wishlist',
                userId: 1,
                beneficiaryId: null,
                shareId: 'test-share-id',
                isPublic: false,
                isCollaborative: false,
                createdAt: new Date().toISOString(),
                updatedAt: '2026-02-20T12:00:00.000Z',
                occasion: null,
                occasionDate: null,
                recurrence: 'none',
                reminderDays: null,
                description: null,
              };
            }
            
            // For other queries, return empty array or null
            return [];
          },
        },
      },
    }),
    wrapper: UserWrapper,
    ...renderOptions
  } = options || {};
  
  function AllTheProviders({ children }: PropsWithChildren) {
    const content = (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </QueryClientProvider>
    );

    if (UserWrapper) {
      return <UserWrapper>{content}</UserWrapper>;
    }

    return content;
  }
  
  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render method
export { customRender as render };
