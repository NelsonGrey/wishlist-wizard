# WishKeeper Extension Installation Guide

This guide provides step-by-step instructions for installing and using the WishKeeper browser extension.

## Installation Instructions

### For Chrome and Chromium-based Browsers (Chrome, Edge, Brave, Opera)

#### Method 1: Quick Installation (Recommended)

1. **Download the Extension**
   - Visit [wishlist-wizard-prod.web.app/extension](https://wishlist-wizard-prod.web.app/extension)
   - Click the "Download Extension" button
   - The file `wishkeeper-extension.zip` will be downloaded to your computer

2. **Extract the Files**
   - Locate the downloaded ZIP file in your Downloads folder
   - Right-click and select "Extract All..." (Windows) or double-click (Mac)
   - Choose a location to extract the files (remember this location)

3. **Install in Chrome**
   - Open Chrome and type `chrome://extensions` in the address bar
   - Enable "Developer mode" by toggling the switch in the upper-right corner
   - Click the "Load unpacked" button
   - Navigate to the folder where you extracted the extension files
   - Select the folder and click "Open"

4. **Verify Installation**
   - The WishKeeper extension should now appear in your extensions list
   - Make sure the extension is enabled (toggle switch is blue/on)
   - The WishKeeper icon should appear in your browser toolbar

#### Method 2: Install from Chrome Web Store

The Chrome Web Store listing is not available yet. Use Method 1 until the listing is published.

### For Firefox

#### Method 1: Install from Mozilla Add-ons Store (Recommended)

1. **Visit the Add-ons Page**
   - Click [Install for Firefox](https://addons.mozilla.org/en-US/firefox/addon/wishlist-wizard/) or go to the [Wishlist Wizard Firefox Extension Page](https://addons.mozilla.org/en-US/firefox/addon/wishlist-wizard/)

2. **Add to Firefox**
   - Click the "Add to Firefox" button
   - When prompted, click "Add" to confirm the installation

3. **Verify Installation**
   - The Wishlist Wizard extension icon should appear in your Firefox toolbar
   - Make sure the extension is enabled
   - The icon will have a green background

#### Method 2: Manual Installation (Developer Mode)

**Note**: This method is for development/testing. Use Method 1 for normal installation.

1. **Download the Extension**
   - Visit [wishlist-wizard-prod.web.app/extension](https://wishlist-wizard-prod.web.app/extension)
   - Click the "Download Extension" button
   - The file `wishkeeper-extension.zip` will be downloaded

2. **Extract the Files**
   - Locate the downloaded ZIP file
   - Right-click and select "Extract All..." (Windows) or double-click (Mac)

3. **Load Temporary Add-on**
   - Open Firefox and go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Navigate to the extracted extension folder
   - Select `manifest.json`

4. **Verify Installation**
   - The extension should now be loaded and appear in your toolbar
   - **Note**: Temporary add-ons are unloaded when Firefox restarts. Use Method 1 for permanent installation.

## Using the WishKeeper Extension

### Initial Setup

1. **Sign In to Your Account**
   - Click the WishKeeper icon in your browser toolbar
   - If you're not already logged in, you'll see a login prompt
   - Click the "Sign In" button to open the WishKeeper login page
   - Log in with your WishKeeper account credentials
   - Return to your shopping and the extension will now be active

2. **Test the Extension**
   - Visit any product page on a shopping website (e.g., Amazon, Target, Walmart, or any other online retailer)
   - Click the WishKeeper icon in your toolbar
   - The extension should display the product information it detected

### Adding Items to Your Wishlist

1. **Browse to a Product Page**
   - Find a product you're interested in on any shopping website
   - Make sure you're on the actual product page, not a search results or category page

2. **Add the Product**
   - Click the WishKeeper icon in your browser toolbar
   - The extension will automatically detect the product information
   - Select which wishlist you want to add the item to from the dropdown menu
   - Add an optional note about why you want this item
   - Click "Add to Wishlist"

3. **Confirmation**
   - You'll see a success message when the item has been added
   - You can click "View Wishlist" to see your updated wishlist on the WishKeeper website
   - Or click "Done" to continue shopping

### Troubleshooting Product Detection

If the extension doesn't detect a product correctly:

1. **Force Detection**
   - If you see "This doesn't appear to be a product page" but you know it is
   - Click the "This is a product - try again" button
   - The extension will make another attempt with more aggressive detection

2. **Edit Product Information**
   - If the product details aren't quite right (wrong title, price, etc.)
   - Click the "Edit Product Info" button
   - Update the title and/or price as needed
   - Click "Update Information"
   - Now proceed with adding to your wishlist

### Managing Extension Permissions

For optimal performance, the WishKeeper extension needs permission to:

1. **Access website content**
   - This allows the extension to detect product information on pages you visit
   - The extension only activates on product pages and doesn't collect any personal browsing data

2. **Connect to WishKeeper servers**
   - This allows the extension to communicate with your WishKeeper account
   - All communication is encrypted and secure

You can review and manage these permissions at any time:
1. Go to `chrome://extensions`
2. Find WishKeeper and click "Details"
3. Scroll down to "Site access" to review permissions

## Uninstalling the Extension

If you need to uninstall the WishKeeper extension:

1. Go to `chrome://extensions`
2. Find the WishKeeper extension
3. Click "Remove" or toggle the extension off to disable temporarily
4. Confirm removal when prompted

Note: Uninstalling the extension does not delete your WishKeeper account or any of your wishlist data.

## Getting Help

If you encounter any issues with the WishKeeper extension:

- Visit our [Help Center](https://wishlist-wizard-prod.web.app/help)
- Email our support team at support@wishlist-wizard-prod.web.app
- Check our [FAQ page](https://wishlist-wizard-prod.web.app/faq) for common questions

## Privacy Information

The WishKeeper extension:
- Only collects product information from pages you visit
- Does not track your browsing history
- Does not sell your data to third parties
- Only sends data to WishKeeper servers when you choose to add an item

For more details, please review our [Privacy Policy](https://wishlist-wizard-prod.web.app/privacy).