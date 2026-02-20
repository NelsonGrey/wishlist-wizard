# Act CLI Testing Guide

## 🎭 Testing Workflows Locally with Act

`act` allows you to run GitHub Actions workflows locally using Docker, preventing costly failures on GitHub.

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Install act
brew install act

# Ensure Docker Desktop is running
docker info

# Setup test secrets (safe for commits)
mkdir -p .act-secrets
cat > .act-secrets/test-secrets << EOF
FIREBASE_TOKEN=test_token
FIREBASE_SERVICE_ACCOUNT_KEY={"test": "key"}
EOF

# For real testing, create secrets with actual values (DO NOT COMMIT)
cp .act-secrets/test-secrets .act-secrets/secrets
# Edit .act-secrets/secrets with your real Firebase credentials
```

### 2. Test Workflows
```bash
# Use the interactive script
./scripts/test-act.sh

# Or test specific workflows directly
act -W .github/workflows/master-pipeline.yml --job test --secret-file .act-secrets/test-secrets --container-architecture linux/amd64
```

## 🛠️ Common Commands

### Test Quality Checks
```bash
act -W .github/workflows/master-pipeline.yml \
  --job test \
  --secret-file .act-secrets/test-secrets \
  --container-architecture linux/amd64
```

### Test Web Build (Dry Run)
```bash
act -W .github/workflows/master-pipeline.yml \
  --job build-web \
  --secret-file .act-secrets/test-secrets \
  --container-architecture linux/amd64
```

### Test Firebase Deployment (Dry Run)
```bash
act -W .github/workflows/master-pipeline.yml \
  --job deploy-firebase \
  --secret-file .act-secrets/test-secrets \
  --container-architecture linux/amd64
```

## 🔧 Troubleshooting

### Docker Image Issues (M-series Mac)
```bash
# Specify architecture explicitly
act --container-architecture linux/amd64

# Pull images manually first
docker pull catthehacker/ubuntu:act-latest
docker pull node:18
```

### Missing Secrets
```bash
# Create secrets file
mkdir -p .act-secrets
cat > .act-secrets/test-secrets << EOF
FIREBASE_TOKEN=test_token
FIREBASE_SERVICE_ACCOUNT_KEY={"test": "key"}
EOF
```

### Workflow Path Issues
```bash
# Use absolute paths
act -W /full/path/to/.github/workflows/master-pipeline.yml

# Or run from project root
cd /path/to/project
act -W .github/workflows/master-pipeline.yml
```

### Job Selection
```bash
# List available jobs
act --list

# Test specific job
act -W .github/workflows/master-pipeline.yml --job test
```

## 📊 Workflow Testing Strategy

### Phase 1: Individual Job Testing
```bash
# Test quality checks first
act -W .github/workflows/master-pipeline.yml --job test

# Test build jobs
act -W .github/workflows/master-pipeline.yml --job build-web

# Test deployment jobs (with dry-run)
act -W .github/workflows/master-pipeline.yml --job deploy-firebase
```

### Phase 2: Full Pipeline Testing
```bash
# Test complete workflow
act -W .github/workflows/master-pipeline.yml --secret-file .act-secrets/test-secrets
```

### Phase 3: Event Simulation
```bash
# Simulate push to develop
act push --secret-file .act-secrets/test-secrets

# Simulate workflow dispatch
act workflow_dispatch --secret-file .act-secrets/test-secrets
```

## 🎯 Best Practices

### 1. Test Incrementally
- Start with individual jobs
- Fix issues locally before full workflow testing
- Use dry-run mode for deployment testing

### 2. Environment Variables
```bash
# Set environment variables
act --env ENVIRONMENT=development \
    --env DRY_RUN=true \
    --secret-file .act-secrets/test-secrets
```

### 3. Mock External Services
```bash
# Use test tokens/keys that don't consume real resources
# Mock API endpoints if needed
# Use local Firebase emulator for testing
```

### 4. Cost-Aware Testing
```bash
# Always test locally first
./scripts/dry-run-pipeline.sh development

# Use act for workflow logic testing
./scripts/test-act.sh

# Only push to GitHub when confident
git push origin develop  # Only triggers on main/staging now
```

## 🚨 Common Issues & Solutions

### "No such image" Error
```bash
# Pull required images
docker pull catthehacker/ubuntu:act-latest
docker pull node:18

# Or disable pulling
act --pull=false
```

### "Container architecture" Warning
```bash
# For M-series Macs
act --container-architecture linux/amd64
```

### Secrets Not Found
```bash
# Check secrets file exists
ls -la .act-secrets/test-secrets

# Verify format
cat .act-secrets/test-secrets
```

### Workflow Fails with Real Credentials
```bash
# Use test/mock credentials for local testing
# Real credentials should only be used on GitHub
```

## 📈 Testing Workflow

```
Local Development → Local Scripts → Act Testing → GitHub Dry-Run → Production
     ↓                    ↓            ↓              ↓              ↓
   0 minutes          0 minutes    0 minutes    Minimal minutes  Full deployment
```

## 🎯 Best Practices

### 1. Test Incrementally
- Start with individual jobs
- Fix issues locally before full workflow testing
- Use dry-run mode for deployment testing

### 2. Environment Variables
```bash
# Set environment variables
act --env ENVIRONMENT=development \
    --env DRY_RUN=true \
    --secret-file .act-secrets/test-secrets
```

### 3. Mock External Services
```bash
# Use test tokens/keys that don't consume real resources
# Mock API endpoints if needed
# Use local Firebase emulator for testing
```

### 4. Cost-Aware Testing
```bash
# Always test locally first
./scripts/dry-run-pipeline.sh development

# Use act for workflow logic testing
./scripts/test-act.sh

# Only push to GitHub when confident
git push origin develop  # Only triggers on main/staging now
```

## 🚨 Common Issues & Solutions

### "No such image" Error
```bash
# Pull required images
docker pull catthehacker/ubuntu:act-latest
docker pull node:18

# Or disable pulling
act --pull=false
```

### "Container architecture" Warning
```bash
# For M-series Macs
act --container-architecture linux/amd64
```

### Secrets Not Found
```bash
# Check secrets file exists
ls -la .act-secrets/test-secrets

# Verify format
cat .act-secrets/test-secrets
```

### Workflow Fails with Real Credentials
```bash
# Use test/mock credentials for local testing
# Real credentials should only be used on GitHub
```

## 📈 Testing Workflow

```
Local Development → Local Scripts → Act Testing → GitHub Dry-Run → Production
     ↓                    ↓            ↓              ↓              ↓
   0 minutes          0 minutes    0 minutes    Minimal minutes  Full deployment
```

## 🆘 Emergency Testing

When workflows fail on GitHub:

1. **Stop the bleeding**: Don't push more commits
2. **Local diagnosis**: Use `./scripts/dry-run-pipeline.sh`
3. **Act debugging**: Use `./scripts/test-act.sh`
4. **Fix locally**: Iterate until tests pass
5. **Controlled deployment**: Use workflow dispatch with dry-run
6. **Production**: Only when confident

## 📚 Resources

- [Act CLI Documentation](https://github.com/nektos/act)
- [GitHub Actions Reference](https://docs.github.com/en/actions)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

---

**Remember**: Test locally, deploy confidently, save Actions minutes! 🎭
