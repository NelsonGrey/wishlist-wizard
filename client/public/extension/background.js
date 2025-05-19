// WishKeeper Extension - Background Script
// This script handles communication between the extension and the website

// Base URL for the WishKeeper website API
let baseUrl = 'https://wishkeeper.replit.app';

// Get API base URL
async function getApiUrl() {
  // For development environments, can be changed to use localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000';
  }
  return baseUrl;
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
    
    // Handle different message types
    if (message.action === 'login') {
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

// Fetch wishlists from the API
async function fetchWishlists() {
  const apiUrl = await getApiUrl();
  const response = await fetch(`${apiUrl}/api/extension/wishlists`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch wishlists');
  }
  
  return await response.json();
}

// Add item to wishlist
async function addItemToWishlist(itemData) {
  const apiUrl = await getApiUrl();
  const response = await fetch(`${apiUrl}/api/extension/add-item`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(itemData)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to add item to wishlist');
  }
  
  return await response.json();
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