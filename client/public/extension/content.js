// WishKeeper Extension - Content Script
// This script runs on supported shopping websites and extracts product information

// Function to track content script events
function trackContentEvent(action, category = 'content', label = null, value = null) {
  try {
    chrome.runtime.sendMessage({
      type: 'TRACK_EVENT',
      payload: {
        action,
        category,
        label,
        value
      }
    });
    console.log(`Content script tracked: ${category} - ${action}`);
  } catch (error) {
    console.warn('Failed to track content script event:', error);
  }
}

// Listen for messages from the background script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  try {
    if (message.action === 'extractProductInfo' || message.action === 'getProductInfo') {
      // If force flag is set, use a more aggressive approach
      if (message.force) {
        // For forced detection, lower the threshold for product page detection
        const isProductPage = true; // Skip the check entirely
        
        try {
          const productInfo = extractProductInfo();
          
          // Validate that we have sufficient product information
          if (!productInfo.success || !productInfo.productInfo.title) {
            // Track failed product extraction
            trackContentEvent('product_extraction_failed', 'product', 'insufficient_info');
            
            sendResponse({ 
              success: false, 
              error: 'Could not extract sufficient product information', 
              errorType: 'parsing',
              partialInfo: productInfo.productInfo || null
            });
            return true;
          }
          
          // Track successful product extraction
          trackContentEvent('product_extraction_success', 'product', 
            productInfo.productInfo.store || window.location.hostname);
          
          sendResponse(productInfo);
        } catch (error) {
          console.error('Error extracting product info (forced):', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Error extracting product information', 
            errorType: 'parsing',
            stack: error.stack
          });
        }
      } else {
        // Normal detection with error handling
        try {
          const isProductPage = checkIfProductPage();
          
          if (!isProductPage) {
            sendResponse({ 
              success: false, 
              error: 'Not a product page', 
              errorType: 'detection',
              url: window.location.href
            });
            return true;
          }
          
          const productInfo = extractProductInfo();
          
          // Validate extraction results
          if (!productInfo.success || !productInfo.productInfo.title) {
            sendResponse({ 
              success: false, 
              error: 'Could not extract sufficient product information',
              errorType: 'parsing',
              partialInfo: productInfo.productInfo || null
            });
            return true;
          }
          
          sendResponse(productInfo);
        } catch (error) {
          console.error('Error in product detection/extraction:', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Error processing product page', 
            errorType: error.message.includes('detection') ? 'detection' : 'parsing',
            stack: error.stack
          });
        }
      }
    } else if (message.action === 'enableQuickAdd') {
      // Handle the quick add button injection
      try {
        if (!message.isLoggedIn) {
          sendResponse({
            success: false,
            error: 'User must be logged in to enable quick add'
          });
          return true;
        }
        
        if (!message.baseUrl) {
          sendResponse({
            success: false,
            error: 'Base URL is required for API communication'
          });
          return true;
        }
        
        // Inject the quick add button
        const quickAddResult = injectQuickAddButton(message.baseUrl, message.productInfo);
        
        sendResponse({
          success: quickAddResult.success,
          message: quickAddResult.message
        });
      } catch (error) {
        console.error('Error enabling quick add:', error);
        sendResponse({
          success: false,
          error: error.message || 'Error enabling quick add functionality',
          stack: error.stack
        });
      }
    } else if (message.action === 'applyCoupon') {
      // Handle applying a coupon code
      try {
        const code = message.code;
        if (!code) {
          sendResponse({
            success: false,
            message: 'No coupon code provided'
          });
          return true;
        }
        
        // Try to find coupon input fields
        const result = applyCouponCode(code);
        sendResponse(result);
      } catch (error) {
        console.error('Error applying coupon:', error);
        sendResponse({
          success: false,
          message: error.message || 'Error applying coupon code'
        });
      }
    } else {
      // Unknown action
      sendResponse({
        success: false,
        error: `Unknown action: ${message.action}`,
        errorType: 'unknown'
      });
    }
  } catch (error) {
    // Catch-all for any unexpected errors
    console.error('Unexpected error in content script:', error);
    sendResponse({
      success: false,
      error: error.message || 'An unexpected error occurred',
      errorType: 'unknown',
      stack: error.stack
    });
  }
  
  return true;
});

// Extract product information based on the current website
function extractProductInfo() {
  try {
    const url = window.location.href;
    let productInfo = null;
    let extractionMethod = 'unknown';
    
    // Validate we have a proper URL
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL for product extraction');
    }
    
    // Try site-specific extractors first for better results
    if (url.includes('amazon.com') && url.includes('/dp/')) {
      try {
        productInfo = extractAmazonProductInfo();
        extractionMethod = 'amazon';
      } catch (err) {
        console.warn('Amazon-specific extraction failed, falling back to generic extraction', err);
      }
    }
    else if (url.includes('target.com') && url.includes('/p/')) {
      try {
        productInfo = extractTargetProductInfo();
        extractionMethod = 'target';
      } catch (err) {
        console.warn('Target-specific extraction failed, falling back to generic extraction', err);
      }
    }
    else if (url.includes('walmart.com') && url.includes('/ip/')) {
      try {
        productInfo = extractWalmartProductInfo();
        extractionMethod = 'walmart';
      } catch (err) {
        console.warn('Walmart-specific extraction failed, falling back to generic extraction', err);
      }
    }
    
    // If site-specific extraction failed or it's not a known site, try generic extraction
    if (!productInfo) {
      try {
        productInfo = extractGenericProductInfo();
        extractionMethod = 'generic';
      } catch (err) {
        console.error('Generic extraction failed:', err);
        throw new Error('Failed to extract product information: ' + err.message);
      }
    }
    
    // Validate extraction results
    if (!productInfo) {
      return {
        success: false,
        error: 'Unable to extract product information',
        errorType: 'parsing',
        url: url
      };
    }
    
    // Validate required fields
    if (!productInfo.title) {
      return {
        success: false,
        error: 'Could not detect product title',
        errorType: 'parsing',
        partialInfo: productInfo,
        extractionMethod
      };
    }
    
    if (!productInfo.productUrl) {
      // Set product URL to current page if missing
      productInfo.productUrl = url;
    }
    
    // Get store name from the URL if not already set
    if (!productInfo.store) {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        const domainParts = hostname.split('.');
        // Usually the domain name is the second-to-last part (e.g., 'amazon' in 'www.amazon.com')
        const storeName = domainParts.length > 1 ? 
          domainParts[domainParts.length - 2].charAt(0).toUpperCase() + 
          domainParts[domainParts.length - 2].slice(1) : 
          hostname;
        
        productInfo.store = storeName;
      } catch (err) {
        console.warn('Error extracting store name from URL, using default', err);
        productInfo.store = 'Online Store';
      }
    }
    
    // Sanitize the price if present
    if (productInfo.price) {
      productInfo.price = sanitizePrice(productInfo.price);
    }
    
    // Ensure image URL is absolute
    if (productInfo.imageUrl && !productInfo.imageUrl.startsWith('http')) {
      try {
        const urlObj = new URL(url);
        const baseUrl = urlObj.origin;
        
        if (productInfo.imageUrl.startsWith('//')) {
          productInfo.imageUrl = 'https:' + productInfo.imageUrl;
        } else if (productInfo.imageUrl.startsWith('/')) {
          productInfo.imageUrl = baseUrl + productInfo.imageUrl;
        } else {
          productInfo.imageUrl = baseUrl + '/' + productInfo.imageUrl;
        }
      } catch (err) {
        console.warn('Error converting relative image URL to absolute', err);
      }
    }
    
    return {
      success: true,
      productInfo,
      extractionMethod
    };
  } catch (error) {
    console.error('Error extracting product info:', error);
    return {
      success: false,
      error: error.message,
      errorType: 'parsing',
      stack: error.stack,
      url: window.location.href
    };
  }
}

// Helper function to sanitize price strings
function sanitizePrice(price) {
  if (!price) return '';
  
  // Handle already clean prices
  if (typeof price === 'number') {
    return price.toFixed(2);
  }
  
  // Convert to string if not already
  const priceStr = String(price).trim();
  
  // Remove all non-numeric characters except for decimal points/commas
  let sanitized = priceStr.replace(/[^\d.,]/g, '');
  
  // Convert comma-based decimals to dot-based (e.g., European format)
  if (sanitized.includes(',') && !sanitized.includes('.')) {
    sanitized = sanitized.replace(',', '.');
  } else if (sanitized.includes(',') && sanitized.includes('.')) {
    // Handle cases like "1,234.56" - remove commas
    sanitized = sanitized.replace(/,/g, '');
  }
  
  // Ensure we have a proper number
  const numValue = parseFloat(sanitized);
  if (isNaN(numValue)) {
    return '';
  }
  
  return numValue.toFixed(2);
}

// Extract product information from Amazon product pages
function extractAmazonProductInfo() {
  // Product title
  const titleElement = document.getElementById('productTitle') || 
                      document.querySelector('.product-title-word-break');
  const title = titleElement ? titleElement.textContent.trim() : '';
  
  // Product price
  let price = '';
  const priceElements = [
    document.querySelector('.a-price .a-offscreen'),
    document.querySelector('#priceblock_ourprice'),
    document.querySelector('#priceblock_dealprice'),
    document.querySelector('.a-price')
  ];
  
  for (const element of priceElements) {
    if (element) {
      price = element.textContent.trim();
      break;
    }
  }
  
  // Remove currency symbols and convert to string
  price = price.replace(/[^0-9,.]/g, '');
  
  // Product image
  const imageElement = document.querySelector('#landingImage') || 
                      document.querySelector('#imgBlkFront') ||
                      document.querySelector('.a-dynamic-image');
  const imageUrl = imageElement ? imageElement.src : '';
  
  return {
    title,
    price,
    imageUrl,
    productUrl: window.location.href,
    store: 'Amazon'
  };
}

// Extract product information from Target product pages
function extractTargetProductInfo() {
  // Product title
  const titleElement = document.querySelector('h1[data-test="product-title"]') ||
                      document.querySelector('.Heading__StyledHeading-sc-1mp23s9-0');
  const title = titleElement ? titleElement.textContent.trim() : '';
  
  // Product price
  const priceElement = document.querySelector('[data-test="product-price"]') ||
                      document.querySelector('.style__PriceFontSize-sc-17wlxvr-0');
  let price = priceElement ? priceElement.textContent.trim() : '';
  
  // Remove currency symbols and convert to string
  price = price.replace(/[^0-9,.]/g, '');
  
  // Product image
  const imageElement = document.querySelector('img[data-test="product-image"]') ||
                      document.querySelector('.slideDeckPicture img');
  const imageUrl = imageElement ? imageElement.src : '';
  
  return {
    title,
    price,
    imageUrl,
    productUrl: window.location.href,
    store: 'Target'
  };
}

// Extract product information from Walmart product pages
function extractWalmartProductInfo() {
  // Product title
  const titleElement = document.querySelector('h1.prod-ProductTitle') ||
                      document.querySelector('[data-automation="product-title"]');
  const title = titleElement ? titleElement.textContent.trim() : '';
  
  // Product price
  const priceElement = document.querySelector('.prod-PriceSection .price-characteristic') ||
                      document.querySelector('[data-automation="product-price"]');
  let price = priceElement ? priceElement.textContent.trim() : '';
  
  // Remove currency symbols and convert to string
  price = price.replace(/[^0-9,.]/g, '');
  
  // Product image
  const imageElement = document.querySelector('.prod-hero-image img') ||
                      document.querySelector('[data-automation="image-main"]');
  const imageUrl = imageElement ? imageElement.src : '';
  
  return {
    title,
    price,
    imageUrl,
    productUrl: window.location.href,
    store: 'Walmart'
  };
}

// Extract product information from any website using generic selectors and heuristics
function extractGenericProductInfo() {
  let title = '';
  let price = '';
  let imageUrl = '';
  
  // Title extraction strategies
  // Try various common selectors for product titles
  const titleSelectors = [
    // Common heading patterns
    'h1', 'h2.product-name', '.product-title', '.product-name', '.product_title',
    '.product-detail__name', '.product-info__title', '.pdp-title',
    // Structured data
    '[itemprop="name"]',
    // Common patterns
    '#productTitle', '#product-name', '.title', '.main-title',
    // Meta tags
    'meta[property="og:title"]', 'meta[name="twitter:title"]'
  ];
  
  // Try each title selector until we find a match
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    
    if (element) {
      // For meta tags, get the content attribute
      if (element.tagName.toLowerCase() === 'meta') {
        title = element.getAttribute('content');
      } else {
        title = element.textContent;
      }
      
      title = title.trim();
      if (title) break;
    }
  }
  
  // Price extraction strategies
  const priceSelectors = [
    // Structured data
    '[itemprop="price"]', '[data-price-type="finalPrice"]',
    // Common class patterns
    '.price', '.product-price', '.offer-price', '.sales-price',
    '.current-price', '.now-price', '.product__price', '.pdp-price',
    // IDs
    '#priceblock_ourprice', '#price', '#product-price',
    // Meta tags
    'meta[property="og:price:amount"]', 'meta[property="product:price:amount"]'
  ];
  
  // Try each price selector until we find a match
  for (const selector of priceSelectors) {
    const element = document.querySelector(selector);
    
    if (element) {
      // For meta tags, get the content attribute
      if (element.tagName.toLowerCase() === 'meta') {
        price = element.getAttribute('content');
      } else {
        price = element.textContent;
      }
      
      price = price.trim().replace(/[^0-9,.]/g, '');
      if (price) break;
    }
  }
  
  // Image extraction strategies
  const imageSelectors = [
    // Structured data
    '[itemprop="image"]',
    // Common product image patterns
    '.product-image img', '.product-image', '.gallery-image',
    '.product-image-main', '.product-img', 'img.main-image',
    '#product-image', '.main-product-image',
    // Media galleries
    '.product-media img:first-child', '.gallery img:first-child',
    // Meta tags
    'meta[property="og:image"]', 'meta[name="twitter:image"]'
  ];
  
  // Try each image selector until we find a match
  for (const selector of imageSelectors) {
    const element = document.querySelector(selector);
    
    if (element) {
      // For meta tags, get the content attribute
      if (element.tagName.toLowerCase() === 'meta') {
        imageUrl = element.getAttribute('content');
      } else if (element.tagName.toLowerCase() === 'img') {
        imageUrl = element.src;
      } else {
        // If it's not an img or meta tag, try to find an img inside
        const img = element.querySelector('img');
        if (img) {
          imageUrl = img.src;
        }
      }
      
      if (imageUrl) break;
    }
  }
  
  // Fallback - if we couldn't find an image, grab the largest image on the page
  if (!imageUrl) {
    let largestArea = 0;
    let largestImage = null;
    
    document.querySelectorAll('img').forEach(img => {
      // Get dimensions - either from attributes or actual rendered size
      const width = img.getAttribute('width') || img.clientWidth;
      const height = img.getAttribute('height') || img.clientHeight;
      
      // Calculate area
      const area = width * height;
      
      // Skip small icons and logos
      if (area > largestArea && area > 10000) { // Threshold of 100x100 to avoid icons
        largestArea = area;
        largestImage = img;
      }
    });
    
    if (largestImage) {
      imageUrl = largestImage.src;
    }
  }
  
  // Validate that we have at least a title to return meaningful data
  if (!title) {
    // Final fallback - use the document title as product title
    title = document.title;
    
    // Remove site name from document title (common format: "Product Name | Site Name")
    const siteSeparators = [' | ', ' - ', ' – ', ' — ', ' :: ', ' // '];
    
    for (const separator of siteSeparators) {
      if (title.includes(separator)) {
        title = title.split(separator)[0].trim();
        break;
      }
    }
  }
  
  return {
    title,
    price,
    imageUrl,
    productUrl: window.location.href,
    store: '' // Store name will be extracted from URL in the main function
  };
}

// Add a WishKeeper button to product pages
function addWishKeeperButton() {
  // Check if we're on a product page
  const productInfo = extractProductInfo();
  
  // Only proceed if we've successfully extracted product information
  // This helps ensure we only show the button on actual product pages
  if (!productInfo.success || !productInfo.productInfo.title) return;
  
  // Additional validation to avoid adding button on non-product pages
  // Check if this looks like a product page by various signals
  const isLikelyProductPage = checkIfProductPage();
  
  // Only show the button if we're confident this is a product page
  if (!isLikelyProductPage) return;
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'wishkeeper-button-container';
  buttonContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    background-color: #ffffff;
    border-radius: 50%;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    transition: transform 0.3s ease;
  `;
  
  // Create button
  const button = document.createElement('button');
  button.id = 'wishkeeper-add-button';
  button.style.cssText = `
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: none;
    outline: none;
    background-color: #6366f1;
    color: white;
    font-size: 24px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: background-color 0.2s ease;
  `;
  button.innerHTML = '♥';
  button.title = 'Add to WishKeeper';
  
  // Add hover effect
  button.onmouseover = () => {
    button.style.backgroundColor = '#4f46e5';
    buttonContainer.style.transform = 'scale(1.1)';
  };
  button.onmouseout = () => {
    button.style.backgroundColor = '#6366f1';
    buttonContainer.style.transform = 'scale(1)';
  };
  
  // Add click event
  button.onclick = () => {
    // Track the button click event
    trackContentEvent('wishkeeper_button_clicked', 'engagement', window.location.hostname);
    
    // Send message to background script to handle adding to wishlist
    chrome.runtime.sendMessage({
      action: 'extractProductInfo'
    }, response => {
      if (response && response.success) {
        // Track successful product detection
        trackContentEvent('product_detected', 'product', response.productInfo.store || window.location.hostname);
        
        chrome.runtime.sendMessage({
          action: 'openPopup',
          data: response.productInfo
        });
      } else {
        // Track failed product detection
        trackContentEvent('product_detection_failed', 'product', window.location.hostname);
      }
    });
  };
  
  // Add button to container
  buttonContainer.appendChild(button);
  
  // Add container to page
  document.body.appendChild(buttonContainer);
}

// Determine if current page is likely a product page
function checkIfProductPage() {
  // Enhanced score-based approach to identify product pages with multiple strategies
  let score = 0;
  
  // Strategy 1: Check URL patterns common for product pages
  const url = window.location.href.toLowerCase();
  const urlPatterns = [
    '/product/', '/p/', '/dp/', '/item/', '/pd/', '/ip/',
    '/shop/product', '/products/', '/product-', '/product_',
    '/catalog/', '/detail/', '/buy/', '/purchase/', 
    '/goods/', '/offer/', '/prod/', '/sku/', '/shop/item'
  ];
  
  for (const pattern of urlPatterns) {
    if (url.includes(pattern)) {
      score += 2;
      break;
    }
  }
  
  // Check if URL contains product identifiers
  const productIdPatterns = [
    /\/[A-Z0-9]{10,}(?:\/|$)/,  // ASIN-like IDs
    /prod[0-9]{5,}/i,           // product ID patterns
    /sku[-_][0-9]{5,}/i,        // SKU patterns
    /item[0-9]{5,}/i,           // item number patterns
  ];
  
  for (const pattern of productIdPatterns) {
    if (pattern.test(url)) {
      score += 2;
      break;
    }
  }
  
  // Check for structured data that indicates a product page
  if (document.querySelector('script[type="application/ld+json"]')) {
    // Try to parse the JSON-LD and look for product schema
    try {
      const ldJsonElements = document.querySelectorAll('script[type="application/ld+json"]');
      for (const element of ldJsonElements) {
        const data = JSON.parse(element.textContent);
        
        // Check if this is product schema
        if (data && (data['@type'] === 'Product' || 
            (data['@graph'] && data['@graph'].some(item => item['@type'] === 'Product')))) {
          score += 5;
          break;
        }
      }
    } catch (e) {
      // Error parsing JSON-LD, do nothing
    }
  }
  
  // Check for common product page elements (enhanced for better detection)
  const productPageElements = [
    'add to cart', 'add to basket', 'add to bag', 'buy now', 'purchase now',
    'checkout', 'shopping cart', 'product details', 'specifications',
    'product description', 'reviews', 'rating', 'shop now', 'shipping',
    'delivery', 'in stock', 'out of stock', 'availability', 'add to wishlist',
    'save for later', 'price match', 'installment', 'payment options',
    'color options', 'size guide', 'dimensions', 'product options', 'quantity'
  ];
  
  const pageText = document.body.innerText.toLowerCase();
  for (const element of productPageElements) {
    if (pageText.includes(element)) {
      score += 1;
    }
  }
  
  // Check for product form elements
  if (document.querySelector('form[action*="cart"]') || 
      document.querySelector('form[action*="basket"]') ||
      document.querySelector('form[action*="checkout"]') ||
      document.querySelector('button[type="submit"][name*="cart"]') ||
      document.querySelector('button[name*="add-to-cart"]') ||
      document.querySelector('input[name*="add-to-cart"]')) {
    score += 3;
  }
  
  // Check for product variation selectors
  if (document.querySelector('select[name*="variation"]') || 
      document.querySelector('select[id*="variant"]') || 
      document.querySelector('.product-options') ||
      document.querySelector('.product-variants')) {
    score += 2;
  }
  
  // Check for product-specific metadata
  if (document.querySelector('meta[property="og:type"][content="product"]') ||
      document.querySelector('meta[name="twitter:card"][content="product"]')) {
    score += 5;
  }
  
  // Log score for debugging
  console.log(`WishKeeper: Product page detection score: ${score}`);
  
  // Consider it a product page if score is above threshold
  return score >= 5;
}

// Run when the page is fully loaded
window.addEventListener('load', () => {
  setTimeout(addWishKeeperButton, 1000); // Slight delay to ensure page elements are loaded
});