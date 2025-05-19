// Background script for WishKeeper extension
// This runs in the background and handles communication between content scripts and the popup

// Base URL for API requests - in a real extension, this would be configurable
const API_BASE_URL = "http://localhost:5000/api";

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("WishKeeper extension installed");
  
  // Set default state
  chrome.storage.local.set({
    currentWishlistId: null,
    currentTab: "myLists"
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received:", request);
  
  if (request.action === "extractProductInfo") {
    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Send message to content script to extract product info
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "extractProductInfo" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ success: false, error: "Could not communicate with page" });
            return;
          }
          
          if (response && response.success) {
            sendResponse(response);
          } else {
            sendResponse({ 
              success: false, 
              error: response?.error || "Failed to extract product information" 
            });
          }
        }
      );
    });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
  
  if (request.action === "fetchWishlists") {
    fetch(`${API_BASE_URL}/wishlists`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        sendResponse({ success: true, wishlists: data });
      })
      .catch(error => {
        console.error("Error fetching wishlists:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
  
  if (request.action === "fetchWishlistItems") {
    const { wishlistId } = request;
    
    fetch(`${API_BASE_URL}/wishlists/${wishlistId}/items`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        sendResponse({ success: true, items: data });
      })
      .catch(error => {
        console.error("Error fetching wishlist items:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
  
  if (request.action === "fetchRecentItems") {
    fetch(`${API_BASE_URL}/recent-items`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        sendResponse({ success: true, items: data });
      })
      .catch(error => {
        console.error("Error fetching recent items:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
  
  if (request.action === "createWishlist") {
    const { name } = request;
    
    fetch(`${API_BASE_URL}/wishlists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        userId: 1  // For demo purposes, use user ID 1
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        sendResponse({ success: true, wishlist: data });
      })
      .catch(error => {
        console.error("Error creating wishlist:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
  
  if (request.action === "addItemToWishlist") {
    const { item, wishlistId, note } = request;
    
    fetch(`${API_BASE_URL}/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        wishlistId,
        title: item.title,
        price: item.price,
        imageUrl: item.imageUrl,
        productUrl: item.productUrl,
        store: item.store,
        note: note || ""
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        sendResponse({ success: true, item: data });
      })
      .catch(error => {
        console.error("Error adding item to wishlist:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
  
  if (request.action === "removeItem") {
    const { itemId } = request;
    
    fetch(`${API_BASE_URL}/items/${itemId}`, {
      method: "DELETE"
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error("Error removing item:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
  
  if (request.action === "shareWishlist") {
    const { wishlistId } = request;
    
    fetch(`${API_BASE_URL}/wishlists/${wishlistId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        const shareUrl = `${window.location.origin}/shared/${data.shareId}`;
        sendResponse({ success: true, shareUrl });
      })
      .catch(error => {
        console.error("Error sharing wishlist:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
});
