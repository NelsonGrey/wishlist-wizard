#!/bin/bash

# Complete Runner Reset and Reconfiguration Script
# Cleans up stale registrations and restarts all runners

set -e

echo "🧹 COMPLETE RUNNER RESET AND RECONFIGURATION"
echo "==========================================="

# Function to clean up stale runners
cleanup_stale_runners() {
    local repo=$1
    echo "🗑️  Cleaning up stale runners for $repo..."

    # Get runner IDs and remove them
    gh api repos/mnelson3/$repo/actions/runners --jq '.runners[] | select(.status != "online") | .id' 2>/dev/null | while read -r id; do
        if [ ! -z "$id" ]; then
            echo "  Removing runner ID: $id"
            gh api -X DELETE repos/mnelson3/$repo/actions/runners/$id 2>/dev/null || true
        fi
    done
}

# Function to reset containers
reset_containers() {
    local repo=$1
    echo "🔄 Resetting $repo container..."

    # Stop and remove container
    docker stop github-runner-$repo 2>/dev/null || true
    docker rm github-runner-$repo 2>/dev/null || true

    # Clean up volumes
    docker volume rm ${repo}-work 2>/dev/null || true

    echo "  ✅ Container reset complete"
}

# Function to reset macOS runners
reset_macos_runners() {
    local repo=$1
    echo "🍎 Resetting macOS runner for $repo..."

    local runner_dir="/Users/marknelson/Circus/Repositories/${repo}-actions-runner/actions-runner"

    if [ -d "$runner_dir" ]; then
        cd "$runner_dir"

        # Remove runner from GitHub if registered
        ./config.sh remove --token dummy 2>/dev/null || true

        # Clean up runner directory
        rm -rf _work _diag .runner

        echo "  ✅ macOS runner reset complete"
    fi
}

# Main cleanup process
echo "🧽 PHASE 1: CLEANUP"
echo "==================="

for repo in modulo-squares vehicle-vitals wishlist-wizard; do
    echo -e "\n🔧 Processing $repo..."

    # Clean up stale GitHub registrations
    cleanup_stale_runners $repo

    # Reset containers
    reset_containers $repo

    # Reset macOS runners
    reset_macos_runners $repo
done

echo -e "\n✅ Cleanup complete!"
echo ""
echo "🎯 PHASE 2: RECONFIGURATION"
echo "==========================="
echo ""
echo "Now you need to:"
echo "1. Get a fresh registration token from:"
echo "   https://github.com/mnelson3/modulo-squares/settings/actions/runners"
echo ""
echo "2. Run the reconfiguration:"
echo "   cd /Users/marknelson/Circus/Repositories/modulo-squares"
echo "   ./update-tokens.sh [YOUR_FRESH_TOKEN]"
echo ""
echo "This will:"
echo "• Update all .env.runner files with the new token"
echo "• Restart all Docker containers with proper configuration"
echo "• Configure macOS runners with correct settings"
echo "• Register all runners with GitHub"
echo ""
echo "After running update-tokens.sh, check:"
echo "https://github.com/mnelson3/*/settings/actions/runners"
echo ""
echo "All runners should show as 'online' ✅"