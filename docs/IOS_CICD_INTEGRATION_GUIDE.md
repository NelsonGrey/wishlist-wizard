# iOS CI/CD Integration Guide

> **Automation Template**: Complete CI/CD setup for iOS projects with certificate management, testing, and distribution.

## 🎯 Overview

This guide provides reusable CI/CD configurations for iOS projects using Fastlane Match certificates. Supports GitHub Actions, GitLab CI, and other platforms.

## 🚀 GitHub Actions Setup

### Complete Workflow Template

```yaml
# .github/workflows/ios-distribution.yml
name: iOS Distribution

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  workflow_dispatch:
    inputs:
      build_type:
        description: 'Build type'
        required: true
        default: 'testflight'
        type: choice
        options: [testflight, appstore, debug]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.35.7' }
      - run: flutter pub get
      - run: flutter test

  build-and-distribute:
    needs: test
    runs-on: macos-latest  # Change to self-hosted for cost savings
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'development' }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with: { flutter-version: '3.35.7' }

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with: { ruby-version: '3.0' }

      - name: Install Fastlane
        run: gem install fastlane -v 2.228.0

      - name: Setup iOS environment
        run: |
          cd packages/mobile/ios
          # Create environment file from secrets
          cat > .env << EOF
          FASTLANE_APPLE_ID=${{ secrets.FASTLANE_APPLE_ID }}
          FASTLANE_TEAM_ID=${{ secrets.FASTLANE_TEAM_ID }}
          FASTLANE_ITC_TEAM_ID=${{ secrets.FASTLANE_ITC_TEAM_ID }}
          ASC_KEY_ID=${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID=${{ secrets.ASC_ISSUER_ID }}
          ASC_PRIVATE_KEY=${{ secrets.ASC_PRIVATE_KEY }}
          MATCH_GIT_URL=${{ secrets.MATCH_GIT_URL }}
          MATCH_PASSWORD=${{ secrets.MATCH_PASSWORD }}
          BETA_FEEDBACK_EMAIL=${{ secrets.BETA_FEEDBACK_EMAIL }}
          RELEASE_NOTES=Build ${{ github.run_number }} from ${{ github.ref_name }}
          EOF

      - name: Run Fastlane
        run: |
          cd packages/mobile/ios
          case "${{ github.event.inputs.build_type || 'testflight' }}" in
            "testflight")
              fastlane beta
              ;;
            "appstore")
              fastlane release
              ;;
            "debug")
              fastlane test_and_build
              ;;
          esac
```

### Required GitHub Secrets

Add these to **Repository Settings → Secrets and variables → Actions**:

```
# Apple Developer Account
FASTLANE_APPLE_ID          → your-apple-id@example.com
FASTLANE_TEAM_ID           → YOUR_TEAM_ID (10 characters)
FASTLANE_ITC_TEAM_ID       → YOUR_ITC_TEAM_ID

# App Store Connect API Key
ASC_KEY_ID                 → YOUR_KEY_ID (10 characters)
ASC_ISSUER_ID              → YOUR_ISSUER_ID (36 characters)
ASC_PRIVATE_KEY            → base64-encoded .p8 file content

# Certificate Repository
MATCH_GIT_URL              → https://oauth2:gho_TOKEN@github.com/user/repo.git
MATCH_PASSWORD             → your_match_password

# Distribution
BETA_FEEDBACK_EMAIL        → feedback@yourcompany.com
```

## 🏃‍♂️ Self-Hosted Runner Setup

### Cost Comparison
- **GitHub Hosted macOS**: ~$0.08/minute ($48/hour)
- **Self-Hosted macOS**: FREE (your hardware)

### Runner Labels Strategy
```yaml
runs-on: [self-hosted, macos-latest, ios, your-project-name]
```

### Runner Setup Script
```bash
#!/bin/bash
# setup-ios-runner.sh

# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Flutter
brew install flutter
flutter doctor

# Install Ruby (for Fastlane)
brew install ruby
echo 'export PATH="/usr/local/opt/ruby/bin:$PATH"' >> ~/.zshrc

# Install Fastlane
gem install fastlane -v 2.228.0

# Setup GitHub Runner (isolated directory)
mkdir -p ~/actions-runner-ios
cd ~/actions-runner-ios
# Download and configure runner...
```

## 🔄 GitLab CI Setup

### .gitlab-ci.yml Template
```yaml
stages:
  - test
  - build
  - deploy

variables:
  FLUTTER_VERSION: "3.35.7"
  FASTLANE_VERSION: "2.228.0"

# Test stage
flutter_test:
  stage: test
  tags: [macos, ios]
  script:
    - flutter pub get
    - flutter test

# Build stage
ios_build:
  stage: build
  tags: [macos, ios]
  script:
    - gem install fastlane -v $FASTLANE_VERSION
    - cd packages/mobile/ios
    - fastlane build_testflight
  artifacts:
    paths:
      - packages/mobile/build/ios/ipa/*.ipa
    expire_in: 1 week

# Deploy stage
ios_deploy:
  stage: deploy
  tags: [macos, ios]
  environment:
    name: production
  script:
    - gem install fastlane -v $FASTLANE_VERSION
    - cd packages/mobile/ios
    - fastlane beta
  only:
    - main
```

### GitLab CI Variables
Add these to **Settings → CI/CD → Variables**:

```
FASTLANE_APPLE_ID           → your-apple-id@example.com
FASTLANE_TEAM_ID            → YOUR_TEAM_ID
FASTLANE_ITC_TEAM_ID        → YOUR_ITC_TEAM_ID
ASC_KEY_ID                  → YOUR_KEY_ID
ASC_ISSUER_ID               → YOUR_ISSUER_ID
ASC_PRIVATE_KEY             → base64-encoded .p8 content
MATCH_GIT_URL               → https://oauth2:gho_TOKEN@github.com/user/repo.git
MATCH_PASSWORD              → your_match_password
BETA_FEEDBACK_EMAIL         → feedback@yourcompany.com
```

## 🔄 Jenkins Pipeline

### Jenkinsfile Template
```groovy
pipeline {
    agent { label 'macos-ios' }

    environment {
        FLUTTER_VERSION = '3.35.7'
        FASTLANE_VERSION = '2.228.0'
    }

    stages {
        stage('Setup') {
            steps {
                sh 'gem install fastlane -v $FASTLANE_VERSION'
                sh 'flutter pub get'
            }
        }

        stage('Test') {
            steps {
                sh 'flutter test'
            }
        }

        stage('Build') {
            steps {
                dir('packages/mobile/ios') {
                    sh 'fastlane build_testflight'
                }
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                dir('packages/mobile/ios') {
                    sh 'fastlane beta'
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'packages/mobile/build/ios/ipa/*.ipa', allowEmptyArchive: true
        }
    }
}
```

## 🔐 Security Best Practices

### Secret Management
- ✅ **Never commit secrets** to version control
- ✅ **Use platform secret managers** (GitHub Secrets, GitLab Variables)
- ✅ **Rotate tokens regularly** (GitHub PATs, API keys)
- ✅ **Limit secret access** to necessary jobs/branches

### Certificate Security
- 🔒 **Private certificate repository** with restricted access
- 🔑 **Read-only match access** for CI pipelines
- 📊 **Audit certificate usage** and access logs
- 🔄 **Regular certificate rotation** (annually or when compromised)

### Network Security
- 🌐 **Use HTTPS** for all repository URLs
- 🔐 **Enable 2FA** on all accounts (Apple, GitHub)
- 🚫 **No hardcoded credentials** in scripts or configs

## 📊 Monitoring & Alerts

### Build Status Badges
```markdown
![iOS Build](https://github.com/username/repo/workflows/iOS%20Distribution/badge.svg)
![TestFlight](https://img.shields.io/badge/TestFlight-Latest-blue)
```

### Notification Setup
```yaml
# Slack notifications
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  if: always()
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Health Checks
- Monitor certificate expiration
- Track build success rates
- Alert on failed deployments
- Regular security audits

## 🔧 Troubleshooting CI/CD

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `fastlane not found` | Add `gem install fastlane` to setup |
| `certificate not found` | Check MATCH_GIT_URL and token permissions |
| `provisioning profile expired` | Run `fastlane match appstore --force` |
| `build timeout` | Increase job timeout in workflow |
| `storage quota exceeded` | Clean up old artifacts and caches |

### Debug Mode
```yaml
# Add to workflow for debugging
- name: Debug
  run: |
    env | grep -E "(FASTLANE|ASC|MATCH)" | sort
    fastlane --version
    flutter --version
```

## 📈 Performance Optimization

### Caching Strategies
```yaml
- name: Cache Flutter dependencies
  uses: actions/cache@v3
  with:
    path: |
      ~/.pub-cache
      packages/mobile/.flutter-plugins-dependencies
    key: flutter-${{ runner.os }}-${{ hashFiles('packages/mobile/pubspec.lock') }}

- name: Cache Ruby gems
  uses: actions/cache@v3
  with:
    path: ~/.gem
    key: ruby-${{ runner.os }}-${{ hashFiles('**/Gemfile.lock') }}
```

### Parallel Jobs
```yaml
jobs:
  test:
    runs-on: macos-latest
    steps: [/* test steps */]

  lint:
    runs-on: ubuntu-latest
    steps: [/* lint steps */]

  build:
    needs: [test, lint]
    runs-on: macos-latest
    steps: [/* build steps */]
```

## 🎯 Success Metrics

- ✅ **Build time**: < 15 minutes
- ✅ **Success rate**: > 95%
- ✅ **Certificate validity**: > 30 days remaining
- ✅ **Deployment frequency**: Multiple times per week
- ✅ **Time to distribute**: < 30 minutes

---

**📖 Related Documentation:**
- [iOS Certificate Setup Guide](./IOS_CERTIFICATE_SETUP_GUIDE.md)
- [macOS Runner Setup Guide](./MACOS_RUNNER_SETUP.md)</content>
<parameter name="filePath">/Users/marknelson/Circus/Repositories/wishlist-wizard/docs/IOS_CICD_INTEGRATION_GUIDE.md