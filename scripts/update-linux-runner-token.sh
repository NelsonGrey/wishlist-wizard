#!/bin/bash

# Update Linux Runner Token
# This script helps update the GitHub runner token for the Linux Docker runner

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.runner"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

main() {
    echo -e "${YELLOW}🔑 Update Linux Runner Token${NC}"
    echo ""

    if [ ! -f "$ENV_FILE" ]; then
        error ".env.runner file not found!"
        exit 1
    fi

    echo "Current .env.runner contents:"
    cat "$ENV_FILE"
    echo ""

    echo -e "${YELLOW}To get a new token:${NC}"
    echo "1. Go to: https://github.com/mnelson3/wishlist-wizard/settings/actions/runners"
    echo "2. Click 'New self-hosted runner'"
    echo "3. Select 'Linux'"
    echo "4. Copy the token from the './config.sh' command"
    echo ""

    read -p "Enter the new runner token: " -r NEW_TOKEN

    if [ -z "$NEW_TOKEN" ]; then
        error "No token provided!"
        exit 1
    fi

    echo "RUNNER_TOKEN=$NEW_TOKEN" > "$ENV_FILE"
    success "Token updated in .env.runner"

    echo ""
    info "Now restart the runner:"
    echo "  ./scripts/manage-docker-runner.sh stop"
    echo "  ./scripts/manage-docker-runner.sh start"
}

main