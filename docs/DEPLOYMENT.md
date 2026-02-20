# Wishlist Wizard - Deployment Guide

## 📦 Available Deliverables

All production-ready builds have been generated and are available in the following locations:

### 1. 🌐 React Web Application
- **Location**: `packages/web/dist/`
- **Type**: Single Page Application (SPA)
- **Deployment**: Ready for static hosting (Firebase Hosting, Netlify, AWS S3, etc.)
- **Entry Point**: `dist/index.html`
- **Assets**: Optimized CSS and JavaScript bundles
- **Size**: ~1MB minified + gzipped (~298KB)

### 2. 🚀 Express API Server
- **Location**: `packages/functions/lib/` (Firebase Functions)
- **Type**: Serverless functions
- **Deployment**: Firebase Functions
- **Runtime**: Node.js 18+
- **Features**: Auto-scaling, serverless execution

### 3. 🔌 Chrome Browser Extension
- **Package Location**: `packages/browser-extension/dist/`
- **Zip Package**: `wishlist-wizard-extension.zip`
- **Type**: Chrome Extension (Manifest V3)
- **Deployment**: Ready for Chrome Web Store submission
- **Features**: Content scripts, background service worker, popup interface

### 4. 📱 Flutter Mobile App
- **Location**: `packages/mobile/build/web/`
- **Type**: Progressive Web App (PWA)
- **Deployment**: Web deployment ready
- **Note**: Android/iOS builds require additional SDK setup

### 5. 📚 Shared Package
- **Location**: `packages/shared/dist/`
- **Type**: TypeScript type definitions and schemas
- **Usage**: Shared between all applications

## 🚢 Deployment Instructions

### Web Application Deployment

#### Option 1: Firebase Hosting (Recommended)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize (if not done)
firebase login
firebase init hosting

# Deploy from project root
firebase deploy --only hosting
```

#### Option 2: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy (from repo root)
netlify deploy --prod --dir=packages/web/dist
```

#### Option 3: Static File Hosting
Upload the entire `packages/web/dist/` directory to your static file host.

### API Server Deployment

#### Firebase Functions (Recommended)
```bash
# Deploy functions
firebase deploy --only functions
```

### Chrome Extension Deployment

1. **Chrome Web Store Submission**:
   - Upload `wishlist-wizard-extension.zip` to Chrome Web Store Developer Console
   - Fill out store listing details
   - Submit for review

2. **Developer Mode Testing**:
   - Open Chrome → Extensions → Developer Mode
   - Load unpacked → Select `packages/browser-extension/dist/` folder

### Mobile App Deployment

#### Web Version (PWA)
```bash
# Serve the Flutter web build
cd packages/mobile/build/web
python -m http.server 8080
```

#### Android APK (Requires Android SDK)
```bash
cd packages/mobile
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

## 🔧 Environment Configuration

### Environment Variables Required

#### Web Application (.env)
```
VITE_API_URL=https://your-api-domain.com
VITE_FIREBASE_API_KEY=your-firebase-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

#### API Server (.env)
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-jwt-secret
FIREBASE_PROJECT_ID=your-project-id
```

## 📊 Build Sizes & Performance

| Component | Size (Minified) | Size (Gzipped) | Build Time |
|-----------|----------------|----------------|------------|
| Web App | 1.05MB | 298KB | ~11s |
| API Server | 266.6KB | N/A | <1s |
| Browser Extension | ~15KB | ~5KB | <1s |
| Flutter Web | ~2MB | ~600KB | ~53s |

## 🔍 Quality Assurance

### Pre-deployment Checklist
- [x] All packages build successfully
- [x] TypeScript compilation passes
- [x] Production bundles optimized
- [x] Extension package created
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates configured
- [ ] Domain names configured

### Testing Commands
```bash
# Test all builds
npm run build

# Test individual packages
npm run build --workspace=@wishlist-wizard/shared
npm run build --workspace=@wishlist-wizard/browser-extension
npm run build --workspace=functions
npm run build --workspace=@wishlist-wizard/web
cd packages/mobile && flutter build web --release
```

## 🆘 Troubleshooting

### Common Issues

1. **Web App Bundle Size Warning**
   - Current bundle is >500KB
   - Consider code splitting with dynamic imports
   - Implement lazy loading for routes

2. **Extension Warnings**
   - Script loading issues in popup.html
   - Consider using type="module" for scripts

3. **Flutter Web WASM Warnings**
   - Some packages not compatible with WebAssembly
   - Use `--no-wasm-dry-run` to disable warnings

### Support
- Check GitHub Issues for known problems
- Review DEVELOPER.md for development setup
- Consult individual package README files

---

**Generated on**: October 7, 2025  
**Version**: 1.0.0  
**Build Status**: ✅ Builds validated; complete environment and secret configuration before production deployment
