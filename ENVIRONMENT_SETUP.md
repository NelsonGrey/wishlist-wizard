# Environment Setup Guide

This guide explains how to set up and configure the three Firebase environments (Production, Staging, Development) for the Wishlist Wizard project.

## Overview

The project supports three environments:
- **Production**: Live environment for end users
- **Staging**: Pre-production environment for testing
- **Development**: Development environment for active development

## Firebase Projects

The following Firebase projects have been set up:

| Environment | Firebase Project ID | Purpose |
|-------------|-------------------|---------|
| Production | `wishlist-wizard` | Live production environment |
| Staging | `wishlist-wizard-staging` | Pre-production testing |
| Development | `wishlist-wizard-dev` | Development and feature testing |

# Environment Setup Guide

This guide explains how to set up and configure the three Firebase environments (Production, Staging, Development) for the Wishlist Wizard project. All environment configuration is stored securely in GitHub repository secrets.

## Overview

The project supports three environments:
- **Production**: Live environment for end users
- **Staging**: Pre-production environment for testing
- **Development**: Development environment for active development

Environment variables are stored as GitHub secrets with environment-specific naming (e.g., `VITE_FIREBASE_API_KEY_PRODUCTION`, `VITE_FIREBASE_API_KEY_STAGING`, etc.). The CI/CD pipeline automatically creates `.env` files from these secrets during the build process.

## Firebase Projects

The following Firebase projects have been set up:

| Environment | Firebase Project ID | Purpose |
|-------------|-------------------|---------|
| Production | `wishlist-wizard` | Live production environment |
| Staging | `wishlist-wizard-staging` | Pre-production testing |
| Development | `wishlist-wizard-dev` | Development and feature testing |

## GitHub Secrets Configuration

### Environment Variables as Secrets

All environment variables are stored as GitHub repository secrets with the naming pattern: `{VARIABLE_NAME}_{ENVIRONMENT}`

#### Production Environment Secrets:
```
VITE_FIREBASE_API_KEY_PRODUCTION
VITE_FIREBASE_AUTH_DOMAIN_PRODUCTION
VITE_FIREBASE_PROJECT_ID_PRODUCTION
VITE_FIREBASE_STORAGE_BUCKET_PRODUCTION
VITE_FIREBASE_MESSAGING_SENDER_ID_PRODUCTION
VITE_FIREBASE_APP_ID_PRODUCTION
VITE_API_BASE_URL_PRODUCTION
VITE_API_TIMEOUT_PRODUCTION
VITE_DEBUG_PRODUCTION
VITE_ANALYTICS_ID_PRODUCTION
VITE_SENTRY_DSN_PRODUCTION
VITE_STRIPE_PUBLISHABLE_KEY_PRODUCTION
VITE_GOOGLE_ANALYTICS_ID_PRODUCTION
VITE_ENABLE_DEBUG_TOOLS_PRODUCTION
VITE_ENABLE_ANALYTICS_PRODUCTION
VITE_ENABLE_ERROR_REPORTING_PRODUCTION
```

#### Staging Environment Secrets:
```
VITE_FIREBASE_API_KEY_STAGING
VITE_FIREBASE_AUTH_DOMAIN_STAGING
VITE_FIREBASE_PROJECT_ID_STAGING
VITE_FIREBASE_STORAGE_BUCKET_STAGING
VITE_FIREBASE_MESSAGING_SENDER_ID_STAGING
VITE_FIREBASE_APP_ID_STAGING
VITE_API_BASE_URL_STAGING
VITE_API_TIMEOUT_STAGING
VITE_DEBUG_STAGING
VITE_ANALYTICS_ID_STAGING
VITE_SENTRY_DSN_STAGING
VITE_STRIPE_PUBLISHABLE_KEY_STAGING
VITE_GOOGLE_ANALYTICS_ID_STAGING
VITE_ENABLE_DEBUG_TOOLS_STAGING
VITE_ENABLE_ANALYTICS_STAGING
VITE_ENABLE_ERROR_REPORTING_STAGING
```

#### Development Environment Secrets:
```
VITE_FIREBASE_API_KEY_DEVELOPMENT
VITE_FIREBASE_AUTH_DOMAIN_DEVELOPMENT
VITE_FIREBASE_PROJECT_ID_DEVELOPMENT
VITE_FIREBASE_STORAGE_BUCKET_DEVELOPMENT
VITE_FIREBASE_MESSAGING_SENDER_ID_DEVELOPMENT
VITE_FIREBASE_APP_ID_DEVELOPMENT
VITE_API_BASE_URL_DEVELOPMENT
VITE_API_TIMEOUT_DEVELOPMENT
VITE_DEBUG_DEVELOPMENT
VITE_ANALYTICS_ID_DEVELOPMENT
VITE_SENTRY_DSN_DEVELOPMENT
VITE_STRIPE_PUBLISHABLE_KEY_DEVELOPMENT
VITE_GOOGLE_ANALYTICS_ID_DEVELOPMENT
VITE_ENABLE_DEBUG_TOOLS_DEVELOPMENT
VITE_ENABLE_ANALYTICS_DEVELOPMENT
VITE_ENABLE_ERROR_REPORTING_DEVELOPMENT
```

#### Deployment Secrets (Environment-Specific):
```
VERCEL_TOKEN_PRODUCTION / VERCEL_TOKEN_STAGING / VERCEL_TOKEN_DEVELOPMENT
VERCEL_ORG_ID_PRODUCTION / VERCEL_ORG_ID_STAGING / VERCEL_ORG_ID_DEVELOPMENT
VERCEL_PROJECT_ID_PRODUCTION / VERCEL_PROJECT_ID_STAGING / VERCEL_PROJECT_ID_DEVELOPMENT
RAILWAY_TOKEN_PRODUCTION / RAILWAY_TOKEN_STAGING / RAILWAY_TOKEN_DEVELOPMENT
RAILWAY_SERVICE_PRODUCTION / RAILWAY_SERVICE_STAGING / RAILWAY_SERVICE_DEVELOPMENT
FIREBASE_SERVICE_ACCOUNT_PRODUCTION / FIREBASE_SERVICE_ACCOUNT_STAGING / FIREBASE_SERVICE_ACCOUNT_DEVELOPMENT
```

#### Chrome Web Store Secrets (Shared):
```
CHROME_EXTENSION_ID
CHROME_CLIENT_ID
CHROME_CLIENT_SECRET
CHROME_REFRESH_TOKEN
```

## Firebase Configuration

### 1. Get Firebase Config Values

For each Firebase project, get the configuration values from the Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the appropriate project
3. Go to Project Settings → General → Your apps
4. Copy the config values for web app

### 2. Add to GitHub Secrets

Add the Firebase configuration values as GitHub secrets using the environment-specific naming:

- `VITE_FIREBASE_API_KEY_{ENVIRONMENT}`
- `VITE_FIREBASE_AUTH_DOMAIN_{ENVIRONMENT}`
- `VITE_FIREBASE_PROJECT_ID_{ENVIRONMENT}`
- etc.

The CI/CD pipeline will automatically use these secrets to create the `.env` file during deployment.

## Deployment URLs

### Production Environment:
- **Web App**: https://wishlist-wizard.vercel.app
- **API Server**: https://api.wishlist-wizard.railway.app
- **Mobile PWA**: https://wishlist-wizard.web.app

### Staging Environment:
- **Web App**: https://wishlist-wizard-staging.vercel.app
- **API Server**: https://api-staging.wishlist-wizard.railway.app
- **Mobile PWA**: https://wishlist-wizard-staging.web.app

### Development Environment:
- **Web App**: https://wishlist-wizard-dev.vercel.app
- **API Server**: https://api-dev.wishlist-wizard.railway.app
- **Mobile PWA**: https://wishlist-wizard-dev.web.app

## CI/CD Pipeline

The CI/CD pipeline automatically deploys based on branches:

- **`main` branch** → Production environment
- **`staging` branch** → Staging environment
- **`develop` branch** → Development environment

### Manual Deployment

You can also trigger manual deployments using the workflow dispatch:

1. Go to GitHub Actions
2. Select "🚀 CI/CD Pipeline" workflow
3. Click "Run workflow"
4. Select the desired environment

## Environment-Specific Settings

### Production Environment:
- Debug tools: Disabled
- Analytics: Enabled
- Error reporting: Enabled
- API timeout: 30 seconds

### Staging Environment:
- Debug tools: Enabled
- Analytics: Disabled
- Error reporting: Enabled
- API timeout: 30 seconds

### Development Environment:
- Debug tools: Enabled
- Analytics: Disabled
- Error reporting: Disabled
- API timeout: 30 seconds

## Firebase Service Account Setup

### 1. Create Service Account

For each Firebase project:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file

### 2. Add to GitHub Secrets

1. Copy the entire JSON content
2. Add as a GitHub secret with the appropriate name (e.g., `FIREBASE_SERVICE_ACCOUNT_PRODUCTION`)
3. The CI/CD pipeline will use this to authenticate with Firebase

## Vercel Configuration

### 1. Get Vercel Tokens

For each environment:

1. Go to Vercel Dashboard
2. Account Settings → Tokens
3. Create tokens for each environment
4. Add tokens to GitHub secrets

### 2. Environment-Specific Projects

Create separate Vercel projects for each environment:
- Production: `wishlist-wizard`
- Staging: `wishlist-wizard-staging`
- Development: `wishlist-wizard-dev`

## Railway Configuration

### 1. Get Railway Tokens

1. Go to Railway Dashboard
2. Account Settings → Tokens
3. Create tokens for each environment
4. Add tokens to GitHub secrets

### 2. Environment-Specific Services

Create separate Railway services for each environment with appropriate names.

## Testing Environment Setup

### 1. Local Development

For local development, create a `.env` file in the `packages/web/` directory with your development values:

```bash
cd packages/web
cat > .env << EOF
# Development Environment Configuration - Local Development

# Firebase Configuration (use development project values)
VITE_FIREBASE_API_KEY=your_dev_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=wishlist-wizard-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=wishlist-wizard-dev
VITE_FIREBASE_STORAGE_BUCKET=wishlist-wizard-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_dev_sender_id
VITE_FIREBASE_APP_ID=your_dev_app_id

# API Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_API_TIMEOUT=30000

# Environment
VITE_ENVIRONMENT=development
VITE_DEBUG=true

# Analytics & Monitoring (disabled for local dev)
VITE_ANALYTICS_ID=
VITE_SENTRY_DSN=

# Third-party Services (use test keys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_GOOGLE_ANALYTICS_ID=

# Feature Flags
VITE_ENABLE_DEBUG_TOOLS=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=false
EOF
```

Then run the development server:

```bash
npm run dev
```

### 2. Environment Switching

The application automatically detects the environment based on the hostname and configuration. For local development, it uses the values from your local `.env` file.

## Troubleshooting

### Common Issues:

1. **Deployment Fails**: Check that all required secrets are set for the target environment
2. **Firebase Connection Issues**: Verify Firebase config values and service account permissions
3. **Vercel Deployment Issues**: Check Vercel tokens and project IDs
4. **Railway Deployment Issues**: Verify Railway tokens and service names

### Debug Steps:

1. Check GitHub Actions logs for detailed error messages
2. Verify all secrets are properly set in repository settings
3. Ensure Firebase projects exist and service accounts have correct permissions
4. Test deployments manually using workflow dispatch

### Environment Variable Validation:

For local development, check that your `.env` file exists and has the required variables:

```bash
# Check if local .env file exists
ls -la packages/web/.env

# View the contents to verify
cat packages/web/.env
```

For CI/CD deployments, the environment variables are automatically created from GitHub secrets, so no manual validation is needed.

## Security Notes

- All sensitive configuration is stored securely in GitHub repository secrets
- Environment files (`.env`) are dynamically generated during CI/CD and never committed to git
- Local development `.env` files should never be committed (they are already in `.gitignore`)
- Regularly rotate service account keys and API tokens
- Use environment-specific service accounts with minimal required permissions
- GitHub secrets are encrypted and only accessible to the repository

## Next Steps

1. **Set up all GitHub secrets** for each environment using the naming convention `{VARIABLE_NAME}_{ENVIRONMENT}`
2. **Configure Firebase projects** and add service account keys as GitHub secrets
3. **Set up Vercel & Railway** projects for each environment and add tokens
4. **Create local development .env file** for development work
5. **Test deployments** to each environment
6. **Update documentation** with actual deployment URLs once everything is working