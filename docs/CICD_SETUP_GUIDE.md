# CI/CD Setup for Multiple Repositories

This repository contains a complete self-hosted CI/CD infrastructure that can be applied to other repositories for cost-effective continuous integration and deployment.

## 🎯 Overview

The setup includes:
- **Self-hosted GitHub Actions runners** (macOS + Linux Docker)
- **Automated workflows** for CI/CD, testing, and deployment
- **Cost monitoring** and infrastructure management
- **Documentation** and setup guides

**Cost Savings**: ~90% reduction compared to GitHub-hosted runners

## 🚀 Quick Apply to Other Repositories

### Option 1: Automated Script (Recommended)

```bash
# Clone this repository
git clone https://github.com/mnelson3/wishlist-wizard.git
cd wishlist-wizard

# Run the setup script for your target repository
./apply-cicd-setup.sh https://github.com/mnelson3/modulo-squares
./apply-cicd-setup.sh https://github.com/mnelson3/vehicle-vitals
```

The script will:
- Clone the target repository
- Copy all CI/CD files with repository-specific customizations
- Create setup documentation
- Stage and commit the changes

### Option 2: Manual Copy

If you prefer manual control:

```bash
# 1. Copy workflow files
cp .github/workflows/*.yml /path/to/target/repo/.github/workflows/

# 2. Copy scripts
cp -r scripts /path/to/target/repo/

# 3. Copy Docker configuration
cp docker-compose.runner.yml /path/to/target/repo/

# 4. Copy documentation
cp docs/SELF_HOSTED_RUNNERS.md /path/to/target/repo/docs/
cp docs/COST_EFFECTIVE_CICD.md /path/to/target/repo/docs/

# 5. Update repository references
find /path/to/target/repo -name "*.yml" -o -name "*.sh" | xargs sed -i '' "s/wishlist-wizard/your-repo-name/g"
```

## 📋 What's Included

### Workflows (`.github/workflows/`)
- `ci-cd-pipeline.yml` - Main CI/CD pipeline with build, test, deploy
- `ios-distribution.yml` - iOS app distribution to TestFlight/App Store
- `android-distribution.yml` - Android app distribution to Play Store
- `test-ci-cd.yml` - Comprehensive testing and validation
- `chrome-extension-submit.yml` - Chrome extension publishing
- `test-secrets.yml` - Secret validation testing

### Scripts (`scripts/`)
- `setup-macos-runner.sh` - macOS runner installation
- `manage-macos-runner.sh` - macOS runner lifecycle management
- `setup-linux-runner.sh` - Linux Docker runner setup
- `infrastructure-status.sh` - Comprehensive status dashboard
- `monitor-github-actions-costs.sh` - Cost analysis and monitoring

### Docker Configuration
- `docker-compose.runner.yml` - Linux runner container setup
- `.env.runner.template` - Environment configuration template

### Documentation (`docs/`)
- `SELF_HOSTED_RUNNERS.md` - Complete setup guide
- `COST_EFFECTIVE_CICD.md` - Cost analysis and benefits
- `SELF_HOSTED_RUNNER_SETUP.md` - Detailed setup instructions

## 🛠️ Repository-Specific Customization

After applying the setup, customize for your repository:

### 1. Update Workflow Configuration

Edit `.github/workflows/ci-cd-pipeline.yml`:
```yaml
env:
  NODE_VERSION: '18'  # Adjust for your tech stack
  # Add your environment variables
```

### 2. Modify Build Commands

Update build steps to match your tech stack:
```yaml
- name: 🏗️ Build Your App
  run: |
    # Replace with your build commands
    npm run build
    # or
    ./gradlew build
    # or
    flutter build apk
```

### 3. Configure Deployment

Update deployment targets in workflow files:
```yaml
- name: 🔥 Deploy to Firebase
  uses: FirebaseExtended/action-hosting-deploy@v0
  with:
    projectId: your-firebase-project
```

### 4. Update Runner Labels

Ensure workflow labels match your runner configuration:
```yaml
runs-on: [self-hosted, macos-latest, your-repo-name]
```

## 🏗️ Infrastructure Setup

### Linux Docker Runner (Automated)

```bash
# 1. Copy environment template
cp .env.runner.template .env.runner

# 2. Add your GitHub token
nano .env.runner
# ACCESS_TOKEN=your_github_personal_access_token

# 3. Start the runner
docker-compose -f docker-compose.runner.yml up -d

# 4. Check status
docker-compose -f docker-compose.runner.yml logs
```

### macOS Runner (Manual Setup)

**CRITICAL**: Install macOS runner OUTSIDE project directory to avoid ES module conflicts.

```bash
# 1. Create isolated runner directory (outside project)
mkdir ~/actions-runner-wishlist-wizard
cd ~/actions-runner-wishlist-wizard

# 2. Download and extract GitHub runner
# (Download from: https://github.com/actions/runner/releases)

# 3. Configure with GitHub token
./config.sh --url https://github.com/mnelson3/wishlist-wizard \
            --token YOUR_TOKEN \
            --labels "self-hosted,macos-latest,wishlist-wizard" \
            --name "wishlist-wizard-macos-runner"

# 4. Install as service (auto-restart on reboot)
./svc.sh install
./svc.sh start
```

**Why Outside Project?**
Projects with `"type": "module"` in `package.json` cause runner failures:
`ReferenceError: require is not defined in ES module scope`

### Monitoring Dashboard

```bash
# View comprehensive status
./scripts/infrastructure-status.sh

# Monitor costs
./scripts/monitor-github-actions-costs.sh
```

## 💰 Cost Analysis

| Runner Type | GitHub-Hosted Cost | Self-Hosted Cost | Savings |
|-------------|-------------------|------------------|---------|
| macOS (per minute) | $0.08 | ~$0.001 | 98% |
| Linux (per minute) | $0.008 | ~$0.0003 | 96% |
| **Monthly (1000 min)** | **$64** | **$2.50** | **96%** |

**Annual Savings**: ~$700+ per repository

## 🔧 Troubleshooting

### Runner Not Connecting
- Verify GitHub token has `repo` scope
- Check runner labels match workflow requirements
- Ensure firewall allows outbound connections

### ES Module Conflicts (macOS Runner)
- **Error**: `ReferenceError: require is not defined in ES module scope`
- **Cause**: macOS runner installed inside project with `"type": "module"` in `package.json`
- **Solution**: Move runner to isolated directory outside project
  ```bash
  mv ~/Projects/my-project/actions-runner ~/actions-runner-my-project
  ```

### Workflow Failures
- Check runner status: `./scripts/infrastructure-status.sh`
- View runner logs: `./scripts/manage-macos-runner.sh logs`
- Verify required tools are installed on runners

### Permission Issues
- macOS runner needs admin access for Xcode
- Linux runner needs Docker socket access
- Ensure proper file permissions on runner directories

## 📊 Monitoring & Maintenance

### Regular Tasks
```bash
# Weekly: Check runner health
./scripts/infrastructure-status.sh

# Monthly: Review costs
./scripts/monitor-github-actions-costs.sh

# Quarterly: Update runner software
./scripts/manage-macos-runner.sh update
```

### Auto-Restart Configuration
- **macOS**: Installed as launchd service (restarts on reboot)
- **Linux**: Docker container with `restart: unless-stopped`

## 🎯 Best Practices

1. **Use repository-specific labels** for runner targeting
2. **Keep runners updated** with latest GitHub runner versions
3. **Monitor costs regularly** to track savings
4. **Document customizations** for team members
5. **Test workflows thoroughly** before going to production
6. **CRITICAL: Isolate macOS runners** outside project directories to prevent ES module conflicts

## 📞 Support

- Check logs: `./scripts/manage-macos-runner.sh logs`
- View status: `./scripts/infrastructure-status.sh`
- Documentation: `docs/SELF_HOSTED_RUNNERS.md`

---

**Ready to save 90% on CI/CD costs?** Apply this setup to your repositories today! 🚀