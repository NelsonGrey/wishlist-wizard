#!/bin/bash
# setup-macos-runner.sh
# Script to set up a self-hosted GitHub Actions runner on macOS

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
RUNNER_DIR="/Users/${RUNNER_USER}/actions-runner"

echo -e "${BLUE}🍎 Setting up macOS GitHub Self-Hosted Runner${NC}"
echo -e "${BLUE}=============================================${NC}"

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This script is designed for macOS only${NC}"
    exit 1
fi

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   exit 1
fi

# Check macOS version (GitHub runners require macOS 11+)
MACOS_VERSION=$(sw_vers -productVersion | cut -d. -f1)
if [[ $MACOS_VERSION -lt 11 ]]; then
    echo -e "${RED}❌ macOS 11.0 or later is required for GitHub Actions runners${NC}"
    echo -e "${YELLOW}Current version: $(sw_vers -productVersion)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ macOS version check passed: $(sw_vers -productVersion)${NC}"

# Install Xcode Command Line Tools if not present
if ! xcode-select -p &>/dev/null; then
    echo -e "${YELLOW}📦 Installing Xcode Command Line Tools...${NC}"
    xcode-select --install

    # Wait for installation to complete
    echo -e "${YELLOW}⏳ Waiting for Xcode Command Line Tools installation...${NC}"
    echo -e "${YELLOW}Please complete the installation in the dialog that appeared${NC}"
    echo -e "${YELLOW}Press Enter when installation is complete...${NC}"
    read -r
else
    echo -e "${GREEN}✅ Xcode Command Line Tools already installed${NC}"
fi

# Install Homebrew if not present
if ! command -v brew &>/dev/null; then
    echo -e "${YELLOW}📦 Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add Homebrew to PATH for this session
    if [[ -f ~/.zshrc ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    echo -e "${GREEN}✅ Homebrew already installed${NC}"
fi

# Update Homebrew
echo -e "${YELLOW}📦 Updating Homebrew...${NC}"
brew update

# Install required packages
echo -e "${YELLOW}📦 Installing required packages...${NC}"
brew install curl wget jq git unzip

# Install Flutter (for mobile builds)
read -p "Install Flutter? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}📱 Installing Flutter...${NC}"
    brew install --cask flutter
    flutter doctor
fi

# Install Ruby (for Fastlane)
read -p "Install Ruby (for Fastlane)? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}💎 Installing Ruby...${NC}"
    brew install ruby
    echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
    export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
fi

# Create runner user (optional - can run as current user)
read -p "Create dedicated runner user? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}👤 Creating runner user...${NC}"

    # Check if user already exists
    if id "$RUNNER_USER" &>/dev/null; then
        echo -e "${YELLOW}⚠️  User $RUNNER_USER already exists, skipping creation${NC}"
        RUNNER_USER=$RUNNER_USER
        RUNNER_DIR="/Users/${RUNNER_USER}/actions-runner"
    else
        # Find an available UID (starting from 1000)
        local uid=1000
        while id "$uid" &>/dev/null 2>&1 || [ -d "/Users/$(id -nu $uid 2>/dev/null)" ]; do
            ((uid++))
        done

        sudo dscl . -create /Users/$RUNNER_USER
        sudo dscl . -create /Users/$RUNNER_USER UserShell /bin/zsh
        sudo dscl . -create /Users/$RUNNER_USER RealName "GitHub Runner"
        sudo dscl . -create /Users/$RUNNER_USER UniqueID $uid
        sudo dscl . -create /Users/$RUNNER_USER PrimaryGroupID 20
        sudo dscl . -create /Users/$RUNNER_USER NFSHomeDirectory /Users/$RUNNER_USER
        # Set a dummy password that meets macOS complexity requirements
        # The runner user won't need to log in interactively
        sudo dscl . -passwd /Users/$RUNNER_USER "RunnerPass123!"
        sudo createhomedir -c -u $RUNNER_USER

        # Add to admin group for Xcode access
        sudo dscl . -append /Groups/admin GroupMembership $RUNNER_USER

        echo -e "${GREEN}✅ Created user $RUNNER_USER with UID $uid${NC}"
        RUNNER_USER=$RUNNER_USER
    fi
else
    RUNNER_USER=$USER
    RUNNER_DIR="$HOME/actions-runner"
fi

# Set up runner
echo -e "${YELLOW}🤖 Setting up GitHub runner...${NC}"

# Create runner directory
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Download and extract runner
echo "Downloading GitHub runner v$RUNNER_VERSION for macOS..."
if [[ $(uname -m) == 'arm64' ]]; then
    # Apple Silicon
    curl -o actions-runner-osx-arm64-$RUNNER_VERSION.tar.gz -L \
      https://github.com/actions/runner/releases/download/v$RUNNER_VERSION/actions-runner-osx-arm64-$RUNNER_VERSION.tar.gz
    tar xzf ./actions-runner-osx-arm64-$RUNNER_VERSION.tar.gz
else
    # Intel
    curl -o actions-runner-osx-x64-$RUNNER_VERSION.tar.gz -L \
      https://github.com/actions/runner/releases/download/v$RUNNER_VERSION/actions-runner-osx-x64-$RUNNER_VERSION.tar.gz
    tar xzf ./actions-runner-osx-x64-$RUNNER_VERSION.tar.gz
fi

# Clean up archive
rm actions-runner-*.tar.gz

# Make scripts executable
chmod +x bin/*.sh

echo -e "${GREEN}✅ Runner downloaded and extracted${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Get a runner token from: $REPO_URL/settings/actions/runners"
echo "2. Run: cd $RUNNER_DIR"
echo "3. Run: ./config.sh --url $REPO_URL --token YOUR_TOKEN --labels self-hosted,macos-latest,wishlist-wizard"
echo "4. Run: ./run.sh"
echo ""
echo -e "${YELLOW}🔧 Optional: Set up as service${NC}"
echo "   - For launchd service: ./svc.sh install"
echo "   - For launchd service: ./svc.sh start"
echo ""
echo -e "${BLUE}🎯 macOS runner setup complete!${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "- Keep the runner updated: ./bin/Runner.Listener update"
echo "- View logs: tail -f _diag/*.log"
echo "- Runner will auto-update when GitHub releases new versions"