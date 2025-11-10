#!/bin/bash
# apply-cicd-setup.sh
# Script to apply the Wishlist Wizard CI/CD setup to other repositories
# Usage: ./apply-cicd-setup.sh <target-repo-url>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SOURCE_REPO="https://github.com/mnelson3/wishlist-wizard"
TARGET_REPO="$1"

if [ -z "$TARGET_REPO" ]; then
    echo -e "${RED}❌ Error: Target repository URL required${NC}"
    echo "Usage: $0 <target-repo-url>"
    echo "Example: $0 https://github.com/mnelson3/modulo-squares"
    exit 1
fi

echo -e "${BLUE}🚀 Applying CI/CD Setup to: $TARGET_REPO${NC}"
echo -e "${BLUE}=============================================${NC}"

# Extract repo name from URL
REPO_NAME=$(basename "$TARGET_REPO" .git)
REPO_OWNER=$(basename "$(dirname "$TARGET_REPO")")

echo -e "${GREEN}✅ Target repository: $REPO_OWNER/$REPO_NAME${NC}"

# Create temporary directory for cloning
TEMP_DIR=$(mktemp -d)
echo -e "${YELLOW}📁 Working in: $TEMP_DIR${NC}"

# Clone target repository
echo -e "${YELLOW}📥 Cloning target repository...${NC}"
git clone "$TARGET_REPO" "$TEMP_DIR/$REPO_NAME"
cd "$TEMP_DIR/$REPO_NAME"

# Create .github/workflows directory if it doesn't exist
mkdir -p .github/workflows

# Copy workflow files (with repository-specific modifications)
echo -e "${YELLOW}📋 Copying workflow files...${NC}"

# CI/CD Pipeline
cp /Users/marknelson/Circus/Repositories/wishlist-wizard/.github/workflows/ci-cd-pipeline.yml .github/workflows/
sed -i '' "s/wishlist-wizard/$REPO_NAME/g" .github/workflows/ci-cd-pipeline.yml

# iOS Distribution
cp /Users/marknelson/Circus/Repositories/wishlist-wizard/.github/workflows/ios-distribution.yml .github/workflows/
sed -i '' "s/wishlist-wizard/$REPO_NAME/g" .github/workflows/ios-distribution.yml

# Android Distribution
cp /Users/marknelson/Circus/Repositories/wishlist-wizard/.github/workflows/android-distribution.yml .github/workflows/
sed -i '' "s/wishlist-wizard/$REPO_NAME/g" .github/workflows/android-distribution.yml

# Test CI/CD
cp /Users/marknelson/Circus/Repositories/wishlist-wizard/.github/workflows/test-ci-cd.yml .github/workflows/
sed -i '' "s/wishlist-wizard/$REPO_NAME/g" .github/workflows/test-ci-cd.yml

# Chrome Extension Submit
cp /Users/marknelson/Circus/Repositories/wishlist-wizard/.github/workflows/chrome-extension-submit.yml .github/workflows/
sed -i '' "s/wishlist-wizard/$REPO_NAME/g" .github/workflows/chrome-extension-submit.yml

# Test Secrets
cp /Users/marknelson/Circus/Repositories/wishlist-wizard/.github/workflows/test-secrets.yml .github/workflows/
sed -i '' "s/wishlist-wizard/$REPO_NAME/g" .github/workflows/test-secrets.yml

# Copy scripts directory
echo -e "${YELLOW}📋 Copying scripts...${NC}"
cp -r /Users/marknelson/Circus/Repositories/wishlist-wizard/scripts .

# Update script references to use new repo name
find scripts -name "*.sh" -exec sed -i '' "s/wishlist-wizard/$REPO_NAME/g" {} \;

# Copy Docker compose for Linux runner
echo -e "${YELLOW}🐳 Copying Docker runner configuration...${NC}"
cp /Users/marknelson/Circus/Repositories/wishlist-wizard/docker-compose.runner.yml .

# Create .env.runner template
cat > .env.runner.template << EOF
# GitHub Runner Configuration for $REPO_NAME
# Copy this to .env.runner and fill in your values

# GitHub Personal Access Token with repo scope
ACCESS_TOKEN=your_github_token_here

# Repository URL
REPO_URL=$TARGET_REPO

# Runner configuration
RUNNER_NAME=${REPO_NAME}-docker-runner
LABELS=self-hosted,linux,x64,$REPO_NAME
EOF

# Copy monitoring directory if it exists
if [ -d "/Users/marknelson/Circus/Repositories/wishlist-wizard/monitoring" ]; then
    echo -e "${YELLOW}📊 Copying monitoring configuration...${NC}"
    cp -r /Users/marknelson/Circus/Repositories/wishlist-wizard/monitoring .
fi

# Copy relevant documentation
echo -e "${YELLOW}📚 Copying documentation...${NC}"
mkdir -p docs
cp /Users/marknelson/Circus/Repositories/wishlist-wizard/docs/COST_EFFECTIVE_CICD.md docs/
cp /Users/marknelson/Circus/Repositories/wishlist-wizard/docs/SELF_HOSTED_RUNNERS.md docs/
cp /Users/marknelson/Circus/Repositories/wishlist-wizard/docs/SELF_HOSTED_RUNNER_SETUP.md docs/

# Create setup instructions
cat > CICCD_SETUP_README.md << EOF
# CI/CD Setup for $REPO_NAME

This repository has been configured with self-hosted GitHub Actions runners for cost-effective CI/CD.

## 🚀 Quick Setup

### 1. Linux Docker Runner (Automated)
\`\`\`bash
# Copy environment template
cp .env.runner.template .env.runner
# Edit with your GitHub token
nano .env.runner

# Start the runner
docker-compose -f docker-compose.runner.yml up -d
\`\`\`

### 2. macOS Runner (Manual Setup)
\`\`\`bash
# Run the setup script
./scripts/setup-macos-runner.sh

# Configure with your token
./scripts/manage-macos-runner.sh configure

# Install as service (auto-restart)
./scripts/manage-macos-runner.sh install
\`\`\`

### 3. Verify Setup
\`\`\`bash
# Check all runners
./scripts/infrastructure-status.sh
\`\`\`

## 📋 What's Included

- **Workflows**: CI/CD pipeline, iOS/Android distribution, testing
- **Scripts**: Runner management, monitoring, deployment
- **Docker**: Linux runner with monitoring dashboard
- **Documentation**: Setup guides and cost analysis

## 💰 Cost Savings

- **Before**: ~\$0.08/minute for GitHub-hosted macOS runners
- **After**: ~\$5-10/month for self-hosted infrastructure
- **Savings**: ~90% reduction in CI/CD costs

## 🔧 Customization

Edit the workflow files in \`.github/workflows/\` to match your project's needs:
- Update Node.js version in \`ci-cd-pipeline.yml\`
- Modify build commands for your tech stack
- Adjust deployment targets and environments

## 📊 Monitoring

- View runner status: \`./scripts/infrastructure-status.sh\`
- Monitor costs: \`./scripts/monitor-github-actions-costs.sh\`
- Check logs: \`./scripts/manage-macos-runner.sh logs\`

## 🆘 Troubleshooting

- **Runner not connecting**: Check GitHub token permissions
- **Workflow failures**: Verify runner labels match workflow requirements
- **Permission issues**: Ensure runners have access to required tools

## 📚 Resources

- [Self-Hosted Runners Documentation](docs/SELF_HOSTED_RUNNERS.md)
- [Cost Analysis](docs/COST_EFFECTIVE_CICD.md)
- [Setup Guide](docs/SELF_HOSTED_RUNNER_SETUP.md)
EOF

# Stage and commit changes
echo -e "${YELLOW}📝 Committing changes...${NC}"
git add .
git commit -m "feat: add self-hosted CI/CD infrastructure

- Add GitHub Actions workflows for CI/CD pipeline
- Add self-hosted runner management scripts
- Add Docker configuration for Linux runner
- Add monitoring and cost analysis tools
- Add comprehensive setup documentation

Cost savings: ~90% vs GitHub-hosted runners"

echo -e "${GREEN}✅ Setup applied successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Push to GitHub: git push origin main"
echo "2. Set up Linux runner: cp .env.runner.template .env.runner && edit token"
echo "3. Set up macOS runner: ./scripts/setup-macos-runner.sh"
echo "4. Verify: ./scripts/infrastructure-status.sh"
echo ""
echo -e "${BLUE}📁 Files created in: $TEMP_DIR/$REPO_NAME${NC}"
echo -e "${YELLOW}⚠️  Remember to push these changes to GitHub!${NC}"