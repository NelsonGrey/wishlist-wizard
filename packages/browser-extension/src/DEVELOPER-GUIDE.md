# WishKeeper Extension: Developer Guide

This guide provides detailed instructions for developers on how to package the WishKeeper browser extension for distribution to users.

## Prerequisites

- Node.js (v14 or higher)
- Chrome or a Chromium-based browser
- Basic understanding of JavaScript, HTML, and CSS
- (Optional) Google Developer account for Web Store publishing

## Project Structure

The extension is structured as follows:

```
extension/
├── manifest.json       # Extension manifest file
├── background.js       # Background service worker
├── content.js          # Content script for product detection
├── popup.html          # Popup UI HTML
├── popup.css           # Popup UI styles
├── popup.js            # Popup UI functionality
├── icons/              # Icon files in various sizes
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # Documentation
```

## Packaging the Extension

### Step 1: Prepare the Extension Files

1. Ensure all code is finalized and tested locally
2. Remove any console.log statements or debug code
3. Update version number in `manifest.json`
4. Verify all permissions are correctly set in `manifest.json`

### Step 2: Build for Production

1. **Option A: Manual Packaging**
   - Create a ZIP file containing all required extension files
   - Make sure to include all files but exclude any development files like `.git`, `.DS_Store`, etc.

   ```bash
   # Example using command line
   zip -r wishkeeper-extension.zip manifest.json background.js content.js popup.html popup.css popup.js icons/ README.md -x "*.DS_Store" -x "*.git*"
   ```

2. **Option B: Using Build Scripts**
   - Create a build script to automate the process (example below)

   ```javascript
   // build.js
   const fs = require('fs');
   const archiver = require('archiver');
   
   // Create a file to stream archive data to
   const output = fs.createWriteStream('dist/wishkeeper-extension.zip');
   const archive = archiver('zip', {
     zlib: { level: 9 } // Compression level
   });
   
   // Listen for all archive data to be written
   output.on('close', () => {
     console.log(`Archive created: ${archive.pointer()} total bytes`);
   });
   
   // Pipe archive data to the file
   archive.pipe(output);
   
   // Add files to the archive
   archive.file('manifest.json');
   archive.file('background.js');
   archive.file('content.js');
   archive.file('popup.html');
   archive.file('popup.css');
   archive.file('popup.js');
   archive.directory('icons/');
   archive.file('README.md');
   
   // Finalize the archive
   archive.finalize();
   ```

### Step 3: Test the Packaged Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" by toggling the switch in the top-right corner
3. Remove any existing versions of the extension
4. Click "Load unpacked" and select the extension directory OR
5. Drag and drop your ZIP file onto the extensions page to install the packaged version
6. Test all functionality to ensure it works as expected:
   - Product detection on various websites
   - Popup functionality
   - Adding items to wishlists
   - Error handling

### Step 4: Distribution Options

#### Option 1: Chrome Web Store Publishing

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Sign in with your Google developer account
3. Click "New Item" and upload your ZIP file
4. Fill in the listing information:
   - Store listing (name, description, screenshots)
   - Category: Shopping
   - Language: English (and any other supported languages)
   - Privacy practices (declare all data usage)
   - Pricing: Free
5. Submit for review (plan for 1-3 business days for approval)

#### Option 2: Enterprise Distribution

1. Host the extension package on your server
2. Set up an update URL in your manifest.json:

   ```json
   "update_url": "https://wishlist-wizard-prod.web.app/updates/updates.xml"
   ```

3. Create an XML file at that location with update information:

   ```xml
   <?xml version='1.0' encoding='UTF-8'?>
   <gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
     <app appid='[YOUR_EXTENSION_ID]'>
       <updatecheck codebase='https://wishlist-wizard-prod.web.app/updates/wishkeeper-extension.zip' version='1.0.0' />
     </app>
   </gupdate>
   ```

4. Distribute the initial extension package to users through your website or internal distribution systems

#### Option 3: Direct Distribution

1. Host the extension ZIP file on your website
2. Provide clear installation instructions for users
3. Create a dedicated landing page with:
   - Download button
   - Step-by-step installation guide
   - Screenshots and tutorial videos
   - FAQ section addressing common issues

## Updating the Extension

When releasing updates:

1. Increment the version number in `manifest.json`
2. Repackage the extension following the steps above
3. If published on Chrome Web Store, upload the new package to the developer dashboard
4. For enterprise distribution, update the version in your updates.xml file
5. Provide a changelog to inform users about the new features or fixes

## Security Considerations

1. **Code Security**
   - Minimize the permissions requested in manifest.json
   - Use strict Content Security Policy headers
   - Sanitize any HTML content being inserted into pages

2. **User Data Protection**
   - Only collect necessary data
   - Use HTTPS for all API calls
   - Don't store sensitive information in localStorage or chrome.storage

3. **Distribution Security**
   - Sign your extension if distributing outside the Web Store
   - Use secure hosting for your extension files
   - Implement version checking to ensure users have the latest version

## Troubleshooting Common Issues

### Manifest V3 Compatibility

- Ensure service workers are properly implemented (not background pages)
- Use appropriate APIs for extension storage
- Follow best practices for content script injection

### Cross-Origin Requests

- Set up appropriate permissions in manifest.json
- Use fetch() with proper CORS headers
- Consider using a backend proxy for problematic APIs

### Content Script Timing

- Use proper event listeners for DOM loading
- Consider using mutation observers for dynamic content
- Implement retry mechanisms for product detection

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Web Store Developer Documentation](https://developer.chrome.com/docs/webstore/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/)

## Support Channels

- Email: dev-support@wishlist-wizard-prod.web.app
- GitHub Issues: [Link to GitHub repository]
- Developer Forum: [Link to forum]

---

This guide is maintained by the WishKeeper development team. Last updated: May 2025.