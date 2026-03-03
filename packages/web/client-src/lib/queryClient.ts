import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp, initFirebase } from "@/lib/firebase";

// API Base URL
// - Uses explicit env override when provided
// - Falls back to local API server in development
// - Falls back to current origin in production to avoid cross-origin CORS issues
const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = configuredApiBaseUrl || (import.meta.env.PROD ? '' : 'http://localhost:3001');

const FIREBASE_FUNCTIONS_REGION = String(import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1');

let functionsEmulatorConnected = false;

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
  // List of API endpoints that are backed by callable Firebase Functions
  const firebaseFunctionEndpoints = [
    '/api/auth/me',
    '/api/wishlists',
    '/api/shared',
    '/api/users/search',
    '/api/calendar',
    '/api/analytics',
    '/api/notifications',
    '/api/fcm',
    '/api/contacts',
    '/api/affiliate',
    '/api/items',
    '/api/mobile',
    '/api/devices',
    '/api/ar'
  ];
  
  return firebaseFunctionEndpoints.some(endpoint => url.startsWith(endpoint));
}

/**
 * Endpoints served by the HTTP `api` Firebase function router (non-callable).
 */
function shouldUseFirebaseApiRouter(url: string): boolean {
  const routerEndpoints = [
    '/api/privacy',
    '/api/recommendations',
    '/api/price-alerts',
    '/api/price-drops',
    '/api/beneficiaries',
    '/api/wishlist-items',
  ];

  return routerEndpoints.some(endpoint => url.startsWith(endpoint));
}

function normalizeBody(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

function resolveFirebaseProjectId(): string {
  const fromApp = String(firebaseApp?.options?.projectId || '').trim();
  if (fromApp) {
    return fromApp;
  }

  const fromEnv = String(
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    import.meta.env.VITE_FIREBASE_PROJECT_ID_DEVELOPMENT ||
    import.meta.env.VITE_FIREBASE_PROJECT_ID_STAGING ||
    import.meta.env.VITE_FIREBASE_PROJECT_ID_PRODUCTION ||
    ''
  ).trim();

  if (!fromEnv) {
    throw new Error('Firebase projectId is not configured for API router requests');
  }

  return fromEnv;
}

function buildFirebaseApiRouterUrl(url: string): string {
  const projectId = resolveFirebaseProjectId();
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;

  if (import.meta.env.PROD) {
    return `https://${FIREBASE_FUNCTIONS_REGION}-${projectId}.cloudfunctions.net/api${normalizedPath}`;
  }

  return `http://localhost:5001/${projectId}/${FIREBASE_FUNCTIONS_REGION}/api${normalizedPath}`;
}

/**
 * Convert Express API endpoint to Firebase Function name
 */
type FunctionRouteMatch = {
  functionName: string;
  data: Record<string, unknown>;
};

function getFirebaseFunctionRoute(url: string, method: string, body?: unknown): FunctionRouteMatch {
  const normalizedMethod = method.toUpperCase();
  const data = (typeof body === 'object' && body !== null && !Array.isArray(body))
    ? { ...(body as Record<string, unknown>) }
    : {};

  const patterns: Array<{ pattern: RegExp; resolve: (match: RegExpExecArray) => FunctionRouteMatch }> = [
    { pattern: /^\/api\/calendar\/events$/, resolve: () => ({ functionName: normalizedMethod === 'POST' ? 'createCalendarEvent' : 'getCalendarEvents', data }) },
    { pattern: /^\/api\/calendar\/events\/([^/]+)$/, resolve: (match) => ({
        functionName: normalizedMethod === 'DELETE' ? 'deleteCalendarEvent' : 'updateCalendarEvent',
        data: { ...data, eventId: match[1] }
      })
    },
    { pattern: /^\/api\/calendar\/auth\/([^/]+)$/, resolve: (match) => ({ functionName: 'getCalendarAuthUrl', data: { ...data, provider: match[1] } }) },
    { pattern: /^\/api\/calendar\/connections$/, resolve: () => ({ functionName: 'getCalendarConnections', data }) },
    { pattern: /^\/api\/calendar\/connect$/, resolve: () => ({ functionName: 'connectCalendar', data }) },
    { pattern: /^\/api\/calendar\/connections\/([^/]+)\/sync$/, resolve: (match) => ({ functionName: 'syncCalendarConnection', data: { ...data, connectionId: match[1] } }) },
    { pattern: /^\/api\/calendar\/connections\/([^/]+)\/settings$/, resolve: (match) => ({ functionName: 'updateCalendarConnectionSettings', data: { ...data, connectionId: match[1] } }) },
    { pattern: /^\/api\/calendar\/connections\/([^/]+)$/, resolve: (match) => ({ functionName: 'disconnectCalendar', data: { ...data, connectionId: match[1] } }) },
    { pattern: /^\/api\/calendar\/sync$/, resolve: () => ({ functionName: 'syncCalendar', data }) },
    { pattern: /^\/api\/calendar\/sync-settings$/, resolve: () => ({ functionName: 'getCalendarSyncSettings', data }) },
    { pattern: /^\/api\/contacts$/, resolve: () => ({ functionName: 'getContacts', data }) },
    { pattern: /^\/api\/contacts\/import$/, resolve: () => ({ functionName: 'importContacts', data }) },
    { pattern: /^\/api\/contacts\/([^/]+)\/hide$/, resolve: (match) => ({ functionName: 'hideContact', data: { ...data, contactId: match[1] } }) },
    { pattern: /^\/api\/contacts\/([^/]+)$/, resolve: (match) => ({ functionName: 'deleteContact', data: { ...data, contactId: match[1] } }) },
    { pattern: /^\/api\/affiliate\/convert$/, resolve: () => ({ functionName: 'convertAffiliateLink', data }) },
    { pattern: /^\/api\/affiliate\/batch-convert$/, resolve: () => ({ functionName: 'batchConvertAffiliateLinks', data }) },
    { pattern: /^\/api\/affiliate\/track-click$/, resolve: () => ({ functionName: 'trackAffiliateClick', data }) },
    { pattern: /^\/api\/affiliate\/convert-wishlist$/, resolve: () => ({ functionName: 'convertWishlistAffiliateLinks', data }) },
    { pattern: /^\/api\/affiliate\/programs$/, resolve: () => ({ functionName: 'getAffiliatePrograms', data }) },
    { pattern: /^\/api\/affiliate\/stats$/, resolve: () => ({ functionName: 'getAffiliateStats', data }) },
    { pattern: /^\/api\/affiliate\/disclosure$/, resolve: () => ({ functionName: 'getAffiliateDisclosure', data }) },
    { pattern: /^\/api\/group-payments\/payment-intent$/, resolve: () => ({ functionName: 'createGroupPaymentIntent', data }) },
    { pattern: /^\/api\/group-payments\/confirm$/, resolve: () => ({ functionName: 'confirmGroupContribution', data }) },
    { pattern: /^\/api\/group-payments\/item\/([^/]+)$/, resolve: (match) => ({ functionName: 'getGroupGiftSummary', data: { ...data, itemId: match[1] } }) },
    { pattern: /^\/api\/mobile\/barcode\/([^/]+)$/, resolve: (match) => ({ functionName: 'lookupBarcode', data: { ...data, barcode: match[1] } }) },
    { pattern: /^\/api\/mobile\/sync$/, resolve: () => ({ functionName: 'syncMobileActions', data }) },
    { pattern: /^\/api\/devices\/register$/, resolve: () => ({ functionName: 'registerDevice', data }) },
    { pattern: /^\/api\/devices$/, resolve: () => ({ functionName: 'listDevices', data }) },
    { pattern: /^\/api\/devices\/update$/, resolve: () => ({ functionName: 'updateDevice', data }) },
    { pattern: /^\/api\/devices\/sync-log$/, resolve: () => ({ functionName: 'logSyncEvent', data }) },
    { pattern: /^\/api\/devices\/sync-logs$/, resolve: () => ({ functionName: 'getSyncLogs', data }) },
    { pattern: /^\/api\/analytics\/track$/, resolve: () => ({ functionName: 'trackAnalyticsEvent', data }) },
    { pattern: /^\/api\/analytics\/events$/, resolve: () => ({ functionName: 'getAnalyticsEvents', data }) },
    { pattern: /^\/api\/analytics\/summary$/, resolve: () => ({ functionName: 'getAnalyticsSummary', data }) },
    { pattern: /^\/api\/ar\/model$/, resolve: () => ({ functionName: 'getARModel', data }) },
    { pattern: /^\/api\/fcm\/token$/, resolve: () => ({ functionName: normalizedMethod === 'DELETE' ? 'removeFCMToken' : 'saveFCMToken', data }) },
    { pattern: /^\/api\/fcm\/subscribe-topic$/, resolve: () => ({ functionName: 'subscribeToTopic', data }) },
    { pattern: /^\/api\/fcm\/unsubscribe-topic$/, resolve: () => ({ functionName: 'unsubscribeFromTopic', data }) },
    { pattern: /^\/api\/fcm\/test-notification$/, resolve: () => ({ functionName: 'sendTestPushNotification', data }) },
    { pattern: /^\/api\/notifications$/, resolve: () => ({ functionName: 'getUserNotifications', data }) },
    { pattern: /^\/api\/notifications\/mark-all-read$/, resolve: () => ({ functionName: 'markAllNotificationsAsRead', data }) },
    { pattern: /^\/api\/notifications\/([^/]+)\/read$/, resolve: (match) => ({ functionName: 'markNotificationAsRead', data: { ...data, notificationId: match[1] } }) },
    { pattern: /^\/api\/notifications\/([^/]+)$/, resolve: (match) => ({ functionName: 'deleteNotification', data: { ...data, notificationId: match[1] } }) },
    { pattern: /^\/api\/notifications\/settings$/, resolve: () => ({ functionName: normalizedMethod === 'POST' ? 'updateNotificationSettings' : 'getNotificationSettings', data }) },
    { pattern: /^\/api\/wishlists$/, resolve: () => ({ functionName: normalizedMethod === 'POST' ? 'createWishlist' : 'getUserWishlists', data }) },
    { pattern: /^\/api\/wishlists\/([^/]+)$/, resolve: (match) => ({
        functionName: normalizedMethod === 'DELETE'
          ? 'deleteWishlist'
          : normalizedMethod === 'PATCH' || normalizedMethod === 'PUT'
            ? 'updateWishlist'
            : 'getWishlistById',
        data: { ...data, wishlistId: match[1] }
      })
    },
    { pattern: /^\/api\/wishlists\/([^/]+)\/items$/, resolve: (match) => ({ functionName: 'getWishlistItems', data: { ...data, wishlistId: match[1] } }) },
    { pattern: /^\/api\/items$/, resolve: () => ({ functionName: 'addWishlistItem', data }) },
    { pattern: /^\/api\/items\/([^/]+)\/reserve$/, resolve: (match) => ({ functionName: 'reserveWishlistItem', data: { ...data, itemId: match[1] } }) },
    { pattern: /^\/api\/items\/([^/]+)\/purchase$/, resolve: (match) => ({ functionName: 'purchaseWishlistItem', data: { ...data, itemId: match[1] } }) },
    { pattern: /^\/api\/items\/([^/]+)$/, resolve: (match) => ({ functionName: normalizedMethod === 'DELETE' ? 'deleteWishlistItem' : 'updateWishlistItem', data: { ...data, itemId: match[1] } }) },
    { pattern: /^\/api\/items\/([^/]+)\/price-history$/, resolve: (match) => ({ functionName: 'getItemPriceHistory', data: { ...data, itemId: match[1] } }) },
    { pattern: /^\/api\/shared\/([^/]+)$/, resolve: (match) => ({ functionName: 'getSharedWishlist', data: { ...data, shareId: match[1] } }) },
  ];

  for (const entry of patterns) {
    const match = entry.pattern.exec(url);
    if (match) {
      return entry.resolve(match);
    }
  }

  return {
    functionName: url.replace('/api/', '').replace(/\//g, '_'),
    data,
  };
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
  const normalizedBody = normalizeBody(body);
  
  // Determine if we should use Firebase Functions
  const useFunctions = useFirebaseFunctions ?? shouldUseFirebaseFunctions(url);
  const useApiRouter = shouldUseFirebaseApiRouter(url);
  
  let fullUrl: string;
  const headers: Record<string, string> = {};
  
  if (useFunctions) {
    // Use Firebase SDK callable functions to ensure proper auth + CORS handling.
    const { functionName, data } = getFirebaseFunctionRoute(url, method, normalizedBody);

    await initFirebase({ enableAuth: true, enableFirestore: false });
    if (!firebaseApp) {
      throw new Error('Firebase app is not initialized');
    }

    const functions = getFunctions(firebaseApp, FIREBASE_FUNCTIONS_REGION);

    if (!import.meta.env.PROD && !functionsEmulatorConnected) {
      connectFunctionsEmulator(functions, 'localhost', 5001);
      functionsEmulatorConnected = true;
    }

    const callable = httpsCallable(functions, functionName);
    const result = await callable(data);
    return result.data;
  } else if (useApiRouter) {
    await initFirebase({ enableAuth: true, enableFirestore: false });

    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fullUrl = buildFirebaseApiRouterUrl(url);
  } else {
    // Use traditional Express.js API
    fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    // Get Firebase Auth token for Express.js API as well (for Firebase Auth middleware)
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  if (normalizedBody) {
    headers['Content-Type'] = 'application/json';
  }
  
  const fetchOptions: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };
  
  if (normalizedBody) {
    fetchOptions.body = JSON.stringify(normalizedBody);
  }
  
  const res = await fetch(fullUrl, fetchOptions);

  await throwIfResNotOk(res);
  
  // Check if the response is actually JSON before trying to parse it
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const jsonResponse = await res.json();
    
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
