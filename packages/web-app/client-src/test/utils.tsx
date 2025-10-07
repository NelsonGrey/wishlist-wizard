import React, { PropsWithChildren } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Router } from 'wouter';

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
        },
      },
    }),
    pathname = '/',
    ...renderOptions
  } = options || {};
  
  function AllTheProviders({ children }: PropsWithChildren<{}>) {
    // Use test routing with a static location
    const staticNavigator = {
      hook: () => [pathname, () => {}]
    };
    
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router navigator={staticNavigator}>
            {children}
          </Router>
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