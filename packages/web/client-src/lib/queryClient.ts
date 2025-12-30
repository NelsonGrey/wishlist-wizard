import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuth } from "firebase/auth";

// API Base URL - use Firebase Functions in production, Express.js API server in development
const API_BASE_URL = import.meta.env.PROD 
  ? "https://api-ph6if7thka-uc.a.run.app"  // Firebase Cloud Functions URL
  : "http://localhost:3001";  // Local Express.js API server

// Firebase Functions URL for production
const FIREBASE_FUNCTIONS_URL = import.meta.env.PROD 
  ? "https://us-central1-wishlist-wizard.cloudfunctions.net"
  : "http://localhost:5001/wishlist-wizard/us-central1";

/**
 * Get Firebase Auth ID token for authenticated requests
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      // Force refresh token to ensure it's valid
      const token = await user.getIdToken(true);
      return token;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to get Firebase auth token:', error);
    return null;
  }
}

/**
 * Determine if we should use Firebase Functions instead of Express API
 */
function shouldUseFirebaseFunctions(url: string): boolean {
  // Use Firebase Functions for specific endpoints in production
  if (!import.meta.env.PROD) {
    return false;
  }
  
  // List of API endpoints that have been migrated to Firebase Functions
  const firebaseFunctionEndpoints = [
    '/api/auth/me',
    '/api/users/search',
    '/api/notifications',
    '/api/price-alerts'
  ];
  
  return firebaseFunctionEndpoints.some(endpoint => url.startsWith(endpoint));
}

/**
 * Convert Express API endpoint to Firebase Function name
 */
function getFirebaseFunctionName(url: string): string {
  // Map API endpoints to Firebase Function names
  const endpointMapping: Record<string, string> = {
    '/api/auth/me': 'getCurrentUser',
    '/api/users/search': 'searchUsers',
    '/api/notifications': 'getUserNotifications',
    '/api/price-alerts': 'getUserPriceAlerts'
  };
  
  for (const [endpoint, functionName] of Object.entries(endpointMapping)) {
    if (url.startsWith(endpoint)) {
      return functionName;
    }
  }
  
  // Default fallback - convert URL path to function name
  return url.replace('/api/', '').replace(/\//g, '_');
}

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
    useFirebaseFunctions?: boolean;
  }
): Promise<unknown> {
  const { method = "GET", body, useFirebaseFunctions } = options || {};
  
  // Determine if we should use Firebase Functions
  const useFunctions = useFirebaseFunctions ?? shouldUseFirebaseFunctions(url);
  
  let fullUrl: string;
  const headers: Record<string, string> = {};
  
  if (useFunctions) {
    // Use Firebase Functions
    const functionName = getFirebaseFunctionName(url);
    fullUrl = `${FIREBASE_FUNCTIONS_URL}/${functionName}`;
    
    // Get Firebase Auth token for authenticated requests
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } else {
    // Use traditional Express.js API
    fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    // Get Firebase Auth token for Express.js API as well (for Firebase Auth middleware)
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  
  const fetchOptions: RequestInit = {
    method,
    headers,
    credentials: useFunctions ? 'omit' : 'include', // Firebase Functions don't use cookies
  };
  
  if (body) {
    if (useFunctions) {
      // Firebase Functions expect data in the request body
      fetchOptions.body = JSON.stringify({ data: body });
    } else {
      // Express.js API expects direct JSON body
      fetchOptions.body = JSON.stringify(body);
    }
  }
  
  const res = await fetch(fullUrl, fetchOptions);

  await throwIfResNotOk(res);
  
  // Check if the response is actually JSON before trying to parse it
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const jsonResponse = await res.json();
    
    // Firebase Functions wrap responses in a 'data' property
    if (useFunctions && jsonResponse.data !== undefined) {
      return jsonResponse.data;
    }
    
    return jsonResponse;
  } else {
    // If it's not JSON, return the text or throw an error
    const text = await res.text();
    throw new Error(`API returned non-JSON response: ${text.substring(0, 200)}...`);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = <T,>(options: {
  on401: UnauthorizedBehavior;
  useFirebaseFunctions?: boolean;
}): QueryFunction<T> =>
  async ({ queryKey }) => {
    try {
      const url = queryKey[0] as string;

      // Use apiRequest for consistent handling of both Express API and Firebase Functions
      try {
        return await apiRequest(url, {
          method: 'GET',
          useFirebaseFunctions: options.useFirebaseFunctions
        }) as T;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Handle 401 errors
        if (errorMessage.includes('401')) {
          if (options.on401 === "returnNull") {
            return null as T;
          }
          throw error;
        }

        // Handle other API errors gracefully
        if (import.meta.env.DEV && !errorMessage.includes('API endpoint not available')) {
          console.warn(`API call failed for ${url}:`, error);
        }

        return (options.on401 === "returnNull" ? null : []) as T;
      }

    } catch (error) {
      // Handle network errors gracefully - only log if it's not an API availability issue
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (import.meta.env.DEV && !errorMessage.includes('API endpoint not available')) {
        console.warn(`Network error for ${queryKey[0]}:`, error);
      }
      return (options.on401 === "returnNull" ? null : []) as T;
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
