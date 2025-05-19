// Global Variables
let currentProductInfo = null;
let wishlists = [];
let currentActiveScreen = 'loading-screen';
let currentTab = null;
let isLoggedIn = false;
let userId = null;
let username = null;

// Show a specific screen and hide all others
function showScreen(screenId) {
  // Hide all screens
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    screen.classList.add('hidden');
  });
  
  // Show the requested screen
  const screenToShow = document.getElementById(screenId);
  if (screenToShow) {
    screenToShow.classList.remove('hidden');
    currentActiveScreen = screenId;
  }
}

// Initialize the popup when it's opened
document.addEventListener('DOMContentLoaded', async () => {
  // Show loading screen first
  showScreen('loading-screen');
  
  // Get the active tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];
  
  // Check login status
  checkLoginStatus();
  
  // Setup event listeners
  setupEventListeners();
});

// Check if user is logged in
async function checkLoginStatus() {
  try {
    // Get the base URL for the API
    const baseUrl = await getBaseUrl();
    
    // Make API request to check login status
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const userData = await response.json();
      isLoggedIn = true;
      userId = userData.id;
      username = userData.username;
      
      // Show user info in footer
      document.getElementById('username').textContent = username;
      document.getElementById('user-info').classList.remove('hidden');
      document.getElementById('logout-button').classList.remove('hidden');
      
      // Check if we're on a product page
      await checkProductPage();
    } else {
      // Not logged in, show login screen
      showScreen('login-screen');
    }
  } catch (error) {
    console.error('Error checking login status:', error);
    showScreen('login-screen');
  }
}

// Check if current page is a product page
async function checkProductPage() {
  try {
    // Execute content script to get product info
    const result = await chrome.tabs.sendMessage(currentTab.id, { action: 'getProductInfo' });
    
    if (result && result.success) {
      // Product info was successfully extracted
      currentProductInfo = result.productInfo;
      
      // Populate product details
      populateProductDetails();
      
      // Get user's wishlists
      await getWishlists();
      
      // Show product screen
      showScreen('product-screen');
    } else {
      // Not a product page or extraction failed
      showScreen('not-product-screen');
    }
  } catch (error) {
    console.error('Error checking product page:', error);
    // Content script might not be running on this page
    showScreen('not-product-screen');
  }
}

// Force product detection even if automatic detection failed
async function forceProductDetection() {
  showScreen('loading-screen');
  
  try {
    // Try to get product info with a more aggressive approach
    const result = await chrome.tabs.sendMessage(currentTab.id, { 
      action: 'getProductInfo',
      force: true 
    });
    
    if (result && result.productInfo && result.productInfo.title) {
      // Product info was extracted
      currentProductInfo = result.productInfo;
      
      // Populate product details
      populateProductDetails();
      
      // Get user's wishlists
      await getWishlists();
      
      // Show product screen
      showScreen('product-screen');
    } else {
      // Still failed, show error
      document.getElementById('error-message').textContent = 
        "Sorry, we couldn't detect product information on this page.";
      showScreen('error-screen');
    }
  } catch (error) {
    console.error('Error in forced product detection:', error);
    document.getElementById('error-message').textContent = 
      "Sorry, we couldn't detect product information on this page.";
    showScreen('error-screen');
  }
}

// Populate product details in the UI
function populateProductDetails() {
  const product = currentProductInfo;
  
  // Set product title
  document.getElementById('product-title').textContent = product.title;
  
  // Set product price if available
  if (product.price) {
    // Format price with currency symbol if not present
    const price = product.price.trim();
    const formattedPrice = price.match(/^\d/) ? `$${price}` : price;
    document.getElementById('product-price').textContent = formattedPrice;
  } else {
    document.getElementById('product-price').textContent = "Price not available";
  }
  
  // Set store name
  document.getElementById('product-store').textContent = `from ${product.store}`;
  document.getElementById('store-badge').textContent = product.store;
  
  // Set image if available
  if (product.imageUrl) {
    const img = document.createElement('img');
    img.src = product.imageUrl;
    img.alt = product.title;
    img.className = 'product-image';
    const imageContainer = document.getElementById('product-image');
    imageContainer.src = product.imageUrl;
  }
  
  // Populate edit form fields
  document.getElementById('edit-title').value = product.title;
  document.getElementById('edit-price').value = product.price || '';
}

// Get user's wishlists
async function getWishlists() {
  try {
    const baseUrl = await getBaseUrl();
    
    // Get user's personal wishlists
    const response = await fetch(`${baseUrl}/api/wishlists`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      wishlists = await response.json();
      
      // Get user's collaborative wishlists
      const collabResponse = await fetch(`${baseUrl}/api/collaborative-wishlists`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (collabResponse.ok) {
        const collabWishlists = await collabResponse.json();
        // Combine personal and collaborative wishlists
        wishlists = [...wishlists, ...collabWishlists];
      }
      
      // Populate wishlist dropdown
      populateWishlistDropdown();
    } else {
      throw new Error('Failed to get wishlists');
    }
  } catch (error) {
    console.error('Error getting wishlists:', error);
    document.getElementById('error-message').textContent = 
      "Failed to load your wishlists. Please try again.";
    showScreen('error-screen');
  }
}

// Populate wishlist dropdown
function populateWishlistDropdown() {
  const select = document.getElementById('wishlist-select');
  
  // Clear existing options
  select.innerHTML = '<option value="" disabled selected>Select a wishlist</option>';
  
  // Add wishlists to dropdown
  wishlists.forEach(wishlist => {
    const option = document.createElement('option');
    option.value = wishlist.id;
    option.textContent = wishlist.name;
    select.appendChild(option);
  });
}

// Add the current product to the selected wishlist
async function addToWishlist() {
  // Show loading screen
  showScreen('loading-screen');
  
  try {
    const baseUrl = await getBaseUrl();
    const wishlistId = document.getElementById('wishlist-select').value;
    const note = document.getElementById('note-input').value;
    
    if (!wishlistId) {
      throw new Error('Please select a wishlist');
    }
    
    // Prepare item data
    const itemData = {
      wishlistId: parseInt(wishlistId),
      title: currentProductInfo.title,
      price: currentProductInfo.price || '',
      productUrl: currentProductInfo.productUrl,
      imageUrl: currentProductInfo.imageUrl || '',
      store: currentProductInfo.store,
      note: note || null
    };
    
    // Send request to add item
    const response = await fetch(`${baseUrl}/api/extension/add-item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(itemData)
    });
    
    if (response.ok) {
      // Item added successfully
      showScreen('success-screen');
      
      // Get the wishlist name for the success message
      const wishlist = wishlists.find(w => w.id === parseInt(wishlistId));
      const wishlistName = wishlist ? wishlist.name : 'wishlist';
      
      // Set up view wishlist button
      document.getElementById('view-wishlist-button').onclick = () => {
        chrome.tabs.create({ url: `${baseUrl}/wishlists/${wishlistId}` });
        window.close();
      };
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add item to wishlist');
    }
  } catch (error) {
    console.error('Error adding item to wishlist:', error);
    document.getElementById('error-message').textContent = error.message;
    showScreen('error-screen');
  }
}

// Update product information from edit form
function updateProductInfo() {
  const newTitle = document.getElementById('edit-title').value;
  const newPrice = document.getElementById('edit-price').value;
  
  if (newTitle) {
    currentProductInfo.title = newTitle;
    document.getElementById('product-title').textContent = newTitle;
  }
  
  if (newPrice) {
    currentProductInfo.price = newPrice;
    // Format price with currency symbol if not present
    const formattedPrice = newPrice.match(/^\d/) ? `$${newPrice}` : newPrice;
    document.getElementById('product-price').textContent = formattedPrice;
  }
  
  // Hide edit form
  document.getElementById('edit-product-form').classList.add('hidden');
}

// Get the base URL for API requests
async function getBaseUrl() {
  // Get extension URL from manifest
  const extensionUrl = chrome.runtime.getURL('');
  
  // Check if we're in development or production
  if (extensionUrl.includes('chrome-extension://')) {
    // Production mode - use the actual website
    return "https://wishkeeper.replit.app";
  } else {
    // Development mode - use localhost
    return "http://localhost:5000";
  }
}

// Open login page in new tab
function openLoginPage() {
  chrome.tabs.create({ url: getBaseUrl() + '/login' });
  window.close();
}

// Handle logout
async function handleLogout() {
  try {
    const baseUrl = await getBaseUrl();
    
    // Call logout API
    await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    
    // Reset UI
    isLoggedIn = false;
    userId = null;
    username = null;
    
    document.getElementById('user-info').classList.add('hidden');
    document.getElementById('logout-button').classList.add('hidden');
    
    // Show login screen
    showScreen('login-screen');
  } catch (error) {
    console.error('Error logging out:', error);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Login button
  document.getElementById('login-button').addEventListener('click', openLoginPage);
  
  // Logout button
  document.getElementById('logout-button').addEventListener('click', handleLogout);
  
  // Force detection button
  document.getElementById('force-detection-button').addEventListener('click', forceProductDetection);
  
  // Add to wishlist form submission
  document.getElementById('add-button').addEventListener('click', (e) => {
    e.preventDefault();
    addToWishlist();
  });
  
  // Edit product button
  document.getElementById('edit-product-button').addEventListener('click', () => {
    const editForm = document.getElementById('edit-product-form');
    if (editForm.classList.contains('hidden')) {
      editForm.classList.remove('hidden');
    } else {
      editForm.classList.add('hidden');
    }
  });
  
  // Update product button
  document.getElementById('update-product-button').addEventListener('click', updateProductInfo);
  
  // Cancel button
  document.getElementById('cancel-button').addEventListener('click', () => {
    window.close();
  });
  
  // Done button (on success screen)
  document.getElementById('done-button').addEventListener('click', () => {
    window.close();
  });
  
  // Retry button (on error screen)
  document.getElementById('retry-button').addEventListener('click', () => {
    // Go back to product screen
    if (currentProductInfo) {
      showScreen('product-screen');
    } else {
      checkProductPage();
    }
  });
  
  // Close button (on error screen)
  document.getElementById('close-button').addEventListener('click', () => {
    window.close();
  });
}