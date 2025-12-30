# iOS Project Template

> **Project Starter**: Complete template for new iOS projects with certificate management and CI/CD.

## 📁 Project Structure

```
your-new-ios-project/
├── .github/
│   └── workflows/
│       ├── ios-distribution.yml     # Main CI/CD workflow
│       └── test.yml                 # Testing workflow
├── packages/
│   └── mobile/
│       ├── ios/
│       │   ├── fastlane/
│       │   │   ├── Appfile          # App configuration
│       │   │   ├── Fastfile         # Build lanes
│       │   │   ├── Matchfile        # Certificate config
│       │   │   └── README.md        # Fastlane docs
│       │   └── .env.example         # Environment template
│       ├── lib/                     # Flutter/Dart code
│       ├── pubspec.yaml             # Flutter dependencies
│       └── README.md
├── docs/
│   ├── IOS_CERTIFICATE_SETUP_GUIDE.md
│   ├── IOS_CERTIFICATE_QUICK_REFERENCE.md
│   └── IOS_CICD_INTEGRATION_GUIDE.md
├── scripts/
│   └── setup-ios-project.sh         # Project setup script
└── README.md
```

## 🚀 Quick Start Script

Create `scripts/setup-ios-project.sh`:

```bash
#!/bin/bash
# iOS Project Setup Script
# Run this to initialize a new iOS project with certificates and CI/CD

set -e

echo "🚀 Setting up iOS project: $PROJECT_NAME"
echo "========================================"

# Configuration
read -p "Enter project name (e.g., my-awesome-app): " PROJECT_NAME
read -p "Enter app identifier (e.g., com.company.appname): " APP_IDENTIFIER
read -p "Enter your Apple ID email: " APPLE_ID
read -p "Enter your team ID: " TEAM_ID
read -p "Enter your ITC team ID: " ITC_TEAM_ID

# Create certificate repository
echo "📝 Creating certificate repository..."
echo "1. Go to GitHub and create a private repository: $PROJECT_NAME-certificates"
echo "2. Generate a Personal Access Token with 'repo' scope"
read -p "Enter your GitHub token: " GITHUB_TOKEN
read -p "Enter your GitHub username: " GITHUB_USER

CERT_REPO_URL="https://oauth2:$GITHUB_TOKEN@github.com/$GITHUB_USER/$PROJECT_NAME-certificates.git"

# Setup Fastlane
echo "🔧 Setting up Fastlane..."
mkdir -p packages/mobile/ios/fastlane
cd packages/mobile/ios/fastlane

# Create Matchfile
cat > Matchfile << EOF
git_url(ENV["MATCH_GIT_URL"])
git_branch("main")
storage_mode("git")
type("appstore")
username(ENV["FASTLANE_APPLE_ID"])
team_id(ENV["FASTLANE_TEAM_ID"])
EOF

# Create Appfile
cat > Appfile << EOF
app_identifier("$APP_IDENTIFIER")
apple_id(ENV["FASTLANE_APPLE_ID"])
team_id(ENV["FASTLANE_TEAM_ID"])
itc_team_id(ENV["FASTLANE_ITC_TEAM_ID"])
EOF

# Create environment template
cat > ../.env.example << EOF
# Apple Developer Account
FASTLANE_APPLE_ID=$APPLE_ID
FASTLANE_TEAM_ID=$TEAM_ID
FASTLANE_ITC_TEAM_ID=$ITC_TEAM_ID

# App Store Connect API Key (generate from App Store Connect)
ASC_KEY_ID=your-key-id
ASC_ISSUER_ID=your-issuer-id
ASC_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----

# Match Configuration
MATCH_GIT_URL=$CERT_REPO_URL

# TestFlight Configuration
BETA_FEEDBACK_EMAIL=feedback@yourcompany.com
EOF

# Create Fastfile
cat > Fastfile << EOF
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

  desc "Build Flutter iOS app"
  lane :build_flutter do
    Dir.chdir("../../") do
      sh("flutter build ipa --release")
    end
  end

  desc "Build and sign for TestFlight"
  lane :build_testflight do
    sync_signing
    build_flutter
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
      ipa: "../build/ios/ipa/$PROJECT_NAME.ipa",
      skip_waiting_for_build_processing: true,
      beta_app_description: "Beta build for $PROJECT_NAME",
      beta_app_feedback_email: ENV["BETA_FEEDBACK_EMAIL"],
      changelog: ENV["RELEASE_NOTES"] || "Bug fixes and improvements"
    )
  end

  desc "Run tests and build debug version"
  lane :test_and_build do
    Dir.chdir("../../") do
      sh("flutter test")
      sh("flutter build ios --debug --no-codesign")
    end
  end

  desc "Clean build artifacts"
  lane :clean do
    Dir.chdir("../../") do
      sh("flutter clean")
      sh("rm -rf build/")
    end
  end
end
EOF

echo "✅ Fastlane setup complete!"

# Setup GitHub Actions
echo "🔄 Setting up GitHub Actions..."
mkdir -p ../../.github/workflows

cat > ../../.github/workflows/ios-distribution.yml << EOF
name: iOS Distribution

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  workflow_dispatch:
    inputs:
      build_type:
        description: 'Build type to distribute'
        required: true
        default: 'debug'
        type: choice
        options:
        - debug
        - release

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.35.7'
      - run: flutter pub get
      - run: flutter test

  build-and-distribute:
    needs: test
    runs-on: macos-latest
    environment:
      name: \${{ github.ref == 'refs/heads/main' && 'PRODUCTION' || 'DEVELOPMENT' }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.35.7'

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.0'

      - name: Install Fastlane
        run: gem install fastlane -v 2.228.0

      - name: Setup iOS environment
        run: |
          cd packages/mobile/ios
          cat > .env << EOF
          FASTLANE_APPLE_ID=\${{ secrets.FASTLANE_APPLE_ID }}
          FASTLANE_TEAM_ID=\${{ secrets.FASTLANE_TEAM_ID }}
          FASTLANE_ITC_TEAM_ID=\${{ secrets.FASTLANE_ITC_TEAM_ID }}
          ASC_KEY_ID=\${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID=\${{ secrets.ASC_ISSUER_ID }}
          ASC_PRIVATE_KEY=\${{ secrets.ASC_PRIVATE_KEY }}
          MATCH_GIT_URL=\${{ secrets.MATCH_GIT_URL }}
          MATCH_PASSWORD=\${{ secrets.MATCH_PASSWORD }}
          BETA_FEEDBACK_EMAIL=\${{ secrets.BETA_FEEDBACK_EMAIL }}
          RELEASE_NOTES=Build \${{ github.run_number }} from \${{ github.ref_name }}
          EOF

      - name: Build and distribute
        run: |
          cd packages/mobile/ios
          if [[ "\${{ github.event.inputs.build_type || 'debug' }}" == "release" ]] || [[ "\${{ github.ref }}" == "refs/heads/main" ]]; then
            fastlane beta
          else
            fastlane test_and_build
          fi
EOF

echo "✅ GitHub Actions setup complete!"

# Create documentation
echo "📚 Creating documentation..."
mkdir -p ../../docs

cat > ../../docs/PROJECT_SETUP.md << EOF
# $PROJECT_NAME - iOS Project Setup

## 🚀 Quick Start

1. **Setup certificates**:
   \`\`\`bash
   cd packages/mobile/ios
   cp .env.example .env
   # Edit .env with your actual values
   fastlane match init
   fastlane match development
   fastlane match appstore
   \`\`\`

2. **Test locally**:
   \`\`\`bash
   fastlane test_and_build
   \`\`\`

3. **Configure GitHub Secrets**:
   - Add all variables from .env.example to Repository Secrets

4. **Push and build**:
   \`\`\`bash
   git add .
   git commit -m "Initial iOS project setup"
   git push origin main
   \`\`\`

## 🔐 Required Secrets

Add these to GitHub Repository Settings → Secrets:

\`\`\`
FASTLANE_APPLE_ID
FASTLANE_TEAM_ID
FASTLANE_ITC_TEAM_ID
ASC_KEY_ID
ASC_ISSUER_ID
ASC_PRIVATE_KEY
MATCH_GIT_URL
MATCH_PASSWORD
BETA_FEEDBACK_EMAIL
\`\`\`

## 📋 Next Steps

1. Generate App Store Connect API key
2. Setup certificate repository: $PROJECT_NAME-certificates
3. Configure code signing
4. Test the CI/CD pipeline
5. Setup TestFlight external testing

## 📖 Documentation

- [iOS Certificate Setup Guide](./IOS_CERTIFICATE_SETUP_GUIDE.md)
- [iOS CI/CD Integration Guide](./IOS_CICD_INTEGRATION_GUIDE.md)
- [iOS Certificate Quick Reference](./IOS_CERTIFICATE_QUICK_REFERENCE.md)
EOF

echo ""
echo "🎉 Project setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Create private GitHub repo: $PROJECT_NAME-certificates"
echo "2. Generate App Store Connect API key"
echo "3. Copy .env.example to .env and fill in values"
echo "4. Run: fastlane match init"
echo "5. Add GitHub secrets from the documentation"
echo ""
echo "📖 See docs/PROJECT_SETUP.md for detailed instructions"
```

## 📋 Required GitHub Secrets

Add these secrets to **Repository Settings → Secrets and variables → Actions**:

```
FASTLANE_APPLE_ID          → your-apple-id@example.com
FASTLANE_TEAM_ID           → YOUR_TEAM_ID
FASTLANE_ITC_TEAM_ID       → YOUR_ITC_TEAM_ID
ASC_KEY_ID                 → YOUR_KEY_ID
ASC_ISSUER_ID              → YOUR_ISSUER_ID
ASC_PRIVATE_KEY            → base64-encoded .p8 content
MATCH_GIT_URL              → https://oauth2:gho_TOKEN@github.com/user/repo.git
MATCH_PASSWORD             → your_match_password
BETA_FEEDBACK_EMAIL        → feedback@yourcompany.com
```

## 🔧 Customization Checklist

For each new project, update these files:

### Fastlane/Appfile
- `app_identifier("com.yourcompany.yourapp")`

### Fastlane/Fastfile
- App name in build paths
- Scheme names (if using native iOS)
- TestFlight configuration

### GitHub Workflows
- Flutter version (check compatibility)
- Ruby version
- macOS runner version
- Environment names

### Documentation
- Update README with project-specific info
- Update contact emails
- Update app store descriptions

## 🚀 Deployment Pipeline

### Development Workflow
1. Push to `develop` branch
2. Runs tests and debug build
3. No distribution (internal testing only)

### Production Workflow
1. Merge to `main` branch
2. Runs full test suite
3. Builds release version
4. Uploads to TestFlight
5. Notifies team via Slack/email

### Manual Deployment
1. Go to GitHub Actions
2. Select "iOS Distribution" workflow
3. Choose "release" build type
4. Click "Run workflow"

## 📊 Monitoring & Maintenance

### Regular Tasks
- **Monthly**: Check certificate expiration dates
- **Weekly**: Review build success rates
- **Daily**: Monitor CI/CD pipeline status

### Certificate Management
```bash
# Check certificate status
fastlane match appstore

# Rotate certificates (if expired)
fastlane match nuke appstore  # ⚠️ Removes all certificates
fastlane match appstore       # Recreate certificates
```

### Performance Optimization
- Use self-hosted runners for cost savings
- Implement caching for dependencies
- Parallelize test execution
- Monitor build times and optimize bottlenecks

## 🎯 Success Criteria

✅ **Setup complete** when:
- [ ] Local build succeeds: `fastlane test_and_build`
- [ ] CI/CD pipeline passes on all branches
- [ ] TestFlight builds are generated automatically
- [ ] Certificates are properly synced
- [ ] Team can trigger manual releases

---

**📖 Related Templates:**
- [iOS Certificate Setup Guide](./IOS_CERTIFICATE_SETUP_GUIDE.md)
- [iOS CI/CD Integration Guide](./IOS_CICD_INTEGRATION_GUIDE.md)
- [iOS Certificate Quick Reference](./IOS_CERTIFICATE_QUICK_REFERENCE.md)</content>
<parameter name="filePath">/Users/marknelson/Circus/Repositories/wishlist-wizard/docs/IOS_PROJECT_TEMPLATE.md