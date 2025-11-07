#!/bin/bash

# macOS GitHub Actions Runner Management Script for Wishlist Wizard
# This script manages self-hosted macOS runners

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default runner configuration
RUNNER_USER="${RUNNER_USER:-github-runner}"
RUNNER_DIR="${RUNNER_DIR:-/Users/$RUNNER_USER/actions-runner}"
REPO_URL="${REPO_URL:-https://github.com/mnelson3/wishlist-wizard}"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running on macOS
check_macos() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        error "This script is designed for macOS only"
        exit 1
    fi
}

# Check if runner is installed
check_runner() {
    if [ ! -d "$RUNNER_DIR" ]; then
        error "Runner not found at $RUNNER_DIR"
        error "Run setup-macos-runner.sh first"
        exit 1
    fi

    if [ ! -f "$RUNNER_DIR/config.sh" ]; then
        error "Runner not properly configured at $RUNNER_DIR"
        exit 1
    fi
}

# Get runner status
get_runner_status() {
    if pgrep -f "Runner.Listener" > /dev/null; then
        echo "running"
    else
        echo "stopped"
    fi
}

# Start the runner
start_runner() {
    log "Starting macOS GitHub Actions Runner..."

    check_macos
    check_runner

    local status=$(get_runner_status)
    if [ "$status" = "running" ]; then
        warn "Runner is already running"
        return 0
    fi

    cd "$RUNNER_DIR"

    # Start runner in background
    nohup ./run.sh > runner.log 2>&1 &
    local pid=$!

    # Wait a moment for startup
    sleep 3

    if kill -0 $pid 2>/dev/null; then
        success "Runner started successfully (PID: $pid)"
        log "Monitor logs: tail -f $RUNNER_DIR/runner.log"
    else
        error "Failed to start runner"
        log "Check logs: cat $RUNNER_DIR/runner.log"
        exit 1
    fi
}

# Stop the runner
stop_runner() {
    log "Stopping macOS GitHub Actions Runner..."

    check_macos

    local pids=$(pgrep -f "Runner.Listener" || true)
    if [ -z "$pids" ]; then
        warn "Runner is not running"
        return 0
    fi

    echo "$pids" | while read -r pid; do
        log "Stopping runner process (PID: $pid)"
        kill $pid
    done

    # Wait for processes to stop
    sleep 2

    local remaining=$(pgrep -f "Runner.Listener" || true)
    if [ -n "$remaining" ]; then
        warn "Force stopping remaining processes..."
        echo "$remaining" | xargs kill -9
    fi

    success "Runner stopped successfully"
}

# Show status
show_status() {
    log "Checking macOS runner status..."

    check_macos

    if [ ! -d "$RUNNER_DIR" ]; then
        warn "Runner directory not found: $RUNNER_DIR"
        echo "Status: not_installed"
        return 0
    fi

    local status=$(get_runner_status)
    local config_status="unknown"

    if [ -f "$RUNNER_DIR/.runner" ]; then
        config_status="configured"
    else
        config_status="not_configured"
    fi

    echo "Status: $status"
    echo "Configuration: $config_status"
    echo "Directory: $RUNNER_DIR"
    echo "Repository: $REPO_URL"

    if [ "$status" = "running" ]; then
        success "Runner is running"
        echo ""
        log "Process info:"
        pgrep -f "Runner.Listener" | xargs ps -p
    else
        warn "Runner is not running"
    fi

    if [ -f "$RUNNER_DIR/runner.log" ]; then
        echo ""
        log "Recent logs:"
        tail -10 "$RUNNER_DIR/runner.log"
    fi
}

# Show logs
show_logs() {
    log "Showing macOS runner logs..."

    check_macos
    check_runner

    if [ -f "$RUNNER_DIR/runner.log" ]; then
        tail -f "$RUNNER_DIR/runner.log"
    else
        warn "No runner log found"
        log "Runner may not have been started yet"
    fi
}

# Configure runner
configure_runner() {
    log "Configuring macOS GitHub Actions Runner..."

    check_macos
    check_runner

    cd "$RUNNER_DIR"

    echo -e "${YELLOW}📝 Runner Configuration${NC}"
    echo "Repository URL: $REPO_URL"
    echo ""
    echo -e "${YELLOW}Get a runner token from:${NC}"
    echo "$REPO_URL/settings/actions/runners"
    echo ""

    read -p "Enter runner token: " -s token
    echo ""

    if [ -z "$token" ]; then
        error "Token is required"
        exit 1
    fi

    local arch_label="macos-x64"
    if [[ $(uname -m) == 'arm64' ]]; then
        arch_label="macos-arm64"
    fi

    log "Configuring runner with labels: self-hosted,macos-latest,$arch_label,wishlist-wizard"

    ./config.sh \
        --url "$REPO_URL" \
        --token "$token" \
        --labels "self-hosted,macos-latest,$arch_label,wishlist-wizard" \
        --name "wishlist-wizard-macos-runner-$(hostname)" \
        --work _work \
        --replace

    success "Runner configured successfully"
}

# Unconfigure runner
unconfigure_runner() {
    log "Unconfiguring macOS GitHub Actions Runner..."

    check_macos
    check_runner

    cd "$RUNNER_DIR"

    ./config.sh remove --token

    success "Runner unconfigured successfully"
}

# Update runner
update_runner() {
    log "Updating macOS GitHub Actions Runner..."

    check_macos
    check_runner

    cd "$RUNNER_DIR"

    ./bin/Runner.Listener configure --update

    success "Runner updated successfully"
}

# Install as service
install_service() {
    log "Installing macOS runner as launchd service..."

    check_macos
    check_runner

    cd "$RUNNER_DIR"

    ./svc.sh install

    success "Runner installed as service"
    log "Start with: ./svc.sh start"
    log "Stop with: ./svc.sh stop"
}

# Uninstall service
uninstall_service() {
    log "Uninstalling macOS runner service..."

    check_macos
    check_runner

    cd "$RUNNER_DIR"

    ./svc.sh stop
    ./svc.sh uninstall

    success "Runner service uninstalled"
}

# Clean up
cleanup() {
    log "Cleaning up macOS runner..."

    check_macos

    stop_runner

    if [ -d "$RUNNER_DIR" ]; then
        log "Removing runner directory: $RUNNER_DIR"
        rm -rf "$RUNNER_DIR"
    fi

    success "Cleanup completed"
}

# Show usage
usage() {
    echo "macOS GitHub Actions Runner Management Script for Wishlist Wizard"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start the runner"
    echo "  stop        Stop the runner"
    echo "  status      Show runner status"
    echo "  logs        Show runner logs (follow)"
    echo "  configure   Configure runner with repository"
    echo "  unconfigure Remove runner configuration"
    echo "  update      Update runner to latest version"
    echo "  install     Install as launchd service"
    echo "  uninstall   Uninstall launchd service"
    echo "  cleanup     Remove runner completely"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 configure  # First time setup"
    echo "  $0 start      # Start runner"
    echo "  $0 status     # Check status"
    echo "  $0 logs       # Monitor logs"
    echo ""
    echo "Environment Variables:"
    echo "  RUNNER_USER  Runner user (default: github-runner)"
    echo "  RUNNER_DIR   Runner directory (default: /Users/\$RUNNER_USER/actions-runner)"
    echo "  REPO_URL     Repository URL (default: https://github.com/mnelson3/wishlist-wizard)"
}

# Main script logic
check_macos

case "${1:-help}" in
    start)
        start_runner
        ;;
    stop)
        stop_runner
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    configure)
        configure_runner
        ;;
    unconfigure)
        unconfigure_runner
        ;;
    update)
        update_runner
        ;;
    install)
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        error "Unknown command: $1"
        echo ""
        usage
        exit 1
        ;;
esac