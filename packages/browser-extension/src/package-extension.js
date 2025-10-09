/**
 * WishKeeper Extension Packaging Script
 * 
 * This script creates browser-specific ZIP files of the extension for distribution.
 * 
 * Usage: 
 * 1. Install dependencies: npm install archiver minimist
 * 2. Run: node package-extension.js --browser=chrome|firefox
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const minimist = require('minimist');

// Parse command line arguments
const argv = minimist(process.argv.slice(2));
const browser = argv.browser || 'chrome'; // Default to Chrome if not specified

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'dist');
const VERSION = require('./manifest.json').version;
const OUTPUT_FILE = path.join(OUTPUT_DIR, `wishkeeper-extension-${browser}-v${VERSION}.zip`);

console.log(`🔧 Packaging WishKeeper extension for ${browser.toUpperCase()} v${VERSION}`);

// Browser-specific manifest adjustments
const manifestAdjustments = {
  chrome: (manifest) => {
    // Chrome uses Manifest V3
    manifest.manifest_version = 3;
    
    // Ensure service worker is used instead of background page
    if (manifest.background && !manifest.background.service_worker) {
      manifest.background = {
        service_worker: 'background.js'
      };
    }
    
    return manifest;
  },
  firefox: (manifest) => {
    // Firefox requires different format for manifest
    manifest.manifest_version = 2;
    
    // Firefox uses background page instead of service worker
    if (manifest.background && manifest.background.service_worker) {
      manifest.background = {
        scripts: [manifest.background.service_worker]
      };
    }
    
    // Add Firefox-specific keys
    manifest.browser_specific_settings = {
      gecko: {
        id: "wishkeeper@wishlist-wizard.web.app",
        strict_min_version: "57.0"
      }
    };
    
    return manifest;
  }
};

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Create a file to stream archive data to
const output = fs.createWriteStream(OUTPUT_FILE);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

// Listen for all archive data to be written
output.on('close', function() {
  console.log(`✅ Extension packaged successfully!`);
  console.log(`📦 Created: ${OUTPUT_FILE}`);
  console.log(`📊 Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  console.log(`🔖 Version: ${VERSION}`);
});

// Handle warnings
archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn('⚠️ Warning:', err);
  } else {
    throw err;
  }
});

// Handle errors
archive.on('error', function(err) {
  console.error('❌ Error during packaging:', err);
  process.exit(1);
});

// Pipe archive data to the file
archive.pipe(output);

// Files to include in the package
const filesToInclude = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'README.md',
  'INSTALLATION-GUIDE.md'
];

// Add individual files
filesToInclude.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: file });
    console.log(`📄 Adding file: ${file}`);
  } else {
    console.warn(`⚠️ File not found: ${file}`);
  }
});

// Add directories
const dirsToInclude = [
  'icons'
];

dirsToInclude.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    archive.directory(dirPath, dir);
    console.log(`📁 Adding directory: ${dir}`);
  } else {
    console.warn(`⚠️ Directory not found: ${dir}`);
  }
});

// Files to exclude (regardless of directory)
const excludePatterns = [
  '.DS_Store',
  'Thumbs.db',
  '.git',
  '*.tmp',
  '*.log'
];

// Add filters to exclude files
archive.glob('**/*', {
  cwd: __dirname,
  ignore: excludePatterns
});

// Create browser-specific manifest
console.log('📝 Creating browser-specific manifest...');
const manifestPath = path.join(__dirname, 'manifest.json');
const manifest = require(manifestPath);

// Apply browser-specific adjustments
const adjustedManifest = manifestAdjustments[browser](manifest);

// Create a temporary manifest file for packaging
const tempManifestPath = path.join(__dirname, 'temp_manifest.json');
fs.writeFileSync(tempManifestPath, JSON.stringify(adjustedManifest, null, 2));

// Add the adjusted manifest to the archive
archive.file(tempManifestPath, { name: 'manifest.json' });
console.log('✅ Added browser-specific manifest.json');

// Finalize the archive
console.log('🔧 Finalizing package...');
archive.finalize().then(() => {
  // Clean up temporary files
  if (fs.existsSync(tempManifestPath)) {
    fs.unlinkSync(tempManifestPath);
    console.log('🧹 Cleaned up temporary files');
  }
  
  console.log(`\n🚀 ${browser.toUpperCase()} Extension package is ready!`);
  console.log(`📦 ${OUTPUT_FILE}`);
  
  // Print next steps based on browser
  if (browser === 'chrome') {
    console.log(`\n📋 Next steps for Chrome deployment:`);
    console.log(`1. Visit chrome://extensions/ and enable Developer mode`);
    console.log(`2. Test locally with "Load unpacked" or by dragging the ZIP file`);
    console.log(`3. For distribution, visit https://chrome.google.com/webstore/devconsole`);
  } else if (browser === 'firefox') {
    console.log(`\n📋 Next steps for Firefox deployment:`);
    console.log(`1. Visit about:debugging#/runtime/this-firefox`);
    console.log(`2. Test locally with "Load Temporary Add-on"`);
    console.log(`3. For distribution, visit https://addons.mozilla.org/developers/`);
  }
});