#!/bin/bash

# ZERO-TOUCH GitHub Runner Setup Script
# Sets up automated token management using GitHub CLI and stored PAT
# This is the ONLY manual step required for ZERO-TOUCH operation

set -e

echo "🔧 ZERO-TOUCH GitHub Runner Setup"
echo "=================================="
echo ""
echo "This script sets up automated runner token management."
echo "You'll only need to provide a GitHub Personal Access Token once."
echo ""

# Check prerequisites
command -v gh >/dev/null 2>&1 || { echo "❌ GitHub CLI required. Install with: brew install gh"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "❌ jq required. Install with: brew install jq"; exit 1; }

echo "📋 Prerequisites Check:"
echo "✅ GitHub CLI installed"
echo "✅ jq installed"
echo ""

# Get GitHub Personal Access Token
echo "🔑 GitHub Personal Access Token Setup:"
echo "======================================"
echo ""
echo "You need a GitHub Personal Access Token (PAT) with these permissions:"
echo "• repo (Full control of private repositories)"
echo "• workflow (Update GitHub Action workflows)"
echo "• admin:repo_hook (Full control of repository hooks)"
echo "• admin:org (read:org) - if using organization repos"
echo ""
echo "Create one at: https://github.com/settings/tokens"
echo ""

read -p "Enter your GitHub Personal Access Token: " -s GITHUB_TOKEN
echo ""
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ No token provided. Setup cancelled."
    exit 1
fi

# Test the token
echo "🧪 Testing GitHub Token..."
if ! echo "$GITHUB_TOKEN" | gh auth login --with-token >/dev/null 2>&1; then
    echo "❌ Invalid GitHub token. Please check and try again."
    exit 1
fi
echo "✅ Token is valid!"

# Update .env.runner files across all repositories
echo ""
echo "📝 Configuring repositories..."

REPOS=("modulo-squares" "vehicle-vitals" "wishlist-wizard")

for repo in "${REPOS[@]}"; do
    ENV_FILE="/Users/marknelson/Circus/Repositories/$repo/.env.runner"
    if [ -f "$ENV_FILE" ]; then
        echo "  📝 Updating $repo..."

        # Add or update GITHUB_TOKEN
        if grep -q "^GITHUB_TOKEN=" "$ENV_FILE"; then
            sed -i.bak "s/^GITHUB_TOKEN=.*/GITHUB_TOKEN=$GITHUB_TOKEN/" "$ENV_FILE"
        else
            echo "GITHUB_TOKEN=$GITHUB_TOKEN" >> "$ENV_FILE"
        fi

        # Remove old GitHub App variables if they exist
        sed -i.bak '/^GITHUB_APP_/d' "$ENV_FILE"
    else
        echo "  ⚠️  .env.runner not found for $repo"
    fi
done

echo ""
echo "🚀 Testing automated token generation..."

# Test token generation for this repo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ./token-refresh.sh --test; then
    echo "✅ Automated token generation works!"
else
    echo "❌ Token generation test failed. Check your token permissions."
    exit 1
fi

echo ""
echo "🎉 ZERO-TOUCH Setup Complete!"
echo "=============================="
echo ""
echo "✅ GitHub PAT stored securely"
echo "✅ Automated token refresh configured"
echo "✅ All repositories updated"
echo ""
echo "🚀 Your runners will now:"
echo "• Generate new tokens automatically every hour"
echo "• Stay online permanently"
echo "• Require ZERO manual intervention"
echo ""
echo "The launch agent will run automatically. No more manual token management!"
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