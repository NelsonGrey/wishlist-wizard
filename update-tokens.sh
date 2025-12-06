#!/bin/bash

# Quick Token Update Script
# Usage: ./update-tokens.sh YOUR_TOKEN_HERE

if [ $# -ne 1 ]; then
    echo "Usage: $0 <registration_token>"
    echo "Get token from: https://github.com/nelsongrey/modulo-squares/settings/actions/runners"
    exit 1
fi

TOKEN="$1"

echo "🔄 Updating runner tokens..."

for repo in modulo-squares vehicle-vitals wishlist-wizard; do
    echo "📝 Updating $repo..."
    sed -i.bak "s/RUNNER_TOKEN=.*/RUNNER_TOKEN=$TOKEN/" "/Users/marknelson/Circus/Repositories/$repo/.env.runner"

    echo "🐳 Restarting $repo container..."
    docker restart "github-runner-$repo" 2>/dev/null || echo "  ⚠️  Container not running or restart failed"
done

echo ""
echo "✅ Token update complete!"
echo "Check GitHub Actions settings to verify runners are online:"
echo "• https://github.com/nelsongrey/modulo-squares/settings/actions/runners"
echo "• https://github.com/nelsongrey/vehicle-vitals/settings/actions/runners"
echo "• https://github.com/nelsongrey/wishlist-wizard/settings/actions/runners"