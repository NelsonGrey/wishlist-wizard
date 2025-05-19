// Popup script for WishKeeper extension
document.addEventListener("DOMContentLoaded", function() {
  // DOM elements
  const myListsTab = document.querySelector('[data-tab="my-lists"]');
  const recentlyAddedTab = document.querySelector('[data-tab="recently-added"]');
  const myListsTabPane = document.getElementById("my-lists-tab");
  const recentlyAddedTabPane = document.getElementById("recently-added-tab");
  const wishlistsContainer = document.getElementById("wishlists-container");
  const recentItemsContainer = document.getElementById("recent-items-container");
  const detailedListView = document.getElementById("detailed-list-view");
  const detailedListTitle = document.getElementById("detailed-list-title");
  const detailedItemsContainer = document.getElementById("detailed-items-container");
  const addCurrentItemBtn = document.getElementById("add-current-item-btn");
  const createListBtn = document.getElementById("create-list-btn");
  const backBtn = document.getElementById("back-btn");
  const shareListBtn = document.getElementById("share-list-btn");
  const openWebsiteBtn = document.getElementById("open-website-btn");
  const addToListModal = document.getElementById("add-to-list-modal");
  const createListModal = document.getElementById("create-list-modal");
  const wishlistSelect = document.getElementById("wishlist-select");
  const noteInput = document.getElementById("note-input");
  const currentProductContainer = document.getElementById("current-product");
  const listNameInput = document.getElementById("list-name-input");
  const cancelAddBtn = document.getElementById("cancel-add-btn");
  const confirmAddBtn = document.getElementById("confirm-add-btn");
  const cancelCreateBtn = document.getElementById("cancel-create-btn");
  const confirmCreateBtn = document.getElementById("confirm-create-btn");
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");

  // State
  let currentWishlistId = null;
  let currentProduct = null;
  let wishlists = [];

  // Fetch wishlists on popup open
  fetchWishlists();
  
  // Tab switching
  myListsTab.addEventListener("click", function() {
    activateTab(myListsTab, myListsTabPane);
    deactivateTab(recentlyAddedTab, recentlyAddedTabPane);
  });
  
  recentlyAddedTab.addEventListener("click", function() {
    activateTab(recentlyAddedTab, recentlyAddedTabPane);
    deactivateTab(myListsTab, myListsTabPane);
    fetchRecentItems();
  });
  
  // Add current item button
  addCurrentItemBtn.addEventListener("click", function() {
    extractProductInfo();
  });
  
  // Create list button
  createListBtn.addEventListener("click", function() {
    createListModal.classList.add("show");
  });
  
  // Back button in detailed view
  backBtn.addEventListener("click", function() {
    showMainView();
  });
  
  // Share list button
  shareListBtn.addEventListener("click", function() {
    shareWishlist(currentWishlistId);
  });
  
  // Open website button
  openWebsiteBtn.addEventListener("click", function() {
    chrome.tabs.create({ url: "http://localhost:5000/dashboard" });
  });
  
  // Cancel add to list
  cancelAddBtn.addEventListener("click", function() {
    addToListModal.classList.remove("show");
  });
  
  // Confirm add to list
  confirmAddBtn.addEventListener("click", function() {
    const selectedWishlistId = parseInt(wishlistSelect.value);
    const note = noteInput.value;
    
    if (!selectedWishlistId || !currentProduct) {
      showToast("Please select a wishlist");
      return;
    }
    
    addItemToWishlist(currentProduct, selectedWishlistId, note);
  });
  
  // Cancel create list
  cancelCreateBtn.addEventListener("click", function() {
    createListModal.classList.remove("show");
    listNameInput.value = "";
  });
  
  // Confirm create list
  confirmCreateBtn.addEventListener("click", function() {
    const name = listNameInput.value.trim();
    
    if (!name) {
      showToast("Please enter a wishlist name");
      return;
    }
    
    createWishlist(name);
  });
  
  // Helper Functions
  
  function activateTab(tabBtn, tabPane) {
    tabBtn.classList.add("active");
    tabPane.style.display = "block";
  }
  
  function deactivateTab(tabBtn, tabPane) {
    tabBtn.classList.remove("active");
    tabPane.style.display = "none";
  }
  
  function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add("show");
    
    setTimeout(function() {
      toast.classList.remove("show");
    }, 3000);
  }
  
  function fetchWishlists() {
    wishlistsContainer.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
      </div>
    `;
    
    chrome.runtime.sendMessage(
      { action: "fetchWishlists" },
      function(response) {
        if (response.success) {
          wishlists = response.wishlists;
          renderWishlists(wishlists);
          populateWishlistSelect(wishlists);
        } else {
          wishlistsContainer.innerHTML = `
            <div class="empty-state">
              <h3 class="empty-state-title">Error loading wishlists</h3>
              <p class="empty-state-text">${response.error || "Please try again"}</p>
              <button class="btn btn-primary" id="retry-wishlists-btn">Retry</button>
            </div>
          `;
          
          document.getElementById("retry-wishlists-btn").addEventListener("click", fetchWishlists);
        }
      }
    );
  }
  
  function renderWishlists(wishlists) {
    if (!wishlists || wishlists.length === 0) {
      wishlistsContainer.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title">No wishlists yet</h3>
          <p class="empty-state-text">Create your first wishlist to get started</p>
          <button class="btn btn-primary" id="empty-create-btn">Create Wishlist</button>
        </div>
      `;
      
      document.getElementById("empty-create-btn").addEventListener("click", function() {
        createListModal.classList.add("show");
      });
      
      return;
    }
    
    let html = "";
    
    wishlists.forEach(wishlist => {
      html += `
        <div class="list-item" data-wishlist-id="${wishlist.id}">
          <div class="list-item-header">
            <div>
              <h3 class="list-item-title">${wishlist.name}</h3>
              <p class="list-item-count">${wishlist.itemCount} ${wishlist.itemCount === 1 ? 'item' : 'items'}</p>
            </div>
            <div class="list-item-actions">
              <button class="icon-btn share-wishlist-btn" data-wishlist-id="${wishlist.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
              </button>
              <button class="icon-btn edit-wishlist-btn" data-wishlist-id="${wishlist.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    wishlistsContainer.innerHTML = html;
    
    // Add event listeners to list items
    document.querySelectorAll(".list-item").forEach(item => {
      item.addEventListener("click", function(e) {
        if (!e.target.closest(".icon-btn")) {
          const wishlistId = parseInt(this.dataset.wishlistId);
          openDetailedView(wishlistId);
        }
      });
    });
    
    // Add event listeners to share buttons
    document.querySelectorAll(".share-wishlist-btn").forEach(btn => {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        const wishlistId = parseInt(this.dataset.wishlistId);
        shareWishlist(wishlistId);
      });
    });
    
    // Add event listeners to edit buttons
    document.querySelectorAll(".edit-wishlist-btn").forEach(btn => {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        // For future implementation
        showToast("Edit functionality coming soon!");
      });
    });
  }
  
  function fetchRecentItems() {
    recentItemsContainer.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
      </div>
    `;
    
    chrome.runtime.sendMessage(
      { action: "fetchRecentItems" },
      function(response) {
        if (response.success) {
          renderRecentItems(response.items);
        } else {
          recentItemsContainer.innerHTML = `
            <div class="empty-state">
              <h3 class="empty-state-title">Error loading recent items</h3>
              <p class="empty-state-text">${response.error || "Please try again"}</p>
              <button class="btn btn-primary" id="retry-recent-btn">Retry</button>
            </div>
          `;
          
          document.getElementById("retry-recent-btn").addEventListener("click", fetchRecentItems);
        }
      }
    );
  }
  
  function renderRecentItems(items) {
    if (!items || items.length === 0) {
      recentItemsContainer.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title">No items yet</h3>
          <p class="empty-state-text">Use the "Add Current Item" button to add items from shopping sites</p>
        </div>
      `;
      return;
    }
    
    let html = "";
    
    items.forEach(item => {
      html += `
        <div class="wish-item">
          <div class="wish-item-content">
            <img src="${item.imageUrl}" alt="${item.title}" class="wish-item-image">
            <div class="wish-item-details">
              <h3 class="wish-item-title">${item.title}</h3>
              <div class="wish-item-meta">
                <div>
                  <span class="wish-item-price">${item.price}</span>
                  <span class="wish-item-store">${item.store}</span>
                </div>
                <button class="icon-btn remove-item-btn" data-item-id="${item.id}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-1">From: ${item.wishlistName}</p>
            </div>
          </div>
        </div>
      `;
    });
    
    recentItemsContainer.innerHTML = html;
    
    // Add event listeners to remove buttons
    document.querySelectorAll(".remove-item-btn").forEach(btn => {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        const itemId = parseInt(this.dataset.itemId);
        removeItem(itemId);
      });
    });
  }
  
  function openDetailedView(wishlistId) {
    currentWishlistId = wishlistId;
    
    // Find the wishlist to get its name
    const wishlist = wishlists.find(w => w.id === wishlistId);
    if (wishlist) {
      detailedListTitle.textContent = wishlist.name;
    }
    
    detailedItemsContainer.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
      </div>
    `;
    
    // Hide main view, show detailed view
    myListsTabPane.style.display = "none";
    recentlyAddedTabPane.style.display = "none";
    detailedListView.style.display = "block";
    
    // Fetch items for this wishlist
    fetchWishlistItems(wishlistId);
  }
  
  function fetchWishlistItems(wishlistId) {
    chrome.runtime.sendMessage(
      { action: "fetchWishlistItems", wishlistId },
      function(response) {
        if (response.success) {
          renderWishlistItems(response.items);
        } else {
          detailedItemsContainer.innerHTML = `
            <div class="empty-state">
              <h3 class="empty-state-title">Error loading items</h3>
              <p class="empty-state-text">${response.error || "Please try again"}</p>
              <button class="btn btn-primary" id="retry-items-btn">Retry</button>
            </div>
          `;
          
          document.getElementById("retry-items-btn").addEventListener("click", function() {
            fetchWishlistItems(wishlistId);
          });
        }
      }
    );
  }
  
  function renderWishlistItems(items) {
    if (!items || items.length === 0) {
      detailedItemsContainer.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title">No items in this wishlist</h3>
          <p class="empty-state-text">Use the "Add Current Item" button to add items from shopping sites</p>
        </div>
      `;
      return;
    }
    
    let html = "";
    
    items.forEach(item => {
      html += `
        <div class="wish-item">
          <div class="wish-item-content">
            <img src="${item.imageUrl}" alt="${item.title}" class="wish-item-image">
            <div class="wish-item-details">
              <h3 class="wish-item-title">${item.title}</h3>
              <div class="wish-item-meta">
                <div>
                  <span class="wish-item-price">${item.price}</span>
                  <span class="wish-item-store">${item.store}</span>
                </div>
                <button class="icon-btn remove-item-btn" data-item-id="${item.id}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
              ${item.note ? `<p class="text-xs text-gray-500 mt-1">Note: ${item.note}</p>` : ''}
            </div>
          </div>
        </div>
      `;
    });
    
    detailedItemsContainer.innerHTML = html;
    
    // Add event listeners to remove buttons
    document.querySelectorAll(".remove-item-btn").forEach(btn => {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        const itemId = parseInt(this.dataset.itemId);
        removeItem(itemId);
      });
    });
  }
  
  function showMainView() {
    detailedListView.style.display = "none";
    myListsTabPane.style.display = "block";
    
    currentWishlistId = null;
  }
  
  function populateWishlistSelect(wishlists) {
    if (!wishlists || wishlists.length === 0) {
      wishlistSelect.innerHTML = '<option value="">No wishlists available</option>';
      return;
    }
    
    let html = '<option value="">Select a wishlist</option>';
    
    wishlists.forEach(wishlist => {
      html += `<option value="${wishlist.id}">${wishlist.name}</option>`;
    });
    
    wishlistSelect.innerHTML = html;
  }
  
  function extractProductInfo() {
    chrome.runtime.sendMessage(
      { action: "extractProductInfo" },
      function(response) {
        if (response.success) {
          currentProduct = response.product;
          showAddToListModal(currentProduct);
        } else {
          showToast(response.error || "Could not extract product information");
        }
      }
    );
  }
  
  function showAddToListModal(product) {
    // Update product preview
    currentProductContainer.innerHTML = `
      <img src="${product.imageUrl}" alt="${product.title}" class="wish-item-image">
      <div>
        <h4 class="font-medium text-sm line-clamp-2">${product.title}</h4>
        <p class="text-sm text-gray-600 mt-1">${product.price}</p>
      </div>
    `;
    
    // Clear note input
    noteInput.value = "";
    
    // Show modal
    addToListModal.classList.add("show");
  }
  
  function createWishlist(name) {
    chrome.runtime.sendMessage(
      { action: "createWishlist", name },
      function(response) {
        if (response.success) {
          createListModal.classList.remove("show");
          listNameInput.value = "";
          
          showToast("Wishlist created successfully");
          fetchWishlists();
        } else {
          showToast(response.error || "Failed to create wishlist");
        }
      }
    );
  }
  
  function addItemToWishlist(item, wishlistId, note) {
    chrome.runtime.sendMessage(
      { action: "addItemToWishlist", item, wishlistId, note },
      function(response) {
        if (response.success) {
          addToListModal.classList.remove("show");
          
          // Find the wishlist name for the toast
          const wishlist = wishlists.find(w => w.id === wishlistId);
          const wishlistName = wishlist ? wishlist.name : "wishlist";
          
          showToast(`Item added to ${wishlistName}`);
          
          // Refresh lists if needed
          if (currentWishlistId === wishlistId) {
            fetchWishlistItems(wishlistId);
          }
          
          fetchWishlists();
        } else {
          showToast(response.error || "Failed to add item to wishlist");
        }
      }
    );
  }
  
  function removeItem(itemId) {
    if (confirm("Are you sure you want to remove this item?")) {
      chrome.runtime.sendMessage(
        { action: "removeItem", itemId },
        function(response) {
          if (response.success) {
            showToast("Item removed successfully");
            
            // Refresh current view
            if (currentWishlistId) {
              fetchWishlistItems(currentWishlistId);
            } else if (recentlyAddedTabPane.style.display === "block") {
              fetchRecentItems();
            }
            
            fetchWishlists();
          } else {
            showToast(response.error || "Failed to remove item");
          }
        }
      );
    }
  }
  
  function shareWishlist(wishlistId) {
    chrome.runtime.sendMessage(
      { action: "shareWishlist", wishlistId },
      function(response) {
        if (response.success) {
          navigator.clipboard.writeText(response.shareUrl).then(
            function() {
              showToast("Wishlist link copied to clipboard");
            },
            function() {
              showToast("Failed to copy link. URL: " + response.shareUrl);
            }
          );
        } else {
          showToast(response.error || "Failed to share wishlist");
        }
      }
    );
  }
});
