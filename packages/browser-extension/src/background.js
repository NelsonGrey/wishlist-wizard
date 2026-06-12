// Wishlist Wizard Extension - Background Script
// This script handles communication between the extension and the website

// Firebase configuration - used for REST API authentication
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'your-firebase-web-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'your-project-id'
};

const EXTENSION_ENVIRONMENTS = {
  development: {
    baseUrl: 'https://wishlist-wizard-dev.web.app',
    cloudFunctionsBaseUrl: 'https://us-central1-wishlist-wizard-dev.cloudfunctions.net'
  },
  staging: {
    baseUrl: 'https://wishlist-wizard-staging.web.app',
    cloudFunctionsBaseUrl: 'https://us-central1-wishlist-wizard-staging.cloudfunctions.net'
  },
  production: {
    baseUrl: 'https://wishlist-wizard-prod.web.app',
    cloudFunctionsBaseUrl: 'https://us-central1-wishlist-wizard-prod.cloudfunctions.net'
  },
  local: {
    baseUrl: 'http://localhost:3001',
    cloudFunctionsBaseUrl: 'http://localhost:5001/wishlist-wizard-dev/us-central1'
  }
};

function normalizeExtensionEnvironment(value) {
  const env = String(value || 'development').toLowerCase();

  if (env === 'dev') return 'development';
  if (env === 'stage') return 'staging';
  if (env === 'prod') return 'production';
  if (env === 'localhost') return 'local';

  return Object.prototype.hasOwnProperty.call(EXTENSION_ENVIRONMENTS, env)
    ? env
    : 'development';
}

// Base URL for the Wishlist Wizard website API
// Note: Service workers don't have access to window.location, so we hardcode the URLs
// Using dev environment to match Firebase config (wishlist-wizard-dev)
let baseUrl = EXTENSION_ENVIRONMENTS.development.baseUrl;

// Cloud Functions base URL - used for extension API calls
let cloudFunctionsBaseUrl = EXTENSION_ENVIRONMENTS.development.cloudFunctionsBaseUrl;

let extensionConfigPromise = null;

async function loadExtensionEnvironmentConfig() {
  const defaultConfig = EXTENSION_ENVIRONMENTS.development;

  return new Promise((resolve) => {
    if (!chrome?.storage?.local?.get) {
      resolve(defaultConfig);
      return;
    }

    chrome.storage.local.get(
      ['wwEnvironment', 'wwBaseUrlOverride', 'wwCloudFunctionsBaseUrlOverride'],
      (result) => {
        const env = normalizeExtensionEnvironment(result?.wwEnvironment);
        const envConfig = EXTENSION_ENVIRONMENTS[env] || defaultConfig;

        resolve({
          baseUrl: result?.wwBaseUrlOverride || envConfig.baseUrl,
          cloudFunctionsBaseUrl: result?.wwCloudFunctionsBaseUrlOverride || envConfig.cloudFunctionsBaseUrl
        });
      }
    );
  });
}

async function ensureExtensionEnvironmentConfig() {
  if (!extensionConfigPromise) {
    extensionConfigPromise = loadExtensionEnvironmentConfig()
      .then((config) => {
        baseUrl = config.baseUrl;
        cloudFunctionsBaseUrl = config.cloudFunctionsBaseUrl;
        return config;
      })
      .catch(() => {
        baseUrl = EXTENSION_ENVIRONMENTS.development.baseUrl;
        cloudFunctionsBaseUrl = EXTENSION_ENVIRONMENTS.development.cloudFunctionsBaseUrl;
        return EXTENSION_ENVIRONMENTS.development;
      });
  }

  return extensionConfigPromise;
}

if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return;
    }

    if (changes.wwEnvironment || changes.wwBaseUrlOverride || changes.wwCloudFunctionsBaseUrlOverride) {
      extensionConfigPromise = null;
      ensureExtensionEnvironmentConfig();
    }
  });
}

// For localhost development, you can change this to:
// let baseUrl = 'http://localhost:3001';
// let cloudFunctionsBaseUrl = 'http://localhost:5001/wishlist-wizard-dev/us-central1';
// For production, change to:
// let baseUrl = 'https://wishlist-wizard.web.app';
// let cloudFunctionsBaseUrl = 'https://us-central1-wishlist-wizard-prod.cloudfunctions.net';

// Auth token storage for JWT-based authentication
let authToken = null;
let tokenExpiry = null;
const TOKEN_REFRESH_THRESHOLD = 15 * 60 * 1000; // 15 minutes in milliseconds

// Get API base URL
async function getApiUrl() {
  await ensureExtensionEnvironmentConfig();
  // For development environments, can be detected automatically
  if (baseUrl.includes('localhost')) {
    return baseUrl;
  }
  return baseUrl;
}

// Get the base URL for the website (not the API)
async function getBaseUrl() {
  await ensureExtensionEnvironmentConfig();
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
    chrome.storage.local.remove(['authToken', 'tokenExpiry', 'userData', 'refreshToken'], resolve);
  });
}

// Check if token needs refresh
function needsTokenRefresh() {
  if (!authToken || !tokenExpiry) return true;
  
  const now = new Date();
  const timeUntilExpiry = tokenExpiry.getTime() - now.getTime();
  
  return timeUntilExpiry < TOKEN_REFRESH_THRESHOLD;
}

// Refresh the authentication token if needed (Firebase REST API)
async function refreshTokenIfNeeded() {
  if (!needsTokenRefresh()) return authToken;
  
  try {
    // If we don't have a token, we can't refresh
    if (!authToken) {
      await clearAuthState();
      return null;
    }
    
    // Get the refresh token from storage
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['refreshToken'], resolve);
    });
    
    const refreshToken = result.refreshToken;
    if (!refreshToken) {
      // No refresh token available, need to re-authenticate
      await clearAuthState();
      return null;
    }
    
    // Use Firebase Auth REST API to refresh the token
    // https://firebase.google.com/docs/reference/rest/auth#section-refresh-token
    const response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      }
    );
    
    if (!response.ok) {
      console.warn('Token refresh failed, clearing auth state');
      await clearAuthState();
      return null;
    }
    
    const data = await response.json();
    
    // Update tokens
    const newIdToken = data.id_token;
    const newRefreshToken = data.refresh_token;
    const expiresIn = parseInt(data.expires_in) * 1000;
    const newExpiry = new Date(Date.now() + expiresIn);
    
    authToken = newIdToken;
    tokenExpiry = newExpiry;
    
    // Save updated tokens
    await new Promise((resolve) => {
      chrome.storage.local.set({
        authToken: newIdToken,
        tokenExpiry: newExpiry.toISOString(),
        refreshToken: newRefreshToken
      }, resolve);
    });
    
    console.log('Token refreshed successfully, new expiry:', newExpiry);
    return authToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    await clearAuthState();
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

function getToolbarActionApi() {
  if (chrome?.action) {
    return chrome.action;
  }
  if (chrome?.browserAction) {
    return chrome.browserAction;
  }
  return null;
}

// Authenticate with the server using username/password via Firebase REST API
async function authenticate(username, password) {
  try {
    // Use Firebase Auth REST API to sign in
    // https://firebase.google.com/docs/reference/rest/auth#section-sign-in-email-password
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: username,
          password: password,
          returnSecureToken: true
        })
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = 'Authentication failed';
      
      // Map Firebase error codes to user-friendly messages
      if (errorData.error?.message) {
        const firebaseError = errorData.error.message;
        if (firebaseError.includes('EMAIL_NOT_FOUND')) {
          errorMessage = 'User not found';
        } else if (firebaseError.includes('INVALID_PASSWORD')) {
          errorMessage = 'Incorrect password';
        } else if (firebaseError.includes('INVALID_EMAIL')) {
          errorMessage = 'Invalid email address';
        } else if (firebaseError.includes('TOO_MANY_ATTEMPTS')) {
          errorMessage = 'Too many failed attempts. Please try again later';
        } else if (firebaseError.includes('USER_DISABLED')) {
          errorMessage = 'This account has been disabled';
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Firebase REST API returns idToken, refreshToken, and expiresIn (in seconds)
    const idToken = data.idToken;
    const refreshToken = data.refreshToken;
    const expiresIn = parseInt(data.expiresIn) * 1000; // Convert to milliseconds
    const expiry = new Date(Date.now() + expiresIn);
    
    // Parse the JWT to get user info
    const tokenParts = idToken.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    
    const userData = {
      id: payload.user_id || data.localId,
      email: data.email,
      username: data.email?.split('@')[0] || 'User',
      displayName: data.displayName || data.email?.split('@')[0]
    };
    
    // Save auth data including refresh token
    authToken = idToken;
    tokenExpiry = expiry;
    
    await new Promise((resolve) => {
      chrome.storage.local.set({
        authToken: idToken,
        tokenExpiry: expiry.toISOString(),
        refreshToken: refreshToken,
        userData: userData
      }, resolve);
    });
    
    console.log('Authentication successful, token expires:', tokenExpiry);
    return { token: idToken, user: userData };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed or updated:', details.reason);
  await ensureExtensionEnvironmentConfig();
  
  // Initialize extension state
  if (details.reason === 'install') {
    // First-time installation
    // Note: Disabled opening welcome page during development
    // Uncomment when welcome page is ready
    /*
    chrome.tabs.create({
      url: `${await getApiUrl()}/extension-welcome`
    });
    */
    console.log('Extension installed - welcome page disabled for development');
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
    const maybePromise = chrome.runtime.sendMessage({ 
      action: 'recoveryMode', 
      active: true,
      reason: 'Too many errors occurred'
    });
    if (maybePromise && typeof maybePromise.catch === 'function') {
      maybePromise.catch(() => {});
    }
  } catch (error) {
    console.error('Failed to perform recovery actions:', error);
  }
}

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  ensureExtensionEnvironmentConfig();

  try {
    // Log messages for debugging
    console.log('Background script received message:', message);
    
    // Add sender info for debugging
    const senderInfo = sender.tab ? 
      `from content script (${sender.tab.id}:${sender.tab.url})` : 
      'from popup or other extension page';
    
    console.log(`Message received ${senderInfo}`);

    // Avoid message port warnings by always acknowledging analytics messages.
    // Detailed handling remains in the dedicated tracking listener below.
    if (message && message.type === 'TRACK_EVENT') {
      sendResponse({ success: true, queued: true });
      return false;
    }
    
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
    
    else if (message.action === 'fetchWishlists') {
      fetchWishlists()
        .then(data => {
          if (!data) {
            throw new Error('No wishlist data received');
          }
          sendResponse({ success: true, wishlists: data });
        })
        .catch(error => {
          const trackingInfo = trackError(error, 'fetchWishlists');
          sendResponse({ 
            success: false, 
            error: error.message,
            errorId: trackingInfo.timestamp,
            recoveryMode
          });
        });
      return true; // Keep sendResponse valid after async operation
    }
    
    else if (message.action === 'addItemToWishlist') {
      // Support both legacy payload ({ item, wishlistId, note }) and
      // current payload ({ itemData }) from popup.
      const incomingItem = message.itemData || message.item || null;
      const normalizedItem = incomingItem ? {
        ...incomingItem,
        wishlistId: incomingItem.wishlistId || message.wishlistId,
        note: incomingItem.note ?? message.note ?? ''
      } : null;

      // Validate data
      if (!normalizedItem || !normalizedItem.wishlistId || !normalizedItem.title) {
        const error = new Error('Invalid item data');
        const trackingInfo = trackError(error, 'addItemToWishlist-validation');
        sendResponse({ 
          success: false, 
          error: error.message,
          errorId: trackingInfo.timestamp
        });
        return true;
      }

      addItemToWishlist(normalizedItem)
        .then(data => {
          // Reset error count on success
          errorCount = Math.max(0, errorCount - 1);
          sendResponse({ success: true, item: data });
        })
        .catch(error => {
          const trackingInfo = trackError(error, 'addItemToWishlist');
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
    
    else if (message.action === 'getActiveTab') {
      // Get the active tab (for popup to use)
      // Try multiple approaches since Firefox popup has limited access to tabs API
      let found = false;
      
      // Approach 1: lastFocusedWindow
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs) {
        if (tabs && tabs.length > 0) {
          sendResponse({ success: true, tab: tabs[0] });
          found = true;
          return true;
        }
        
        // Approach 2: currentWindow
        if (!found) {
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs && tabs.length > 0) {
              sendResponse({ success: true, tab: tabs[0] });
              found = true;
              return true;
            }
            
            // Approach 3: Just get all active tabs
            if (!found) {
              chrome.tabs.query({ active: true }, function(tabs) {
                if (tabs && tabs.length > 0) {
                  // Filter out extension tabs
                  const realTabs = tabs.filter(tab => 
                    tab.url && 
                    !tab.url.startsWith('moz-extension://') && 
                    !tab.url.startsWith('chrome-extension://') &&
                    !tab.url.startsWith('about:')
                  );
                  
                  if (realTabs.length > 0) {
                    sendResponse({ success: true, tab: realTabs[0] });
                    found = true;
                  } else {
                    sendResponse({ success: false, error: 'No active tab found' });
                  }
                } else {
                  sendResponse({ success: false, error: 'No active tab found' });
                }
              });
            }
          });
        }
      });
      
      return true; // Keep sendResponse valid
    }

    else if (message.action === 'injectContentScripts') {
      const tabId = message.tabId;

      if (!tabId) {
        sendResponse({ success: false, error: 'tabId is required' });
        return true;
      }

      if (!chrome.scripting || !chrome.scripting.executeScript) {
        sendResponse({ success: false, error: 'chrome.scripting API not available' });
        return true;
      }

      (async () => {
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['enhanced-product-extractor.js']
          });

          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
          });

          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error?.message || 'Injection failed' });
        }
      })();

      return true;
    }

    else if (message.action === 'extractProductInfoDirect') {
      const tabId = message.tabId;

      if (!tabId) {
        sendResponse({ success: false, error: 'tabId is required' });
        return true;
      }

      if (!chrome.scripting || !chrome.scripting.executeScript) {
        sendResponse({ success: false, error: 'chrome.scripting API not available' });
        return true;
      }

      (async () => {
        try {
          const existingExtractor = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => typeof window.EnhancedProductExtractor === 'function'
          });

          const hasExtractor = !!(existingExtractor && existingExtractor[0] && existingExtractor[0].result);

          if (!hasExtractor) {
            await chrome.scripting.executeScript({
              target: { tabId },
              files: ['enhanced-product-extractor.js']
            });
          }

          const extraction = await chrome.scripting.executeScript({
            target: { tabId },
            func: async () => {
              try {
                if (typeof window.EnhancedProductExtractor !== 'function') {
                  return { success: false, error: 'EnhancedProductExtractor not available' };
                }

                const result = await new window.EnhancedProductExtractor().extract();
                return result || { success: false, error: 'No extraction result' };
              } catch (error) {
                return {
                  success: false,
                  error: error?.message || 'Direct extraction failed'
                };
              }
            }
          });

          const result = extraction && extraction[0] ? extraction[0].result : null;
          sendResponse({ success: true, result });
        } catch (error) {
          sendResponse({ success: false, error: error?.message || 'Direct extraction failed' });
        }
      })();

      return true;
    }
    
    else if (message.action === 'extractProductInfo') {
      // Get current tab and extract product info
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs || tabs.length === 0) {
          sendResponse({ 
            success: false, 
            error: 'No active tab found' 
          });
          return;
        }
        
        const tab = tabs[0];
        
        // Send message to content script to extract product info
        chrome.tabs.sendMessage(tab.id, { action: 'extractProductInfo' }, function(response) {
          if (chrome.runtime.lastError) {
            sendResponse({
              success: false,
              error: 'Could not communicate with page. Please refresh and try again.'
            });
            return;
          }
          
          sendResponse(response || { success: false, error: 'No response from page' });
        });
      });
      return true; // Keep sendResponse valid for async operation
    }
    
    else if (message.action === 'fetchRecentItems') {
      fetchRecentItems()
        .then(data => {
          sendResponse({ success: true, items: data });
        })
        .catch(error => {
          const trackingInfo = trackError(error, 'fetchRecentItems');
          sendResponse({ 
            success: false, 
            error: error.message,
            errorId: trackingInfo.timestamp
          });
        });
      return true;
    }
    
    else if (message.action === 'fetchWishlistItems') {
      if (!message.wishlistId) {
        sendResponse({ 
          success: false, 
          error: 'Wishlist ID is required' 
        });
        return true;
      }
      
      fetchWishlistItems(message.wishlistId)
        .then(data => {
          sendResponse({ success: true, items: data });
        })
        .catch(error => {
          const trackingInfo = trackError(error, 'fetchWishlistItems');
          sendResponse({ 
            success: false, 
            error: error.message,
            errorId: trackingInfo.timestamp
          });
        });
      return true;
    }
    
    else if (message.action === 'createWishlist') {
      if (!message.name) {
        sendResponse({ 
          success: false, 
          error: 'Wishlist name is required' 
        });
        return true;
      }
      
      createWishlist(message.name)
        .then(data => {
          sendResponse({ success: true, wishlist: data });
        })
        .catch(error => {
          const trackingInfo = trackError(error, 'createWishlist');
          sendResponse({ 
            success: false, 
            error: error.message,
            errorId: trackingInfo.timestamp
          });
        });
      return true;
    }
    
    else if (message.action === 'removeItem') {
      if (!message.itemId) {
        sendResponse({ 
          success: false, 
          error: 'Item ID is required' 
        });
        return true;
      }
      
      removeItem(message.itemId)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          const trackingInfo = trackError(error, 'removeItem');
          sendResponse({ 
            success: false, 
            error: error.message,
            errorId: trackingInfo.timestamp
          });
        });
      return true;
    }
    
    else if (message.action === 'shareWishlist') {
      if (!message.wishlistId) {
        sendResponse({ 
          success: false, 
          error: 'Wishlist ID is required' 
        });
        return true;
      }
      
      shareWishlist(message.wishlistId)
        .then(shareUrl => {
          sendResponse({ success: true, shareUrl });
        })
        .catch(error => {
          const trackingInfo = trackError(error, 'shareWishlist');
          sendResponse({ 
            success: false, 
            error: error.message,
            errorId: trackingInfo.timestamp
          });
        });
      return true;
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

    else if (message.action === 'billingStatus') {
      callCallableFunction('billingStatus', {})
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => {
          const trackingInfo = trackError(error, 'billingStatus');
          sendResponse({
            success: false,
            error: error.message,
            errorId: trackingInfo.timestamp
          });
        });
      return true;
    }

    else if (message.action === 'billingPlans') {
      callCallableFunction('billingPlans', {})
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => {
          const trackingInfo = trackError(error, 'billingPlans');
          sendResponse({
            success: false,
            error: error.message,
            errorId: trackingInfo.timestamp
          });
        });
      return true;
    }

    else if (message.action === 'billingCheckout') {
      const payload = {
        tier: String(message.tier || ''),
        billingCycle: String(message.billingCycle || 'monthly')
      };

      callCallableFunction('billingCheckout', payload)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => {
          const trackingInfo = trackError(error, 'billingCheckout');
          sendResponse({
            success: false,
            error: error.message,
            errorId: trackingInfo.timestamp
          });
        });
      return true;
    }

    else if (message.action === 'billingPortal') {
      callCallableFunction('billingPortal', {})
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => {
          const trackingInfo = trackError(error, 'billingPortal');
          sendResponse({
            success: false,
            error: error.message,
            errorId: trackingInfo.timestamp
          });
        });
      return true;
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
  
  // Check if we need to refresh the token and do so if necessary
  await refreshTokenIfNeeded();
  
  // If we don't have a token after refresh attempt, authentication has failed
  if (!authToken) {
    throw new Error('Not authenticated. Please log in again.');
  }
  
  // Set up headers with authentication
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Add authorization header if we have a token
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  // Build the request options
  const requestOptions = {
    ...options,
    headers,
    // Use bearer-token auth only for extension API calls to avoid CORS preflight
    // rejection when server responds with Access-Control-Allow-Origin: *
    credentials: 'omit'
  };
  
  // Make the request
  const response = await fetch(url, requestOptions);
  const responseText = await response.text();
  let responseJson = null;
  try {
    responseJson = responseText ? JSON.parse(responseText) : null;
  } catch (parseError) {
    responseJson = null;
  }
  
  // Add request/response logging for debugging
  console.log(`[API Request] ${requestOptions.method || 'GET'} ${url}`);
  console.log(`[API Response] Status: ${response.status}`);
  
  // Handle authentication errors
  if (response.status === 401) {
    // Clear auth state and throw error
    await clearAuthState();
    if (responseJson && responseJson.error) {
      throw new Error(responseJson.error);
    }
    console.error('[API 401] Response text:', responseText.substring(0, 200));
    throw new Error('Authentication required (invalid session)');
  }
  
  // Handle other errors
  if (!response.ok) {
    console.error(`[API Error] ${response.status} ${response.statusText}`);
    if (responseJson && responseJson.error) {
      throw new Error(responseJson.error || `Request failed with status ${response.status}`);
    }

    console.error(`[API ${response.status}] Response body (first 500 chars):`, responseText.substring(0, 500));
    
    // Check if response is HTML (likely 404 or 500 error page)
    if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
      throw new Error(`Server error (${response.status}): Backend returned HTML error page. Check API endpoint: ${url}`);
    }
    
    throw new Error(`Request failed with status ${response.status}: ${responseText.substring(0, 100)}`);
  }
  
  // Parse successful response
  if (responseJson === null && responseText) {
    console.error('[API Parse Error] Failed to parse response as JSON. Raw body:', responseText.substring(0, 500));
    throw new Error('Invalid response format from server');
  }

  console.log('[API Success] Response:', responseJson);
  return responseJson;
}

async function callCallableFunction(functionName, data = {}) {
  const response = await makeAuthenticatedRequest(
    `${cloudFunctionsBaseUrl}/${functionName}`,
    {
      method: 'POST',
      body: JSON.stringify({ data })
    }
  );

  if (response && typeof response === 'object') {
    if (Object.prototype.hasOwnProperty.call(response, 'result')) {
      return response.result;
    }
    if (Object.prototype.hasOwnProperty.call(response, 'data')) {
      return response.data;
    }
  }

  return response;
}

// Fetch wishlists from the API
async function fetchWishlists() {
  try {
    // Check if we're authenticated
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw new Error('Authentication required. Please sign in to your account.');
    }
    
    // Get wishlists from the Cloud Function
    const response = await makeAuthenticatedRequest(`${cloudFunctionsBaseUrl}/extensionGetWishlists`);
    
    // Log for debugging
    console.log('Fetched wishlists:', response);
    
    // Response is an array of wishlists
    return Array.isArray(response) ? 
      response.sort((a, b) => a.name.localeCompare(b.name)) : 
      [];
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    trackError(error, 'fetchWishlists'); // Track for debugging
    throw error;
  }
}

// Add item to wishlist
async function addItemToWishlist(itemData) {
  try {
    // Check if we're authenticated
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw new Error('Authentication required. Please sign in to your account.');
    }
    
    // Validate item data before sending to server
    if (!itemData.title || !itemData.price || !itemData.productUrl) {
      throw new Error('Invalid product data. Missing required fields.');
    }
    
    // Add timestamp to track when the item was added
    const enrichedItemData = {
      ...itemData,
      addedAt: new Date().toISOString(),
      clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    // Log what we're sending for debugging
    console.log('Adding item to wishlist:', enrichedItemData);
    
    // Send the request to Cloud Function
    const response = await makeAuthenticatedRequest(`${cloudFunctionsBaseUrl}/extensionAddItem`, {
      method: 'POST',
      body: JSON.stringify(enrichedItemData)
    });
    
    console.log('Item added successfully:', response);
    return response;
  } catch (error) {
    console.error('Error adding item to wishlist:', error);
    trackError(error, 'addItemToWishlist');
    throw error;
  }
}

// Fetch recent items from the API
async function fetchRecentItems() {
  try {
    // Check if we're authenticated
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw new Error('Authentication required. Please sign in to your account.');
    }
    
    // Get recent items from Cloud Function
    const response = await makeAuthenticatedRequest(`${cloudFunctionsBaseUrl}/extensionGetRecentItems`);
    
    console.log('Fetched recent items:', response);
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('Error fetching recent items:', error);
    trackError(error, 'fetchRecentItems');
    throw error;
  }
}

// Fetch items for a specific wishlist
async function fetchWishlistItems(wishlistId) {
  try {
    // Check if we're authenticated
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw new Error('Authentication required. Please sign in to your account.');
    }
    
    // Get wishlist items from Cloud Function
    const response = await makeAuthenticatedRequest(`${cloudFunctionsBaseUrl}/extensionGetWishlistItems?wishlistId=${wishlistId}`);
    
    console.log('Fetched wishlist items:', response);
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('Error fetching wishlist items:', error);
    trackError(error, 'fetchWishlistItems');
    throw error;
  }
}

// Create a new wishlist
async function createWishlist(name) {
  try {
    // Check if we're authenticated
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw new Error('Authentication required. Please sign in to your account.');
    }
    
    // Create wishlist on the Cloud Function
    const response = await makeAuthenticatedRequest(`${cloudFunctionsBaseUrl}/extensionCreateWishlist`, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    
    console.log('Created wishlist:', response);
    return response;
  } catch (error) {
    console.error('Error creating wishlist:', error);
    trackError(error, 'createWishlist');
    throw error;
  }
}

// Remove an item from a wishlist
async function removeItem(itemId) {
  try {
    // Check if we're authenticated
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw new Error('Authentication required. Please sign in to your account.');
    }
    
    // Remove item from Cloud Function
    await makeAuthenticatedRequest(`${cloudFunctionsBaseUrl}/extensionDeleteItem?itemId=${itemId}`, {
      method: 'DELETE'
    });
    
    console.log('Removed item:', itemId);
    return true;
  } catch (error) {
    console.error('Error removing item:', error);
    trackError(error, 'removeItem');
    throw error;
  }
}

// Share a wishlist
async function shareWishlist(wishlistId) {
  try {
    // Check if we're authenticated
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw new Error('Authentication required. Please sign in to your account.');
    }
    
    // Get share URL from Cloud Function
    const response = await makeAuthenticatedRequest(`${cloudFunctionsBaseUrl}/extensionShareWishlist?wishlistId=${wishlistId}`, {
      method: 'POST'
    });
    
    console.log('Generated share URL:', response);
    return response.shareUrl || response.url;
  } catch (error) {
    console.error('Error sharing wishlist:', error);
    trackError(error, 'shareWishlist');
    throw error;
  }
}

// Track analytics events
async function trackAnalyticsEvent(action, category, label, value) {
  try {
    const apiUrl = await getApiUrl();
    const url = `${apiUrl}/api/extension/track-event`;
    
    // Get the current tab URL to track where the event happened
    let tabUrl = null;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        tabUrl = tabs[0].url;
      }
    } catch (err) {
      console.warn('Could not get current tab URL for analytics', err);
    }
    
    // Prepare the event data
    const eventData = {
      action,
      category: category || 'extension',
      label: label || null,
      value: value || null,
      url: tabUrl,
      timestamp: new Date().toISOString()
    };
    
    // Send the event without blocking on CORS
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });
    
    console.log(`Analytics event tracked: ${category} - ${action}`);
    return true;
  } catch (error) {
    console.warn('Failed to track analytics event:', error);
    // Don't let analytics failures break extension functionality
    return false;
  }
}

// Initialize browser action icon
const toolbarActionApi = getToolbarActionApi();
if (toolbarActionApi?.setIcon) {
  toolbarActionApi.setIcon({
    path: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  });
}

// Handle events from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRACK_EVENT') {
    // Use our analytics tracking function
    trackAnalyticsEvent(
      message.payload.action,
      message.payload.category,
      message.payload.label,
      message.payload.value
    ).then(success => {
      if (sendResponse) {
        sendResponse({ success });
      }
    }).catch(error => {
      console.warn('Failed to track analytics event:', error);
      if (sendResponse) {
        sendResponse({ success: false, error: error.message });
      }
    });
    
    return true; // Keep sendResponse valid for async operations
  }
});
