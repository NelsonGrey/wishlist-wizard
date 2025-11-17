# iOS Certificate Setup - Quick Reference

> **Cheatsheet**: Fast setup commands and essential configurations for new iOS projects.

## 🚀 Quick Setup Commands

### 1. Create Certificate Repository
```bash
# Create private GitHub repo: {project-name}-certificates
# Generate PAT with 'repo' scope
CERT_REPO_URL="https://oauth2:gho_YOUR_TOKEN@github.com/username/project-certificates.git"
```

### 2. Initialize Fastlane (in project/packages/mobile/ios/)
```bash
mkdir -p fastlane
cd fastlane

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
app_identifier("com.company.appname")
apple_id(ENV["FASTLANE_APPLE_ID"])
team_id(ENV["FASTLANE_TEAM_ID"])
itc_team_id(ENV["FASTLANE_ITC_TEAM_ID"])
EOF
```

### 3. Environment Variables (.env file)
```bash
# Apple Account
FASTLANE_APPLE_ID=your-email@example.com
FASTLANE_TEAM_ID=YOUR_TEAM_ID
FASTLANE_ITC_TEAM_ID=YOUR_ITC_TEAM_ID

# App Store Connect API
ASC_KEY_ID=YOUR_KEY_ID
ASC_ISSUER_ID=YOUR_ISSUER_ID
ASC_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----

# Certificates
MATCH_GIT_URL=https://oauth2:gho_TOKEN@github.com/username/project-certificates.git
MATCH_PASSWORD=your_password

# TestFlight
BETA_FEEDBACK_EMAIL=feedback@company.com
```

### 4. Generate Certificates
```bash
cd packages/mobile/ios

# Initialize match
fastlane match init

# Generate development cert
fastlane match development

# Generate distribution cert & profiles
fastlane match appstore
```

### 5. Create Fastfile
```ruby
# Fastfile
default_platform(:ios)

platform :ios do
  desc "Sync certificates"
  lane :sync_signing do
    match(type: "appstore", readonly: true, api_key_path: nil)
  end

  desc "Build TestFlight"
  lane :build_testflight do
    sync_signing
    Dir.chdir("../../") do
      sh("flutter build ipa --release")
    end
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
    upload_to_testflight(ipa: "../build/ios/ipa/App.ipa")
  end
end
```

## 🔐 GitHub Secrets (Repository Settings → Secrets)

```
FASTLANE_APPLE_ID          → your-apple-id@example.com
FASTLANE_TEAM_ID           → YOUR_TEAM_ID
FASTLANE_ITC_TEAM_ID       → YOUR_ITC_TEAM_ID
ASC_KEY_ID                 → YOUR_KEY_ID
ASC_ISSUER_ID              → YOUR_ISSUER_ID
ASC_PRIVATE_KEY            → base64-encoded .p8 content
MATCH_GIT_URL              → https://oauth2:gho_TOKEN@github.com/user/repo.git
MATCH_PASSWORD             → your_match_password
BETA_FEEDBACK_EMAIL        → feedback@company.com
```

## 📋 GitHub Actions Workflow (.github/workflows/ios.yml)

```yaml
name: iOS Distribution
on: [push, workflow_dispatch]

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.35.7' }
      - run: gem install fastlane -v 2.228.0
      - run: flutter pub get
      - run: cd packages/mobile/ios && fastlane beta
```

## 🔧 Troubleshooting Quick Fixes

| Error | Solution |
|-------|----------|
| `app_name` undefined | Remove `app_name()` from Appfile |
| No MATCH_PASSWORD | Add `MATCH_PASSWORD` to env vars |
| Repo not found | Check MATCH_GIT_URL format & token |
| Certificate expired | `fastlane match appstore --force` |
| Keychain locked | Add MATCH_PASSWORD to CI secrets |

## 📝 Project-Specific Variables to Change

For each new project, update these values:

- **Repository names**: `project-certificates`
- **App identifier**: `com.company.appname`
- **Team IDs**: From Apple Developer account
- **API keys**: Generate new App Store Connect key
- **GitHub token**: Create new PAT for certificates repo
- **Email addresses**: Update feedback and contact emails

## ✅ Verification Steps

- [ ] `fastlane match appstore` runs without errors
- [ ] `fastlane beta` builds and uploads to TestFlight
- [ ] GitHub Actions workflow completes successfully
- [ ] TestFlight build appears in App Store Connect

## 🎯 Cost Optimization

**Use self-hosted runners** for significant savings:
- GitHub hosted: ~$0.08/minute
- Self-hosted: FREE (your hardware)

See [macOS Runner Setup](./MACOS_RUNNER_SETUP.md) for details.

---

**📖 Full Guide**: [iOS Certificate Setup Guide](./IOS_CERTIFICATE_SETUP_GUIDE.md)</content>
<parameter name="filePath">/Users/marknelson/Circus/Repositories/wishlist-wizard/docs/IOS_CERTIFICATE_QUICK_REFERENCE.md