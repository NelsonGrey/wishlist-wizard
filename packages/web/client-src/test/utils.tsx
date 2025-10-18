import React, { PropsWithChildren } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

// Create a custom render function that includes providers
function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { 
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
                  store: 'Test Store',
                  imageUrl: 'https://example.com/image1.jpg',
                  wishlistId: 1,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                {
                  id: 2,
                  title: 'Test Item 2', 
                  price: '$49.99',
                  store: 'Another Store',
                  imageUrl: 'https://example.com/image2.jpg',
                  wishlistId: 1,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              ];
            }
            
            // For other queries, return empty array or null
            return [];
          },
        },
      },
    }),
    pathname = '/',
    ...renderOptions
  } = options || {};
  
  function AllTheProviders({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
  
  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render method
export { customRender as render };