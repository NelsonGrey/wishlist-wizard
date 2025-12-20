#!/bin/bash

# Standardized ZERO-TOUCH GitHub Runner Token Refresh Script
# Uses shared GitHub CLI authentication library for consistent, automated token management
# Version: 1.0.0

set -e

# Load shared authentication library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_LIB_DIR="/Users/marknelson/Circus/Repositories/nelson-grey/shared/github-auth"
LIB_FILE="$SHARED_LIB_DIR/github-auth-lib.sh"

if [ ! -f "$LIB_FILE" ]; then
    echo "❌ ERROR: Shared authentication library not found: $LIB_FILE"
    echo "Run setup to initialize shared components"
    exit 1
fi

source "$LIB_FILE"

# Configuration - Load from environment or use defaults
ENV_FILE="${SCRIPT_DIR}/.env.runner"
DOCKER_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.runner.yml"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
else
    log_error "Environment file not found: $ENV_FILE"
    exit 1
fi

# Repository configuration (should be set in .env.runner)
REPO_OWNER="${REPO_OWNER:-}"
REPO_NAME="${REPO_NAME:-}"

if [ -z "$REPO_OWNER" ] || [ -z "$REPO_NAME" ]; then
    log_error "REPO_OWNER and REPO_NAME must be configured in $ENV_FILE"
    exit 1
fi

# Default values
TOKEN_CHECK_INTERVAL=${TOKEN_CHECK_INTERVAL:-3600}
TOKEN_REFRESH_BUFFER=${TOKEN_REFRESH_BUFFER:-86400}
LOG_FILE="${LOG_FILE:-/tmp/github-runner-token-refresh.log}"

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running or not accessible"
        return 1
    fi
    return 0
}

# Function to check if runner container is healthy
check_runner_health() {
    local container_name="github-runner-${REPO_NAME}"

    if ! docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        log_warn "Runner container '$container_name' is not running"
        return 1
    fi

    log_info "Runner container is healthy"
    return 0
}

# Function to restart runner container with new token
restart_runner_container() {
    local container_name="github-runner-${REPO_NAME}"

    log_info "Restarting runner container: $container_name"

    # Stop container if running
    if docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        docker stop "$container_name" || log_warn "Failed to stop container"
    fi

    # Remove container
    if docker ps -a --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        docker rm "$container_name" || log_warn "Failed to remove container"
    fi

    # Start new container
    if [ -f "$DOCKER_COMPOSE_FILE" ]; then
        log_info "Starting container with docker-compose"
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d github-runner-${REPO_NAME} || {
            log_error "Failed to start container with docker-compose"
            return 1
        }
    else
        log_warn "Docker compose file not found, manual container restart required"
        return 1
    fi

    log_info "Runner container restarted successfully"
    return 0
}

# Main token refresh logic
perform_token_refresh() {
    log_info "Starting token refresh process for $REPO_OWNER/$REPO_NAME"

    # Check if token refresh is needed
    if ! is_token_expired "$RUNNER_TOKEN" "$((TOKEN_REFRESH_BUFFER / 3600))"; then
        log_info "Token is still valid, no refresh needed"
        return 0
    fi

    log_info "Token refresh required"

    # Refresh token using shared library
    if ! refresh_runner_token "$REPO_OWNER" "$REPO_NAME" "$ENV_FILE"; then
        log_error "Token refresh failed"
        return 1
    fi

    # Reload environment variables with new token
    source "$ENV_FILE"

    # Check Docker and restart container
    if check_docker; then
        if ! restart_runner_container; then
            log_error "Failed to restart runner container"
            return 1
        fi
    else
        log_warn "Docker not available, container restart skipped"
    fi

    log_info "Token refresh completed successfully"
    return 0
}

# Health check function
perform_health_check() {
    log_info "Performing health check"

    # Check GitHub CLI authentication
    if ! check_gh_cli; then
        log_error "GitHub CLI authentication check failed"
        return 1
    fi

    # Check repository access
    if ! validate_repo_access "$REPO_OWNER" "$REPO_NAME"; then
        log_error "Repository access check failed"
        return 1
    fi

    # Check Docker if available
    if check_docker; then
        if ! check_runner_health; then
            log_warn "Runner container health check failed; attempting restart"
            restart_runner_container || log_warn "Runner container restart failed"
        fi
    fi

    log_info "Health check completed"
    return 0
}

# Main execution
main() {
    local command="${1:-refresh}"

    case "$command" in
        "refresh")
            perform_token_refresh
            ;;
        "health"|"health_check")
            perform_health_check
            ;;
        "force_refresh")
            log_info "Forcing token refresh"
            export FORCE_REFRESH=1
            perform_token_refresh
            ;;
        "setup")
            setup_auth "$REPO_OWNER" "$REPO_NAME"
            ;;
        *)
            echo "Usage: $0 [refresh|health|force_refresh|setup]"
            echo "  refresh      - Check and refresh token if needed (default)"
            echo "  health       - Perform health checks only"
            echo "  force_refresh- Force token refresh regardless of expiry"
            echo "  setup        - Initial setup and authentication"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"