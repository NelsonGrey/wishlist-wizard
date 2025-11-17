# iOS Certificate Repository Setup Guide

> **Reusable Template**: Complete setup guide for iOS code signing certificates using Fastlane Match. Use this for any new iOS project.

## 🎯 Overview

This guide provides a complete, reusable setup for iOS code signing certificates using Fastlane Match with a separate GitHub repository. This approach ensures security, automation, and scalability for iOS development.

## 📋 Prerequisites

### Required Accounts & Tools
- ✅ **Apple Developer Program** ($99/year) - [developer.apple.com](https://developer.apple.com)
- ✅ **App Store Connect** access (Admin/App Manager role)
- ✅ **GitHub Account** with private repository access
- ✅ **Fastlane** installed (`gem install fastlane`)
- ✅ **Flutter** SDK (for Flutter projects)
- ✅ **Xcode** Command Line Tools

### Hardware Requirements
- macOS 11.0+ (Big Sur or later)
- Intel or Apple Silicon (M1/M2/M3 supported)
- 8GB RAM minimum, 16GB recommended

## 🚀 Step-by-Step Setup

### Step 1: Create Certificate Repository

1. **Create Private GitHub Repository**
   ```bash
   # Repository naming convention: {project-name}-certificates
   # Example: my-awesome-app-certificates
   ```

2. **Generate GitHub Personal Access Token**
   - Go to: [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
   - Create token with `repo` scope
   - **Save the token securely** - you'll need it for CI/CD

3. **Set Repository URL**
   ```bash
   # Format: https://oauth2:{token}@github.com/{username}/{repo-name}.git
   CERT_REPO_URL="https://oauth2:gho_YOUR_TOKEN_HERE@github.com/yourusername/your-app-certificates.git"
   ```

### Step 2: Initialize Fastlane Match

1. **Navigate to iOS Fastlane Directory**
   ```bash
   cd your-project/packages/mobile/ios
   mkdir -p fastlane
   cd fastlane
   ```

2. **Create Matchfile**
   ```ruby
   # Matchfile - Code signing configuration
   git_url(ENV["MATCH_GIT_URL"])
   git_branch("main")  # or "develop" to match your main repo
   storage_mode("git")
   type("appstore")  # development, adhoc, appstore, enterprise
   username(ENV["FASTLANE_APPLE_ID"])
   team_id(ENV["FASTLANE_TEAM_ID"])
   ```

3. **Create Appfile**
   ```ruby
   # Appfile - App-specific configuration
   app_identifier("com.yourcompany.yourapp")
   apple_id(ENV["FASTLANE_APPLE_ID"])
   team_id(ENV["FASTLANE_TEAM_ID"])
   itc_team_id(ENV["FASTLANE_ITC_TEAM_ID"])
   ```

### Step 3: Generate App Store Connect API Key

1. **Access App Store Connect**
   - Go to: [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Navigate: Users and Access → Keys → App Store Connect API

2. **Create API Key**
   - Click "+" to create new key
   - Choose "Admin" role
   - Name: "Your App CI" (e.g., "MyApp CI")
   - Download the `.p8` file

3. **Extract Key Details**
   - **Key ID**: From the downloaded key name
   - **Issuer ID**: From the API Keys page
   - **Private Key**: Contents of `.p8` file (base64 encode for CI/CD)

### Step 4: Configure Environment Variables

Create a `.env` file in your iOS fastlane directory:

```bash
# Apple Developer Account
FASTLANE_APPLE_ID=your-apple-id@example.com
FASTLANE_TEAM_ID=YOUR_TEAM_ID
FASTLANE_ITC_TEAM_ID=YOUR_ITC_TEAM_ID

# App Store Connect API Key
ASC_KEY_ID=YOUR_KEY_ID
ASC_ISSUER_ID=YOUR_ISSUER_ID
ASC_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----

# Match Configuration
MATCH_GIT_URL=https://oauth2:gho_YOUR_TOKEN@github.com/yourusername/your-app-certificates.git
MATCH_PASSWORD=your_match_password

# TestFlight Configuration
BETA_FEEDBACK_EMAIL=feedback@yourcompany.com
```

### Step 5: Initialize Certificates

1. **Run Match Init**
   ```bash
   cd your-project/packages/mobile/ios
   fastlane match init
   # Select "git" when prompted
   # Enter your certificate repository URL
   ```

2. **Generate Development Certificate**
   ```bash
   fastlane match development
   # This creates and stores your development certificate
   ```

3. **Generate Distribution Certificate**
   ```bash
   fastlane match appstore
   # This creates distribution certificate and provisioning profiles
   ```

### Step 6: Create Fastlane Lanes

Create `Fastfile` with your build lanes:

```ruby
# Fastfile - Build lanes
default_platform(:ios)

platform :ios do
  before_all do
    setup_ci if ENV['CI']
  end

  desc "Sync code signing certificates"
  lane :sync_signing do
    match(
      type: "appstore",
      readonly: true,
      api_key_path: nil
    )
  end

  desc "Build and sign for TestFlight"
  lane :build_testflight do
    sync_signing

    # For Flutter projects
    Dir.chdir("../../") do
      sh("flutter build ipa --release")
    end

    # For native iOS projects
    # build_app(
    #   scheme: "Runner",
    #   configuration: "Release",
    #   export_method: "app-store"
    # )
  end

  desc "Upload to TestFlight"
  lane :beta do
    app_store_connect_api_key(
      key_id: ENV["ASC_KEY_ID"],
      issuer_id: ENV["ASC_ISSUER_ID"],
      key_content: ENV["ASC_PRIVATE_KEY"],
      is_key_content_base64: true
    )

    build_testflight

    upload_to_testflight(
      ipa: "../build/ios/ipa/Your App.ipa",
      skip_waiting_for_build_processing: true
    )
  end
end
```

## 🔐 CI/CD Integration

### GitHub Actions Setup

1. **Add Secrets to Repository**
   - Go to: Repository Settings → Secrets and variables → Actions
   - Add these secrets:
     ```
     FASTLANE_APPLE_ID
     FASTLANE_TEAM_ID
     FASTLANE_ITC_TEAM_ID
     ASC_KEY_ID
     ASC_ISSUER_ID
     ASC_PRIVATE_KEY
     MATCH_GIT_URL
     MATCH_PASSWORD
     BETA_FEEDBACK_EMAIL
     ```

2. **Create iOS Workflow** (`.github/workflows/ios-distribution.yml`)
   ```yaml
   name: iOS Distribution
   on:
     push:
       branches: [ main, develop ]
     workflow_dispatch:

   jobs:
     distribute-ios:
       runs-on: macos-latest  # or self-hosted
       steps:
         - uses: actions/checkout@v4
         - uses: subosito/flutter-action@v2
           with:
             flutter-version: '3.35.7'
         - run: gem install fastlane -v 2.228.0
         - run: flutter pub get
         - run: |
             cd packages/mobile/ios
             fastlane beta
   ```

### Self-Hosted Runner (Cost Optimization)

For cost savings, use a self-hosted macOS runner:

```yaml
runs-on: [self-hosted, macos-latest, your-label]
```

See the macOS Runner Setup Guide for complete instructions.

## 🔧 Maintenance & Troubleshooting

### Certificate Rotation

```bash
# Rotate distribution certificate
fastlane match appstore --force

# Rotate all certificates
fastlane match nuke distribution  # ⚠️  Removes all certificates
fastlane match appstore           # Recreate certificates
```

### Common Issues

**"undefined method `app_name'"**
- Remove `app_name()` from Appfile (deprecated in newer Fastlane)

**"Neither MATCH_PASSWORD nor keychain"**
- Add `MATCH_PASSWORD` to your environment variables

**"Repository not found"**
- Check MATCH_GIT_URL format and token permissions

**"Certificate not found"**
- Run `fastlane match appstore` to regenerate certificates

### Security Best Practices

- 🔒 **Private Repository**: Keep certificates repo private
- 🔑 **Token Rotation**: Rotate GitHub tokens regularly
- 👥 **Access Control**: Limit who can access certificate repository
- 🔐 **Environment Variables**: Never commit secrets to code
- 📊 **Audit Logs**: Monitor certificate access and changes

## 📋 Checklist

- [ ] Apple Developer Program membership
- [ ] App Store Connect API key created
- [ ] Private GitHub certificates repository created
- [ ] GitHub Personal Access Token generated
- [ ] Fastlane Match initialized
- [ ] Certificates generated (development & distribution)
- [ ] Environment variables configured
- [ ] Fastlane lanes created
- [ ] CI/CD secrets added
- [ ] GitHub Actions workflow created
- [ ] Test build completed successfully

## 🎉 Next Steps

1. **Test Locally**: Run `fastlane beta` to verify setup
2. **Push to CI**: Commit changes and trigger workflow
3. **Monitor Builds**: Check GitHub Actions for successful builds
4. **Distribute**: Submit to TestFlight and App Store when ready

---

**📖 Related Documentation:**
- [macOS Runner Setup Guide](./MACOS_RUNNER_SETUP.md)
- [CI/CD Pipeline Guide](./CICD_SETUP_GUIDE.md)
- [Fastlane Documentation](https://docs.fastlane.tools)</content>
<parameter name="filePath">/Users/marknelson/Circus/Repositories/wishlist-wizard/docs/IOS_CERTIFICATE_SETUP_GUIDE.md