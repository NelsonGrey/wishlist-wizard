# 🚀 Automated Build & Deployment Guide

## Overview

This project includes a comprehensive CI/CD pipeline that automatically builds, tests, and deploys all Wishlist Wizard components to their respective hosting platforms.

## 🏗️ Components & Deployment Targets

| Component | Platform | URL | Auto Deploy |
|-----------|----------|-----|-------------|
| 🌐 Web App | Firebase Hosting | `https://wishlist-wizard-prod.web.app` | ✅ (push to `main`/`staging`/`develop`, per-environment) |
| ⚡ Firebase Functions | Firebase Functions | n/a (callable functions, routed through an `api` router) | ✅ (push to `main`/`staging` only, via `master-pipeline.yml`) |
| 📱 Android | Play Store — **internal track only** | n/a (app not publicly launched) | ✅ (push to `main`/`staging`, via `master-pipeline.yml`) |
| 🍎 iOS | TestFlight only | n/a | ✅ (push to `main`/`staging`, via `master-pipeline.yml` → `ios-mobile-release.yml`); full App Store submission is a separate manual `workflow_dispatch` |
| 🔌 Chrome Extension | Chrome Web Store | Manual submission unless `workflow_dispatch` action is `build_and_deploy` | 📦 conditional |

## 🔄 Automated CI/CD Pipeline

**Top-line claim**: "Push to `main` triggers deployment" — this is true today, but only since a `master-pipeline.yml` change on 2026-08-01 (commit `2cdb070`) added real `push` triggers on `staging`/`main`. It comes with caveats: Android goes to the Play Store internal track only, iOS goes to TestFlight only (not the App Store), and the Chrome extension only publishes under the `build_and_deploy` manual action. `develop` does **not** trigger this pipeline at all — see below.

### Triggers (`master-pipeline.yml`)
- **Push to `main`**: maps to the `production` environment; runs build/test/quality-gate, then deploys Firebase Hosting + Functions, Android (internal track), and builds iOS for TestFlight ("Beta Testers" group). Path-filtered — only fires when relevant package/workflow/config paths change.
- **Push to `staging`**: same pipeline, mapped to the `staging` environment (iOS TestFlight "Staging" group).
- **Push to `develop`**: does **not** trigger `master-pipeline.yml` — this is deliberate (see the comment in the workflow's `on:` block). `develop` instead gets a lighter, Hosting-only deploy via the separate `firebase-hosting-dev.yml` workflow, which deploys just the web app to the dev Firebase project.
- **Pull Requests** (to `develop`/`staging`/`main`): runs tests and builds, no deployment.
- **Manual Trigger** (`workflow_dispatch`): choose an `action` (`build_all`, `test_all`, `build_and_deploy`, `deploy_only`, `android_deploy_only`) and target `environment`. Chrome Web Store publish and a full iOS App Store submission both require explicit manual dispatch.

### Pipeline Stages

#### 1. 🔍 Quality Check & Tests
- TypeScript compilation check
- Unit tests across all packages (functions tests run against the companion-repo checkout, see below)
- Security audit
- Code quality / quality-gate job

#### 2. 🏗️ Build All Packages
- Web App (Vite build)
- Firebase Functions (from the companion repo checkout)
- Browser Extension (Vite build)
- Shared Package (TypeScript compilation)
- Mobile App (Flutter, native iOS/Android builds — not just a web PWA build)

#### 3. 📦 Package & Artifacts
- Creates deployment-ready artifacts
- Chrome extension ZIP package
- Optimized production bundles

#### 4. 🚀 Deploy to Platforms
- **Firebase Hosting**: web application, per-environment (`firebase-hosting-dev.yml`/`-staging.yml`/`-merge.yml`, plus `master-pipeline.yml`'s own hosting deploy for staging/main)
- **Firebase Functions**: deployed via the reusable `firebase-deploy-local.yml`, called from `master-pipeline.yml` for staging/main
- **Android**: Play Store internal track only
- **iOS**: TestFlight only (App Store submission is manual)
- **Chrome Web Store**: only on the `build_and_deploy` manual dispatch action

### Functions Companion-Repo Checkout

`packages/functions/` is gitignored in this repo — real function source lives in the private repo `NelsonGrey/wishlist-wizard-functions`. Before any job builds, tests, or deploys functions, it checks out that repo into `packages/functions/` using the `FUNCTIONS_REPO_PAT` secret. This happens in `master-pipeline.yml`'s `test` and `build-web` jobs, in the reusable `firebase-deploy-local.yml`, and in `release-readiness-gate.yml`. If you're debugging a functions-related CI failure and don't see this checkout step, that's the first thing to check.

## 🔧 Setup Instructions

### 1. Repository Secrets Configuration

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

#### Firebase Deployment
```
FIREBASE_SERVICE_ACCOUNT_KEY_WISHLIST_WIZARD=your_firebase_service_account_json
```

#### Chrome Web Store (Optional)
```
CHROME_EXTENSION_ID=your_extension_id
CHROME_CLIENT_ID=your_chrome_client_id
CHROME_CLIENT_SECRET=your_chrome_client_secret
CHROME_REFRESH_TOKEN=your_chrome_refresh_token
```

### 2. Environment Variables

There is no Postgres database or `DATABASE_URL`/`JWT_SECRET` in this stack — those are dead references to a retired Express+Postgres backend. Auth is entirely Firebase Auth-managed (including password policy, read live via `validatePassword()`), and Functions are Firebase callable functions from the companion repo.

#### Web App Environment Variables (Vite, build-time)
Set these per environment (suffixed `_DEVELOPMENT`/`_STAGING`/`_PRODUCTION`, with unsuffixed `VITE_FIREBASE_*` as a fallback), consumed in `packages/web/client-src/lib/firebase.ts`:
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
VITE_FIREBASE_APPCHECK_SITE_KEY      # reCAPTCHA v3 site key — App Check is enforced server-side
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN   # dev-only, for local/E2E runs
```

There is no `VITE_API_URL` — the web app talks to Firebase directly (Auth, Firestore, callable Functions), not a separate REST API host.

#### GitHub Actions Secrets
Set in `Settings > Secrets and variables > Actions`:
```
FIREBASE_SERVICE_ACCOUNT_KEY_WISHLIST_WIZARD   # Firebase deploy auth
FUNCTIONS_REPO_PAT                              # read access to NelsonGrey/wishlist-wizard-functions
```

## 📋 Manual Deployment

### Using the Deployment Script

```bash
# Build all components
./scripts/deploy.sh build

# Deploy everything
./scripts/deploy.sh deploy-all

# Deploy individual components
./scripts/deploy.sh deploy-firebase      # Deploy to Firebase Hosting
./scripts/deploy.sh deploy-api      # Deploy to Firebase Functions
./scripts/deploy.sh deploy-mobile   # Deploy to Firebase Hosting

# Create Chrome extension package
./scripts/deploy.sh package-ext
```

### Prerequisites for Manual Deployment

Install the required CLI tools:

```bash
# Firebase CLI
npm install -g firebase-tools

# Flutter (for mobile builds)
# Follow: https://docs.flutter.dev/get-started/install
```

### Individual Platform Deployment

#### Web App to Firebase Hosting
```bash
cd packages/web
npm run build
firebase deploy --only hosting
```

#### Firebase Functions

`packages/functions/` is gitignored — clone the companion repo into place first:
```bash
git clone https://github.com/NelsonGrey/wishlist-wizard-functions.git packages/functions
cd packages/functions
npm ci
npm run build
firebase deploy --only functions
```

#### Mobile PWA to Firebase Hosting
```bash
cd packages/mobile
flutter build web --release
firebase deploy --only hosting
```

## 🔒 Security & Best Practices

### Environment Security
- All sensitive data stored in GitHub Secrets
- Environment variables injected at build time
- No hardcoded credentials in source code

### Deployment Security
- HTTPS enforced on all platforms
- Content Security Policy headers
- Proper CORS configuration
- Database connection encryption

### Build Optimization
- Tree shaking for minimal bundle sizes
- Asset compression and caching
- Code splitting for faster loading
- Progressive Web App features

## 📊 Monitoring & Maintenance

### Build Status
- GitHub Actions dashboard shows all build/deploy status
- Email notifications on build failures
- Slack integration available (optional)

### Platform Monitoring
- **Firebase**: Performance monitoring, crash reporting, and analytics

### Health Checks
- API server includes health check endpoint (`/health`)
- Automated uptime monitoring recommended
- Error tracking with Sentry (optional)

## 🆘 Troubleshooting

### Common Issues

#### Build Failures
1. Check GitHub Actions logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are properly installed

#### Deployment Failures
1. **Firebase**: Check deployment logs in Firebase console and verify configuration

#### Chrome Extension Issues
1. Ensure manifest.json is valid
2. Check Chrome Web Store developer policies
3. Verify all required icons and files are included

### Getting Help
- Check GitHub Issues for known problems
- Review platform-specific documentation
- Contact support for deployment platform issues

## 🔄 Workflow Customization

The CI/CD pipeline is designed to be flexible and can be customized:

### Adding New Deployment Targets
1. Add new job to `.github/workflows/master-pipeline.yml`
2. Configure platform-specific secrets
3. Update deployment script if needed

### Modifying Build Process
1. Update build commands in `package.json` files
2. Modify workflow steps as needed
3. Test changes in feature branches first

### Adding Quality Gates
1. Add new testing steps to test job
2. Configure additional linting or security checks
3. Set up branch protection rules

---

**🎉 Your Wishlist Wizard project is now equipped with a comprehensive automated build and deployment pipeline!**

The system automatically handles:
- ✅ Quality assurance and testing
- ✅ Multi-platform builds
- ✅ Automated deployments
- ✅ Artifact management
- ✅ Deployment reporting

Simply push to `main` and watch your application deploy across all platforms automatically! 🚀
