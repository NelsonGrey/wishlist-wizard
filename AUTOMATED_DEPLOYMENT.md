# 🚀 Automated Build & Deployment Guide

## Overview

This project includes a comprehensive CI/CD pipeline that automatically builds, tests, and deploys all Wishlist Wizard components to their respective hosting platforms.

## 🏗️ Components & Deployment Targets

| Component | Platform | URL | Auto Deploy |
|-----------|----------|-----|-------------|
| 🌐 Web App | Firebase Hosting | `https://wishlist-wizard.web.app` | ✅ |
| 🚂 API Server | Firebase Functions | `https://api.wishlist-wizard.web.app` | ✅ |
| 📱 Mobile PWA | Firebase Hosting | `https://wishlist-wizard.web.app` | ✅ |
| 🔌 Chrome Extension | Chrome Web Store | Manual submission | 📦 |

## 🔄 Automated CI/CD Pipeline

### Triggers
- **Push to `main`**: Triggers full build, test, and deployment
- **Pull Requests**: Runs tests and builds (no deployment)
- **Manual Trigger**: Chrome Web Store submission

### Pipeline Stages

#### 1. 🔍 Quality Check & Tests
- TypeScript compilation check
- Unit tests across all packages
- Security audit
- Code quality validation

#### 2. 🏗️ Build All Packages
- Parallel builds for maximum efficiency
- Web App (Vite build)
- API Server (esbuild bundle)
- Browser Extension (Vite build)
- Shared Package (TypeScript compilation)
- Mobile App (Flutter web build)

#### 3. 📦 Package & Artifacts
- Creates deployment-ready artifacts
- Chrome extension ZIP package
- Optimized production bundles

#### 4. 🚀 Deploy to Platforms
- **Firebase Hosting**: Web application and Mobile PWA deployment
- **Firebase Functions**: API server deployment
- **Chrome Web Store**: Manual submission workflow

## 🔧 Setup Instructions

### 1. Repository Secrets Configuration

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

#### Firebase Deployment
```
FIREBASE_SERVICE_ACCOUNT_WISHLIST_WIZARD=your_firebase_service_account_json
```

#### Chrome Web Store (Optional)
```
CHROME_EXTENSION_ID=your_extension_id
CHROME_CLIENT_ID=your_chrome_client_id
CHROME_CLIENT_SECRET=your_chrome_client_secret
CHROME_REFRESH_TOKEN=your_chrome_refresh_token
```

### 2. Environment Variables

#### Firebase Environment Variables
Set these in your Firebase Functions configuration:
```
NODE_ENV=production
DATABASE_URL=your_postgresql_connection_string
FIREBASE_PROJECT_ID=your_project_id
JWT_SECRET=your_jwt_secret
```

#### Web App Environment Variables
Set these in your Firebase Hosting configuration or build process:
```
VITE_API_URL=https://api.wishlist-wizard.web.app
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```

## 📋 Manual Deployment

### Using the Deployment Script

```bash
# Build all components
./scripts/deploy.sh build

# Deploy everything
./scripts/deploy.sh deploy-all

# Deploy individual components
./scripts/deploy.sh deploy-web      # Deploy to Firebase Hosting
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

#### API Server to Firebase Functions
```bash
cd packages/api-server
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
1. Add new job to `.github/workflows/ci-cd-pipeline.yml`
2. Configure platform-specific secrets
3. Update deployment script if needed

### Modifying Build Process
1. Update build commands in `package.json` files
2. Modify workflow steps as needed
3. Test changes in feature branches first

### Adding Quality Gates
1. Add new testing steps to quality-check job
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