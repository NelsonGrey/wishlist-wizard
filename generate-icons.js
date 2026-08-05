#!/usr/bin/env node

/**
 * Icon Generation Script for Wishlist Wizard
 * Converts SVG icon to PNG files in required sizes for browser extension
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎨 Wishlist Wizard Icon Generator');
console.log('================================');

// Check if we're in the right directory
const svgPath = path.join(__dirname, 'icons', 'icon-wishlist-wizard.svg');
const extensionIconsDir = path.join(__dirname, 'packages/browser-extension/src/icons');

if (!fs.existsSync(svgPath)) {
  console.error('❌ SVG icon not found at:', svgPath);
  process.exit(1);
}

console.log('✅ Found SVG icon at:', svgPath);

// Create instructions for manual conversion
console.log('\n📋 Manual PNG Generation Instructions:');
console.log('=====================================');
console.log('Since image conversion tools are not available, please convert manually:');
console.log('');
console.log('1. Open icons/icon-wishlist-wizard.svg in a browser or image editor');
console.log('2. Export/Save as PNG in these sizes:');
console.log('   - 16x16 pixels → icon16.png');
console.log('   - 48x48 pixels → icon48.png');
console.log('   - 128x128 pixels → icon128.png');
console.log('');
console.log('3. Save them to: packages/browser-extension/src/icons/ (or use ./scripts/apply-new-icon.sh to automate)');
console.log('');
console.log('Or use online tools:');
console.log('- https://cloudconvert.com/svg-to-png');
console.log('- https://convertio.co/svg-png/');
console.log('- https://www.iloveimg.com/convert-to-png');

// Alternative: Create a simple HTML file for browser-based conversion
const htmlConverter = `<!DOCTYPE html>
<html>
<head>
    <title>Wishlist Wizard Icon Converter</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .icon-preview { border: 1px solid #ccc; padding: 10px; margin: 10px 0; display: inline-block; }
        canvas { border: 1px solid #999; margin: 5px; }
        button { padding: 10px 15px; margin: 5px; background: #6366F1; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #4F46E5; }
    </style>
</head>
<body>
    <h1>🎨 Wishlist Wizard Icon Converter</h1>
    <p>Convert SVG to PNG files for browser extension</p>

    <div class="icon-preview">
        <h3>Icon Preview:</h3>
        <img id="iconPreview" src="icons/icon-wishlist-wizard.svg" width="128" height="128" alt="Wishlist Wizard Icon">
    </div>

    <div>
        <h3>Generate PNG Files:</h3>
        <button onclick="downloadPNG(16)">Download 16x16 PNG</button>
        <button onclick="downloadPNG(48)">Download 48x48 PNG</button>
        <button onclick="downloadPNG(128)">Download 128x128 PNG</button>
    </div>

    <script>
        async function downloadPNG(size) {
            const img = document.getElementById('iconPreview');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = size;
            canvas.height = size;

            // Draw the SVG image to canvas
            ctx.drawImage(img, 0, 0, size, size);

            // Convert to blob and download
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = \`icon\${size}.png\`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'icon-converter.html'), htmlConverter);
console.log('\n✅ Created icon-converter.html for browser-based PNG generation');
console.log('   Open this file in a browser to convert SVG to PNG files');

console.log('\n🎯 Next Steps:');
console.log('==============');
console.log('1. Generate PNG files using one of the methods above');
console.log('2. Place them in: packages/browser-extension/src/icons/');
console.log('3. Update manifest.json to reference the new icons');
console.log('4. Test the extension in Chrome developer mode');
console.log('5. Alternatively, use the repository script to automatically resize and apply the PNG across all deliverables (macOS):');
console.log('   ./scripts/apply-new-icon.sh /path/to/new-icon.png');

console.log('\n✨ Icon Design Summary:');
console.log('=====================');
console.log('- Layered "W" design with two floating shapes');
console.log('- Primary W (prominent) and secondary W (semi-transparent)');
console.log('- Golden star on top of primary W peak');
console.log('- Blue color scheme (#6366F1)');
console.log('- Scalable SVG format with PNG fallbacks');