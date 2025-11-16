#!/bin/bash

# 🌍 Environment & Secret Management System
# Centralized management of all environments, secrets, and configurations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-development}"
ACTION="${2:-status}"
SECRET_NAME="${3:-}"

# Environment configurations (Bash 3.2 compatible)
ENV_CONFIGS_development="wishlist-wizard-dev"
ENV_CONFIGS_staging="wishlist-wizard-staging"
ENV_CONFIGS_production="wishlist-wizard-prod"

# Helper functions
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

log_header() {
    echo -e "${PURPLE}🌍 $1${NC}"
    echo -e "${PURPLE}$(printf '%.0s=' {1..50})${NC}"
}

# Validate environment
validate_environment() {
    local valid_envs="development staging production"
    if [[ ! "$valid_envs" =~ "$ENVIRONMENT" ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        echo "Valid environments: development, staging, production"
        exit 1
    fi
}

# Get Firebase project ID
get_firebase_project() {
    eval "echo \$ENV_CONFIGS_$ENVIRONMENT"
}

# Generate secure random values
generate_secret() {
    local length="${1:-32}"
    openssl rand -hex "$length"
}

generate_password() {
    local length="${1:-24}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Environment file management
manage_env_files() {
    log_header "Environment File Management"

    ENV_FILE=".env.${ENVIRONMENT}"
    EXAMPLE_FILE=".env.${ENVIRONMENT}.example"

    if [ ! -f "$ENV_FILE" ]; then
        log_info "Creating environment file: $ENV_FILE"

        # Create example file first
        cat > "$EXAMPLE_FILE" << EOF
# ${ENVIRONMENT^} Environment Configuration
# Copy this file to .env.${ENVIRONMENT} and fill in the values

# Node.js Environment
NODE_ENV=${ENVIRONMENT}

# Firebase Configuration
FIREBASE_PROJECT_ID=${ENV_CONFIGS[$ENVIRONMENT]}
FIREBASE_API_KEY=your_firebase_api_key_here
FIREBASE_AUTH_DOMAIN=${ENV_CONFIGS[$ENVIRONMENT]}.firebaseapp.com
FIREBASE_STORAGE_BUCKET=${ENV_CONFIGS[$ENVIRONMENT]}.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id

# API Configuration
API_BASE_URL=https://api.${ENV_CONFIGS[$ENVIRONMENT]}.web.app
API_TIMEOUT=30000

# Web App Configuration
VITE_API_BASE_URL=https://api.${ENV_CONFIGS[$ENVIRONMENT]}.web.app
VITE_ENVIRONMENT=${ENVIRONMENT}
VITE_DEBUG=false
VITE_ANALYTICS_ID=
VITE_SENTRY_DSN=

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/wishlist_wizard_${ENVIRONMENT}

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
SESSION_SECRET=your_session_secret_here

# Third-party Services
STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key_here
STRIPE_SECRET_KEY=sk_test_or_live_key_here
STRIPE_WEBHOOK_SECRET=whsec_webhook_secret_here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Social Auth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Mobile App Configuration
MOBILE_BUNDLE_ID=com.nelsongrey.wishlistwizard.mobile
MOBILE_ANDROID_PACKAGE=com.nelsongrey.wishlistwizard.mobile

# Apple Services (Production/Staging only)
ASC_KEY_ID=your_asc_key_id
ASC_ISSUER_ID=your_asc_issuer_id
ASC_PRIVATE_KEY=-----BEGIN APP_STORE_CONNECT_KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----
FASTLANE_APPLE_ID=your_apple_id@email.com
FASTLANE_TEAM_ID=your_team_id
FASTLANE_ITC_TEAM_ID=your_itc_team_id

# Google Play Store (Production/Staging only)
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
ANDROID_KEYSTORE_PASSWORD=your_keystore_password
ANDROID_KEY_ALIAS=your_key_alias

# Chrome Web Store
CHROME_EXTENSION_ID=your_extension_id
CHROME_CLIENT_ID=your_chrome_client_id
CHROME_CLIENT_SECRET=your_chrome_client_secret
CHROME_REFRESH_TOKEN=your_refresh_token

# Docker Configuration
DOCKER_REGISTRY=your_registry_url
DOCKER_USERNAME=your_registry_username
DOCKER_PASSWORD=your_registry_password

# Monitoring & Logging
LOG_LEVEL=info
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
NEW_RELIC_LICENSE_KEY=your_new_relic_key

# Feature Flags
ENABLE_ANALYTICS=false
ENABLE_ERROR_REPORTING=false
ENABLE_DEBUG_TOOLS=false
ENABLE_SOCIAL_AUTH=false
ENABLE_PAYMENTS=false
EOF

        # Create actual environment file with generated secrets
        cp "$EXAMPLE_FILE" "$ENV_FILE"

        # Generate secure secrets
        JWT_SECRET=$(generate_secret 32)
        ENCRYPTION_KEY=$(generate_secret 32)
        SESSION_SECRET=$(generate_secret 32)
        DB_PASSWORD=$(generate_password 16)

        # Update with generated values
        sed -i.bak "s/your_jwt_secret_here/$JWT_SECRET/" "$ENV_FILE"
        sed -i.bak "s/your_encryption_key_here/$ENCRYPTION_KEY/" "$ENV_FILE"
        sed -i.bak "s/your_session_secret_here/$SESSION_SECRET/" "$ENV_FILE"
        sed -i.bak "s/password/$DB_PASSWORD/" "$ENV_FILE"

        rm "${ENV_FILE}.bak"

        log_success "Environment file created with generated secrets"
        log_warning "Review and update $ENV_FILE with your actual service credentials"
    else
        log_info "Environment file already exists: $ENV_FILE"
    fi
}

# GitHub Secrets management
manage_github_secrets() {
    log_header "GitHub Secrets Management"

    if [ ! -f ".env.${ENVIRONMENT}" ]; then
        log_error "Environment file .env.${ENVIRONMENT} not found. Run 'env setup' first."
        exit 1
    fi

    log_info "Updating GitHub repository secrets for $ENVIRONMENT..."

    # Load environment variables
    source ".env.${ENVIRONMENT}"

    # Define secrets to sync (Bash 3.2 compatible)
    GITHUB_SECRETS_FIREBASE_SERVICE_ACCOUNT_KEY="${FIREBASE_SERVICE_ACCOUNT_KEY}"
    GITHUB_SECRETS_VITE_FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY}"
    GITHUB_SECRETS_VITE_FIREBASE_AUTH_DOMAIN="${VITE_FIREBASE_AUTH_DOMAIN}"
    GITHUB_SECRETS_VITE_FIREBASE_PROJECT_ID="${VITE_FIREBASE_PROJECT_ID}"
    GITHUB_SECRETS_VITE_FIREBASE_STORAGE_BUCKET="${VITE_FIREBASE_STORAGE_BUCKET}"
    GITHUB_SECRETS_VITE_FIREBASE_MESSAGING_SENDER_ID="${VITE_FIREBASE_MESSAGING_SENDER_ID}"
    GITHUB_SECRETS_VITE_FIREBASE_APP_ID="${VITE_FIREBASE_APP_ID}"
    GITHUB_SECRETS_VITE_API_BASE_URL="${VITE_API_BASE_URL}"
    GITHUB_SECRETS_DATABASE_URL="${DATABASE_URL}"
    GITHUB_SECRETS_JWT_SECRET="${JWT_SECRET}"
    GITHUB_SECRETS_ENCRYPTION_KEY="${ENCRYPTION_KEY}"
    GITHUB_SECRETS_VITE_STRIPE_PUBLISHABLE_KEY="${VITE_STRIPE_PUBLISHABLE_KEY}"
    GITHUB_SECRETS_STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY}"
    GITHUB_SECRETS_STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET}"

    # Mobile app secrets (production/staging only)
    if [[ "$ENVIRONMENT" == "production" || "$ENVIRONMENT" == "staging" ]]; then
        GITHUB_SECRETS_ASC_KEY_ID="${ASC_KEY_ID}"
        GITHUB_SECRETS_ASC_ISSUER_ID="${ASC_ISSUER_ID}"
        GITHUB_SECRETS_ASC_PRIVATE_KEY="${ASC_PRIVATE_KEY}"
        GITHUB_SECRETS_FASTLANE_APPLE_ID="${FASTLANE_APPLE_ID}"
        GITHUB_SECRETS_FASTLANE_TEAM_ID="${FASTLANE_TEAM_ID}"
        GITHUB_SECRETS_FASTLANE_ITC_TEAM_ID="${FASTLANE_ITC_TEAM_ID}"
        GITHUB_SECRETS_GOOGLE_PLAY_SERVICE_ACCOUNT_KEY="${GOOGLE_PLAY_SERVICE_ACCOUNT_KEY}"
    fi

    # Chrome extension secrets
    GITHUB_SECRETS_CHROME_EXTENSION_ID="${CHROME_EXTENSION_ID}"
    GITHUB_SECRETS_CHROME_CLIENT_ID="${CHROME_CLIENT_ID}"
    GITHUB_SECRETS_CHROME_CLIENT_SECRET="${CHROME_CLIENT_SECRET}"
    GITHUB_SECRETS_CHROME_REFRESH_TOKEN="${CHROME_REFRESH_TOKEN}"

    # Sync secrets to GitHub
    for secret_var in $(env | grep "^GITHUB_SECRETS_" | cut -d= -f1); do
        secret_name=$(echo "$secret_var" | sed 's/GITHUB_SECRETS_//')
        secret_value=$(eval "echo \$$secret_var")

        if [ -n "$secret_value" ] && [ "$secret_value" != "your_"* ]; then
            echo -n "$secret_value" | gh secret set "${secret_name}_${ENVIRONMENT}" --repo mnelson3/wishlist-wizard 2>/dev/null || \
            echo -n "$secret_value" | gh secret set "$secret_name" --repo mnelson3/wishlist-wizard
            log_success "Updated GitHub secret: $secret_name"
        else
            log_warning "Skipped empty/placeholder secret: $secret_name"
        fi
    done

    log_success "GitHub secrets synchronization completed"
}

# Firebase configuration management
manage_firebase_config() {
    log_header "Firebase Configuration Management"

    if [ ! -f ".env.${ENVIRONMENT}" ]; then
        log_error "Environment file .env.${ENVIRONMENT} not found. Run 'env setup' first."
        exit 1
    fi

    source ".env.${ENVIRONMENT}"
    PROJECT_ID=$(get_firebase_project)

    log_info "Configuring Firebase project: $PROJECT_ID"

    # Create/update Firebase configuration
    cat > "firebase.${ENVIRONMENT}.json" << EOF
{
  "projects": {
    "default": "${PROJECT_ID}"
  },
  "targets": {
    "${PROJECT_ID}": {
      "hosting": {
        "wishlist-wizard-${ENVIRONMENT}": [
          "packages/web"
        ]
      },
      "functions": {
        "wishlist-wizard-${ENVIRONMENT}": [
          "packages/functions"
        ]
      }
    }
  },
  "deploy": {
    "targets": {
      "wishlist-wizard-${ENVIRONMENT}": {
        "project": "${PROJECT_ID}",
        "hosting": {
          "wishlist-wizard-${ENVIRONMENT}": "packages/web"
        },
        "functions": {
          "wishlist-wizard-${ENVIRONMENT}": "packages/functions"
        }
      }
    }
  }
}
EOF

    # Deploy Firebase configuration
    firebase use "$PROJECT_ID"
    firebase deploy --only hosting,functions --project "$PROJECT_ID"

    log_success "Firebase configuration deployed"
}

# Secret rotation
rotate_secrets() {
    log_header "Secret Rotation"

    if [ ! -f ".env.${ENVIRONMENT}" ]; then
        log_error "Environment file .env.${ENVIRONMENT} not found."
        exit 1
    fi

    log_info "Rotating secrets for $ENVIRONMENT environment..."

    # Backup current environment
    cp ".env.${ENVIRONMENT}" ".env.${ENVIRONMENT}.backup.$(date +%Y%m%d_%H%M%S)"

    # Generate new secrets
    NEW_JWT_SECRET=$(generate_secret 32)
    NEW_ENCRYPTION_KEY=$(generate_secret 32)
    NEW_SESSION_SECRET=$(generate_secret 32)
    NEW_DB_PASSWORD=$(generate_password 16)

    # Update environment file
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" ".env.${ENVIRONMENT}"
    sed -i.bak "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$NEW_ENCRYPTION_KEY/" ".env.${ENVIRONMENT}"
    sed -i.bak "s/SESSION_SECRET=.*/SESSION_SECRET=$NEW_SESSION_SECRET/" ".env.${ENVIRONMENT}"
    sed -i.bak "s/postgresql:\/\/\([^:]*\):[^@]*/postgresql:\/\/\1:$NEW_DB_PASSWORD/" ".env.${ENVIRONMENT}"

    rm ".env.${ENVIRONMENT}.bak"

    # Update database password (this would need customization for your DB)
    log_warning "Database password changed - update your database manually"

    # Sync to GitHub secrets
    manage_github_secrets

    log_success "Secrets rotated and synchronized"
    log_warning "Update your database with the new password: $NEW_DB_PASSWORD"
}

# Environment status
show_status() {
    log_header "Environment Status - $ENVIRONMENT"

    ENV_FILE=".env.${ENVIRONMENT}"
    PROJECT_ID=$(get_firebase_project)

    echo "Environment: $ENVIRONMENT"
    echo "Firebase Project: $PROJECT_ID"
    echo ""

    # Check environment file
    if [ -f "$ENV_FILE" ]; then
        log_success "Environment file exists: $ENV_FILE"

        # Count configured secrets
        total_secrets=$(grep -c "^[A-Z_][A-Z0-9_]*=" "$ENV_FILE" 2>/dev/null | tr -d '\n' || echo "0")
        placeholder_secrets=$(grep -c "your_" "$ENV_FILE" 2>/dev/null | tr -d '\n' || echo "0")
        configured_secrets=$(( ${total_secrets:-0} - ${placeholder_secrets:-0} ))

        echo "Secrets configured: $configured_secrets / $total_secrets"
        echo ""
    else
        log_error "Environment file missing: $ENV_FILE"
        echo "Run: $0 $ENVIRONMENT setup"
        return
    fi

    # Check Firebase access
    if firebase projects:list | grep -q "$PROJECT_ID"; then
        log_success "Firebase project accessible: $PROJECT_ID"
    else
        log_error "Firebase project not accessible: $PROJECT_ID"
    fi

    # Check GitHub secrets
    if gh secret list --repo mnelson3/wishlist-wizard | grep -q "FIREBASE_SERVICE_ACCOUNT_KEY_${ENVIRONMENT}"; then
        log_success "GitHub secrets configured"
    else
        log_warning "GitHub secrets not configured"
        echo "Run: $0 $ENVIRONMENT sync-secrets"
    fi

    # Check running services
    echo ""
    echo "Service Status:"
    if curl -s --max-time 5 "https://$PROJECT_ID.web.app" | grep -q "wishlist"; then
        log_success "Web app: Running"
    else
        log_warning "Web app: Not accessible"
    fi

    if curl -s --max-time 5 "https://us-central1-$PROJECT_ID.cloudfunctions.net/api/health" | grep -q "ok"; then
        log_success "API: Running"
    else
        log_warning "API: Not accessible"
    fi
}

# Main environment management workflow
main() {
    validate_environment

    case $ACTION in
        "setup")
            manage_env_files
            ;;
        "sync-secrets")
            manage_github_secrets
            ;;
        "firebase-config")
            manage_firebase_config
            ;;
        "rotate-secrets")
            rotate_secrets
            ;;
        "status")
            show_status
            ;;
        "full-setup")
            manage_env_files
            manage_github_secrets
            manage_firebase_config
            ;;
        *)
            log_error "Unknown action: $ACTION"
            echo ""
            echo "Usage: $0 ENVIRONMENT ACTION [SECRET_NAME]"
            echo ""
            echo "Actions:"
            echo "  setup          Create environment files with generated secrets"
            echo "  sync-secrets   Sync secrets to GitHub repository"
            echo "  firebase-config Configure Firebase project"
            echo "  rotate-secrets Rotate all secrets and sync"
            echo "  status         Show environment status"
            echo "  full-setup     Complete environment setup"
            echo ""
            echo "Environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"