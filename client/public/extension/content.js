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
    
    // Amazon product page
    if (url.includes('amazon.com') && url.includes('/dp/')) {
      productInfo = extractAmazonProductInfo();
    }
    // Target product page
    else if (url.includes('target.com') && url.includes('/p/')) {
      productInfo = extractTargetProductInfo();
    }
    // Walmart product page
    else if (url.includes('walmart.com') && url.includes('/ip/')) {
      productInfo = extractWalmartProductInfo();
    }
    
    if (productInfo) {
      return {
        success: true,
        productInfo
      };
    } else {
      return {
        success: false,
        error: 'Not a supported product page or unable to extract information'
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

// Add a WishKeeper button to product pages
function addWishKeeperButton() {
  // Check if we're on a product page
  const productInfo = extractProductInfo();
  if (!productInfo.success) return;
  
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

// Run when the page is fully loaded
window.addEventListener('load', () => {
  setTimeout(addWishKeeperButton, 1000); // Slight delay to ensure page elements are loaded
});