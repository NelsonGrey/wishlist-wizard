// WishKeeper Extension - Background Script
// This script acts as a bridge between the content scripts and the WishKeeper app

// Store API endpoint base URL
const API_BASE_URL = 'https://wishkeeper.replit.app';
let userToken = null;
let currentUser = null;
let userWishlists = [];

// Check if user is logged in on extension startup
chrome.runtime.onStartup.addListener(() => {
  checkLoginStatus();
});

// Listen for messages from the content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  // Handle different message types
  switch (message.action) {
    case 'checkLogin':
      checkLoginStatus().then(sendResponse);
      return true; // Keep the message channel open for async response
      
    case 'fetchWishlists':
      fetchWishlists().then(sendResponse);
      return true;
      
    case 'addItem':
      addItemToWishlist(message.data).then(sendResponse);
      return true;
      
    case 'logout':
      logout().then(sendResponse);
      return true;
      
    case 'extractProductInfo':
      // Forward the message to the content script of the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'extractProductInfo' }, (response) => {
            sendResponse(response);
          });
        } else {
          sendResponse({ success: false, error: 'No active tab found' });
        }
      });
      return true;
  }
});

// Function to check if the user is logged in
async function checkLoginStatus() {
  try {
    // Make a request to your auth endpoint
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      currentUser = data;
      return { loggedIn: true, user: data };
    } else {
      currentUser = null;
      return { loggedIn: false };
    }
  } catch (error) {
    console.error('Error checking login status:', error);
    return { loggedIn: false, error: error.message };
  }
}

// Function to fetch user's wishlists
async function fetchWishlists() {
  try {
    // Check if user is logged in first
    const loginStatus = await checkLoginStatus();
    if (!loginStatus.loggedIn) {
      return { success: false, error: 'User not logged in' };
    }
    
    // Fetch the wishlists
    const response = await fetch(`${API_BASE_URL}/api/wishlists`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const wishlists = await response.json();
      userWishlists = wishlists;
      return { success: true, wishlists };
    } else {
      return { success: false, error: 'Failed to fetch wishlists' };
    }
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    return { success: false, error: error.message };
  }
}

// Function to add an item to a wishlist
async function addItemToWishlist(data) {
  try {
    // Check if user is logged in first
    const loginStatus = await checkLoginStatus();
    if (!loginStatus.loggedIn) {
      return { success: false, error: 'User not logged in' };
    }
    
    // Add the item to the specified wishlist
    const response = await fetch(`${API_BASE_URL}/api/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        wishlistId: data.wishlistId,
        title: data.title,
        price: data.price,
        imageUrl: data.imageUrl,
        productUrl: data.productUrl,
        store: data.store,
        note: data.note || null
      })
    });
    
    if (response.ok) {
      const item = await response.json();
      return { success: true, item };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Failed to add item' };
    }
  } catch (error) {
    console.error('Error adding item to wishlist:', error);
    return { success: false, error: error.message };
  }
}

// Function to log out
async function logout() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      currentUser = null;
      userWishlists = [];
      return { success: true };
    } else {
      return { success: false, error: 'Failed to logout' };
    }
  } catch (error) {
    console.error('Error logging out:', error);
    return { success: false, error: error.message };
  }
}