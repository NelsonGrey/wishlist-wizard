// Global Variables
let currentProductInfo = null;
let wishlists = [];
let currentActiveScreen = 'loading-screen';
let currentActiveTab = 'product';
let currentTab = null;
let isLoggedIn = false;
let userId = null;
let username = null;
let comparisonResults = [];
let coupons = [];

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
    // Show loading screen during processing
    showScreen('loading-screen');
    
    // Check if we have a valid tab
    if (!currentTab || !currentTab.id) {
      throw new Error('No active tab found');
    }
    
    // Check if the URL is reachable and the tab is available
    if (!currentTab.url || currentTab.url.startsWith('chrome://') || 
        currentTab.url.startsWith('chrome-extension://') || 
        currentTab.url.startsWith('about:')) {
      // Current tab cannot be accessed by extension
      showErrorScreen('This page cannot be accessed by the extension', 'permission');
      return;
    }
    
    try {
      // Execute content script to get product info
      const result = await chrome.tabs.sendMessage(currentTab.id, { action: 'getProductInfo' });
      
      if (result && result.success) {
        // Product info was successfully extracted
        currentProductInfo = result.productInfo;
        
        // Log the extraction method for analytics
        console.log(`Product extracted using ${result.extractionMethod || 'unknown'} method`);
        
        // Validate we have the minimum required product information
        if (!currentProductInfo || !currentProductInfo.title) {
          showErrorScreen('Incomplete product information was extracted', 'parsing');
          console.warn('Incomplete product info:', currentProductInfo);
          return;
        }
        
        // Populate product details
        populateProductDetails();
        
        try {
          // Get user's wishlists
          await getWishlists();
          
          // Show product screen
          showScreen('product-screen');
        } catch (wishlitError) {
          // Handle errors getting wishlists
          console.error('Error getting wishlists:', wishlitError);
          showErrorScreen(
            'Could not load your wishlists. Please check your connection and try again.', 
            'network'
          );
        }
      } else {
        // Handle specific error types from content script
        if (result && result.errorType) {
          switch (result.errorType) {
            case 'detection':
              // Not a product page
              showScreen('not-product-screen');
              break;
            case 'parsing':
              // Failed to parse product information
              showErrorScreen(
                'Could not extract product information from this page. Try manual entry.', 
                'parsing'
              );
              // Store any partial info we may have received
              if (result.partialInfo) {
                currentProductInfo = result.partialInfo;
                populateProductDetails(true); // True indicates partial data
              }
              break;
            default:
              // General error
              showErrorScreen(result.error || 'Unknown error occurred', 'unknown');
          }
        } else {
          // Generic error or not a product page
          showScreen('not-product-screen');
        }
      }
    } catch (messageError) {
      // Handle error communicating with content script
      console.error('Error communicating with content script:', messageError);
      
      // Check if this is due to content script not being injected
      if (messageError.message && messageError.message.includes('Could not establish connection')) {
        showErrorScreen(
          'Extension cannot access this page. Refresh the page and try again.', 
          'permission'
        );
      } else {
        showScreen('not-product-screen');
      }
    }
  } catch (error) {
    console.error('Unexpected error in checkProductPage:', error);
    showErrorScreen('An unexpected error occurred: ' + error.message, 'unknown');
  }
}

// Display a specific error screen
function showErrorScreen(message, errorType = 'unknown') {
  document.getElementById('error-message').textContent = message;
  
  // Set appropriate action button text based on error type
  const retryButton = document.getElementById('retry-button');
  
  switch (errorType) {
    case 'network':
      retryButton.textContent = 'Retry Connection';
      break;
    case 'auth':
      retryButton.textContent = 'Sign In';
      retryButton.onclick = openLoginPage;
      break;
    case 'permission':
      retryButton.textContent = 'Refresh Page';
      retryButton.onclick = () => chrome.tabs.reload(currentTab.id);
      break;
    case 'parsing':
      retryButton.textContent = 'Try Manual Entry';
      retryButton.onclick = enableManualEntry;
      break;
    default:
      retryButton.textContent = 'Try Again';
  }
  
  showScreen('error-screen');
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

// Enable manual entry mode when automatic detection fails
function enableManualEntry() {
  // Pre-populate with any partial data we might have
  if (currentProductInfo) {
    document.getElementById('edit-title').value = currentProductInfo.title || '';
    document.getElementById('edit-price').value = currentProductInfo.price || '';
    document.getElementById('edit-image-url').value = currentProductInfo.imageUrl || '';
    
    // If we have store information, pre-populate it
    if (currentProductInfo.store) {
      document.getElementById('edit-store').value = currentProductInfo.store;
    } else {
      // Try to extract store from URL
      try {
        const url = new URL(currentTab.url);
        const hostname = url.hostname;
        const domainParts = hostname.split('.');
        const storeName = domainParts.length > 1 ? 
          domainParts[domainParts.length - 2].charAt(0).toUpperCase() + 
          domainParts[domainParts.length - 2].slice(1) : 
          hostname;
        
        document.getElementById('edit-store').value = storeName;
      } catch (err) {
        console.warn('Error extracting store from URL for manual entry', err);
        document.getElementById('edit-store').value = 'Online Store';
      }
    }
  } else {
    // Initialize with empty values if we have no data at all
    document.getElementById('edit-title').value = '';
    document.getElementById('edit-price').value = '';
    document.getElementById('edit-image-url').value = '';
    document.getElementById('edit-store').value = 'Online Store';
  }
  
  // Show the edit form
  document.getElementById('edit-product-form').classList.remove('hidden');
  document.getElementById('edit-product-button').classList.add('hidden');
  document.getElementById('manual-entry-instructions').classList.remove('hidden');
  
  // Focus on the title field
  document.getElementById('edit-title').focus();
  
  // If we're coming from the error screen, go back to product screen
  showScreen('product-screen');
}

// Populate product details in the UI
function populateProductDetails(isPartialData = false) {
  try {
    if (!currentProductInfo) {
      console.error('No product information available to populate UI');
      return;
    }
    
    const product = currentProductInfo;
    
    // Set product title
    const titleElement = document.getElementById('product-title');
    if (product.title) {
      titleElement.textContent = product.title;
    } else {
      titleElement.textContent = "Product Title Not Available";
      titleElement.classList.add('text-error');
    }
    
    // Set product price if available
    const priceElement = document.getElementById('product-price');
    if (product.price) {
      try {
        // Format price with currency symbol if not present
        const price = product.price.toString().trim();
        const formattedPrice = price.match(/^\d/) ? `$${price}` : price;
        priceElement.textContent = formattedPrice;
      } catch (err) {
        console.warn('Error formatting price:', err);
        priceElement.textContent = product.price;
      }
    } else {
      priceElement.textContent = "Price not available";
      priceElement.classList.add('text-muted');
    }
    
    // Set store name
    const storeTextElement = document.getElementById('product-store');
    const storeBadgeElement = document.getElementById('store-badge');
    
    if (product.store) {
      storeTextElement.textContent = `from ${product.store}`;
      storeBadgeElement.textContent = product.store;
    } else {
      storeTextElement.textContent = `from Online Store`;
      storeBadgeElement.textContent = 'Online Store';
    }
    
    // Set image if available
    const imageContainer = document.getElementById('product-image');
    if (product.imageUrl) {
      imageContainer.src = product.imageUrl;
      imageContainer.alt = product.title || 'Product Image';
      imageContainer.classList.remove('hidden');
    } else {
      // Show placeholder image or hide container
      imageContainer.classList.add('hidden');
    }
    
    // Populate edit form fields
    document.getElementById('edit-title').value = product.title || '';
    document.getElementById('edit-price').value = product.price || '';
    document.getElementById('edit-store').value = product.store || '';
    document.getElementById('edit-image-url').value = product.imageUrl || '';
    
    // If working with partial data or auto detection failed, show a notification
    if (isPartialData) {
      const partialDataNotice = document.getElementById('partial-data-notice');
      if (partialDataNotice) {
        partialDataNotice.classList.remove('hidden');
      }
      
      // Show edit form automatically for partial data
      enableManualEntry();
    }
  } catch (error) {
    console.error('Error populating product details:', error);
    // Show error in the UI
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = 'Error displaying product information. Please try again.';
    
    const productInfo = document.querySelector('.product-info');
    if (productInfo) {
      productInfo.appendChild(errorElement);
    }
  }
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
    // Validate we have a product to add
    if (!currentProductInfo) {
      throw new Error('No product information available to add');
    }
    
    // Get server URL
    const baseUrl = await getBaseUrl();
    
    // Get selected wishlist and note
    const wishlistSelect = document.getElementById('wishlist-select');
    const noteInput = document.getElementById('note-input');
    
    if (!wishlistSelect) {
      throw new Error('Wishlist selection element not found');
    }
    
    const wishlistId = wishlistSelect.value;
    const note = noteInput ? noteInput.value : '';
    
    // Validate wishlist selection
    if (!wishlistId) {
      throw new Error('Please select a wishlist');
    }
    
    // Get any manually entered data
    const manualTitle = document.getElementById('edit-title')?.value;
    const manualPrice = document.getElementById('edit-price')?.value;
    const manualImageUrl = document.getElementById('edit-image-url')?.value;
    const manualStore = document.getElementById('edit-store')?.value;
    
    // Use manual data if available, otherwise use extracted data
    const useManualEntry = document.getElementById('edit-product-form') && 
                          !document.getElementById('edit-product-form').classList.contains('hidden');
    
    // Prepare item data, prioritizing manually entered data if the edit form is visible
    const itemData = {
      wishlistId: parseInt(wishlistId),
      title: useManualEntry && manualTitle ? manualTitle : currentProductInfo.title,
      price: useManualEntry && manualPrice ? manualPrice : (currentProductInfo.price || ''),
      productUrl: currentProductInfo.productUrl || currentTab.url,
      imageUrl: useManualEntry && manualImageUrl ? manualImageUrl : (currentProductInfo.imageUrl || ''),
      store: useManualEntry && manualStore ? manualStore : (currentProductInfo.store || 'Online Store'),
      note: note || null
    };
    
    // Validate required fields
    if (!itemData.title) {
      throw new Error('Product title is required');
    }
    
    // Add timestamp for analytics
    itemData.addedAt = new Date().toISOString();
    
    // Track the source of the addition (manual vs automatic)
    itemData.source = useManualEntry ? 'manual' : 'automatic';
    
    // Log the request for troubleshooting
    console.log('Adding item to wishlist:', itemData);
    
    // Set up timeout to handle network issues
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), 15000)
    );
    
    // Send request to add item with timeout protection
    const fetchPromise = fetch(`${baseUrl}/api/extension/add-item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(itemData)
    });
    
    // Race between the fetch and the timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    // Handle HTTP errors
    if (!response.ok) {
      // Try to parse error response
      try {
        const errorData = await response.json();
        
        // Handle authentication errors specially
        if (response.status === 401) {
          showErrorScreen('You need to log in to add items to your wishlist', 'auth');
          return;
        }
        
        // Handle permission errors
        if (response.status === 403) {
          throw new Error(errorData.error || 'You don\'t have permission to add to this wishlist');
        }
        
        // Handle other errors
        throw new Error(errorData.error || `Server error (${response.status})`);
      } catch (parseError) {
        // If we can't parse the error JSON, use the status text
        throw new Error(`Failed to add item: ${response.statusText || response.status}`);
      }
    }
    
    // Parse the successful response
    const responseData = await response.json();
    
    // Item added successfully
    showScreen('success-screen');
    
    // Update success message with wishlist name
    const wishlist = wishlists.find(w => w.id === parseInt(wishlistId));
    const wishlistName = wishlist ? wishlist.name : 'wishlist';
    
    const successTitle = document.querySelector('#success-screen h2');
    if (successTitle) {
      successTitle.textContent = `Added to ${wishlistName}!`;
    }
    
    // Set up view wishlist button
    document.getElementById('view-wishlist-button').onclick = () => {
      chrome.tabs.create({ url: `${baseUrl}/wishlists/${wishlistId}` });
      window.close();
    };
    
    // Track successful addition in extension storage for stats
    try {
      chrome.storage.local.get(['addedItems'], (result) => {
        const addedItems = result.addedItems || [];
        addedItems.push({
          date: new Date().toISOString(),
          wishlistId,
          wishlistName,
          itemTitle: itemData.title,
          store: itemData.store
        });
        chrome.storage.local.set({ addedItems });
      });
    } catch (storageError) {
      console.warn('Failed to save stats to extension storage:', storageError);
    }
  } catch (error) {
    console.error('Error adding item to wishlist:', error);
    
    // Determine error type for better user feedback
    let errorType = 'unknown';
    const errorMsg = error.message.toLowerCase();
    
    if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('timed out')) {
      errorType = 'network';
    } else if (errorMsg.includes('permission') || errorMsg.includes('access')) {
      errorType = 'permission';
    } else if (errorMsg.includes('log in') || errorMsg.includes('authentication')) {
      errorType = 'auth';
    }
    
    showErrorScreen(error.message, errorType);
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