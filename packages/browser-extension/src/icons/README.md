# 🎨 Wishlist Wizard Icon System

This directory contains the icon assets for the Wishlist Wizard project across all platforms: web, mobile, and browser extension.

## 📁 Icon Files

### Browser Extension Icons
- `icon16.svg` - 16x16 extension toolbar icon
- `icon48.svg` - 48x48 extension management page icon
- `icon128.svg` - 128x128 Chrome Web Store icon
- `icon-wishlist-wizard.svg` - Master SVG source file

### PNG Versions Required
The browser extension also needs PNG versions of these icons:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

## 🎨 Design Description

The Wishlist Wizard icon features:
- **Layered "W" design** with two floating W shapes
- **Primary W** (thicker, more prominent)
- **Secondary W** (slightly larger, semi-transparent, fits under and within)
- **Golden star** positioned on the peak of the primary W
- **Blue color scheme** (#6366F1) representing trust and technology
- **Scalable SVG format** for crisp display at any size

## 🔄 Generating PNG Files

Since automated conversion tools aren't available, use one of these methods:

### Method 1: Browser-Based Converter
1. Open `icon-converter.html` (in project root) in a web browser
2. Click the download buttons to generate PNG files
3. Move the downloaded files to this directory

### Method 2: Online Tools
1. Go to https://cloudconvert.com/svg-to-png or similar
2. Upload `icon-wishlist-wizard.svg`
3. Convert to PNG at sizes: 16×16, 48×48, 128×128
4. Download and rename files as `icon[size].png`

### Method 3: Design Software
1. Open `icon-wishlist-wizard.svg` in Figma, Sketch, or Illustrator
2. Export as PNG at the required sizes
3. Save with the naming convention above

## 📱 Platform Implementation

### Browser Extension
- **Manifest**: References PNG files in `manifest.json`
- **Location**: `packages/browser-extension/src/icons/`
- **Usage**: Toolbar icon, extension popup, Chrome Web Store

### Web Application
- **Location**: `packages/web/public/` or `packages/web/src/assets/`
- **Usage**: Favicon, app icon, PWA manifest
- **Formats**: SVG for web, PNG for favicons

### Mobile App (Flutter)
- **Location**: `packages/mobile/android/app/src/main/res/` (Android)
- **Location**: `packages/mobile/ios/Runner/Assets.xcassets/` (iOS)
- **Usage**: App icon, notification icons
- **Formats**: PNG files in various sizes per platform requirements

## 🎯 Icon Usage Guidelines

### Colors
- **Primary**: #6366F1 (Blue)
- **Secondary**: #FFD700 (Gold for star)
- **Background**: Transparent or white
- **Stroke**: White for contrast

### Sizing
- **Browser Extension**: 16px, 48px, 128px
- **Web Favicon**: 16px, 32px, 64px
- **Mobile**: Follow platform guidelines (typically 192px+ for Android, various for iOS)

### File Formats
- **SVG**: For scalable web usage
- **PNG**: For platform-specific requirements
- **ICO**: For legacy favicon support

## 🚀 Next Steps

1. **Generate PNG files** using one of the methods above
2. **Update manifest.json** to reference the new icons
3. **Test extension** in Chrome developer mode
4. **Implement across platforms** (web favicons, mobile app icons)
5. **Update Chrome Web Store listing**
6. **Update project documentation** with new icon references

## 📋 Checklist

- [ ] Generate PNG files (16px, 48px, 128px)
- [ ] Update browser extension manifest.json
- [ ] Test extension loading and display
- [ ] Add web favicons
- [ ] Create mobile app icons
- [ ] Update Chrome Web Store listing
- [ ] Update project documentation

## 🛠️ Tools & Resources

- **Icon Converter**: `icon-converter.html` (browser-based)
- **Online Converters**: CloudConvert, Convertio, iLoveIMG
- **Design Software**: Figma, Sketch, Adobe Illustrator
- **Validation**: Chrome Extension manifest validator

---

**Last Updated**: October 15, 2025
**Designer**: Wishlist Wizard Team
