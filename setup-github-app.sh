#!/bin/bash

# GitHub App Setup Script for ZERO-TOUCH Runner Management
# This script helps create and configure a GitHub App for automated token generation

set -e

echo "🔧 GitHub App Setup for ZERO-TOUCH Runner Management"
echo "=================================================="
echo ""

# Check prerequisites
command -v jq >/dev/null 2>&1 || { echo "❌ jq is required. Install with: brew install jq"; exit 1; }
command -v openssl >/dev/null 2>&1 || { echo "❌ openssl is required."; exit 1; }

# Configuration
APP_NAME="Zero-Touch Runner Manager"
APP_DESCRIPTION="Automated GitHub Actions runner token management for self-hosted runners"
APP_URL="https://github.com/nelsongrey"  # Replace with your GitHub profile/org

echo "📋 Prerequisites Check:"
echo "✅ jq installed"
echo "✅ openssl available"
echo ""

echo "🚀 GitHub App Creation Steps:"
echo "=============================="
echo ""
echo "1. Go to: https://github.com/settings/apps/new"
echo ""
echo "2. Fill in the following details:"
echo "   • GitHub App name: $APP_NAME"
echo "   • Homepage URL: $APP_URL"
echo "   • Description: $APP_DESCRIPTION"
echo ""
echo "3. Repository permissions (under 'Permissions & events'):"
echo "   • Actions: Read and write"
echo "   • Administration: Read and write (for managing runners)"
echo "   • Contents: Read-only"
echo "   • Metadata: Read-only"
echo ""
echo "4. Where can this GitHub App be installed?:"
echo "   • Only on this account (or your organization)"
echo ""
echo "5. Create the GitHub App"
echo ""
echo "6. After creation, download the private key (.pem file)"
echo ""
echo "7. Note the App ID from the app settings page"
echo ""
echo "8. Install the app on your repositories:"
echo "   • Go to the app settings"
echo "   • Click 'Install App'"
echo "   • Select the repositories: modulo-squares, vehicle-vitals, wishlist-wizard"
echo "   • Note the Installation ID from the installation URL"
echo ""

read -p "Have you completed the above steps? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please complete the steps above, then run this script again."
    exit 0
fi

# Get user input
echo ""
read -p "Enter the GitHub App ID: " APP_ID
read -p "Enter the Installation ID: " INSTALLATION_ID
read -p "Enter the path to the downloaded private key (.pem file): " PRIVATE_KEY_PATH

# Validate inputs
if [ -z "$APP_ID" ] || [ -z "$INSTALLATION_ID" ] || [ -z "$PRIVATE_KEY_PATH" ]; then
    echo "❌ All fields are required"
    exit 1
fi

if [ ! -f "$PRIVATE_KEY_PATH" ]; then
    echo "❌ Private key file not found: $PRIVATE_KEY_PATH"
    exit 1
fi

echo ""
echo "🔄 Testing GitHub App authentication..."

# Test JWT generation and API access
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Generate JWT
generate_jwt() {
    local app_id="$1"
    local private_key_path="$2"

    local header=$(echo -n '{"alg":"RS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-')
    local now=$(date +%s)
    local payload=$(echo -n "{\"iat\":$now,\"exp\":$((now + 600)),\"iss\":\"$app_id\"}" | base64 | tr -d '=' | tr '/+' '_-')
    local header_payload="${header}.${payload}"
    local signature=$(echo -n "$header_payload" | openssl dgst -sha256 -sign "$private_key_path" | base64 | tr -d '=' | tr '/+' '_-')
    echo "${header_payload}.${signature}"
}

# Test API access
JWT=$(generate_jwt "$APP_ID" "$PRIVATE_KEY_PATH")
if [ $? -ne 0 ]; then
    echo "❌ Failed to generate JWT"
    exit 1
fi

echo "✅ JWT generated successfully"

# Test installation token
INSTALLATION_TOKEN=$(curl -s -X POST \
    -H "Authorization: Bearer $JWT" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/app/installations/$INSTALLATION_ID/access_tokens" | \
    jq -r '.token')

if [ -z "$INSTALLATION_TOKEN" ] || [ "$INSTALLATION_TOKEN" = "null" ]; then
    echo "❌ Failed to get installation token"
    exit 1
fi

echo "✅ Installation token obtained successfully"

# Test runner token generation
RUNNER_TOKEN=$(curl -s -X POST \
    -H "Authorization: token $INSTALLATION_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/nelsongrey/modulo-squares/actions/runners/registration-token" | \
    jq -r '.token')

if [ -z "$RUNNER_TOKEN" ] || [ "$RUNNER_TOKEN" = "null" ]; then
    echo "❌ Failed to get runner registration token"
    exit 1
fi

echo "✅ Runner token generation working"
echo ""

# Copy private key to all repositories
echo "📁 Setting up private keys in repositories..."

for repo in modulo-squares vehicle-vitals wishlist-wizard; do
    repo_path="/Users/marknelson/Circus/Repositories/$repo"
    key_dest="$repo_path/.github-app-private-key.pem"

    if [ -d "$repo_path" ]; then
        cp "$PRIVATE_KEY_PATH" "$key_dest"
        chmod 600 "$key_dest"
        echo "✅ Copied private key to $repo"
    else
        echo "⚠️  Repository not found: $repo_path"
    fi
done

echo ""

# Update .env.runner files
echo "⚙️  Updating configuration files..."

for repo in modulo-squares vehicle-vitals wishlist-wizard; do
    env_file="/Users/marknelson/Circus/Repositories/$repo/.env.runner"

    if [ -f "$env_file" ]; then
        # Update App ID
        sed -i.bak "s/GITHUB_APP_ID=.*/GITHUB_APP_ID=$APP_ID/" "$env_file"

        # Update Installation ID
        sed -i.bak "s/GITHUB_APP_INSTALLATION_ID=.*/GITHUB_APP_INSTALLATION_ID=$INSTALLATION_ID/" "$env_file"

        echo "✅ Updated $repo configuration"
    else
        echo "⚠️  Config file not found: $env_file"
    fi
done

echo ""
echo "🎉 GitHub App setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test token refresh: cd /Users/marknelson/Circus/Repositories/modulo-squares && ./token-refresh.sh force_refresh"
echo "2. Check that runners come online in GitHub"
echo "3. The launch agents will now use GitHub App authentication automatically"
echo ""
echo "🔒 Security notes:"
echo "• Private keys are stored locally and not committed to git"
echo "• Tokens are generated on-demand and expire after 1 hour"
echo "• No manual token management required"
echo ""

echo "✅ Setup complete! Your ZERO-TOUCH runner management is now fully automated."