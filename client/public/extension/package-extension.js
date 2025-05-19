/**
 * WishKeeper Extension Packaging Script
 * 
 * This script creates a ZIP file of the extension for distribution.
 * 
 * Usage: 
 * 1. Install dependencies: npm install archiver
 * 2. Run: node package-extension.js
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'dist');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'wishkeeper-extension.zip');
const VERSION = require('./manifest.json').version;

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

// Finalize the archive
console.log('🔧 Finalizing package...');
archive.finalize();