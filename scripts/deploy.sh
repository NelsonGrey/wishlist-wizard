#!/bin/bash

# 🚀 Wishlist Wizard - Manual Deployment Script
# This script allows for manual deployment of all components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

get_project_id_from_alias() {
    local alias="$1"
    node -e "const fs=require('fs');const rc=JSON.parse(fs.readFileSync('.firebaserc','utf8'));const id=rc.projects&&rc.projects['$alias'];if(!id){process.exit(1)};process.stdout.write(id);"
}

export_firebase_web_env() {
    local environment="$1"
    local firebase_project_alias="$2"
    local env_upper
    env_upper="$(echo "$environment" | tr '[:lower:]' '[:upper:]')"

    local project_id
    if ! project_id="$(get_project_id_from_alias "$firebase_project_alias" 2>/dev/null)"; then
        log_warning "Unable to resolve Firebase project id for alias '$firebase_project_alias'."
        return 0
    fi

    local init_url="https://${project_id}.web.app/__/firebase/init.json"
    local init_json
    init_json="$(curl -sfL "$init_url" || true)"
    if [[ -z "$init_json" ]]; then
        log_warning "Unable to load Firebase web config from $init_url. Using existing environment variables."
        return 0
    fi

    # Export both suffixed and plain VITE_FIREBASE_* values for Vite build.
    export FIREBASE_INIT_JSON="$init_json"
    eval "$(node - <<'NODE'
const cfg = JSON.parse(process.env.FIREBASE_INIT_JSON || '{}');
function out(name, value) {
  const v = String(value || '');
  process.stdout.write(`${name}='${v.replace(/'/g, "'\\''")}'\n`);
}
out('FW_API_KEY', cfg.apiKey);
out('FW_AUTH_DOMAIN', cfg.authDomain);
out('FW_PROJECT_ID', cfg.projectId);
out('FW_STORAGE_BUCKET', cfg.storageBucket);
out('FW_MESSAGING_SENDER_ID', cfg.messagingSenderId);
out('FW_APP_ID', cfg.appId);
out('FW_MEASUREMENT_ID', cfg.measurementId);
NODE
)"
    unset FIREBASE_INIT_JSON

    export "VITE_FIREBASE_API_KEY_${env_upper}=$FW_API_KEY"
    export "VITE_FIREBASE_AUTH_DOMAIN_${env_upper}=$FW_AUTH_DOMAIN"
    export "VITE_FIREBASE_PROJECT_ID_${env_upper}=$FW_PROJECT_ID"
    export "VITE_FIREBASE_STORAGE_BUCKET_${env_upper}=$FW_STORAGE_BUCKET"
    export "VITE_FIREBASE_MESSAGING_SENDER_ID_${env_upper}=$FW_MESSAGING_SENDER_ID"
    export "VITE_FIREBASE_APP_ID_${env_upper}=$FW_APP_ID"
    export "VITE_FIREBASE_MEASUREMENT_ID_${env_upper}=$FW_MEASUREMENT_ID"

    export VITE_FIREBASE_API_KEY="$FW_API_KEY"
    export VITE_FIREBASE_AUTH_DOMAIN="$FW_AUTH_DOMAIN"
    export VITE_FIREBASE_PROJECT_ID="$FW_PROJECT_ID"
    export VITE_FIREBASE_STORAGE_BUCKET="$FW_STORAGE_BUCKET"
    export VITE_FIREBASE_MESSAGING_SENDER_ID="$FW_MESSAGING_SENDER_ID"
    export VITE_FIREBASE_APP_ID="$FW_APP_ID"
    export VITE_FIREBASE_MEASUREMENT_ID="$FW_MEASUREMENT_ID"
    export VITE_ENVIRONMENT="$environment"

    log_info "Loaded Firebase web config for $environment from ${project_id}.web.app"
}

resolve_environment() {
    local requested_env="$1"
    if [[ -n "$requested_env" ]]; then
        echo "$requested_env"
        return
    fi

    local branch
    branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
    case "$branch" in
        main)
            echo "production"
            ;;
        staging)
            echo "staging"
            ;;
        develop)
            echo "development"
            ;;
        *)
            log_warning "Unknown branch '$branch'. Defaulting deploy environment to development."
            echo "development"
            ;;
    esac
}

resolve_project_alias() {
    local environment="$1"
    case "$environment" in
        production)
            echo "production"
            ;;
        staging)
            echo "staging"
            ;;
        development)
            echo "development"
            ;;
        *)
            log_error "Invalid environment '$environment'. Use: development | staging | production"
            return 1
            ;;
    esac
}

# Main deployment function
deploy_component() {
    local component=$1
    local deploy_target=$2
    local firebase_project_alias=$3
    
    log_info "Deploying $component to $deploy_target..."
    
    case $component in
        "web")
            if [[ $deploy_target == "firebase" ]]; then
                cd packages/web
                if command_exists firebase; then
                    firebase deploy --only hosting --project "$firebase_project_alias"
                    log_success "Web app deployed to Firebase Hosting"
                else
                    log_error "Firebase CLI not found. Install with: npm i -g firebase-tools"
                    return 1
                fi
                cd ../..
            fi
            ;;
        "api-server")
            if [[ $deploy_target == "firebase" ]]; then
                cd packages/functions
                if command_exists firebase; then
                    firebase deploy --only functions --project "$firebase_project_alias"
                    log_success "API server deployed to Firebase Functions"
                else
                    log_error "Firebase CLI not found. Install with: npm i -g firebase-tools"
                    return 1
                fi
                cd ../..
            fi
            ;;
        "mobile")
            if [[ $deploy_target == "firebase" ]]; then
                cd packages/mobile
                if command_exists firebase; then
                    firebase deploy --only hosting --project "$firebase_project_alias"
                    log_success "Mobile PWA deployed to Firebase Hosting"
                else
                    log_error "Firebase CLI not found. Install with: npm i -g firebase-tools"
                    return 1
                fi
                cd ../..
            fi
            ;;
        "extension")
            log_info "Chrome extension package created: wishlist-wizard-extension.zip"
            log_warning "Manual submission to Chrome Web Store required"
            ;;
    esac
}

# Build all components
build_all() {
    local environment="$1"
    local firebase_project_alias="$2"
    log_info "Building all components..."

    export_firebase_web_env "$environment" "$firebase_project_alias"
    
    # Install dependencies
    npm ci
    
    # Build all packages
    npm run build
    
    # Build Flutter mobile app
    if command_exists flutter; then
        cd packages/mobile
        flutter build web --release
        cd ../..
        log_success "Flutter mobile app built"
    else
        log_warning "Flutter not found. Skipping mobile app build."
    fi
    
    # Create extension package
    mkdir -p chrome-extension-package
    cp -r packages/browser-extension/dist/* chrome-extension-package/
    cp packages/browser-extension/manifest.json chrome-extension-package/
    cp -r packages/browser-extension/public/icons chrome-extension-package/
    cd chrome-extension-package
    zip -r ../wishlist-wizard-extension.zip .
    cd ..
    
    log_success "All components built successfully"
}

# Show usage
show_usage() {
    echo "🚀 Wishlist Wizard Deployment Script"
    echo ""
    echo "Usage: $0 [OPTION] [ENVIRONMENT]"
    echo ""
    echo "Options:"
    echo "  build           Build all components"
    echo "  deploy-web      Deploy web app to Firebase Hosting"
    echo "  deploy-api      Deploy API server to Firebase Functions"
    echo "  deploy-mobile   Deploy mobile PWA to Firebase Hosting"
    echo "  deploy-all      Deploy all components"
    echo "  package-ext     Create Chrome extension package"
    echo "  help            Show this help message"
    echo ""
    echo "Environment (optional): development | staging | production"
    echo "If omitted, environment is inferred from current branch:"
    echo "  develop -> development, staging -> staging, main -> production"
    echo ""
    echo "Examples:"
    echo "  $0 build"
    echo "  $0 deploy-all"
    echo "  $0 deploy-web"
    echo "  $0 deploy-web development"
}

# Optional second argument: explicit deploy environment
DEPLOY_ENVIRONMENT="$(resolve_environment "${2:-}")"
FIREBASE_PROJECT_ALIAS="$(resolve_project_alias "$DEPLOY_ENVIRONMENT")" || exit 1
log_info "Resolved deploy environment: $DEPLOY_ENVIRONMENT (firebase project alias: $FIREBASE_PROJECT_ALIAS)"

# Main script logic
case ${1:-help} in
    "build")
        build_all "$DEPLOY_ENVIRONMENT" "$FIREBASE_PROJECT_ALIAS"
        ;;
    "deploy-web")
        build_all "$DEPLOY_ENVIRONMENT" "$FIREBASE_PROJECT_ALIAS"
        deploy_component "web" "firebase" "$FIREBASE_PROJECT_ALIAS"
        ;;
    "deploy-api")
        build_all "$DEPLOY_ENVIRONMENT" "$FIREBASE_PROJECT_ALIAS"
        deploy_component "api-server" "firebase" "$FIREBASE_PROJECT_ALIAS"
        ;;
    "deploy-mobile")
        build_all "$DEPLOY_ENVIRONMENT" "$FIREBASE_PROJECT_ALIAS"
        deploy_component "mobile" "firebase" "$FIREBASE_PROJECT_ALIAS"
        ;;
    "deploy-all")
        build_all "$DEPLOY_ENVIRONMENT" "$FIREBASE_PROJECT_ALIAS"
        deploy_component "web" "firebase" "$FIREBASE_PROJECT_ALIAS"
        deploy_component "api-server" "firebase" "$FIREBASE_PROJECT_ALIAS"
        deploy_component "mobile" "firebase" "$FIREBASE_PROJECT_ALIAS"
        deploy_component "extension" "package"
        log_success "All components deployed!"
        ;;
    "package-ext")
        build_all "$DEPLOY_ENVIRONMENT" "$FIREBASE_PROJECT_ALIAS"
        deploy_component "extension" "package"
        ;;
    "help"|*)
        show_usage
        ;;
esac
