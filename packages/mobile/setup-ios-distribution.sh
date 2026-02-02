#!/bin/bash
# iOS Distribution Setup Script
# This script helps set up the iOS distribution pipeline

set -e

echo "🚀 Setting up iOS Distribution for Wishlist Wizard"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "pubspec.yaml" ]; then
    echo "❌ Error: Please run this script from the mobile package root (packages/mobile/)"
    exit 1
fi

echo "📍 Current directory: $(pwd)"

# Check if Fastlane is installed
if ! command -v fastlane &> /dev/null; then
    echo "⚠️  Fastlane not found. Installing..."
    gem install fastlane
else
    echo "✅ Fastlane is installed: $(fastlane --version)"
fi

# Check if Flutter is available
if ! command -v flutter &> /dev/null; then
    echo "❌ Error: Flutter not found. Please install Flutter first."
    exit 1
else
    echo "✅ Flutter is available: $(flutter --version | head -1)"
fi

# Create .env file template for iOS distribution
if [ ! -f ".env.ios" ]; then
    echo "📝 Creating .env.ios template..."
    cat > .env.ios << 'EOF'
# iOS Distribution Environment Variables
# Copy this file to your CI/CD environment or local .env file

# Apple Developer Account
FASTLANE_APPLE_ID=your-apple-id@example.com
FASTLANE_TEAM_ID=your-team-id
FASTLANE_ITC_TEAM_ID=your-itc-team-id

# App Store Connect API Key (generate from App Store Connect)
APP_STORE_CONNECT_KEY_ID=your-key-id
APP_STORE_CONNECT_ISSUER_ID=your-issuer-id
APP_STORE_CONNECT_KEY=-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----

# Match (Code Signing) Configuration
MATCH_GIT_URL=https://github.com/mnelson3/nelson-grey

# TestFlight Configuration
BETA_FEEDBACK_EMAIL=feedback@wishlistwizard.com

# Release Notes (optional)
RELEASE_NOTES=New version with bug fixes and improvements
EOF
    echo "✅ Created .env.ios template"
else
    echo "ℹ️  .env.ios already exists"
fi

# Create instructions file
cat > IOS_DISTRIBUTION_SETUP.md << 'EOF'
# iOS Distribution Setup Guide

This guide will help you set up automated iOS distribution for Wishlist Wizard using Fastlane.

## Prerequisites

1. **Apple Developer Account**: You need an Apple Developer Program membership ($99/year)
2. **App Store Connect Access**: Admin or App Manager role
3. **Xcode**: Latest version installed
4. **Flutter**: SDK installed and configured

## Step 1: App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to Users and Access → Keys
3. Click "App Store Connect API" → "+" to create a new key
4. Choose "Admin" role and give it a name (e.g., "Wishlist Wizard CI")
5. Download the `.p8` file and copy the Key ID and Issuer ID

## Step 2: Configure Environment Variables

Copy `.env.ios` to your environment and fill in the values:

```bash
cp .env.ios .env
# Edit .env with your actual values
```

Required variables:
- `FASTLANE_APPLE_ID`: Your Apple ID email
- `FASTLANE_TEAM_ID`: Your Developer Team ID (from developer.apple.com)
- `FASTLANE_ITC_TEAM_ID`: Your App Store Connect Team ID
- `APP_STORE_CONNECT_KEY_ID`: From the API key you created
- `APP_STORE_CONNECT_ISSUER_ID`: From the API key you created
- `APP_STORE_CONNECT_KEY`: Contents of the .p8 file (base64 encoded for CI)

## Step 3: Code Signing Setup

### Option A: Using Match (Recommended)

1. Create a private Git repository for certificates:
   ```bash
   git init certificates-repo
   cd certificates-repo
    git remote add origin https://github.com/mnelson3/nelson-grey
   ```

2. Set the `MATCH_GIT_URL` in your `.env` file

3. Run match setup:
   ```bash
   cd ios
   fastlane match init
   ```

### Option B: Manual Code Signing

If you prefer manual code signing, update the Fastfile to use your existing certificates.

## Step 4: Test the Setup

1. Run a test build:
   ```bash
   cd ios
   fastlane test_and_build
   ```

2. If successful, try TestFlight distribution:
   ```bash
   fastlane beta
   ```

## Step 5: CI/CD Integration

### GitHub Actions

The iOS distribution workflow is already configured in `.github/workflows/ios-distribution.yml`.

Add these secrets to your GitHub repository:
- `FASTLANE_APPLE_ID`
- `FASTLANE_TEAM_ID`
- `FASTLANE_ITC_TEAM_ID`
- `APP_STORE_CONNECT_KEY_ID`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_KEY` (base64 encoded)
- `MATCH_GIT_URL` (if using match)
- `BETA_FEEDBACK_EMAIL`

### Environment-Specific Secrets

For production deployments, create separate secrets with `_PRODUCTION` suffix:
- `FIREBASE_SERVICE_ACCOUNT_KEY_PRODUCTION`
- `APP_STORE_CONNECT_KEY_PRODUCTION` (if different)

## Available Fastlane Lanes

- `flutter_deps`: Install Flutter dependencies
- `flutter_test`: Run Flutter tests
- `build_debug`: Build debug version
- `build_release`: Build release version
- `sync_signing`: Sync code signing certificates
- `build_appstore`: Build for App Store
- `build_testflight`: Build for TestFlight
- `beta`: Upload to TestFlight
- `release`: Deploy to App Store
- `test_and_build`: Run tests and build debug
- `ci_pipeline`: Complete CI pipeline (test + TestFlight)
- `clean`: Clean build artifacts

## Troubleshooting

### Common Issues

1. **Code Signing Errors**:
   - Ensure your Apple ID has the correct permissions
   - Check that certificates are valid and not expired
   - Verify bundle identifier matches in all places

2. **App Store Connect API Errors**:
   - Verify API key is not expired
   - Check that the key has the correct permissions
   - Ensure team IDs are correct

3. **Flutter Build Errors**:
   - Run `flutter clean` and rebuild
   - Check iOS deployment target in Xcode
   - Ensure all Flutter dependencies are compatible

### Getting Help

- Check Fastlane documentation: https://docs.fastlane.tools/
- Flutter iOS deployment: https://flutter.dev/docs/deployment/ios
- Apple Developer Forums for code signing issues

## Security Notes

- Never commit API keys or certificates to version control
- Use environment variables for all sensitive data
- Rotate API keys regularly
- Use separate keys for different environments when possible
EOF

echo "✅ Created IOS_DISTRIBUTION_SETUP.md with detailed instructions"

# Check if we can run a basic Fastlane command
echo "🔍 Testing Fastlane setup..."
cd ios
if fastlane --version > /dev/null 2>&1; then
    echo "✅ Fastlane is working correctly"
else
    echo "❌ Fastlane setup issue detected"
fi

echo ""
echo "🎉 iOS Distribution setup complete!"
echo ""
echo "Next steps:"
echo "1. Follow IOS_DISTRIBUTION_SETUP.md for detailed configuration"
echo "2. Set up your environment variables in .env.ios"
echo "3. Configure App Store Connect API key"
echo "4. Test with: cd ios && fastlane test_and_build"
echo ""
echo "📚 Documentation: IOS_DISTRIBUTION_SETUP.md"
echo ""
# Detect ephemeral keychain helper (repo-root or local scripts folder)
HELPER_REPO_PATH="../../scripts/ephemeral_keychain_fastlane.sh"
HELPER_LOCAL_PATH="./scripts/ephemeral_keychain_fastlane.sh"
HELPER_PATH=""
if [ -f "$HELPER_REPO_PATH" ]; then
    HELPER_PATH="$HELPER_REPO_PATH"
elif [ -f "$HELPER_LOCAL_PATH" ]; then
    HELPER_PATH="$HELPER_LOCAL_PATH"
fi

if [ -n "$HELPER_PATH" ]; then
    echo "💡 Ephemeral keychain helper found: $HELPER_PATH"
    echo "Import a .p12 for a single run and upload to TestFlight (example):"
    echo "  CERT_P12_PATH=./certs/distribution.p12 CERT_P12_PASSWORD=yourP12Pass \\\n+    $HELPER_PATH \"bundle exec fastlane beta\""
    echo "Run a Fastlane lane without importing a cert (CI-style):"
    echo "  $HELPER_PATH \"fastlane sync_signing\""
else
    echo "💡 Ephemeral keychain helper not found (expected at ../../scripts/... or ./scripts/...)."
    echo "To avoid modifying your login keychain, create the helper at the repo root: scripts/ephemeral_keychain_fastlane.sh"
    echo "Example (from packages/mobile):"
    echo "  ../../scripts/ephemeral_keychain_fastlane.sh \"bundle exec fastlane beta\""
fi