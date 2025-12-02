#!/bin/bash
# set -e  # Commented out to allow configuration failures

# Entrypoint script for self-contained GitHub Actions runner

# Set default environment variables
REPO_URL="${REPO_URL:-https://github.com/mnelson3/wishlist-wizard}"
RUNNER_NAME="${RUNNER_NAME:-wishlist-wizard-docker-runner}"
RUNNER_TOKEN="${RUNNER_TOKEN:-}"
ACCESS_TOKEN="${ACCESS_TOKEN:-$RUNNER_TOKEN}"  # Support both variable names
LABELS="${LABELS:-self-hosted,linux,x64,wishlist-wizard}"
RUNNER_WORKDIR="${RUNNER_WORKDIR:-/tmp/runner/work}"

# Validate required environment
if [ -z "$ACCESS_TOKEN" ] && [ -z "$RUNNER_TOKEN" ]; then
    echo "ERROR: ACCESS_TOKEN or RUNNER_TOKEN environment variable is required"
    exit 1
fi

# Use ACCESS_TOKEN if available, otherwise use RUNNER_TOKEN
TOKEN="${ACCESS_TOKEN:-$RUNNER_TOKEN}"

# Check if runner is already configured
if [ -f ".runner" ]; then
    echo "Runner is already configured, starting directly..."
    # Just start the runner if it's already configured
    ./run.sh
else
    # Configure the runner for the first time
    echo "Configuring GitHub Actions runner..."
    ./config.sh \
        --url "$REPO_URL" \
        --token "$TOKEN" \
        --name "$RUNNER_NAME" \
        --labels "$LABELS" \
        --work "$RUNNER_WORKDIR" \
        --replace \
        --unattended || echo "Configuration failed, but continuing..."
    
    # Start the runner
    echo "Starting GitHub Actions runner..."
    ./run.sh
fi