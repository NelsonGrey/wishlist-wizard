/**
 * Cross-Browser Extension Build System
 * 
 * Generates Manifest V3 for Chrome/Edge and Manifest V2 for Firefox
 * based on a unified configuration.
 * 
 * Usage:
 *   npm run build:chrome      # Generate Chrome/Edge extension
 *   npm run build:firefox     # Generate Firefox extension
 *   npm run build:safari      # Generate Safari extension
 *   npm run build:all         # Generate all browsers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Product detection (floating button + extraction) runs on all http(s) pages —
// generic JSON-LD/OG-tag/heuristic extraction handles sites without a
// dedicated adapter (see src/lib/adapters/ for the Amazon/Target/Walmart
// adapters, which are looked up by hostname independently of this list).
const ALL_SITES = ['http://*/*', 'https://*/*'];

const EXTENSION_API_HOSTS = [
  'https://wishlist-wizard-dev.web.app/*',
  'https://wishlist-wizard-staging.web.app/*',
  'https://wishlist-wizard-prod.web.app/*',
  'https://wishlist-wizard.web.app/*',
  'https://wishlist-wizard.com/*',
  'https://www.wishlist-wizard.com/*',
  'http://localhost/*',
];

// The auth-bridge content script only ever runs on the web app's own origins
// (not the shopping sites above) — it relays the signed-in user's Firebase ID
// token to the extension so the popup can skip a separate login.
const WEB_APP_BRIDGE_SCRIPT = {
  matches: EXTENSION_API_HOSTS,
  js: ['web-auth-bridge.js'],
  run_at: 'document_idle',
};

const ICON_SIZES = {
  '16': 'icons/icon16.png',
  '32': 'icons/icon32.png',
  '48': 'icons/icon48.png',
  '128': 'icons/icon128.png',
};

const BASE_MANIFEST = {
  name: 'Wishlist Wizard',
  version: '1.0.0',
  description: 'Create wishlists from your favorite shopping sites with just one click',
  icons: ICON_SIZES,
};

/**
 * Manifest V3 (Chrome/Edge)
 */
function manifestV3() {
  return {
    ...BASE_MANIFEST,
    manifest_version: 3,
    action: {
      default_popup: 'popup.html',
      default_icon: ICON_SIZES,
    },
    permissions: [
      'activeTab',
      'storage',
      'scripting',
      'notifications',
    ],
    host_permissions: ['<all_urls>'],
    background: {
      service_worker: 'background.js',
    },
    web_accessible_resources: [
      {
        resources: ['firebase-messaging-sw.js'],
        matches: ['<all_urls>'],
      },
    ],
    content_scripts: [
      {
        matches: ALL_SITES,
        js: ['enhanced-product-extractor.js', 'content.js'],
        run_at: 'document_end',
      },
      WEB_APP_BRIDGE_SCRIPT,
    ],
  };
}

/**
 * Manifest V2 (Firefox)
 * 
 * Key differences from MV3:
 * - manifest_version: 2
 * - browser_action instead of action
 * - permissions includes host patterns directly
 * - different background script format
 * - different content_scripts format
 */
function manifestV2Firefox() {
  return {
    ...BASE_MANIFEST,
    manifest_version: 2,
    permissions: [
      'activeTab',
      'tabs',
      'storage',
      'notifications',
      '<all_urls>',
      ...EXTENSION_API_HOSTS,
    ],
    browser_action: {
      default_popup: 'popup.html',
      default_icon: ICON_SIZES,
    },
    background: {
      scripts: ['background.js'],
    },
    content_scripts: [
      {
        matches: ALL_SITES,
        js: ['enhanced-product-extractor.js', 'content.js'],
        run_at: 'document_end',
      },
      WEB_APP_BRIDGE_SCRIPT,
    ],
    web_accessible_resources: ['firebase-messaging-sw.js'],
  };
}

/**
 * Safari Web Extension Format
 * 
 * Safari uses a different structure with Info.plist
 * This generates the JSON manifest compatible with Safari
 */
function manifestSafari() {
  return {
    ...BASE_MANIFEST,
    manifest_version: 3, // Safari supports MV3-like structure
    action: {
      default_popup: 'popup.html',
      default_icon: ICON_SIZES,
    },
    permissions: [
      'activeTab',
      'storage',
      'notifications',
    ],
    content_scripts: [
      {
        matches: ALL_SITES,
        js: ['enhanced-product-extractor.js', 'content.js'],
        run_at: 'document_end',
      },
      WEB_APP_BRIDGE_SCRIPT,
    ],
  };
}

/**
 * Write manifest to file
 */
function writeManifest(browser, manifest) {
  const outputDir = path.join(__dirname, `../dist/${browser}`);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  
  console.log(`✓ Generated ${browser} manifest: ${manifestPath}`);
}

/**
 * Build all browser versions
 */
function buildAll() {
  console.log('🔨 Building cross-browser extensions...\n');
  
  writeManifest('chrome', manifestV3());
  writeManifest('edge', manifestV3());
  writeManifest('firefox', manifestV2Firefox());
  writeManifest('safari', manifestSafari());
  
  console.log('\n✓ All manifests generated successfully!\n');
  
  // Print submission instructions
  printSubmissionGuide();
}

/**
 * Submit guide for each browser store
 */
function printSubmissionGuide() {
  const guide = `
╔══════════════════════════════════════════════════════════════════╗
║           BROWSER EXTENSION SUBMISSION GUIDE                    ║
╚══════════════════════════════════════════════════════════════════╝

📦 CHROME (dist/chrome/)
   • Store: Chrome Web Store
   • URL: https://chrome.google.com/webstore
   • Fee: $5 one-time developer fee
   • Review: 1-3 days
   • Submit: 
     1. Zip dist/chrome/ → wishlist-wizard-chrome.zip
     2. Go to https://chrome.google.com/webstore/devconsole
     3. New App → Upload ZIP
     4. Fill form with description, screenshots, privacy policy
     5. Submit for review

🔴 FIREFOX (dist/firefox/)
   • Store: Mozilla Add-ons
   • URL: https://addons.mozilla.org
   • Fee: Free
   • Review: 1-7 days
   • Submit:
     1. Zip dist/firefox/ → wishlist-wizard-firefox.zip
     2. Go to https://addons.mozilla.org/developers/addon/submit
     3. Choose "on-site hosting"
     4. Upload ZIP
     5. Fill form with description, screenshots, privacy policy
     6. Submit for review

🧭 SAFARI (dist/safari/)
   • Store: App Store (Safari Extensions section)
   • URL: https://developer.apple.com/app-store
   • Fee: $99/year developer account
   • Review: 1-2 days
   • Submit:
     1. Create Xcode project with app + extension
     2. Place dist/safari/ files in extension target
     3. Archive and upload via App Store Connect
     4. Fill form with description, screenshots, privacy policy
     5. Submit for review

🔷 EDGE (dist/edge/)
   • Store: Microsoft Edge Add-ons
   • URL: https://microsoftedge.microsoft.com/addons
   • Fee: Free
   • Review: 1-3 days
   • Submit:
     1. Zip dist/edge/ → wishlist-wizard-edge.zip
     2. Go to https://partner.microsoft.com/en-us/dashboard/microsoftedge
     3. New Package → Upload ZIP
     4. Fill form with description, screenshots, privacy policy
     5. Submit for review

📋 REQUIRED FOR SUBMISSION:
   ☐ Privacy Policy (required by all stores)
   ☐ Screenshots (at least 2: popup, settings page)
   ☐ 256x256 icon (Chrome, Firefox, Edge require)
   ☐ 512x512 icon (Firefox requires for store listing)
   ☐ Description (10-50 words)
   ☐ Detailed description (100-300 words)
   ☐ Support email
   ☐ Support URL
   ☐ Homepage URL

🚀 NEXT STEPS:
   1. Create privacy policy: docs/PRIVACY_POLICY_EXTENSION.md
   2. Create store listings with descriptions
   3. Generate screenshots (1024x768 recommended)
   4. Submit to stores in parallel (all async)
   5. Monitor review status
`;
  
  console.log(guide);
}

// Run build if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = process.argv[2] || 'all';
  
  switch (target) {
    case 'chrome':
      writeManifest('chrome', manifestV3());
      break;
    case 'edge':
      writeManifest('edge', manifestV3());
      break;
    case 'firefox':
      writeManifest('firefox', manifestV2Firefox());
      break;
    case 'safari':
      writeManifest('safari', manifestSafari());
      break;
    case 'all':
    default:
      buildAll();
      break;
  }
}

export { manifestV3, manifestV2Firefox, manifestSafari, buildAll };
