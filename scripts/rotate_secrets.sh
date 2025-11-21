#!/usr/bin/env bash
# scripts/rotate_secrets.sh
# Automates secret rotations where possible (ZERO-TOUCH where APIs allow)
# Usage: ./scripts/rotate_secrets.sh [service]
# Services: firebase, github, all

set -euo pipefail

SERVICE="${1:-all}"
ENVIRONMENT="${ENVIRONMENT:-PRODUCTION}"  # Default to PRODUCTION; override with env var

echo "🔄 Starting secret rotation for service: $SERVICE (Environment: $ENVIRONMENT)"

# Function to rotate Firebase service account keys
rotate_firebase() {
    echo "🔑 Rotating Firebase service account key..."
    if ! command -v gcloud >/dev/null 2>&1; then
        echo "❌ gcloud CLI not found. Install Google Cloud SDK first."
        return 1
    fi

    # Assume service account email from environment or default
    SA_EMAIL="${FIREBASE_SA_EMAIL:-your-sa@$ENVIRONMENT-project.iam.gserviceaccount.com}"
    PROJECT_ID="${FIREBASE_PROJECT_ID:-wishlist-wizard-$ENVIRONMENT}"

    # Create new key
    NEW_KEY_FILE="/tmp/firebase-new-key.json"
    gcloud iam service-accounts keys create "$NEW_KEY_FILE" \
        --iam-account="$SA_EMAIL" \
        --project="$PROJECT_ID"

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
}

# Function to revoke GitHub PATs (requires token list; creation is manual)
rotate_github() {
    echo "🔑 Rotating GitHub PATs..."
    if ! command -v gh >/dev/null 2>&1; then
        echo "❌ gh CLI not found. Install GitHub CLI first."
        return 1
    fi

    # List and revoke old tokens (assumes you have admin access)
    echo "📋 Listing GitHub tokens (revoke manually in UI):"
    gh auth token --list || echo "⚠️  Cannot list tokens; revoke manually at https://github.com/settings/tokens"

    echo "✅ GitHub rotation: Revoke old tokens manually and create new ones via UI/API"
}

# Main logic
case "$SERVICE" in
    firebase)
        rotate_firebase
        ;;
    github)
        rotate_github
        ;;
    all)
        rotate_firebase
        rotate_github
        ;;
    *)
        echo "❌ Unknown service: $SERVICE. Use: firebase, github, or all"
        exit 1
        ;;
esac

echo "🔄 Secret rotation complete. Manual steps required for App Store Connect, Slack, and runner tokens."
echo "📝 Next: Update CI secrets and test rotations."