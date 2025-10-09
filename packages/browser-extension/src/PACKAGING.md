# WishKeeper Extension: Packaging & Installation Guide

This document provides instructions for both developers and end-users on how to package, install, and use the WishKeeper browser extension.

## For Developers: Packaging the Extension

### Prerequisites
- The complete extension code
- Google Chrome or a Chromium-based browser
- (Optional) A Google Developer account for Web Store publishing

### Method 1: Local Development & Testing

1. **Prepare the Extension Files**:
   - Ensure all files are present in the `extension` directory:
     - `manifest.json`
     - `background.js`
     - `content.js`
     - `popup.html`
     - `popup.css`
     - `popup.js`
     - `icons` directory with all sizes (16, 32, 48, 128)

2. **Load the Extension in Developer Mode**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" by toggling the switch in the top-right corner
   - Click "Load unpacked" and select the extension directory
   - The extension should now appear in your extensions list

3. **Test the Extension**:
   - Visit any e-commerce site (Amazon, Target, Walmart, or any other retailer)
   - The extension should detect product pages and show the WishKeeper button
   - Click the extension icon to test the popup functionality

4. **Debugging the Extension**:
   - On the `chrome://extensions/` page, click "background page" under the extension to debug the background script
   - Use browser developer tools (F12) to debug content scripts on product pages
   - View the popup's console by right-clicking on the popup and selecting "Inspect"

### Method 2: Packaging for Distribution

1. **Create a ZIP Archive**:
   - Select all files in the extension directory
   - Create a ZIP file containing these files (maintain the directory structure)
   - The ZIP file should not include any development-only or temporary files

2. **For Chrome Web Store Publishing**:
   - Visit the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Sign in with your Google account
   - Click "New Item" and upload the ZIP file
   - Complete the store listing with:
     - Description of the extension
     - Privacy policy
     - Screenshots/promotional images
     - Category selection (Shopping)
   - Submit for review (typically takes 1-3 business days)

3. **For Enterprise Distribution**:
   - Host the extension package on a secure server
   - Use Group Policy or enterprise management to deploy to users
   - Configure the update URL in `manifest.json` for automatic updates

## For Users: Installing the Extension

### Method 1: Installing from Chrome Web Store (Recommended)

1. Visit the [WishKeeper Extension page](https://chrome.google.com/webstore/detail/wishkeeper/extension-id) on the Chrome Web Store
2. Click the "Add to Chrome" button
3. Confirm the installation when prompted
4. The WishKeeper icon will appear in your browser toolbar

### Method 2: Manual Installation (Developer Mode)

**Note**: This method is primarily for testing and requires the extension files.

1. Download the WishKeeper extension files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top-right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. The WishKeeper extension should now be installed and active

## Using the Extension

1. **Setting Up**:
   - After installation, click the WishKeeper icon in your browser toolbar
   - If you're not logged in, you'll be directed to create an account or sign in
   - Once logged in, you can start adding items to your wishlists

2. **Adding Items to Wishlists**:
   - Navigate to any product page on any online retailer
   - The extension will automatically detect product information
   - Click the WishKeeper button that appears on the page OR click the extension icon
   - Select which wishlist to add the item to
   - Add an optional note about why you want this item
   - Click "Add to Wishlist"

3. **Managing Wishlist Items**:
   - Visit the WishKeeper website to view and manage all your wishlist items
   - Share wishlists with friends and family
   - Track reservations and purchases

4. **Troubleshooting**:
   - If a product isn't detected automatically, click "This is a product - try again"
   - If product details aren't accurate, use the "Edit Product Info" option
   - For persistent issues, visit the WishKeeper support page or contact support

## Privacy and Data Usage

- The WishKeeper extension only accesses product information on pages you visit
- Your wishlist data is stored securely on the WishKeeper servers
- The extension requires permissions to run on shopping sites to detect products
- For complete details, see our [Privacy Policy](https://wishlist-wizard.web.app/privacy)

## Uninstalling

1. Go to `chrome://extensions/`
2. Find the WishKeeper extension and click "Remove"
3. Confirm the uninstallation when prompted

Note that uninstalling the extension does not delete your WishKeeper account or any wishlist data. Your data remains accessible through the WishKeeper website.