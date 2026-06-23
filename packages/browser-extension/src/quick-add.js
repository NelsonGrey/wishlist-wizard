// Wishlist Wizard Extension - Quick Add Module
// This script provides one-click adding to wishlist functionality

// Class for handling one-click add to wishlist
class QuickAdd {
  constructor() {
    this.defaultWishlistId = null;
    this.isLoggedIn = false;
    this.buttonVisible = false;
    this.observer = null;
    this.baseUrl = '';
    this.currentProductInfo = null;
  }

  /**
   * Initialize the quick add feature
   * @param {boolean} isLoggedIn - Whether the user is logged in
   * @param {string} baseUrl - The base URL for the API
   */
  async init(isLoggedIn, baseUrl) {
    this.isLoggedIn = isLoggedIn;
    this.baseUrl = baseUrl;

    if (!this.isLoggedIn) {
      console.warn('QuickAdd: User not logged in, quick add disabled');
      return false;
    }

    try {
      // Get user's default wishlist
      await this.loadDefaultWishlist();
      
      // Initialize the floating button
      await this.injectQuickAddButton();
      
      // Start monitoring for page changes
      this.startObserving();
      
      return true;
    } catch (error) {
      console.error('QuickAdd: Error initializing', error);
      return false;
    }
  }

  /**
   * Load the user's default wishlist
   */
  async loadDefaultWishlist() {
    try {
      // Get user's wishlists
      const response = await fetch(`${this.baseUrl}/api/wishlists`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.warn('QuickAdd: Failed to load wishlists');
        return false;
      }
      
      const wishlists = await response.json();
      
      if (!wishlists || wishlists.length === 0) {
        console.warn('QuickAdd: No wishlists found');
        return false;
      }
      
      // Use the first wishlist as default
      this.defaultWishlistId = wishlists[0].id;
      console.log(`QuickAdd: Default wishlist set to ${wishlists[0].name} (${this.defaultWishlistId})`);
      return true;
    } catch (error) {
      console.error('QuickAdd: Error loading default wishlist', error);
      return false;
    }
  }

  /**
   * Inject the quick add button into the page
   */
  async injectQuickAddButton() {
    if (this.buttonVisible) {
      return; // Button already visible
    }

    // Check if we're on a product page
    try {
      // Get the current tab's product info
      const productInfo = await this.detectProductInfo();
      
      if (!productInfo || !productInfo.title) {
        console.log('QuickAdd: Not a product page or no product detected');
        return;
      }
      
      this.currentProductInfo = productInfo;
      
      // Create the quick add button
      const button = document.createElement('div');
      button.id = 'wishkeeper-quick-add-button';
      button.className = 'wishkeeper-floating-button';
      button.title = 'Add to Wishlist Wizard';
      
      // Style the button
      button.style.cssText = `
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: #6366f1;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        z-index: 99999;
        transition: all 0.3s ease;
        font-family: Arial, sans-serif;
      `;
      
      // Add hover effect
      button.onmouseover = function() {
        this.style.transform = 'scale(1.1)';
        this.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.3)';
      };
      
      button.onmouseout = function() {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)';
      };
      
      // Add the + icon
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5V19M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      
      // Add click event to add to wishlist
      button.addEventListener('click', async () => {
        await this.quickAddToWishlist();
      });
      
      // Add the button to the page
      document.body.appendChild(button);
      this.buttonVisible = true;
      
      // Create tooltip/notification element for status messages
      const tooltip = document.createElement('div');
      tooltip.id = 'wishkeeper-tooltip';
      tooltip.className = 'wishkeeper-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        right: 90px;
        bottom: 30px;
        background-color: white;
        color: #333;
        padding: 8px 16px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        z-index: 99999;
        font-family: Arial, sans-serif;
        font-size: 14px;
        max-width: 220px;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      `;
      
      document.body.appendChild(tooltip);
    } catch (error) {
      console.error('QuickAdd: Error injecting button', error);
    }
  }

  /**
   * Start observing page changes to reposition the button when needed
   */
  startObserving() {
    // Create a mutation observer to watch for page changes
    this.observer = new MutationObserver((mutations) => {
      // Check if the URL has changed (SPA navigation)
      if (window.location.href !== this._lastUrl) {
        this._lastUrl = window.location.href;
        this.handlePageChange();
      }
    });
    
    // Start observing with a delay to avoid performance issues
    setTimeout(() => {
      this._lastUrl = window.location.href;
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }, 1000);
  }

  /**
   * Handle page changes (like SPA navigation)
   */
  async handlePageChange() {
    // Reset state
    this.hideButton();
    
    // Check if the new page is a product page
    setTimeout(async () => {
      await this.injectQuickAddButton();
    }, 1000);
  }

  /**
   * Hide the quick add button
   */
  hideButton() {
    const button = document.getElementById('wishkeeper-quick-add-button');
    if (button) {
      button.remove();
    }
    
    const tooltip = document.getElementById('wishkeeper-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
    
    this.buttonVisible = false;
  }

  /**
   * Detect product information from the current page
   */
  async detectProductInfo() {
    try {
      // Send message to background script to get product info
      const result = await chrome.runtime.sendMessage({ action: 'getProductInfo' });
      
      if (result && result.success && result.productInfo) {
        return result.productInfo;
      }
      
      return null;
    } catch (error) {
      console.error('QuickAdd: Error detecting product', error);
      return null;
    }
  }

  /**
   * Add the current product to the default wishlist
   */
  async quickAddToWishlist() {
    try {
      if (!this.isLoggedIn) {
        this.showTooltip('Please log in to add items to your wishlist');
        return;
      }
      
      if (!this.defaultWishlistId) {
        this.showTooltip('No default wishlist found');
        return;
      }
      
      if (!this.currentProductInfo) {
        this.showTooltip('No product information available');
        return;
      }
      
      // Show loading state
      this.showTooltip('Adding to wishlist...', false);
      
      // Add the product to the default wishlist
      const response = await fetch(`${this.baseUrl}/api/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          wishlistId: this.defaultWishlistId,
          title: this.currentProductInfo.title,
          price: this.currentProductInfo.price,
          imageUrl: this.currentProductInfo.imageUrl,
          productUrl: this.currentProductInfo.productUrl || window.location.href,
          store: this.currentProductInfo.store,
          note: ''
        })
      });
      
      if (response.ok) {
        const item = await response.json();
        this.showTooltip('Added to wishlist!', true);
        
        // Animate the button to indicate success
        const button = document.getElementById('wishkeeper-quick-add-button');
        if (button) {
          button.style.backgroundColor = '#10b981'; // Success green
          button.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13L9 17L19 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `;
          
          // Reset after 2 seconds
          setTimeout(() => {
            button.style.backgroundColor = '#6366f1';
            button.innerHTML = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            `;
          }, 2000);
        }
        
        return true;
      } else {
        // Handle error
        const errorText = await response.text();
        console.error('QuickAdd: Error adding to wishlist', errorText);
        this.showTooltip('Failed to add to wishlist', true);
        return false;
      }
    } catch (error) {
      console.error('QuickAdd: Error adding to wishlist', error);
      this.showTooltip('An error occurred', true);
      return false;
    }
  }

  /**
   * Show a tooltip with a message
   * @param {string} message - The message to show
   * @param {boolean} autoHide - Whether to auto-hide the tooltip
   */
  showTooltip(message, autoHide = true) {
    const tooltip = document.getElementById('wishkeeper-tooltip');
    if (tooltip) {
      tooltip.textContent = message;
      tooltip.style.opacity = '1';
      
      if (autoHide) {
        setTimeout(() => {
          tooltip.style.opacity = '0';
        }, 3000);
      }
    }
  }
}

// Export the quick add functionality
window.quickAdd = new QuickAdd();