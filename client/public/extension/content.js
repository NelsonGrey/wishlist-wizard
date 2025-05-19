// WishKeeper Extension - Content Script
// This script runs on supported shopping websites and extracts product information

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.action === 'extractProductInfo') {
    const productInfo = extractProductInfo();
    sendResponse(productInfo);
  }
  
  return true;
});

// Extract product information based on the current website
function extractProductInfo() {
  try {
    const url = window.location.href;
    let productInfo = null;
    
    // Try site-specific extractors first for better results
    if (url.includes('amazon.com') && url.includes('/dp/')) {
      productInfo = extractAmazonProductInfo();
    }
    else if (url.includes('target.com') && url.includes('/p/')) {
      productInfo = extractTargetProductInfo();
    }
    else if (url.includes('walmart.com') && url.includes('/ip/')) {
      productInfo = extractWalmartProductInfo();
    }
    
    // If site-specific extraction failed or it's not a known site, try generic extraction
    if (!productInfo) {
      productInfo = extractGenericProductInfo();
    }
    
    if (productInfo && productInfo.title && productInfo.productUrl) {
      // Get store name from the URL if not already set
      if (!productInfo.store) {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        const domainParts = hostname.split('.');
        // Usually the domain name is the second-to-last part (e.g., 'amazon' in 'www.amazon.com')
        const storeName = domainParts.length > 1 ? 
          domainParts[domainParts.length - 2].charAt(0).toUpperCase() + 
          domainParts[domainParts.length - 2].slice(1) : 
          hostname;
        
        productInfo.store = storeName;
      }
      
      return {
        success: true,
        productInfo
      };
    } else {
      return {
        success: false,
        error: 'Unable to extract product information from this page'
      };
    }
  } catch (error) {
    console.error('Error extracting product info:', error);
    return {
      success: false,
      error: error.message
    };
  }
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
    // Send message to background script to handle adding to wishlist
    chrome.runtime.sendMessage({
      action: 'extractProductInfo'
    }, response => {
      if (response && response.success) {
        chrome.runtime.sendMessage({
          action: 'openPopup',
          data: response.productInfo
        });
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
  // Score-based approach to identify product pages
  let score = 0;
  
  // Check URL patterns common for product pages
  const url = window.location.href.toLowerCase();
  const urlPatterns = [
    '/product/', '/p/', '/dp/', '/item/', '/pd/', '/ip/',
    '/shop/product', '/products/', '/product-', '/product_',
    '/catalog/', '/detail/', '/buy/', '/purchase/'
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
  
  // Check for common product page elements
  const productPageElements = [
    'add to cart', 'add to basket', 'add to bag', 'buy now', 'purchase now',
    'checkout', 'shopping cart', 'product details', 'specifications',
    'product description', 'reviews', 'rating', 'shop now', 'shipping',
    'delivery', 'in stock', 'out of stock', 'availability'
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