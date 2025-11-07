#!/bin/bash

# GitHub Actions Runner Management Script for Wishlist Wizard
# This script manages the Docker-based self-hosted runner

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.runner.yml"
ENV_FILE="$PROJECT_ROOT/.env.runner"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if .env.runner exists
check_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        error ".env.runner file not found!"
        error "Please create $ENV_FILE with your RUNNER_TOKEN"
        error "Example:"
        echo "RUNNER_TOKEN=your_github_runner_token_here"
        exit 1
    fi
}

# Check if docker and docker-compose are available
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
}

# Start the runner
start_runner() {
    log "Starting GitHub Actions Runner for Wishlist Wizard..."
    check_env_file
    check_dependencies

    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" up -d

    success "Runner started successfully!"
    log "Monitor at: http://localhost:8080"
    log "Check logs with: docker-compose -f $COMPOSE_FILE logs -f"
}

# Stop the runner
stop_runner() {
    log "Stopping GitHub Actions Runner..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" down
    success "Runner stopped successfully!"
}

# Show status
show_status() {
    log "Checking runner status..."
    cd "$PROJECT_ROOT"

    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        success "Runner is running"
        echo ""
        docker-compose -f "$COMPOSE_FILE" ps
        echo ""
        log "Monitor at: http://localhost:8080"
    else
        warn "Runner is not running"
        echo ""
        docker-compose -f "$COMPOSE_FILE" ps
    fi
}

# Show logs
show_logs() {
    log "Showing runner logs..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" logs -f
}

# Restart runner
restart_runner() {
    log "Restarting GitHub Actions Runner..."
    stop_runner
    sleep 2
    start_runner
}

# Clean up
cleanup() {
    log "Cleaning up runner containers and volumes..."
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" down -v --remove-orphans
    success "Cleanup completed!"
}

# Show usage
usage() {
    echo "GitHub Actions Runner Management Script for Wishlist Wizard"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Start the runner"
    echo "  stop      Stop the runner"
    echo "  restart   Restart the runner"
    echo "  status    Show runner status"
    echo "  logs      Show runner logs"
    echo "  cleanup   Clean up containers and volumes"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 status"
    echo "  $0 logs"
}

# Main script logic
case "${1:-help}" in
    start)
        start_runner
        ;;
    stop)
        stop_runner
        ;;
    restart)
        restart_runner
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
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