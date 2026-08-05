#!/bin/bash

# Setup Linux Docker Runner for Wishlist Wizard
# This script sets up a Docker-based Linux GitHub Actions runner

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.runner"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

header() {
    echo -e "${PURPLE}================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================================${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Check Docker installation
check_docker() {
    header "🐳 Checking Docker Installation"

    if ! command -v docker &> /dev/null; then
        error "Docker is not installed!"
        info "Please install Docker Desktop for macOS from: https://www.docker.com/products/docker-desktop"
        exit 1
    fi

    if ! command -v docker &> /dev/null && docker compose version &> /dev/null; then
        error "Docker Compose is not available!"
        info "Please install Docker Desktop for macOS which includes Docker Compose"
        exit 1
    fi

    success "Docker is installed"
    docker --version
    docker compose version
    echo ""
}

# Get runner token
get_runner_token() {
    header "🔑 Getting GitHub Runner Token"

    echo -e "${YELLOW}To set up the Linux runner, you need a GitHub runner token.${NC}"
    echo ""
    echo -e "${CYAN}Please follow these steps:${NC}"
    echo "1. Open your browser and go to:"
    echo -e "${BLUE}   https://github.com/mnelson3/wishlist-wizard/settings/actions/runners${NC}"
    echo "2. Click the ${GREEN}'New self-hosted runner'${NC} button"
    echo "3. Select ${YELLOW}'Linux'${NC} as the runner image"
    echo "4. ${RED}DO NOT${NC} follow the download instructions"
    echo "5. Copy the ${PURPLE}token${NC} from the ${GREEN}'./config.sh'${NC} command shown"
    echo ""
    echo -e "${YELLOW}The token will look like: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA${NC}"
    echo ""

    read -p "Enter your runner token: " -r RUNNER_TOKEN
    echo ""

    if [ -z "$RUNNER_TOKEN" ]; then
        error "No token provided!"
        exit 1
    fi

    # Create .env.runner file
    echo "RUNNER_TOKEN=$RUNNER_TOKEN" > "$ENV_FILE"
    success ".env.runner file created with token"
    echo ""
}

# Start the runner
start_runner() {
    header "🚀 Starting Linux Runner"

    cd "$PROJECT_ROOT"

    log "Starting Docker-based GitHub Actions runner..."
    docker compose -f docker-compose.runner.yml up -d

    success "Linux runner started successfully!"
    echo ""
    info "Runner name: wishlist-wizard-docker-runner"
    info "Labels: self-hosted,linux,x64,wishlist-wizard"
    info "Monitor at: http://localhost:8080"
    echo ""
    info "Check status with: ./scripts/manage-docker-runner.sh status"
    info "View logs with: ./scripts/manage-docker-runner.sh logs"
    echo ""
}

# Main function
main() {
    header "🐧 Linux Docker Runner Setup for Wishlist Wizard"

    echo -e "${CYAN}This will set up a Docker-based Linux GitHub Actions runner${NC}"
    echo -e "${CYAN}to complement your existing macOS runner.${NC}"
    echo ""

    check_docker

    if [ -f "$ENV_FILE" ]; then
        warning ".env.runner file already exists"
        read -p "Do you want to recreate it with a new token? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            get_runner_token
        fi
    else
        get_runner_token
    fi

    start_runner

    header "🎯 Setup Complete!"
    echo -e "${GREEN}You now have:${NC}"
    echo "  ✅ 1 macOS runner (for iOS builds)"
    echo "  ✅ 1 Linux runner (for web/API/Android builds)"
    echo ""
    echo -e "${CYAN}Both runners are configured to use labels:${NC}"
    echo "  - macOS: self-hosted,macos,arm64"
    echo "  - Linux: self-hosted,linux,x64,wishlist-wizard"
    echo ""
    info "Check infrastructure status: ./scripts/infrastructure-status.sh"
}

# Run main function
main