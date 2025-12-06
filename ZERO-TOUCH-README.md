# ZERO-TOUCH GitHub Actions Runner Management

This system provides fully automated, zero-maintenance GitHub Actions self-hosted runners using GitHub App authentication for token generation.

## 🎯 Overview

- **Zero Manual Intervention**: Tokens refresh automatically every hour
- **GitHub App Authentication**: No expiring PATs to manage
- **Multi-Repository Support**: Single app manages all repositories
- **Docker + macOS Runners**: Both containerized and native runners
- **Health Monitoring**: Automatic recovery and status reporting

## 🏗️ Architecture

```
GitHub App
├── JWT Generation (every 10 minutes)
├── Installation Tokens (1-hour expiry)
└── Runner Registration Tokens (refreshed hourly)

Launch Agents (macOS)
├── Hourly token refresh
├── Health checks
└── Automatic recovery

Docker Containers
├── Token auto-injection
├── Health monitoring
└── Auto-restart on failure
```

## 🚀 Quick Setup

### 1. Create GitHub App

Run the setup script to create and configure your GitHub App:

```bash
cd /Users/marknelson/Circus/Repositories/modulo-squares
./setup-github-app.sh
```

This will guide you through:
- Creating the GitHub App with proper permissions
- Installing it on your repositories
- Configuring authentication
- Testing the setup

### 2. Start Runners

```bash
# Start Docker runners
for repo in modulo-squares vehicle-vitals wishlist-wizard; do
  cd "/Users/marknelson/Circus/Repositories/${repo}-actions-runner"
  ./manage-docker-runner.sh start
done

# Start macOS runners
for repo in modulo-squares vehicle-vitals wishlist-wizard; do
  cd "/Users/marknelson/Circus/Repositories/${repo}-actions-runner/actions-runner"
  ./run.sh &
done
```

### 3. Verify Status

Check that runners appear online in GitHub:
- https://github.com/nelsongrey/modulo-squares/settings/actions/runners
- https://github.com/nelsongrey/vehicle-vitals/settings/actions/runners
- https://github.com/nelsongrey/wishlist-wizard/settings/actions/runners

## 🔧 Manual GitHub App Setup

If you prefer manual setup:

### Create GitHub App

1. Go to https://github.com/settings/apps/new
2. **App name**: `Zero-Touch Runner Manager`
3. **Homepage URL**: `https://github.com/nelsongrey`
4. **Description**: `Automated GitHub Actions runner token management`

### Permissions

Under "Repository permissions":
- **Actions**: Read and write
- **Administration**: Read and write
- **Contents**: Read-only
- **Metadata**: Read-only

### Installation

1. Install the app on your repositories
2. Note the **App ID** and **Installation ID**
3. Download the private key (.pem file)

### Configuration

Update `.env.runner` in each repository:

```bash
# GitHub App Configuration
GITHUB_APP_ID=your_app_id_here
GITHUB_APP_INSTALLATION_ID=your_installation_id_here
GITHUB_APP_PRIVATE_KEY_PATH=/path/to/private-key.pem
```

## 🔄 How It Works

### Token Flow

1. **JWT Generation**: Script generates JWT using App ID + private key
2. **Installation Token**: JWT exchanges for installation access token (1 hour)
3. **Runner Token**: Installation token gets runner registration token
4. **Auto-Refresh**: Process repeats hourly via launch agents

### Security

- **Private Keys**: Stored locally, never committed
- **Short-Lived Tokens**: Installation tokens expire in 1 hour
- **Scoped Access**: App only has necessary permissions
- **No Secrets in Code**: All sensitive data in local files

## 🛠️ Maintenance

### Health Checks

```bash
# Check runner health
cd /Users/marknelson/Circus/Repositories/modulo-squares
./token-refresh.sh health_check
```

### Force Refresh

```bash
# Force token refresh
cd /Users/marknelson/Circus/Repositories/modulo-squares
./token-refresh.sh force_refresh
```

### Logs

Check logs at `/tmp/runner-token-refresh.log`

## 📁 File Structure

```
repository/
├── .env.runner                    # GitHub App configuration
├── .github-app-private-key.pem    # Private key (not committed)
├── token-refresh.sh              # Token management script
├── com.*.runner-token-refresh.plist  # Launch agent
└── docker-compose.runner.yml     # Docker runner config

actions-runner/
├── actions-runner/               # macOS runner binaries
├── docker-compose.yml            # Docker runner orchestration
└── manage-docker-runner.sh       # Docker runner control
```

## 🔒 Security Considerations

- Keep private keys secure and never commit them
- Regularly rotate GitHub App private keys
- Monitor GitHub App usage in settings
- Use organization-level apps for team access
- Consider IP allowlisting for additional security

## 🐛 Troubleshooting

### Runners Offline

1. Check token refresh logs: `tail -f /tmp/runner-token-refresh.log`
2. Verify GitHub App installation
3. Test token generation: `./token-refresh.sh force_refresh`
4. Check Docker/macOS runner processes

### Authentication Errors

1. Verify App ID and Installation ID in `.env.runner`
2. Check private key file exists and has correct permissions
3. Test JWT generation manually
4. Ensure GitHub App has correct permissions

### Permission Issues

1. Check GitHub App repository permissions
2. Verify app is installed on target repositories
3. Confirm user has admin access to repositories

## 📊 Monitoring

The system includes automatic monitoring:

- **Launch Agents**: macOS services run every hour
- **Health Checks**: Container and process monitoring
- **Log Rotation**: Automatic log management
- **Error Recovery**: Automatic restart on failures

## 🎉 Benefits

- ✅ **Zero Maintenance**: No manual token renewal
- ✅ **High Security**: Short-lived tokens, scoped access
- ✅ **Reliable**: Automatic health checks and recovery
- ✅ **Scalable**: Single app manages multiple repositories
- ✅ **Cost Effective**: No external services required

---

**Status**: 🟢 Production Ready

This ZERO-TOUCH system eliminates all manual runner management while maintaining enterprise-grade security and reliability.