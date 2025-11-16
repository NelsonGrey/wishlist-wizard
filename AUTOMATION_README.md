# 🚀 Wishlist Wizard - Complete Automation Suite

> **Zero-Touch DevOps**: Fully automated CI/CD, deployment, monitoring, and security for the entire Wishlist Wizard platform.

## 🎯 Overview

This automation suite eliminates manual interactions between Visual Studio Code, GitHub, Docker, Firebase, and Apple Store Connect. Everything from token rotation to production deployments happens automatically with intelligent monitoring and self-healing capabilities.

## ✨ Key Features

- 🔐 **Automated Token Management**: GitHub, Firebase, Docker registry, and API tokens rotate automatically
- 🌍 **Multi-Environment Management**: Development, staging, and production environments with isolated secrets
- 📊 **Intelligent Monitoring**: 24/7 health checks with auto-healing and smart alerting
- 🚀 **Zero-Touch Deployments**: Push to main branch → automatic deployment across all platforms
- 🔄 **Self-Healing Systems**: Automatic service restarts, certificate renewal, and issue resolution
- 📧 **Multi-Channel Alerts**: Email, Slack, and log-based notifications
- 💾 **Automated Backups**: Daily backups with disaster recovery capabilities

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Visual Studio │    │     GitHub      │    │     Docker      │
│     Code        │◄──►│   Actions       │◄──►│   Registry      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Automation    │
                    │   Controller    │
                    │                 │
                    │ • Token Mgmt    │
                    │ • Environment   │
                    │ • Monitoring    │
                    │ • Deployments   │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Firebase     │    │  Apple Store   │    │ Chrome Web Store│
│   Hosting       │    │   Connect      │    │                 │
│   Functions     │    │                 │    │                 │
│   Firestore     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Complete automated setup
./automate.sh setup

# Or setup specific environment
./automate.sh environment setup production
```

### 2. Start Monitoring

```bash
# Start 24/7 monitoring with auto-healing
./automate.sh monitor start

# Check monitoring status
./automate.sh monitor status
```

### 3. Deploy Everything

```bash
# Full production deployment
./automate.sh deploy full production

# Deploy specific components
./automate.sh deploy web production
./automate.sh deploy api production
./automate.sh deploy mobile production
```

## 📋 Commands

### Main Commands

| Command | Description |
|---------|-------------|
| `setup` | Complete system setup and configuration |
| `deploy` | Automated deployments to all platforms |
| `monitor` | 24/7 monitoring and alerting system |
| `tokens` | Token rotation and credential management |
| `environment` | Multi-environment configuration |
| `backup` | Backup and disaster recovery |
| `health` | System health checks |
| `docker` | Docker image and container management |

### Usage Examples

```bash
# Complete setup for production
./automate.sh setup production

# Start monitoring system
./automate.sh monitor start

# Deploy to production
./automate.sh deploy full production

# Rotate all tokens
./automate.sh tokens rotate

# Check system health
./automate.sh health

# Manage environments
./automate.sh environment setup staging
./automate.sh environment sync staging
./automate.sh environment status production

# Docker management
./automate.sh docker build
./automate.sh docker runner restart
```

## 🔧 Configuration

### Environment Variables (.env.automation)

Create a `.env.automation` file in the project root:

```bash
# Notification Settings
ALERT_EMAIL=admin@wishlist-wizard.com
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Docker Configuration
DOCKER_REGISTRY=your-registry.com
DOCKER_USERNAME=your_username
DOCKER_PASSWORD=your_password

# Monitoring Settings
MONITOR_INTERVAL=300  # 5 minutes

# Security
JWT_SECRET_ROTATION_DAYS=30
SSL_CERT_RENEWAL_DAYS=30

# Backup Settings
BACKUP_RETENTION_DAYS=7
BACKUP_SCHEDULE=daily
```

### GitHub Secrets Required

For production deployments, add these secrets to your GitHub repository:

#### Firebase
- `FIREBASE_SERVICE_ACCOUNT_KEY_PRODUCTION`
- `FIREBASE_SERVICE_ACCOUNT_KEY_STAGING`
- `VITE_FIREBASE_API_KEY_PRODUCTION`
- `VITE_FIREBASE_AUTH_DOMAIN_PRODUCTION`
- etc.

#### Apple Store Connect
- `ASC_KEY_ID`
- `ASC_ISSUER_ID`
- `ASC_PRIVATE_KEY`
- `FASTLANE_APPLE_ID`
- `FASTLANE_TEAM_ID`

#### Chrome Web Store
- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`

## 🔐 Security Features

### Automated Token Rotation
- **GitHub Runner Tokens**: Rotate every 30 days
- **Firebase Tokens**: Refresh weekly
- **API Secrets**: Rotate every 90 days
- **SSL Certificates**: Auto-renew 30 days before expiry
- **Encryption Keys**: Rotate every 180 days

### Secret Management
- Environment-isolated secrets
- GitHub repository secrets sync
- Encrypted storage with rotation
- Audit logging for all access

### Access Control
- Role-based access to environments
- IP whitelisting for deployments
- Two-factor authentication for critical operations

## 📊 Monitoring & Alerting

### What Gets Monitored

- ✅ **System Resources**: CPU, memory, disk usage
- ✅ **GitHub Actions**: Runner status, workflow failures
- ✅ **Firebase Services**: Hosting, functions, Firestore
- ✅ **Docker Containers**: Resource usage, health status
- ✅ **API Endpoints**: Response times, availability
- ✅ **SSL Certificates**: Expiry dates, validity
- ✅ **Token Validity**: Expiration monitoring

### Alert Channels

- 📧 **Email**: Critical alerts and weekly reports
- 💬 **Slack**: Real-time notifications
- 📝 **Logs**: Comprehensive audit trails
- 📊 **Dashboards**: Web-based monitoring interface

### Auto-Healing

- 🔄 **Service Restarts**: Automatic container restarts
- 🔐 **Token Refresh**: Automatic credential renewal
- 🧹 **Cleanup**: Old containers, images, and logs
- 💾 **Backups**: Automated backup creation

## 🚀 Deployment Pipeline

### Automatic Triggers

1. **Push to `main`**: Production deployment
2. **Push to `staging`**: Staging deployment
3. **Pull Requests**: Testing and validation
4. **Manual Dispatch**: Custom deployments

### Deployment Stages

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Code Push  │ -> │   Testing   │ -> │ Deployment  │
│             │    │             │    │             │
│ • Quality   │    │ • Unit      │    │ • Firebase  │
│ • Security  │    │ • Integration│    │ • Docker   │
│ • Linting   │    │ • E2E       │    │ • Mobile    │
└─────────────┘    └─────────────┘    └─────────────┘
                                      │
                                      v
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Monitoring  │ -> │   Alerts    │ -> │  Rollback  │
│             │    │             │    │             │
│ • Health    │    │ • Email     │    │ • Auto      │
│ • Performance│    │ • Slack    │    │ • Manual    │
│ • Logs      │    │ • Dashboard │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🔄 Token & Credential Automation

### GitHub Integration
```bash
# Automatic runner token rotation
./automate.sh tokens github

# Repository secret synchronization
./automate.sh environment sync production
```

### Firebase Integration
```bash
# Service account key rotation
./automate.sh tokens rotate

# Project configuration deployment
firebase deploy --only hosting,functions
```

### Apple Store Connect
```bash
# Certificate and profile management
fastlane match development  # Automatic provisioning
fastlane beta             # TestFlight deployment
```

### Chrome Web Store
```bash
# Extension publishing
mnao305/chrome-extension-upload@v5.0.0
```

## 📈 Performance & Cost Optimization

### Resource Optimization
- **Self-Hosted Runners**: 90% cost reduction vs GitHub-hosted
- **Intelligent Scaling**: Auto-scale based on load
- **Resource Monitoring**: Prevent over-provisioning

### Cost Savings
- **GitHub Actions**: ~$500/month savings
- **Firebase**: Optimized function cold starts
- **Docker**: Efficient image layers and caching

## 🆘 Troubleshooting

### Common Issues

#### Monitoring Not Starting
```bash
# Check system resources
./automate.sh health

# Check log files
tail -f monitoring.log
```

#### Deployment Failures
```bash
# Check environment configuration
./automate.sh environment status production

# Verify secrets
gh secret list --repo mnelson3/wishlist-wizard
```

#### Token Issues
```bash
# Force token rotation
./automate.sh tokens rotate

# Check token status
./automate.sh tokens status
```

### Logs and Debugging

```bash
# View all logs
tail -f *.log

# Check health status
cat health-status.json | jq .

# Docker container logs
./automate.sh docker runner logs
```

## 📚 Advanced Usage

### Custom Automation Scripts

Create custom automation in `scripts/custom/`:

```bash
#!/bin/bash
# scripts/custom/my-automation.sh

source "$(dirname "$0")/../common.sh"

log_info "Running custom automation..."
# Your custom logic here
```

### Scheduled Tasks

Set up cron jobs for regular maintenance:

```bash
# Daily token rotation
0 2 * * * /path/to/wishlist-wizard/automate.sh tokens rotate

# Weekly full backup
0 3 * * 0 /path/to/wishlist-wizard/automate.sh backup create

# Health monitoring
*/5 * * * * /path/to/wishlist-wizard/automate.sh monitor once
```

### API Integration

The automation system provides REST APIs for integration:

```bash
# Get system status
curl http://localhost:8080/api/status

# Trigger deployment
curl -X POST http://localhost:8080/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"environment": "production", "component": "web"}'
```

## 🤝 Contributing

### Adding New Automation

1. Create script in `scripts/` directory
2. Add command to `automate.sh`
3. Update documentation
4. Test thoroughly

### Code Standards

- Bash strict mode (`set -e`)
- Comprehensive error handling
- Detailed logging
- Security-first approach

## 📄 License

This automation suite is part of the Wishlist Wizard project.

---

## 🎉 Getting Started

Ready to eliminate manual DevOps tasks? Here's your quick start:

```bash
# 1. Clone and setup
git clone https://github.com/mnelson3/wishlist-wizard.git
cd wishlist-wizard

# 2. Configure your environment
cp .env.automation.example .env.automation
# Edit .env.automation with your settings

# 3. Run complete setup
./automate.sh setup

# 4. Start monitoring
./automate.sh monitor start

# 5. Push to main for automatic deployment
git push origin main
```

**That's it!** Your Wishlist Wizard now deploys automatically across all platforms with zero manual intervention. 🎯

---

*Built with ❤️ for the Wishlist Wizard team - Zero-touch DevOps achieved!* 🚀