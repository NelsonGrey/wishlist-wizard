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

### Primary Path: GitHub Actions (`master-pipeline.yml`)

Deployment is normally **not** a manual step — it happens through GitHub Actions:

- **Automatic**: pushing to `staging` or `main` (with changes under `packages/mobile/**`, `packages/web/**`, `packages/browser-extension/**`, `packages/functions/**`, `.github/workflows/**`, `.cicd/projects/**`, `pubspec.yaml`, or `firebase*.json`) triggers `master-pipeline.yml`, which maps `main` → `production` and `staging` → `staging`, then runs build/test/quality-gate jobs before deploying Firebase Hosting + Functions, Android (Play Store internal track), iOS (TestFlight), and — for the `build_and_deploy` action — the Chrome extension.
- **Manual**: trigger `master-pipeline.yml` via `workflow_dispatch` in the GitHub Actions UI, choosing an `action` (`build_all`, `test_all`, `build_and_deploy`, `deploy_only`, `android_deploy_only`) and target `environment`.
- **`develop` branch**: pushes to `develop` do **not** trigger `master-pipeline.yml` (it's deliberately excluded from that workflow's push trigger). `develop` instead gets a lighter-weight web-only deploy via `firebase-hosting-dev.yml`, which fires on every push to `develop` and deploys just Firebase Hosting to the dev project.

See `docs/CICD_SETUP_GUIDE.md` for the full workflow list and gate set.

### Manual Local Deployment (for one-off / emergency use)

#### Web Application
```bash
# Install Firebase CLI
npm install -g firebase-tools
firebase login

# Build and deploy from the web package
cd packages/web
npm run build
firebase deploy --only hosting
```

#### Firebase Functions

`packages/functions/` is **gitignored in this repo** — the real function source lives in the private companion repo `NelsonGrey/wishlist-wizard-functions`. Before you can deploy functions locally, clone that repo into `packages/functions/`:

```bash
# Clone the companion repo into place (requires access to NelsonGrey/wishlist-wizard-functions)
git clone https://github.com/NelsonGrey/wishlist-wizard-functions.git packages/functions

cd packages/functions
npm ci
npm run build
firebase deploy --only functions
```

CI does this automatically via a `FUNCTIONS_REPO_PAT`-authenticated checkout step in `master-pipeline.yml`, `firebase-deploy-local.yml`, and `release-readiness-gate.yml` — see `docs/CICD_SETUP_GUIDE.md` for details.

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

There is no Postgres-backed API server or `DATABASE_URL`/`JWT_SECRET` in this project — that describes an earlier Express+Postgres backend that has since been fully replaced by Firebase (Auth, Firestore, Functions). Auth and password policy are managed by Firebase Auth itself, not application code.

#### Web Application (Vite `VITE_*` vars, set per-environment as `..._DEVELOPMENT`/`..._STAGING`/`..._PRODUCTION` suffixed vars, with plain `VITE_FIREBASE_*` as a fallback)
```
VITE_FIREBASE_API_KEY[_DEVELOPMENT|_STAGING|_PRODUCTION]
VITE_FIREBASE_AUTH_DOMAIN[_DEVELOPMENT|_STAGING|_PRODUCTION]
VITE_FIREBASE_PROJECT_ID[_DEVELOPMENT|_STAGING|_PRODUCTION]
VITE_FIREBASE_STORAGE_BUCKET[_DEVELOPMENT|_STAGING|_PRODUCTION]
VITE_FIREBASE_MESSAGING_SENDER_ID[_DEVELOPMENT|_STAGING|_PRODUCTION]
VITE_FIREBASE_APP_ID[_DEVELOPMENT|_STAGING|_PRODUCTION]
VITE_FIREBASE_MEASUREMENT_ID[_DEVELOPMENT|_STAGING|_PRODUCTION]
VITE_FIREBASE_APPCHECK_SITE_KEY[_DEVELOPMENT|_STAGING|_PRODUCTION]  # reCAPTCHA v3 site key for App Check
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN     # dev-only, lets local/E2E runs pass App Check without solving reCAPTCHA
VITE_USE_FIREBASE_EMULATORS            # true/false, local dev only
VITE_ENVIRONMENT                       # explicit environment override (development|staging|production)
```

These are read in `packages/web/client-src/lib/firebase.ts`. In deployed environments (`wishlist-wizard-dev.web.app`, `-staging.web.app`, and the production domains), the app also has a runtime-config fallback that can source these values from Firebase Hosting rather than build-time env vars — see `mergeWithRuntimeFirebaseConfig()` in the same file.

#### Firebase Functions
Functions configuration is managed through Firebase (Secret Manager / `firebase functions:config` or `.env` files inside the companion repo `NelsonGrey/wishlist-wizard-functions`), not through a generic `NODE_ENV`/`PORT`/`DATABASE_URL` `.env` file.

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
