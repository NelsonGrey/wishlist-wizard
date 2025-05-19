// Functions for handling tabs
function switchTab(tabId) {
  // Update active tab button
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });
  document.getElementById(`tab-${tabId}`).classList.add('active');
  
  // Save active tab
  currentActiveTab = tabId;
  
  // Show appropriate screen based on tab
  if (tabId === 'product') {
    showScreen('product-screen');
  } else if (tabId === 'price') {
    loadPriceComparisons();
  } else if (tabId === 'coupon') {
    loadCoupons();
  }
}

// Load price comparisons
async function loadPriceComparisons() {
  if (!currentProductInfo) {
    showErrorScreen('No product information available', 'detection');
    return;
  }
  
  // Show loading state
  showScreen('price-comparison-screen');
  document.getElementById('comparison-loading').classList.remove('hidden');
  document.getElementById('best-deal-container').classList.add('hidden');
  document.getElementById('comparison-list').innerHTML = '';
  
  try {
    // Initialize price comparison
    if (!window.priceComparison) {
      showErrorScreen('Price comparison engine is not available', 'unknown');
      return;
    }
    
    window.priceComparison.init(currentProductInfo);
    
    // Get comparison results
    comparisonResults = await window.priceComparison.findPriceComparisons();
    
    // Hide loading spinner
    document.getElementById('comparison-loading').classList.add('hidden');
    
    // Check for best deal
    const bestDeal = window.priceComparison.findBestDeal();
    
    if (bestDeal && !bestDeal.isCurrent) {
      // Show best deal section
      const bestDealContainer = document.getElementById('best-deal-container');
      const dealStore = bestDealContainer.querySelector('.deal-store');
      const dealPrice = bestDealContainer.querySelector('.deal-price');
      const dealSavings = bestDealContainer.querySelector('.deal-savings');
      const dealLink = document.getElementById('best-deal-link');
      
      dealStore.textContent = bestDeal.storeName;
      dealPrice.textContent = bestDeal.priceFormatted;
      
      // Calculate savings
      const currentStore = comparisonResults.find(r => r.isCurrent);
      if (currentStore) {
        const savingsAmount = currentStore.price - bestDeal.price;
        const savingsPercent = (savingsAmount / currentStore.price) * 100;
        dealSavings.textContent = `Save ${savingsAmount.toFixed(2)} (${savingsPercent.toFixed(0)}%)`;
      } else {
        dealSavings.textContent = '';
      }
      
      dealLink.href = bestDeal.url;
      bestDealContainer.classList.remove('hidden');
    }
    
    // Show comparison results
    populateComparisonList(comparisonResults);
    
  } catch (error) {
    console.error('Error loading price comparisons:', error);
    document.getElementById('comparison-loading').classList.add('hidden');
    showErrorScreen('Error loading price comparisons', 'network');
  }
}

// Populate comparison list with results
function populateComparisonList(results) {
  const comparisonList = document.getElementById('comparison-list');
  comparisonList.innerHTML = '';
  
  if (!results || results.length === 0) {
    comparisonList.innerHTML = '<div class="no-results">No comparison results available</div>';
    return;
  }
  
  const template = document.getElementById('comparison-item-template');
  
  results.forEach(result => {
    const item = template.content.cloneNode(true);
    
    // Set store name
    item.querySelector('.store-name').textContent = result.storeName;
    
    // Set price
    item.querySelector('.price').textContent = result.priceFormatted;
    
    // Set price difference
    const priceDifference = item.querySelector('.price-difference');
    
    if (result.isCurrent) {
      priceDifference.textContent = 'Current store';
    } else if (result.difference) {
      const diffPercent = result.difference.percentage.toFixed(0);
      const diffAmount = Math.abs(result.difference.amount).toFixed(2);
      
      if (result.difference.amount < 0) {
        priceDifference.textContent = `${diffPercent}% lower (-$${diffAmount})`;
        priceDifference.classList.add('lower');
      } else {
        priceDifference.textContent = `${diffPercent}% higher (+$${diffAmount})`;
        priceDifference.classList.add('higher');
      }
    }
    
    // Set badges
    const inStockBadge = item.querySelector('.in-stock-badge');
    inStockBadge.textContent = result.inStock ? 'In Stock' : 'Limited Stock';
    if (result.inStock) inStockBadge.classList.add('yes');
    
    const freeShippingBadge = item.querySelector('.free-shipping-badge');
    freeShippingBadge.textContent = result.freeShipping ? 'Free Shipping' : 'Shipping Fees';
    if (result.freeShipping) freeShippingBadge.classList.add('yes');
    
    // Set link
    const viewButton = item.querySelector('.view-button');
    viewButton.href = result.url;
    viewButton.textContent = result.isCurrent ? 'Current' : 'View';
    
    comparisonList.appendChild(item);
  });
}

// Load coupons
async function loadCoupons() {
  if (!currentProductInfo) {
    showErrorScreen('No product information available', 'detection');
    return;
  }
  
  // Show loading state
  showScreen('coupon-screen');
  document.getElementById('coupon-loading').classList.remove('hidden');
  document.getElementById('coupon-list').innerHTML = '';
  document.getElementById('no-coupons-message').classList.add('hidden');
  
  try {
    // Initialize coupon finder
    if (!window.couponFinder) {
      showErrorScreen('Coupon finder is not available', 'unknown');
      return;
    }
    
    window.couponFinder.init(currentProductInfo);
    
    // Get coupons
    coupons = await window.couponFinder.findCoupons();
    
    // Hide loading spinner
    document.getElementById('coupon-loading').classList.add('hidden');
    
    if (!coupons || coupons.length === 0) {
      // No coupons found
      document.getElementById('no-coupons-message').classList.remove('hidden');
      
      // Show coupon site links
      const couponLinks = window.couponFinder.getCouponLinks();
      const linksList = document.getElementById('coupon-links');
      linksList.innerHTML = '';
      
      couponLinks.forEach(link => {
        const a = document.createElement('a');
        a.href = link.url;
        a.textContent = link.name;
        a.target = '_blank';
        linksList.appendChild(a);
      });
      
      return;
    }
    
    // Show coupons
    populateCouponList(coupons);
    
  } catch (error) {
    console.error('Error loading coupons:', error);
    document.getElementById('coupon-loading').classList.add('hidden');
    showErrorScreen('Error loading coupons', 'network');
  }
}

// Populate coupon list
function populateCouponList(coupons) {
  const couponList = document.getElementById('coupon-list');
  couponList.innerHTML = '';
  
  if (!coupons || coupons.length === 0) {
    return;
  }
  
  const template = document.getElementById('coupon-item-template');
  
  coupons.forEach(coupon => {
    const item = template.content.cloneNode(true);
    
    // Set coupon code
    item.querySelector('.coupon-code').textContent = coupon.code;
    
    // Set discount
    item.querySelector('.coupon-discount').textContent = coupon.discount;
    
    // Set description
    item.querySelector('.coupon-description').textContent = coupon.description;
    
    // Set expiry
    item.querySelector('.coupon-expiry').textContent = `Expires: ${coupon.expiryDate}`;
    
    // Set source
    item.querySelector('.coupon-source').textContent = `Source: ${coupon.source}`;
    
    // Set verification status
    const verificationEl = item.querySelector('.coupon-verification');
    if (coupon.verified) {
      verificationEl.textContent = 'Verified';
    } else {
      verificationEl.textContent = 'Unverified';
      verificationEl.style.color = '#9ca3af'; // Gray color
    }
    
    // Setup copy button
    const copyButton = item.querySelector('.copy-button');
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(coupon.code).then(() => {
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = 'Copy';
        }, 2000);
      });
    });
    
    // Setup apply button
    const applyButton = item.querySelector('.apply-button');
    applyButton.addEventListener('click', async () => {
      try {
        applyButton.disabled = true;
        applyButton.textContent = 'Applying...';
        
        const result = await window.couponFinder.applyCoupon(coupon.code);
        
        if (result.success) {
          applyButton.textContent = 'Applied!';
          applyButton.style.backgroundColor = '#10b981'; // Success green
        } else {
          applyButton.textContent = 'Failed';
          applyButton.style.backgroundColor = '#ef4444'; // Error red
          console.error('Failed to apply coupon:', result.message);
          
          setTimeout(() => {
            applyButton.textContent = 'Apply';
            applyButton.style.backgroundColor = '#4f46e5';
            applyButton.disabled = false;
          }, 2000);
        }
      } catch (error) {
        console.error('Error applying coupon:', error);
        applyButton.textContent = 'Error';
        applyButton.style.backgroundColor = '#ef4444';
        
        setTimeout(() => {
          applyButton.textContent = 'Apply';
          applyButton.style.backgroundColor = '#4f46e5';
          applyButton.disabled = false;
        }, 2000);
      }
    });
    
    couponList.appendChild(item);
  });
}

// Enable one-click adding
async function enableQuickAdd() {
  try {
    if (!currentTab || !currentTab.id) {
      showErrorScreen('No active tab found', 'unknown');
      return;
    }
    
    if (!currentProductInfo) {
      showErrorScreen('No product information available', 'detection');
      return;
    }
    
    // Get base URL
    const baseUrl = await getBaseUrl();
    
    // Initialize quick add in content script
    const result = await chrome.tabs.sendMessage(currentTab.id, { 
      action: 'enableQuickAdd',
      isLoggedIn: isLoggedIn,
      baseUrl: baseUrl,
      productInfo: currentProductInfo
    });
    
    if (result && result.success) {
      const quickAddButton = document.getElementById('enable-quick-add-button');
      quickAddButton.disabled = true;
      quickAddButton.innerHTML = `
        <span class="option-icon">✓</span>
        <span class="option-text">One-Click Add Enabled</span>
      `;
      quickAddButton.style.backgroundColor = '#d1fae5';
      quickAddButton.style.borderColor = '#a7f3d0';
      quickAddButton.style.color = '#065f46';
    } else {
      showErrorScreen('Failed to enable one-click add', 'unknown');
    }
  } catch (error) {
    console.error('Error enabling quick add:', error);
    showErrorScreen('Error enabling one-click add', 'unknown');
  }
}

// Setup tab event listeners
document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.id.split('-')[1]; // tab-product -> product
      switchTab(tabId);
    });
  });
  
  // Quick add button
  const quickAddButton = document.getElementById('enable-quick-add-button');
  if (quickAddButton) {
    quickAddButton.addEventListener('click', enableQuickAdd);
  }
  
  // Refresh comparison button
  const refreshComparisonButton = document.getElementById('refresh-comparison-button');
  if (refreshComparisonButton) {
    refreshComparisonButton.addEventListener('click', loadPriceComparisons);
  }
  
  // Refresh coupons button
  const refreshCouponsButton = document.getElementById('refresh-coupons-button');
  if (refreshCouponsButton) {
    refreshCouponsButton.addEventListener('click', loadCoupons);
  }
});