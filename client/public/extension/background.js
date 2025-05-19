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

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Log messages for debugging
  console.log('Background script received message:', message);
  
  // Handle different message types
  if (message.action === 'login') {
    // Open login page in new tab
    chrome.tabs.create({
      url: `${baseUrl}/login?source=extension`
    });
    sendResponse({ success: true });
  }
  
  else if (message.action === 'getWishlists') {
    fetchWishlists()
      .then(data => sendResponse({ success: true, wishlists: data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep sendResponse valid after async operation
  }
  
  else if (message.action === 'addToWishlist') {
    addItemToWishlist(message.data)
      .then(data => sendResponse({ success: true, item: data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep sendResponse valid after async operation
  }
  
  // Other message handlers can be added here
  
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