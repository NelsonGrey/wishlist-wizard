#!/bin/bash

# Cross-Browser Extension Build System
# Builds extension for Chrome, Edge, Firefox, and Safari
# Usage: ./build-extension.sh [chrome|firefox|safari|edge|all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_ROOT/dist"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Clean dist directory
clean_dist() {
    log_info "Cleaning dist directory..."
    rm -rf "$DIST_DIR"
    mkdir -p "$DIST_DIR"
    log_success "Cleaned"
}

# Build extension assets using Vite
build_assets() {
    local target=$1
    log_info "Building assets for $target with Vite..."
    
    # Vite builds to a default location; we'll organize it
    npm run build > /dev/null 2>&1
    
    log_success "Assets built"
}

# Copy assets to browser-specific directory
copy_assets() {
    local browser=$1
    local src_dir="$DIST_DIR/temp"  # Vite default output
    local target_dir="$DIST_DIR/$browser"
    
    log_info "Organizing assets for $browser..."
    
    mkdir -p "$target_dir"
    
    # Copy all built assets
    if [ -d "$src_dir" ]; then
        cp -r "$src_dir"/* "$target_dir/" 2>/dev/null || true
    fi
    
    # Copy source files (for now; ideally Vite would bundle everything)
    cp -r "$PROJECT_ROOT/src"/* "$target_dir/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/public"/* "$target_dir/" 2>/dev/null || true
    
    log_success "Assets organized for $browser"
}

# Generate manifest for specific browser
generate_manifest() {
    local browser=$1
    log_info "Generating manifest for $browser..."
    
    node "$SCRIPT_DIR/build-manifests.mjs" "$browser"
}

# Build for a specific browser
build_browser() {
    local browser=$1
    log_info "Building $browser extension..."
    
    build_assets "$browser"
    copy_assets "$browser"
    generate_manifest "$browser"
    
    log_success "$browser extension ready: $DIST_DIR/$browser/"
}

# Create simple test to verify structure
verify_build() {
    local browser=$1
    local dir="$DIST_DIR/$browser"
    
    log_info "Verifying $browser build..."
    
    # Check for manifest
    if [ ! -f "$dir/manifest.json" ]; then
        log_error "Missing manifest.json in $dir"
        return 1
    fi
    
    # Check manifest is valid JSON
    if ! jq empty "$dir/manifest.json" 2>/dev/null; then
        log_error "Invalid JSON in manifest.json"
        return 1
    fi
    
    # Check for popup
    if [ ! -f "$dir/popup.html" ] && [ ! -f "$dir/popup/index.html" ]; then
        log_warn "Missing popup.html (might be in subdirectory)"
    fi
    
    log_success "$browser build verified"
}

# Build all browsers
build_all() {
    log_info "Building extensions for all browsers..."
    echo ""
    
    clean_dist
    
    for browser in chrome edge firefox safari; do
        echo ""
        build_browser "$browser"
        verify_build "$browser"
    done
    
    echo ""
    echo -e "${GREEN}═════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ All browser extensions built successfully!${NC}"
    echo -e "${GREEN}═════════════════════════════════════════${NC}"
    echo ""
    
    print_next_steps
}

# Print submission instructions
print_next_steps() {
    cat << 'EOF'

📦 NEXT STEPS - PREPARING FOR SUBMISSION:

1. CREATE STORE ASSETS:
   └─ Prepare screenshots for each store
   └─ Create privacy policy
   └─ Create store descriptions

2. PACKAGE FOR SUBMISSION:
   └─ Chrome:   zip -r wishlist-wizard-chrome.zip dist/chrome/
   └─ Firefox:  zip -r wishlist-wizard-firefox.zip dist/firefox/
   └─ Edge:     zip -r wishlist-wizard-edge.zip dist/edge/
   └─ Safari:   Use Xcode project (see docs/EXTENSION_STORE_SUBMISSION_RUNBOOK.md)

3. SUBMIT TO STORES:
   └─ Chrome Web Store:      https://chrome.google.com/webstore
   └─ Mozilla Add-ons:        https://addons.mozilla.org
   └─ Microsoft Edge Add-ons: https://microsoftedge.microsoft.com/addons
   └─ App Store (Safari):     https://developer.apple.com/app-store

📋 Run `npm run build:all` to rebuild anytime

EOF
}

# Show usage
show_usage() {
    cat << 'EOF'
Cross-Browser Extension Build System

USAGE:
  ./build-extension.sh [TARGET]

TARGETS:
  chrome    Build for Chrome (Manifest V3)
  edge      Build for Edge (Manifest V3)
  firefox   Build for Firefox (Manifest V2)
  safari    Build for Safari (Manifest V3)
  all       Build for all browsers (default)

EXAMPLES:
  ./build-extension.sh chrome      # Build Chrome only
  ./build-extension.sh all         # Build all browsers
  ./build-extension.sh             # Same as 'all'

ENVIRONMENT:
  PROJECT_ROOT: $PROJECT_ROOT
  DIST_DIR:     $DIST_DIR

EOF
}

# Main script
main() {
    local target="${1:-all}"
    
    case "$target" in
        chrome)
            build_browser "chrome"
            verify_build "chrome"
            ;;
        edge)
            build_browser "edge"
            verify_build "edge"
            ;;
        firefox)
            build_browser "firefox"
            verify_build "firefox"
            ;;
        safari)
            build_browser "safari"
            verify_build "safari"
            ;;
        all)
            build_all
            ;;
        help|-h|--help)
            show_usage
            ;;
        *)
            log_error "Unknown target: $target"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
