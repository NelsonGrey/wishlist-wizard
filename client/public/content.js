// Content script for WishKeeper extension
// This script runs in the context of the web page and extracts product information

// Helper functions to extract product details from different sites
const extractors = {
  // Amazon product page extractor
  amazon: () => {
    try {
      // Get product title
      const title = document.getElementById("productTitle")?.textContent.trim() ||
                   document.querySelector("h1.a-size-large")?.textContent.trim();
      
      // Get product price
      const priceElement = document.querySelector(".a-price .a-offscreen") ||
                          document.querySelector("#priceblock_ourprice") ||
                          document.querySelector("#priceblock_dealprice") ||
                          document.querySelector(".a-price");
      
      const price = priceElement?.textContent.trim();
      
      // Get product image
      const image = document.querySelector("#landingImage") ||
                   document.querySelector("#imgBlkFront") ||
                   document.querySelector("#main-image");
      
      const imageUrl = image?.src || image?.getAttribute("data-a-dynamic-image");
      
      // Parse image URL from JSON if needed
      let finalImageUrl = imageUrl;
      if (imageUrl && imageUrl.startsWith("{")) {
        try {
          const imageJson = JSON.parse(imageUrl);
          finalImageUrl = Object.keys(imageJson)[0];
        } catch (e) {
          console.error("Error parsing image JSON:", e);
        }
      }
      
      if (!title || !price || !finalImageUrl) {
        throw new Error("Could not extract all product details");
      }
      
      return {
        success: true,
        product: {
          title,
          price,
          imageUrl: finalImageUrl,
          productUrl: window.location.href,
          store: "Amazon"
        }
      };
    } catch (error) {
      console.error("Error extracting Amazon product:", error);
      return { success: false, error: "Failed to extract product information from Amazon" };
    }
  },
  
  // Target product page extractor
  target: () => {
    try {
      // Get product title
      const title = document.querySelector("h1[data-test='product-title']")?.textContent.trim() ||
                   document.querySelector("h1.Heading__StyledHeading-sc-1kh6y84-0")?.textContent.trim();
      
      // Get product price
      const priceElement = document.querySelector("[data-test='product-price']") ||
                          document.querySelector(".style__PriceFontSize-gob4i1-0");
      
      const price = priceElement?.textContent.trim();
      
      // Get product image
      const imageElement = document.querySelector("img[data-test='product-image']") ||
                          document.querySelector("picture img");
      
      const imageUrl = imageElement?.src;
      
      if (!title || !price || !imageUrl) {
        throw new Error("Could not extract all product details");
      }
      
      return {
        success: true,
        product: {
          title,
          price,
          imageUrl,
          productUrl: window.location.href,
          store: "Target"
        }
      };
    } catch (error) {
      console.error("Error extracting Target product:", error);
      return { success: false, error: "Failed to extract product information from Target" };
    }
  },
  
  // Walmart product page extractor
  walmart: () => {
    try {
      // Get product title
      const title = document.querySelector("h1.f3")?.textContent.trim() ||
                   document.querySelector("[data-automation='product-title']")?.textContent.trim();
      
      // Get product price
      const priceElement = document.querySelector("[data-automation='buybox-price']") ||
                          document.querySelector(".b5.f4");
      
      const price = priceElement?.textContent.trim();
      
      // Get product image
      const imageElement = document.querySelector("[data-automation='image-thumbnail'] img") ||
                          document.querySelector(".db.mb1.mh0.w-100");
      
      const imageUrl = imageElement?.src;
      
      if (!title || !price || !imageUrl) {
        throw new Error("Could not extract all product details");
      }
      
      return {
        success: true,
        product: {
          title,
          price,
          imageUrl,
          productUrl: window.location.href,
          store: "Walmart"
        }
      };
    } catch (error) {
      console.error("Error extracting Walmart product:", error);
      return { success: false, error: "Failed to extract product information from Walmart" };
    }
  },
  
  // Generic extractor as fallback for unsupported sites
  generic: () => {
    try {
      // Try to find the product title
      const title = document.querySelector("h1")?.textContent.trim();
      
      // Try to get the main product image
      const images = Array.from(document.querySelectorAll("img"))
        .filter(img => {
          const rect = img.getBoundingClientRect();
          // Look for sizeable images in the viewport
          return rect.width > 200 && rect.height > 200 && 
                 rect.top >= 0 && rect.left >= 0 && 
                 rect.bottom <= window.innerHeight && 
                 rect.right <= window.innerWidth;
        })
        .sort((a, b) => {
          // Sort by size (largest first)
          const aSize = a.width * a.height;
          const bSize = b.width * b.height;
          return bSize - aSize;
        });
      
      const imageUrl = images.length > 0 ? images[0].src : null;
      
      // Try to find a price
      const priceRegex = /\$\d+(\.\d{2})?/;
      const textNodes = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while (node = walk.nextNode()) {
        if (priceRegex.test(node.nodeValue)) {
          textNodes.push(node.nodeValue.trim());
        }
      }
      
      // Get the first price match
      let price = null;
      for (const text of textNodes) {
        const match = text.match(priceRegex);
        if (match) {
          price = match[0];
          break;
        }
      }
      
      // Get hostname for store name
      const hostname = window.location.hostname;
      const store = hostname.replace(/^www\./, "").split(".")[0];
      const storeName = store.charAt(0).toUpperCase() + store.slice(1);
      
      if (!title || !price || !imageUrl) {
        throw new Error("Could not extract all product details");
      }
      
      return {
        success: true,
        product: {
          title,
          price,
          imageUrl,
          productUrl: window.location.href,
          store: storeName
        }
      };
    } catch (error) {
      console.error("Error extracting generic product:", error);
      return { success: false, error: "Failed to extract product information. Make sure you're on a product page." };
    }
  }
};

// Function to determine which extractor to use based on the current URL
function getExtractor() {
  const url = window.location.hostname;
  
  if (url.includes("amazon")) {
    return extractors.amazon;
  } else if (url.includes("target")) {
    return extractors.target;
  } else if (url.includes("walmart")) {
    return extractors.walmart;
  } else {
    return extractors.generic;
  }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractProductInfo") {
    const extractor = getExtractor();
    const result = extractor();
    sendResponse(result);
  }
  
  return true;
});

// Optional: Add a visual indicator when hovering over product images
// This could be expanded in the future
document.addEventListener("mouseover", (event) => {
  // Check if hovering over a large enough image
  if (event.target.tagName === "IMG") {
    const img = event.target;
    const rect = img.getBoundingClientRect();
    
    if (rect.width > 100 && rect.height > 100) {
      img.style.cursor = "pointer";
      
      // Optional: Add a subtle highlight
      // img.style.boxShadow = "0 0 5px rgba(79, 70, 229, 0.5)";
    }
  }
});

// Optional: Revert style changes on mouseout
document.addEventListener("mouseout", (event) => {
  if (event.target.tagName === "IMG") {
    event.target.style.boxShadow = "";
  }
});
