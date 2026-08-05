# ZERO-TOUCH CI/CD Implementation

This document outlines the ZERO-TOUCH CI/CD automation implemented for the Wishlist Wizard monorepo.

## 🎯 Goals Achieved

- **Automated Secret Management**: Scripts and workflows for rotating secrets with minimal manual intervention
- **Security Automation**: Automated leak detection and secret rotation scheduling
- **CI/CD Validation**: Automated testing of build pipelines with rotated secrets
- **Environment Consistency**: Standardized Ruby versions, keychain management, and build processes

## 🔧 Components

### Secret Rotation System

#### `scripts/rotate_secrets.sh`
Main script for rotating secrets across all services:
```bash
# Rotate all secrets
./scripts/rotate_secrets.sh all

# Rotate specific service
./scripts/rotate_secrets.sh firebase
./scripts/rotate_secrets.sh github
./scripts/rotate_secrets.sh asc
```

**Services Supported:**
- **Firebase**: Automated rotation (requires gcloud CLI authentication)
- **GitHub**: Manual guidance (UI-based token rotation)
- **App Store Connect**: Semi-automated (manual key generation + automated update)

#### `scripts/update_asc_key.sh`
Helper script for updating ASC keys after manual rotation:
```bash
./scripts/update_asc_key.sh <key_id> <path_to_p8_file>
```

### CI/CD Workflows

#### `.github/workflows/scheduled-secret-rotation.yml`
- **Trigger**: Weekly (Monday 2 AM UTC) or manual
- **Runner**: `self-hosted` (Docker-based)
- **Purpose**: Automated secret rotation for programmable services
- **Services**: Firebase, GitHub (guidance), ASC (guidance)

#### `.github/workflows/cicd-validation.yml`
- **Trigger**: Manual
- **Runner**: `self-hosted` (Docker-based) for general jobs, `[self-hosted, macos-latest, wishlist-wizard]` for iOS
- **Purpose**: Validate CI/CD pipelines work with current secrets
- **Validates**: iOS build setup, Android build setup, security scans

#### `.github/workflows/security-scan.yml`
- **Trigger**: PRs, pushes, weekly schedule
- **Runner**: `self-hosted` (Docker-based)
- **Purpose**: Automated leak detection using gitleaks

### Infrastructure Improvements

#### Ruby Version Pinning
- **File**: `.ruby-version`
- **Version**: 3.2.2 (compatible with Fastlane)
- **Purpose**: Reproducible builds across environments

#### Keychain Management
- **Script**: `scripts/setup_keychain.sh`
- **Purpose**: Idempotent macOS keychain creation for CI codesign
- **Features**: Temporary keychains per CI run, automatic cleanup

## 🚀 Usage Guide

### Daily Operations

1. **Monitor Security**: Automatic gitleaks scans on all PRs/pushes
2. **Weekly Rotation**: Scheduled secret rotation runs automatically
3. **Manual Rotation**: Use rotation scripts when needed

### Secret Rotation Process

#### Firebase Service Account Keys
```bash
# Fully automated (requires gcloud auth)
./scripts/rotate_secrets.sh firebase
```

#### GitHub Personal Access Tokens
```bash
# Manual process with guidance
./scripts/rotate_secrets.sh github
# Follow the printed instructions
```

#### App Store Connect API Keys
```bash
# Step 1: Manual key generation in ASC UI
./scripts/rotate_secrets.sh asc

# Step 2: Automated update after getting new key
./scripts/update_asc_key.sh <new_key_id> <path_to_p8_file>
```

### CI/CD Validation

```bash
# Validate all pipelines
gh workflow run cicd-validation.yml -f environment=PRODUCTION

# Validate specific components
gh workflow run cicd-validation.yml \
  -f environment=STAGING \
  -f validate_ios=true \
  -f validate_android=false \
  -f validate_security=true
```

## 🔒 Security Features

- **Automated Leak Detection**: gitleaks scans all commits
- **Secret Rotation**: Regular automated rotation reduces exposure window
- **Environment Isolation**: Separate secrets per environment
- **Access Control**: GitHub secrets with scoped permissions

## 📊 Monitoring & Alerts

### Automated Checks
- Security scans on every PR/push
- Weekly secret rotation reports
- CI/CD pipeline validation

### Manual Monitoring
- Review rotation summaries in workflow artifacts
- Check GitHub Actions billing/limits
- Monitor CI runner availability

## 🔄 Future Enhancements

### High Priority
- [ ] GitHub App migration for automated token rotation
- [ ] ASC API integration (when available)
- [ ] Multi-environment secret synchronization

### Medium Priority
- [ ] Slack/Discord notifications for rotation events
- [ ] Secret expiration monitoring
- [ ] Automated rollback on rotation failures

### Low Priority
- [ ] Secret usage analytics
- [ ] Integration with external secret managers
- [ ] Advanced rotation scheduling (time-based, usage-based)

## 🛠️ Troubleshooting

### Common Issues

**"gcloud CLI not found"**
```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

**"gh CLI not authenticated"**
```bash
gh auth login
```

**"Ruby version mismatch"**
```bash
# Ensure .ruby-version is set to 3.2.2
ruby --version
```

**"Keychain creation failed"**
```bash
# Check macOS security permissions
security list-keychains
```

### Recovery Procedures

1. **Failed Rotation**: Check workflow logs, retry manually
2. **Secret Mismatch**: Use validation workflow to identify issues
3. **Build Failures**: Revert to previous secret versions if needed

## 📈 Metrics & KPIs

- **Secret Rotation Frequency**: Weekly automated + on-demand
- **Security Scan Coverage**: 100% of commits
- **CI/CD Uptime**: Target 99.9%
- **Manual Intervention Time**: < 5 minutes per rotation

## 🤝 Contributing

When adding new services or modifying rotation logic:

1. Update `scripts/rotate_secrets.sh` with new service function
2. Add corresponding workflow steps if needed
3. Update this documentation
4. Test with validation workflow
5. Ensure idempotent operations

---

**Status**: ✅ ZERO-TOUCH implementation complete for programmable services. Manual guidance provided for UI-based services. Ready for production use once billing issues are resolved.