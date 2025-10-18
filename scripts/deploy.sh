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

# Main deployment function
deploy_component() {
    local component=$1
    local deploy_target=$2
    
    log_info "Deploying $component to $deploy_target..."
    
    case $component in
        "web")
            if [[ $deploy_target == "firebase" ]]; then
                cd packages/web
                if command_exists firebase; then
                    firebase deploy --only hosting
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
                    firebase deploy --only functions
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
                    firebase deploy --only hosting
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
    log_info "Building all components..."
    
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
    echo "Usage: $0 [OPTION]"
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
    echo "Examples:"
    echo "  $0 build"
    echo "  $0 deploy-all"
    echo "  $0 deploy-web"
}

# Main script logic
case ${1:-help} in
    "build")
        build_all
        ;;
    "deploy-web")
        build_all
        deploy_component "web" "firebase"
        ;;
    "deploy-api")
        build_all
        deploy_component "api-server" "firebase"
        ;;
    "deploy-mobile")
        build_all
        deploy_component "mobile" "firebase"
        ;;
    "deploy-all")
        build_all
        deploy_component "web" "firebase"
        deploy_component "api-server" "firebase"
        deploy_component "mobile" "firebase"
        deploy_component "extension" "package"
        log_success "All components deployed!"
        ;;
    "package-ext")
        build_all
        deploy_component "extension" "package"
        ;;
    "help"|*)
        show_usage
        ;;
esac