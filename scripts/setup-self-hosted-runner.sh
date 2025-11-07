#!/bin/bash
# setup-self-hosted-runner.sh
# Script to set up a self-hosted GitHub Actions runner on Ubuntu/Debian

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REPO_URL="${REPO_URL:-https://github.com/mnelson3/wishlist-wizard}"
RUNNER_VERSION="${RUNNER_VERSION:-2.311.0}"
RUNNER_USER="${RUNNER_USER:-github-runner}"
RUNNER_DIR="/home/${RUNNER_USER}/actions-runner"

echo -e "${BLUE}🚀 Setting up GitHub Self-Hosted Runner${NC}"
echo -e "${BLUE}=====================================${NC}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
sudo apt install -y curl jq git unzip

# Install Docker (optional, for containerized builds)
read -p "Install Docker? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🐳 Installing Docker...${NC}"
    sudo apt install -y docker.io
    sudo usermod -aG docker $USER
    sudo systemctl enable docker
    sudo systemctl start docker
fi

# Create runner user
echo -e "${YELLOW}👤 Creating runner user...${NC}"
sudo useradd -m -s /bin/bash $RUNNER_USER
sudo usermod -aG docker $RUNNER_USER 2>/dev/null || true

# Switch to runner user and set up runner
echo -e "${YELLOW}🤖 Setting up GitHub runner...${NC}"
sudo -u $RUNNER_USER bash << EOF
cd /home/$RUNNER_USER

# Download and extract runner
echo "Downloading GitHub runner v$RUNNER_VERSION..."
curl -o actions-runner-linux-x64-$RUNNER_VERSION.tar.gz -L \
  https://github.com/actions/runner/releases/download/v$RUNNER_VERSION/actions-runner-linux-x64-$RUNNER_VERSION.tar.gz

tar xzf ./actions-runner-linux-x64-$RUNNER_VERSION.tar.gz
rm actions-runner-linux-x64-$RUNNER_VERSION.tar.gz

# Make scripts executable
chmod +x bin/*.sh

echo -e "${GREEN}✅ Runner downloaded and extracted${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Get a runner token from: $REPO_URL/settings/actions/runners"
echo "2. Run: cd /home/$RUNNER_USER/actions-runner"
echo "3. Run: ./config.sh --url $REPO_URL --token YOUR_TOKEN --labels self-hosted,ubuntu-latest"
echo "4. Run: sudo ./svc.sh install $RUNNER_USER"
echo "5. Run: sudo ./svc.sh start"
echo ""
echo -e "${BLUE}🎯 Runner setup complete!${NC}"
EOF