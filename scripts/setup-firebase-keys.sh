#!/bin/bash
# scripts/setup-firebase-keys.sh
# Setup Firebase service account keys for all environments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if gcloud is authenticated
check_gcloud_auth() {
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" >/dev/null 2>&1; then
        log_error "gcloud not authenticated. Run: gcloud auth login"
        exit 1
    fi
    log_success "gcloud authenticated"
}

# Setup Firebase service account key for environment
setup_firebase_key() {
    local env="$1"
    local project_id="wishlist-wizard-${env}"

    log_info "Setting up Firebase key for $env environment..."

    # Check if project exists
    if ! gcloud projects describe "$project_id" >/dev/null 2>&1; then
        log_error "Firebase project $project_id does not exist or not accessible"
        return 1
    fi

    # Find or create service account
    local sa_email="firebase-adminsdk-${env}@${project_id}.iam.gserviceaccount.com"

    if ! gcloud iam service-accounts describe "$sa_email" --project="$project_id" >/dev/null 2>&1; then
        log_info "Creating service account: $sa_email"
        gcloud iam service-accounts create "firebase-adminsdk-${env}" \
            --description="Firebase Admin SDK Service Account for $env" \
            --display-name="Firebase Admin SDK ($env)" \
            --project="$project_id"
    else
        log_info "Service account already exists: $sa_email"
    fi

    # Create key file
    local key_file="${PROJECT_ROOT}/firebase-service-account-${env}.json"
    local mobile_key_file="${PROJECT_ROOT}/packages/mobile/ios/service-account-key-${env}.json"

    log_info "Creating new service account key..."
    gcloud iam service-accounts keys create "$key_file" \
        --iam-account="$sa_email" \
        --project="$project_id"

    # Copy to mobile directory for iOS builds
    cp "$key_file" "$mobile_key_file"
    log_success "Created Firebase service account key for $env"

    # Set appropriate permissions
    chmod 600 "$key_file" "$mobile_key_file"

    # Update GitHub secret (if gh CLI available)
    if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
        local secret_name="FIREBASE_SERVICE_ACCOUNT_KEY_$(echo "$env" | tr '[:lower:]' '[:upper:]')"
        log_info "Updating GitHub secret: $secret_name"
        gh secret set "$secret_name" --body "$(cat "$key_file")" --repo mnelson3/wishlist-wizard
        log_success "Updated GitHub secret"
    else
        log_warning "GitHub CLI not available or not authenticated"
        log_info "Manual step: Update GitHub secret FIREBASE_SERVICE_ACCOUNT_KEY_$(echo "$env" | tr '[:lower:]' '[:upper:]') with contents of $key_file"
    fi

    echo "$key_file"
}

# Main function
main() {
    echo "🔥 Firebase Service Account Key Setup"
    echo "====================================="

    check_gcloud_auth

    local environments=("dev" "staging" "prod")
    local key_files=()

    for env in "${environments[@]}"; do
        if key_file=$(setup_firebase_key "$env"); then
            key_files+=("$key_file")
        else
            log_warning "Failed to setup $env environment"
        fi
    done

    echo ""
    log_success "Firebase service account keys setup complete!"
    echo ""
    echo "📁 Key files created:"
    for key_file in "${key_files[@]}"; do
        echo "   $key_file"
    done
    echo ""
    echo "🔒 Security notes:"
    echo "   - Keys are encrypted in GitHub secrets"
    echo "   - Local key files have restricted permissions (600)"
    echo "   - Rotate keys regularly using: ./scripts/rotate_secrets.sh firebase"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Test mobile builds with new keys"
    echo "   2. Verify Firebase deployments work"
    echo "   3. Run: ./automate.sh health"
}

# Run main function
main "$@"