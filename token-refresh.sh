#!/bin/bash

# ZERO-TOUCH GitHub Runner Token Refresh Script
# Automatically detects expired tokens and refreshes them
# Part of the ZERO-TOUCH DevOps pipeline

set -e  # Exit on any error

# Configuration - Load from environment or use defaults
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.runner"
DOCKER_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.runner.yml"
REPO_OWNER="nelsongrey"
REPO_NAME="wishlist-wizard"

# GitHub App Configuration
GITHUB_APP_ID="${GITHUB_APP_ID:-}"
GITHUB_APP_PRIVATE_KEY_PATH="${GITHUB_APP_PRIVATE_KEY_PATH:-${SCRIPT_DIR}/.github-app-private-key.pem}"
GITHUB_APP_INSTALLATION_ID="${GITHUB_APP_INSTALLATION_ID:-}"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
else
    echo "❌ ERROR: .env.runner file not found at $ENV_FILE"
    exit 1
fi

# Default values
TOKEN_CHECK_INTERVAL=${TOKEN_CHECK_INTERVAL:-3600}
TOKEN_REFRESH_BUFFER=${TOKEN_REFRESH_BUFFER:-86400}
TOKEN_LOG_FILE=${TOKEN_LOG_FILE:-"/tmp/runner-token-refresh.log"}

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$TOKEN_LOG_FILE"
    echo "[$timestamp] [$level] $message"
}

# Generate JWT for GitHub App authentication
generate_jwt() {
    local app_id="$1"
    local private_key_path="$2"

    if [ ! -f "$private_key_path" ]; then
        log "ERROR" "GitHub App private key not found at $private_key_path"
        return 1
    fi

    # Create JWT header
    local header=$(echo -n '{"alg":"RS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-')

    # Create JWT payload
    local now=$(date +%s)
    local payload=$(echo -n "{\"iat\":$now,\"exp\":$((now + 600)),\"iss\":\"$app_id\"}" | base64 | tr -d '=' | tr '/+' '_-')

    # Create signature
    local header_payload="${header}.${payload}"
    local signature=$(echo -n "$header_payload" | openssl dgst -sha256 -sign "$private_key_path" | base64 | tr -d '=' | tr '/+' '_-')

    echo "${header_payload}.${signature}"
}

# Get installation access token
get_installation_token() {
    local jwt="$1"
    local installation_id="$2"

    curl -s -X POST \
        -H "Authorization: Bearer $jwt" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/app/installations/$installation_id/access_tokens" | \
        jq -r '.token'
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log "ERROR" "Docker is not running or not accessible"
        return 1
    fi
    return 0
}

# Check if runner container is healthy
check_runner_health() {
    local container_name="github-runner-wishlist-wizard"

    if ! docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        log "WARN" "Runner container '$container_name' is not running"
        return 1
    fi

    # Check if runner process is running inside container
    if ! docker exec "$container_name" ps aux | grep -q "Runner.Listener"; then
        log "WARN" "GitHub runner process not found in container"
        return 1
    fi

    log "INFO" "Runner container is healthy"
    return 0
}

# Get new runner registration token from GitHub API
get_new_token() {
    # Validate GitHub App configuration
    if [ -z "$GITHUB_APP_ID" ] || [ -z "$GITHUB_APP_INSTALLATION_ID" ]; then
        log "ERROR" "GitHub App ID ($GITHUB_APP_ID) or Installation ID ($GITHUB_APP_INSTALLATION_ID) not configured"
        return 1
    fi

    log "INFO" "Requesting new runner registration token using GitHub App authentication"

    # Generate JWT
    local jwt
    jwt=$(generate_jwt "$GITHUB_APP_ID" "$GITHUB_APP_PRIVATE_KEY_PATH")
    if [ $? -ne 0 ]; then
        log "ERROR" "Failed to generate JWT"
        return 1
    fi

    # Get installation token
    local installation_token
    installation_token=$(get_installation_token "$jwt" "$GITHUB_APP_INSTALLATION_ID")
    if [ -z "$installation_token" ] || [ "$installation_token" = "null" ]; then
        log "ERROR" "Failed to get installation token"
        return 1
    fi

    # Get runner registration token
    local api_response
    api_response=$(curl -s -X POST \
        -H "Authorization: token $installation_token" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/runners/registration-token")

    if [ $? -ne 0 ]; then
        log "ERROR" "Failed to call GitHub API"
        return 1
    fi

    local token
    token=$(echo "$api_response" | jq -r '.token' 2>/dev/null)

    if [ -z "$token" ] || [ "$token" = "null" ]; then

    if [ $? -ne 0 ]; then
        log "ERROR" "Failed to call GitHub API"
        return 1
    fi

    local token
    token=$(echo "$api_response" | jq -r '.token' 2>/dev/null)

    if [ -z "$token" ] || [ "$token" = "null" ]; then
        log "ERROR" "Failed to extract token from API response: $api_response"
        return 1
    fi

    echo "$token"
}

# Update the .env.runner file with new token
update_env_file() {
    local new_token="$1"

    if [ ! -f "$ENV_FILE" ]; then
        log "ERROR" "Environment file not found: $ENV_FILE"
        return 1
    fi

    # Create backup
    cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%s)"

    # Update the token
    sed -i.bak "s/^RUNNER_TOKEN=.*/RUNNER_TOKEN=$new_token/" "$ENV_FILE"

    # Update the timestamp
    local timestamp=$(date)
    sed -i.bak "s/^# Last updated:.*/# Last updated: $timestamp/" "$ENV_FILE"

    log "INFO" "Updated RUNNER_TOKEN in $ENV_FILE"
}

# Restart Docker containers
restart_containers() {
    log "INFO" "Restarting Docker containers..."

    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log "ERROR" "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        return 1
    fi

    # Stop containers
    if ! docker-compose -f "$DOCKER_COMPOSE_FILE" down; then
        log "WARN" "Failed to stop containers gracefully, forcing..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down --timeout 10 || true
    fi

    # Start containers
    if ! docker-compose -f "$DOCKER_COMPOSE_FILE" up -d; then
        log "ERROR" "Failed to start containers"
        return 1
    fi

    # Wait for containers to be healthy
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
            log "INFO" "Containers are running"
            return 0
        fi

        log "INFO" "Waiting for containers to start (attempt $attempt/$max_attempts)..."
        sleep 10
        ((attempt++))
    done

    log "ERROR" "Containers failed to start within timeout"
    return 1
}

# Main token refresh logic
refresh_token_if_needed() {
    log "INFO" "Starting ZERO-TOUCH token refresh check"

    # Check if runner is healthy
    if check_runner_health; then
        log "INFO" "Runner is healthy, checking if token refresh is still needed"
        # Even if healthy, we might want to proactively refresh
    else
        log "WARN" "Runner is unhealthy, token refresh likely needed"
    fi

    # Get new token
    local new_token
    new_token=$(get_new_token)

    if [ $? -ne 0 ] || [ -z "$new_token" ]; then
        log "ERROR" "Failed to obtain new token"
        return 1
    fi

    log "INFO" "Obtained new runner token"

    # Update environment file
    if ! update_env_file "$new_token"; then
        log "ERROR" "Failed to update environment file"
        return 1
    fi

    # Restart containers
    if ! restart_containers; then
        log "ERROR" "Failed to restart containers"
        return 1
    fi

    # Verify runner comes back online
    sleep 30
    if check_runner_health; then
        log "SUCCESS" "ZERO-TOUCH token refresh completed successfully"
        return 0
    else
        log "ERROR" "Runner failed to come back online after token refresh"
        return 1
    fi
}

# Health check function (can be called periodically)
health_check() {
    log "INFO" "Performing runner health check"

    if ! check_docker; then
        log "ERROR" "Docker health check failed"
        return 1
    fi

    if ! check_runner_health; then
        log "WARN" "Runner health check failed, attempting automatic recovery"
        refresh_token_if_needed
        return $?
    fi

    log "INFO" "Runner health check passed"
    return 0
}

# Main execution
main() {
    local command="${1:-health_check}"

    case "$command" in
        "refresh")
            refresh_token_if_needed
            ;;
        "health_check")
            health_check
            ;;
        "force_refresh")
            log "INFO" "Forcing token refresh"
            refresh_token_if_needed
            ;;
        *)
            echo "Usage: $0 [refresh|health_check|force_refresh]"
            echo "  refresh      - Check and refresh token if needed"
            echo "  health_check - Check runner health"
            echo "  force_refresh- Force token refresh regardless of health"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"