// WishKeeper Extension - Popup Script

// Base URL for the WishKeeper API
const API_BASE_URL = 'https://wishkeeper.replit.app';

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const loadingScreen = document.getElementById('loading-screen');
const productScreen = document.getElementById('product-screen');
const successScreen = document.getElementById('success-screen');
const errorScreen = document.getElementById('error-screen');

const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const userInfo = document.getElementById('user-info');
const username = document.getElementById('username');

const productImage = document.getElementById('product-image');
const productTitle = document.getElementById('product-title');
const productPrice = document.getElementById('product-price');
const productStore = document.getElementById('product-store');
const wishlistSelect = document.getElementById('wishlist-select');
const noteInput = document.getElementById('note-input');
const addButton = document.getElementById('add-button');
const cancelButton = document.getElementById('cancel-button');

const doneButton = document.getElementById('done-button');
const viewWishlistButton = document.getElementById('view-wishlist-button');
const retryButton = document.getElementById('retry-button');
const closeButton = document.getElementById('close-button');
const errorMessage = document.getElementById('error-message');

// Global state
let currentUser = null;
let currentWishlists = [];
let currentProductInfo = null;
let selectedWishlistId = null;

// Initialize the popup
function initPopup() {
  showScreen(loadingScreen);
  
  // Check login status
  chrome.runtime.sendMessage({ action: 'checkLogin' }, response => {
    if (response && response.loggedIn && response.user) {
      currentUser = response.user;
      username.textContent = currentUser.username || currentUser.displayName || currentUser.email;
      userInfo.classList.remove('hidden');
      logoutButton.classList.remove('hidden');
      
      // Fetch wishlists
      fetchWishlists();
    } else {
      showScreen(loginScreen);
    }
  });
  
  // Check if we have product data from content script
  chrome.runtime.getBackgroundPage(backgroundPage => {
    if (backgroundPage.extractedProductInfo) {
      currentProductInfo = backgroundPage.extractedProductInfo;
      displayProductInfo();
    }
  });
  
  // Set up event listeners
  setupEventListeners();
}

// Show selected screen and hide others
function showScreen(screenToShow) {
  [loginScreen, loadingScreen, productScreen, successScreen, errorScreen].forEach(screen => {
    if (screen === screenToShow) {
      screen.classList.remove('hidden');
    } else {
      screen.classList.add('hidden');
    }
  });
}

// Set up all event listeners
function setupEventListeners() {
  // Login button
  loginButton.addEventListener('click', () => {
    chrome.tabs.create({ url: `${API_BASE_URL}/login?source=extension` });
  });
  
  // Logout button
  logoutButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'logout' }, response => {
      if (response && response.success) {
        currentUser = null;
        userInfo.classList.add('hidden');
        logoutButton.classList.add('hidden');
        showScreen(loginScreen);
      } else {
        showError('Failed to log out. Please try again.');
      }
    });
  });
  
  // Wishlist select
  wishlistSelect.addEventListener('change', (e) => {
    selectedWishlistId = parseInt(e.target.value);
  });
  
  // Add button
  addButton.addEventListener('click', () => {
    if (!selectedWishlistId) {
      showError('Please select a wishlist');
      return;
    }
    
    const note = noteInput.value.trim();
    
    showScreen(loadingScreen);
    
    // Add item to selected wishlist
    chrome.runtime.sendMessage({
      action: 'addItem',
      data: {
        wishlistId: selectedWishlistId,
        title: currentProductInfo.title,
        price: currentProductInfo.price,
        imageUrl: currentProductInfo.imageUrl,
        productUrl: currentProductInfo.productUrl,
        store: currentProductInfo.store,
        note: note || null
      }
    }, response => {
      if (response && response.success) {
        showScreen(successScreen);
      } else {
        showError(response && response.error ? response.error : 'Failed to add item to wishlist');
      }
    });
  });
  
  // Cancel button
  cancelButton.addEventListener('click', () => {
    window.close();
  });
  
  // Done button
  doneButton.addEventListener('click', () => {
    window.close();
  });
  
  // View wishlist button
  viewWishlistButton.addEventListener('click', () => {
    chrome.tabs.create({ url: `${API_BASE_URL}/wishlist/${selectedWishlistId}` });
    window.close();
  });
  
  // Retry button
  retryButton.addEventListener('click', () => {
    showScreen(productScreen);
  });
  
  // Close button
  closeButton.addEventListener('click', () => {
    window.close();
  });
  
  // Extract product info when popup is opened
  document.addEventListener('DOMContentLoaded', () => {
    // Try to extract product info from the active tab
    chrome.runtime.sendMessage({ action: 'extractProductInfo' }, response => {
      if (response && response.success && response.productInfo) {
        currentProductInfo = response.productInfo;
        displayProductInfo();
      }
    });
  });
}

// Fetch user's wishlists
function fetchWishlists() {
  chrome.runtime.sendMessage({ action: 'fetchWishlists' }, response => {
    if (response && response.success && response.wishlists) {
      currentWishlists = response.wishlists;
      populateWishlistDropdown();
      
      if (currentProductInfo) {
        showScreen(productScreen);
      } else {
        // Try to extract product info again
        chrome.runtime.sendMessage({ action: 'extractProductInfo' }, response => {
          if (response && response.success && response.productInfo) {
            currentProductInfo = response.productInfo;
            displayProductInfo();
            showScreen(productScreen);
          } else {
            showError('No product detected on this page. Please navigate to a product page on Amazon, Target, or Walmart.');
          }
        });
      }
    } else {
      showError('Failed to fetch your wishlists');
    }
  });
}

// Populate the wishlist dropdown
function populateWishlistDropdown() {
  // Clear existing options
  wishlistSelect.innerHTML = '<option value="" disabled selected>Select a wishlist</option>';
  
  // Add options for each wishlist
  currentWishlists.forEach(wishlist => {
    const option = document.createElement('option');
    option.value = wishlist.id;
    option.textContent = wishlist.name;
    wishlistSelect.appendChild(option);
  });
}

// Display product information
function displayProductInfo() {
  if (!currentProductInfo) return;
  
  productImage.src = currentProductInfo.imageUrl || 'placeholder.png';
  productTitle.textContent = currentProductInfo.title || 'Unknown Product';
  productPrice.textContent = currentProductInfo.price ? `$${currentProductInfo.price}` : 'Price not available';
  productStore.textContent = currentProductInfo.store || 'Unknown Store';
}

// Show error screen with custom message
function showError(message) {
  errorMessage.textContent = message || 'Something went wrong. Please try again.';
  showScreen(errorScreen);
}

// Initialize the popup when loaded
window.addEventListener('DOMContentLoaded', initPopup);