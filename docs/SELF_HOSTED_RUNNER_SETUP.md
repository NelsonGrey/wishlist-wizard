# Self-Hosted GitHub Actions Runner Setup - Wishlist Wizard

This document describes the self-hosted GitHub Actions runner implementation for the Wishlist Wizard repository, designed to eliminate GitHub Actions costs while maintaining CI/CD functionality.

## Overview

The implementation includes:
- **Docker-based runner**: Using `myoung34/github-runner` image for Linux x64 execution
- **Direct runner**: macOS ARM64 runner for native Apple Silicon execution
- **Monitoring dashboard**: Nginx-based status page on port 8080
- **Management scripts**: Automated runner lifecycle management
- **Cost savings**: ~90% reduction compared to GitHub-hosted runners

## Architecture

### Docker Runner (Primary)
- **Image**: `myoung34/github-runner:latest`
- **Container**: `github-runner-wishlist-wizard`
- **Labels**: `self-hosted,linux,x64,wishlist-wizard`
- **Network**: `runner-network`
- **Volumes**: Docker socket mount for container builds

### Direct Runner (macOS)
- **Platform**: macOS ARM64 (Apple Silicon)
- **Installation**: Native GitHub Actions runner binaries
- **Labels**: `self-hosted,macos,arm64,wishlist-wizard`
- **Work directory**: `./actions-runner`

### Monitoring
- **Port**: 8080
- **Service**: Nginx with custom status page
- **Endpoint**: `http://localhost:8080/status`

## Setup Instructions

### Prerequisites
1. Docker and Docker Compose installed
2. GitHub repository access with admin permissions
3. Runner registration token from GitHub

### 1. Environment Configuration
Create `.env.runner` file:
```bash
RUNNER_TOKEN=your_github_runner_token_here
```

Get the token from: Repository Settings → Actions → Runners → Add self-hosted runner → Copy token

### 2. Start Docker Runner
```bash
# Using management script
./scripts/manage-docker-runner.sh start

# Or directly with docker-compose
docker-compose -f docker-compose.runner.yml up -d
```

### 3. Configure Direct Runner (macOS)
```bash
cd actions-runner
./config.sh --url https://github.com/mnelson3/wishlist-wizard --token $RUNNER_TOKEN --labels self-hosted,macos,arm64,wishlist-wizard
./run.sh
```

## Management Commands

### Docker Runner
```bash
# Start runner
./scripts/manage-docker-runner.sh start

# Stop runner
./scripts/manage-docker-runner.sh stop

# Check status
./scripts/manage-docker-runner.sh status

# View logs
./scripts/manage-docker-runner.sh logs

# Restart runner
./scripts/manage-docker-runner.sh restart

# Clean up
./scripts/manage-docker-runner.sh cleanup
```

### Direct Runner (macOS)
```bash
cd actions-runner

# Start in background
./run.sh &

# Stop (Ctrl+C or kill process)
pkill -f "actions.runner"

# Check status
ps aux | grep "actions.runner"
```

## Workflow Configuration

All workflows have been updated to use `runs-on: self-hosted` instead of `ubuntu-latest`. The runner automatically selects the appropriate execution environment based on available labels.

### Updated Workflows
- `master-pipeline.yml`: Main CI/CD pipeline
- `android-distribution.yml`: Android app distribution
- `chrome-extension-submit.yml`: Chrome extension publishing
- `test-ci-cd.yml`: CI/CD testing
- `test-secrets.yml`: Secrets testing

## Monitoring and Troubleshooting

### Status Dashboard
Access the monitoring dashboard at: `http://localhost:8080`

### Common Issues

#### Runner Not Connecting
1. Verify `RUNNER_TOKEN` is valid and not expired
2. Check network connectivity
3. Review runner logs: `./scripts/manage-docker-runner.sh logs`

#### Workflow Not Running
1. Ensure runner is registered with correct labels
2. Check that workflow uses `runs-on: self-hosted`
3. Verify runner is online and accepting jobs

#### Docker Build Issues
1. Ensure Docker socket is properly mounted
2. Check Docker daemon is running
3. Verify user has Docker permissions

### Log Locations
- **Docker runner**: `docker-compose -f docker-compose.runner.yml logs`
- **Direct runner**: `actions-runner/_diag/`
- **GitHub Actions**: Repository Actions tab

## Cost Analysis

### Before (GitHub-hosted)
- **ubuntu-latest**: $0.008/minute
- **Monthly estimate**: ~$350-500 for moderate usage

### After (Self-hosted)
- **Infrastructure cost**: ~$10-20/month (server/VM)
- **Maintenance time**: ~2-4 hours/month
- **Savings**: ~90% reduction in CI/CD costs

## Security Considerations

1. **Network isolation**: Runners run in isolated containers/networks
2. **Token management**: Registration tokens expire and should be rotated
3. **Access control**: Only authorized repository contributors can trigger workflows
4. **Resource limits**: Docker containers prevent resource exhaustion

## Backup and Recovery

### Configuration Backup
- `docker-compose.runner.yml`: Infrastructure definition
- `monitoring/`: Status dashboard files
- `scripts/manage-docker-runner.sh`: Management automation
- `.env.runner`: Environment variables (keep secure)

### Runner Recovery
1. Stop existing runner: `./scripts/manage-docker-runner.sh stop`
2. Clean up: `./scripts/manage-docker-runner.sh cleanup`
3. Get new token from GitHub
4. Update `.env.runner` with new token
5. Restart: `./scripts/manage-docker-runner.sh start`

## Future Enhancements

- **Auto-scaling**: Multiple runner instances based on load
- **Runner groups**: Separate runners for different job types
- **Metrics collection**: Detailed performance and cost tracking
- **High availability**: Redundant runner setup across multiple hosts

## Support

For issues or questions:
1. Check this documentation
2. Review runner logs
3. Check GitHub repository issues
4. Contact repository maintainers