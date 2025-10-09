import { QueryClient, QueryFunction } from "@tanstack/react-query";

// API Base URL - use Firebase Functions in production
const API_BASE_URL = import.meta.env.PROD 
  ? "https://api-ph6if7thka-uc.a.run.app"
  : "http://localhost:3001";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // For API calls, check if we got HTML instead of JSON (404 pages)
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      // If we got HTML, it's likely a 404 page, so provide a cleaner error
      throw new Error(`API endpoint not available (${res.status})`);
    }
    
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
  }
): Promise<any> {
  const { method = "GET", body } = options || {};
  
  // Ensure the URL uses the correct API base
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const res = await fetch(fullUrl, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Check if the response is actually JSON before trying to parse it
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  } else {
    // If it's not JSON, return the text or throw an error
    const text = await res.text();
    throw new Error(`API returned non-JSON response: ${text.substring(0, 200)}...`);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const url = queryKey[0] as string;
      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      
      const res = await fetch(fullUrl, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      // If API is not available (404, 500, etc), return empty data instead of throwing
      if (!res.ok) {
        // Only log if it's not a 404 (API endpoint not found)
        if (res.status !== 404) {
          console.warn(`API call failed: ${res.status} ${res.statusText} for ${queryKey[0]}`);
        }
        return unauthorizedBehavior === "returnNull" ? null : [];
      }

      // Check if the response is actually JSON before trying to parse it
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      } else {
        // If it's not JSON (e.g., HTML 404 page), return empty data silently
        return unauthorizedBehavior === "returnNull" ? null : [];
      }
    } catch (error) {
      // Handle network errors gracefully - only log if it's not an API availability issue
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (import.meta.env.DEV && !errorMessage.includes('API endpoint not available')) {
        console.warn(`Network error for ${queryKey[0]}:`, error);
      }
      return unauthorizedBehavior === "returnNull" ? null : [];
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
