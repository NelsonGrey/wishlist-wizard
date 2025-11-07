# macOS Self-Hosted Runner Setup Guide

This guide covers setting up macOS self-hosted runners for the Wishlist Wizard project to enable cost-effective iOS builds.

## 🎯 Overview

Self-hosted macOS runners allow you to run iOS builds without incurring GitHub's expensive hosted macOS runner costs (~$0.08/minute). This can save ~90% on CI/CD costs for iOS workflows.

## 📋 Prerequisites

### Hardware Requirements
- **macOS 11.0+** (Big Sur or later)
- **Intel or Apple Silicon** (M1/M2/M3 chips supported)
- **8GB RAM minimum** (16GB recommended)
- **50GB free disk space**
- **Stable internet connection**

### Software Requirements
- **Xcode Command Line Tools**
- **Homebrew** (package manager)
- **Flutter** (for mobile builds)
- **Ruby** (for Fastlane)
- **Git**

## 🚀 Quick Setup

### 1. Run the Setup Script

```bash
# Clone the repository (if not already done)
git clone https://github.com/mnelson3/wishlist-wizard.git
cd wishlist-wizard

# Run the macOS runner setup script
./scripts/setup-macos-runner.sh
```

The script will:
- ✅ Check macOS version compatibility
- 📦 Install Xcode Command Line Tools
- 🍺 Install Homebrew and required packages
- 📱 Optionally install Flutter and Ruby
- 🤖 Download and extract GitHub Actions runner

### 2. Configure the Runner

```bash
# Get a runner token from GitHub
# Visit: https://github.com/mnelson3/wishlist-wizard/settings/actions/runners
# Click "New self-hosted runner" and copy the token

# Configure the runner
cd /Users/github-runner/actions-runner  # or your runner directory
./config.sh \
  --url https://github.com/mnelson3/wishlist-wizard \
  --token YOUR_TOKEN_HERE \
  --labels "self-hosted,macos-latest,macos-arm64,wishlist-wizard" \
  --name "wishlist-wizard-macos-runner-$(hostname)"
```

### 3. Start the Runner

```bash
# Start the runner
./run.sh
```

For production use, install as a service:

```bash
# Install as launchd service
./svc.sh install
./svc.sh start
```

## 🛠️ Management

Use the management script for common operations:

```bash
# Check status
./scripts/manage-macos-runner.sh status

# Start runner
./scripts/manage-macos-runner.sh start

# Stop runner
./scripts/manage-macos-runner.sh stop

# View logs
./scripts/manage-macos-runner.sh logs

# Update runner
./scripts/manage-macos-runner.sh update
```

## 🔧 Advanced Configuration

### Environment Variables

Set these in your shell profile (`~/.zshrc`):

```bash
# Custom runner configuration
export RUNNER_USER="github-runner"           # Runner user account
export RUNNER_DIR="/Users/$RUNNER_USER/actions-runner"  # Runner directory
export REPO_URL="https://github.com/mnelson3/wishlist-wizard"  # Repository URL
```

### Runner Labels

The runner is configured with these labels:
- `self-hosted` - Identifies as self-hosted
- `macos-latest` - macOS environment
- `macos-x64` or `macos-arm64` - Architecture specific
- `wishlist-wizard` - Project specific

### Security Considerations

- **Dedicated User**: Run as non-admin user (`github-runner`)
- **Firewall**: Configure firewall rules for necessary ports
- **Updates**: Keep macOS and Xcode updated
- **Secrets**: Never store secrets in runner environment

## 📊 Monitoring

### Runner Status

```bash
# Quick status check
./scripts/manage-macos-runner.sh status

# View recent logs
tail -f /Users/github-runner/actions-runner/runner.log

# Check system resources
top -l 1 | head -10
```

### GitHub Repository

Monitor runner status in:
`https://github.com/mnelson3/wishlist-wizard/settings/actions/runners`

## 🐛 Troubleshooting

### Common Issues

1. **Runner won't start**
   ```bash
   # Check logs
   cat /Users/github-runner/actions-runner/runner.log

   # Reconfigure
   ./scripts/manage-macos-runner.sh unconfigure
   ./scripts/manage-macos-runner.sh configure
   ```

2. **User creation fails with password error**
   ```bash
   # This happens when macOS password policies reject empty passwords
   # The setup script automatically uses a secure dummy password
   # If you encounter issues, the user is created with password: RunnerPass123!
   ```

3. **Xcode issues**
   ```bash
   # Accept Xcode license
   sudo xcodebuild -license accept

   # Select Xcode version
   sudo xcode-select -s /Applications/Xcode.app
   ```

4. **Permission issues**
   ```bash
   # Fix permissions
   sudo chown -R github-runner:admin /Users/github-runner/actions-runner
   ```

5. **Flutter issues**
   ```bash
   # Run doctor
   flutter doctor

   # Accept licenses
   flutter doctor --android-licenses
   ```

### Logs and Diagnostics

```bash
# Runner diagnostic logs
ls -la /Users/github-runner/actions-runner/_diag/

# System logs
log show --predicate 'process == "Runner.Listener"' --last 1h
```

## 🔄 Updates

Keep the runner updated:

```bash
# Update runner software
./scripts/manage-macos-runner.sh update

# Update system packages
brew update && brew upgrade

# Update Flutter
flutter upgrade
```

## 💰 Cost Analysis

### Before (GitHub-hosted)
- iOS builds: ~$0.08/minute
- Typical build: 15-30 minutes
- Cost per build: $1.20 - $2.40

### After (Self-hosted)
- Hardware cost: ~$1000-2000 one-time
- Maintenance: Minimal
- Electricity: ~$5-10/month
- **Savings: ~90%**

## 📚 Additional Resources

- [GitHub Actions Self-hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Flutter macOS Setup](https://flutter.dev/docs/get-started/install/macos)
- [Fastlane iOS Deployment](https://docs.fastlane.tools/getting-started/ios/setup/)
- [Xcode Command Line Tools](https://developer.apple.com/download/more/)

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review runner logs
3. Check GitHub Actions runner documentation
4. Create an issue in the repository

---

**Last Updated**: November 7, 2025
**macOS Version**: 11.0+
**Runner Version**: 2.311.0