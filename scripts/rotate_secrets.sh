#!/usr/bin/env bash
# scripts/rotate_secrets.sh
# Automates secret rotations where possible (ZERO-TOUCH where APIs allow)
# Usage: ./scripts/rotate_secrets.sh [service]
# Services: firebase, github, asc, all

set -euo pipefail

SERVICE="${1:-all}"
ENVIRONMENT="${ENVIRONMENT:-PRODUCTION}"  # Default to PRODUCTION; override with env var

echo "🔄 Starting secret rotation for service: $SERVICE (Environment: $ENVIRONMENT)"

# Function to rotate Firebase service account keys
rotate_firebase() {
    echo "🔑 Rotating Firebase service account key..."
    if ! command -v gcloud >/dev/null 2>&1; then
        echo "❌ gcloud CLI not found. Install Google Cloud SDK first."
        echo "📋 Manual steps:"
        echo "   1. Go to Firebase Console > Project Settings > Service Accounts"
        echo "   2. Generate new private key"
        echo "   3. Update FIREBASE_SERVICE_ACCOUNT_KEY secret in GitHub"
        echo "   4. Update local .env files"
        return 1
    fi

    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" >/dev/null 2>&1; then
        echo "❌ Not authenticated with gcloud. Run 'gcloud auth login' first."
        echo "📋 Manual steps:"
        echo "   1. Go to Firebase Console > Project Settings > Service Accounts"
        echo "   2. Generate new private key"
        echo "   3. Update FIREBASE_SERVICE_ACCOUNT_KEY secret in GitHub"
        echo "   4. Update local .env files"
        return 1
    fi

    # Assume service account email from environment or default
    SA_EMAIL="${FIREBASE_SA_EMAIL:-your-sa@$ENVIRONMENT-project.iam.gserviceaccount.com}"
    PROJECT_ID="${FIREBASE_PROJECT_ID:-wishlist-wizard-$ENVIRONMENT}"

    echo "🔄 Creating new key for $SA_EMAIL in project $PROJECT_ID..."

    # Create new key
    NEW_KEY_FILE="/tmp/firebase-new-key.json"
    if gcloud iam service-accounts keys create "$NEW_KEY_FILE" \
        --iam-account="$SA_EMAIL" \
        --project="$PROJECT_ID" 2>/dev/null; then

        # Update GitHub secret
        if command -v gh >/dev/null 2>&1; then
            SECRET_NAME="FIREBASE_SERVICE_ACCOUNT_KEY_$ENVIRONMENT"
            gh secret set "$SECRET_NAME" --body "$(cat "$NEW_KEY_FILE")"
            echo "✅ Updated GitHub secret: $SECRET_NAME"
        else
            echo "⚠️  gh CLI not found. Manually update GitHub secret with content of $NEW_KEY_FILE"
        fi

        # List old keys and prompt for deletion (manual step)
        echo "📋 Old keys (delete manually in Google Cloud Console):"
        gcloud iam service-accounts keys list --iam-account="$SA_EMAIL" --project="$PROJECT_ID"

        rm -f "$NEW_KEY_FILE"
        echo "✅ Firebase rotation complete (manual cleanup required)"
    else
        echo "❌ Failed to create new Firebase key. Service account may not exist."
        echo "📋 Manual steps:"
        echo "   1. Go to Firebase Console > Project Settings > Service Accounts"
        echo "   2. Generate new private key"
        echo "   3. Update FIREBASE_SERVICE_ACCOUNT_KEY secret in GitHub"
        echo "   4. Update local .env files"
        return 1
    fi
}

# Function to rotate GitHub tokens (guidance only - manual process)
rotate_github() {
    echo "🔑 GitHub Token Rotation (Manual Process)"
    echo ""
    echo "📋 Steps to rotate GitHub Personal Access Token:"
    echo "1. Go to https://github.com/settings/tokens"
    echo "2. Generate new token with required permissions"
    echo "3. Update GitHub secrets in repository settings"
    echo "4. Update local .env files if needed"
    echo "5. Revoke old token"
    echo ""
    echo "⚠️  This cannot be fully automated due to GitHub UI requirements"
    echo "💡 Consider using GitHub App instead for better automation"
}

# Function to handle ASC key rotation guidance
rotate_asc() {
    echo "🔑 App Store Connect API Key Rotation (Manual Process)"
    echo ""
    echo "📋 Steps to rotate ASC API Key:"
    echo "1. Go to https://appstoreconnect.apple.com/access/api"
    echo "2. Click '+' to generate new API Key"
    echo "3. Download the .p8 file and note the Key ID"
    echo "4. Revoke the old key (ID: $(grep ASC_KEY_ID packages/mobile/ios/.env 2>/dev/null || echo 'UNKNOWN'))"
    echo ""
    echo "🔄 After getting new key, run:"
    echo "   ./scripts/update_asc_key.sh <new_key_id> <path_to_new_p8_file>"
    echo ""
    echo "⚠️  This cannot be fully automated due to App Store Connect UI requirements"
}

# Main logic
case "$SERVICE" in
    firebase)
        rotate_firebase
        ;;
    github)
        rotate_github
        ;;
    asc)
        rotate_asc
        ;;
    all)
        echo "🔄 Rotating all secrets..."
        rotate_firebase || echo "⚠️  Firebase rotation failed, continuing..."
        rotate_github || echo "⚠️  GitHub rotation failed, continuing..."
        rotate_asc || echo "⚠️  ASC rotation failed, continuing..."
        ;;
    *)
        echo "❌ Unknown service: $SERVICE. Use: firebase, github, asc, or all"
        exit 1
        ;;
esac

echo "🔄 Secret rotation complete. Manual steps required for App Store Connect, Slack, and runner tokens."
echo "📝 Next: Update CI secrets and test rotations."