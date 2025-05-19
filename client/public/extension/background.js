// WishKeeper Extension - Background Script
// This script handles communication between the extension and the website

// Base URL for the WishKeeper website API
let baseUrl = 'https://wishkeeper.replit.app';

// Auth token storage for JWT-based authentication
let authToken = null;
let tokenExpiry = null;
const TOKEN_REFRESH_THRESHOLD = 15 * 60 * 1000; // 15 minutes in milliseconds

// Get API base URL
async function getApiUrl() {
  // For development environments, can be changed to use localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000';
  }
  return baseUrl;
}

// Get the base URL for the website (not the API)
async function getBaseUrl() {
  return baseUrl;
}

// Initialize authentication state from storage
async function initAuthState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken', 'tokenExpiry', 'userData'], (result) => {
      if (result.authToken) {
        authToken = result.authToken;
        tokenExpiry = result.tokenExpiry ? new Date(result.tokenExpiry) : null;
        console.log('Auth token loaded from storage, expires:', tokenExpiry);
      }
      resolve();
    });
  });
}

// Save authentication state to storage
async function saveAuthState(token, expiry, userData) {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      authToken: token,
      tokenExpiry: expiry ? expiry.toISOString() : null,
      userData: userData || null
    }, resolve);
  });
}

// Clear authentication state
async function clearAuthState() {
  authToken = null;
  tokenExpiry = null;
  return new Promise((resolve) => {
    chrome.storage.local.remove(['authToken', 'tokenExpiry', 'userData'], resolve);
  });
}

// Check if token needs refresh
function needsTokenRefresh() {
  if (!authToken || !tokenExpiry) return true;
  
  const now = new Date();
  const timeUntilExpiry = tokenExpiry.getTime() - now.getTime();
  
  return timeUntilExpiry < TOKEN_REFRESH_THRESHOLD;
}

// Refresh the authentication token if needed
async function refreshTokenIfNeeded() {
  if (!needsTokenRefresh()) return authToken;
  
  try {
    const apiUrl = await getApiUrl();
    
    // If we don't have a token at all, we can't refresh
    if (!authToken) {
      return null;
    }
    
    const response = await fetch(`${apiUrl}/api/extension/refresh-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn('Token refresh failed, clearing auth state');
      await clearAuthState();
      return null;
    }
    
    const data = await response.json();
    
    // Parse JWT to get expiration
    const payload = JSON.parse(atob(data.token.split('.')[1]));
    const newExpiry = new Date(payload.exp * 1000);
    
    // Save the new token
    authToken = data.token;
    tokenExpiry = newExpiry;
    await saveAuthState(authToken, tokenExpiry);
    
    console.log('Token refreshed successfully, new expiry:', newExpiry);
    return authToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

// Check authentication status
async function isAuthenticated() {
  await initAuthState();
  
  if (!authToken) return false;
  
  if (needsTokenRefresh()) {
    // Try to refresh the token
    const refreshedToken = await refreshTokenIfNeeded();
    return !!refreshedToken;
  }
  
  return true;
}

// Authenticate with the server using username/password
async function authenticate(username, password) {
  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}/api/extension/jwt-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Authentication failed');
    }
    
    const data = await response.json();
    
    // Parse JWT to get expiration
    const payload = JSON.parse(atob(data.token.split('.')[1]));
    const expiry = new Date(payload.exp * 1000);
    
    // Save auth data
    authToken = data.token;
    tokenExpiry = expiry;
    await saveAuthState(authToken, tokenExpiry, data.user);
    
    console.log('Authentication successful, token expires:', expiry);
    return data;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed or updated:', details.reason);
  
  // Initialize extension state
  if (details.reason === 'install') {
    // First-time installation
    // Open the welcome page
    chrome.tabs.create({
      url: `${await getApiUrl()}/extension-welcome`
    });
  }
});

// Global error tracking
let lastError = null;
let errorCount = 0;
const ERROR_THRESHOLD = 5; // Max errors before recovery actions

// Error recovery mode flag
let recoveryMode = false;

// Error tracking function
function trackError(error, context) {
  console.error(`Error in ${context}:`, error);
  
  // Store the error
  lastError = {
    message: error.message || String(error),
    context,
    timestamp: new Date().toISOString(),
    tabId: error.tabId,
    stack: error.stack
  };
  
  // Increment error count
  errorCount++;
  
  // Check if we need to enter recovery mode
  if (errorCount >= ERROR_THRESHOLD && !recoveryMode) {
    enterRecoveryMode();
  }
  
  // Store error in extension local storage for later reporting
  try {
    chrome.storage.local.get(['errors'], (result) => {
      const errors = result.errors || [];
      // Keep only the last 20 errors
      if (errors.length > 20) errors.shift();
      errors.push(lastError);
      chrome.storage.local.set({ errors });
    });
  } catch (storageError) {
    console.warn('Could not store error in local storage:', storageError);
  }
  
  return lastError;
}

// Enter recovery mode
function enterRecoveryMode() {
  recoveryMode = true;
  console.warn('Entering recovery mode due to excessive errors');
  
  // Reset error count after entering recovery mode
  setTimeout(() => {
    recoveryMode = false;
    errorCount = 0;
    console.log('Exiting recovery mode');
  }, 60000); // Recovery mode lasts for 1 minute
  
  // Perform recovery actions if needed
  try {
    // Reset extension state
    chrome.storage.local.set({ 
      recoveryMode: true,
      lastRecovery: new Date().toISOString()
    });
    
    // Notify any open popups about recovery mode
    chrome.runtime.sendMessage({ 
      action: 'recoveryMode', 
      active: true,
      reason: 'Too many errors occurred'
    }).catch(() => {}); // Ignore errors if no listeners
  } catch (error) {
    console.error('Failed to perform recovery actions:', error);
  }
}

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    // Log messages for debugging
    console.log('Background script received message:', message);
    
    // Add sender info for debugging
    const senderInfo = sender.tab ? 
      `from content script (${sender.tab.id}:${sender.tab.url})` : 
      'from popup or other extension page';
    
    console.log(`Message received ${senderInfo}`);
    
    // JWT Auth Methods
    if (message.action === 'isAuthenticated') {
      // Initialize auth and check status
      initAuthState().then(async () => {
        const isAuth = await isAuthenticated();
        
        // Get user data if we have it
        let userData = null;
        try {
          chrome.storage.local.get(['userData'], (result) => {
            userData = result.userData;
            
            sendResponse({
              success: true,
              authenticated: isAuth,
              userData: userData
            });
          });
        } catch (error) {
          // In case of storage error, just return auth status
          sendResponse({
            success: true,
            authenticated: isAuth
          });
        }
      });
      
      return true; // Keep sendResponse valid
    }
    
    else if (message.action === 'authenticate') {
      // Authenticate with username/password
      const { username, password } = message;
      
      if (!username || !password) {
        sendResponse({
          success: false,
          error: 'Username and password are required'
        });
        return true;
      }
      
      // Call authenticate method
      authenticate(username, password)
        .then(result => {
          sendResponse({
            success: true,
            user: result.user,
            token: result.token
          });
        })
        .catch(error => {
          const trackingInfo = trackError(error, 'authenticate');
          sendResponse({
            success: false,
            error: error.message,
            errorId: trackingInfo.timestamp
          });
        });
      
      return true; // Keep sendResponse valid
    }
    
    else if (message.action === 'logout') {
      // Clear auth state
      clearAuthState()
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          const trackingInfo = trackError(error, 'logout');
          sendResponse({
            success: false,
            error: error.message,
            errorId: trackingInfo.timestamp
          });
        });
      
      return true; // Keep sendResponse valid
    }
    
    // Original login action (open web login page)
    else if (message.action === 'login') {
      try {
        // Open login page in new tab
        chrome.tabs.create({
          url: `${baseUrl}/login?source=extension`
        });
        sendResponse({ success: true });
      } catch (error) {
        const trackingInfo = trackError(error, 'login');
        sendResponse({ 
          success: false, 
          error: error.message,
          errorId: trackingInfo.timestamp
        });
      }
    }
    
    else if (message.action === 'getWishlists') {
      fetchWishlists()
        .then(data => {
          if (!data) {
            throw new Error('No wishlist data received');
          }
          sendResponse({ success: true, wishlists: data });
        })
        .catch(error => {
          const trackingInfo = trackError(error, 'getWishlists');
          sendResponse({ 
            success: false, 
            error: error.message,
            errorId: trackingInfo.timestamp,
            recoveryMode
          });
        });
      return true; // Keep sendResponse valid after async operation
    }
    
    else if (message.action === 'addToWishlist') {
      // Validate data
      if (!message.data || !message.data.wishlistId || !message.data.title) {
        const error = new Error('Invalid item data');
        const trackingInfo = trackError(error, 'addToWishlist-validation');
        sendResponse({ 
          success: false, 
          error: error.message,
          errorId: trackingInfo.timestamp
        });
        return true;
      }
      
      addItemToWishlist(message.data)
        .then(data => {
          // Reset error count on success
          errorCount = Math.max(0, errorCount - 1);
          sendResponse({ success: true, item: data });
        })
        .catch(error => {
          const trackingInfo = trackError(error, 'addToWishlist');
          sendResponse({ 
            success: false, 
            error: error.message,
            errorId: trackingInfo.timestamp,
            recoveryMode,
            // Include auth status to help the UI handle auth errors
            authError: error.message.toLowerCase().includes('auth') || 
                      error.message.toLowerCase().includes('log in')
          });
        });
      return true; // Keep sendResponse valid after async operation
    }
    
    else if (message.action === 'getErrorStatus') {
      // Return information about recent errors
      sendResponse({
        success: true,
        lastError,
        errorCount,
        recoveryMode
      });
    }
    
    else if (message.action === 'clearErrors') {
      // Clear error state
      lastError = null;
      errorCount = 0;
      recoveryMode = false;
      chrome.storage.local.remove(['errors']);
      sendResponse({ success: true });
    }
    
    else {
      // Unknown action
      const error = new Error(`Unknown action: ${message.action}`);
      const trackingInfo = trackError(error, 'unknown-action');
      sendResponse({ 
        success: false, 
        error: error.message,
        errorId: trackingInfo.timestamp
      });
    }
  } catch (error) {
    // Handle any unexpected errors in message processing
    const trackingInfo = trackError(error, 'message-handler');
    try {
      sendResponse({ 
        success: false, 
        error: 'Unexpected error in extension background script: ' + error.message,
        errorId: trackingInfo.timestamp,
        fatal: true
      });
    } catch (responseError) {
      console.error('Failed to send error response:', responseError);
    }
  }
  
  return true; // Keep sendResponse valid for async operations
});

// Make authenticated API request
async function makeAuthenticatedRequest(url, options = {}) {
  // Initialize authentication if not done yet
  await initAuthState();
  
  // Ensure we have a valid token
  const token = await refreshTokenIfNeeded();
  
  // Set up headers with authentication
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Add authorization header if we have a token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Build the request options
  const requestOptions = {
    ...options,
    headers,
    // Include credentials for cookie-based auth as fallback
    credentials: 'include'
  };
  
  // Make the request
  const response = await fetch(url, requestOptions);
  
  // Handle authentication errors
  if (response.status === 401) {
    // Clear auth state and throw error
    await clearAuthState();
    const errorData = await response.json();
    throw new Error(errorData.error || 'Authentication required');
  }
  
  // Handle other errors
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }
  
  return response.json();
}

// Fetch wishlists from the API
async function fetchWishlists() {
  try {
    const apiUrl = await getApiUrl();
    
    // Check if we're authenticated
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw new Error('Authentication required');
    }
    
    return await makeAuthenticatedRequest(`${apiUrl}/api/extension/wishlists`);
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    throw error;
  }
}

// Add item to wishlist
async function addItemToWishlist(itemData) {
  try {
    const apiUrl = await getApiUrl();
    
    // Check if we're authenticated
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw new Error('Authentication required');
    }
    
    return await makeAuthenticatedRequest(`${apiUrl}/api/extension/items`, {
      method: 'POST',
      body: JSON.stringify(itemData)
    });
  } catch (error) {
    console.error('Error adding item to wishlist:', error);
    throw error;
  }
}

// Initialize browser action icon
chrome.action.setIcon({
  path: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
});