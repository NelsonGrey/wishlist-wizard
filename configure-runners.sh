#!/bin/bash

# Interactive Token Update Script
# Prompts for token and runs the update

echo "🔑 GITHUB ACTIONS RUNNER TOKEN UPDATE"
echo "====================================="
echo ""
echo "This script will configure all your self-hosted runners."
echo ""
read -p "Enter the registration token from GitHub: " -s TOKEN
echo ""
echo ""

if [ -z "$TOKEN" ]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

echo "✅ Token received, updating all runners..."
echo ""

# Run the update script
./update-tokens.sh "$TOKEN"

echo ""
echo "🎉 Update complete! Check GitHub Actions settings to verify runners are online."