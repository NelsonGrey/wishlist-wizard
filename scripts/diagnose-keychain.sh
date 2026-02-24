#!/bin/bash

################################################################################
# iOS Keychain Diagnostic Tool
#
# Troubleshoots keychain configuration issues for iOS development.
# Helps identify why password prompts appear during builds.
#
# Usage:
#   ./scripts/diagnose-keychain.sh [--verbose]
#
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;37m'
NC='\033[0m'

VERBOSE=false
ISSUES_FOUND=0
WARNINGS_FOUND=0

print_header() {
  echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

print_section() {
  echo -e "\n${BLUE}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  ((WARNINGS_FOUND++))
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
  ((ISSUES_FOUND++))
}

print_info() {
  echo -e "${GRAY}ℹ️  $1${NC}"
}

print_detail() {
  echo -e "${GRAY}   $1${NC}"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --help|-h)
      cat << EOF
iOS Keychain Diagnostic Tool

Usage:
  ./scripts/diagnose-keychain.sh [OPTIONS]

Options:
  --verbose, -v   Show detailed output
  --help, -h      Display this help message

Examples:
  ./scripts/diagnose-keychain.sh              # Standard diagnosis
  ./scripts/diagnose-keychain.sh --verbose    # Detailed diagnosis

EOF
      exit 0
      ;;
    *)
      print_error "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Main diagnostic functions

check_keychain_files() {
  print_section "Keychain Files"
  
  KEYCHAINS_DIR="$HOME/Library/Keychains"
  
  if [ ! -d "$KEYCHAINS_DIR" ]; then
    print_error "Keychains directory not found: $KEYCHAINS_DIR"
    return 1
  fi
  print_success "Keychains directory exists"
  
  # Check login keychain
  if [ -f "$KEYCHAINS_DIR/login.keychain-db" ]; then
    print_success "Login keychain exists: login.keychain-db"
  elif [ -f "$KEYCHAINS_DIR/login.keychain" ]; then
    print_success "Login keychain exists: login.keychain"
  else
    print_error "Login keychain not found (expected login.keychain-db or login.keychain)"
  fi
  
  # List all keychains
  if [ "$VERBOSE" = true ]; then
    echo ""
    print_detail "All keychains in $KEYCHAINS_DIR:"
    ls -1 "$KEYCHAINS_DIR" | grep -E '\.keychain' | while read -r kc; do
      if [ -f "$KEYCHAINS_DIR/$kc" ]; then
        size=$(du -h "$KEYCHAINS_DIR/$kc" | cut -f1)
        print_detail "  • $kc ($size)"
      fi
    done
  fi
}

check_keychain_search_list() {
  print_section "Keychain Search List"
  
  if ! SEARCH_LIST=$(security list-keychains -d user 2>/dev/null); then
    print_error "Failed to read keychain search list"
    return 1
  fi
  
  print_success "Keychain search list accessible"
  
  # Parse search list
  echo "$SEARCH_LIST" | while read -r kc; do
    kc_clean=$(echo "$kc" | tr -d '"')
    if [ -z "$kc_clean" ]; then
      continue
    fi
    
    if [ -f "$kc_clean" ]; then
      print_success "  ✓ $kc_clean"
    else
      print_warning "  ✗ Missing keychain in search list: $kc_clean"
    fi
  done
  
  # Check for ephemeral keychains
  if echo "$SEARCH_LIST" | grep -q "fastlane_tmp"; then
    print_warning "Ephemeral fastlane keychain still in search list (may need cleanup)"
    if [ "$VERBOSE" = true ]; then
      echo "$SEARCH_LIST" | grep "fastlane_tmp" | while read -r kc; do
        print_detail "  • $(echo $kc | tr -d '\"')"
      done
    fi
  fi
}

check_default_keychain() {
  print_section "Default Keychain"
  
  if ! DEFAULT_KC=$(security default-keychain -d user 2>/dev/null); then
    print_error "Failed to read default keychain"
    return 1
  fi
  
  DEFAULT_KC=$(echo "$DEFAULT_KC" | tr -d '"')
  
  if [ -f "$DEFAULT_KC" ]; then
    print_success "Default keychain is valid: $DEFAULT_KC"
  else
    print_error "Default keychain not found: $DEFAULT_KC"
  fi
}

check_certificates() {
  print_section "Code Signing Certificates"
  
  # Check in login keychain
  LOGIN_KC="$HOME/Library/Keychains/login.keychain-db"
  if [ ! -f "$LOGIN_KC" ]; then
    LOGIN_KC="$HOME/Library/Keychains/login.keychain"
  fi
  
  if [ ! -f "$LOGIN_KC" ]; then
    print_warning "Login keychain not found, skipping certificate check"
    return 1
  fi
  
  # Find identities
  if ! IDENTITIES=$(security find-identity -v -p codesigning "$LOGIN_KC" 2>/dev/null); then
    print_warning "Failed to read identities from login keychain"
    return 1
  fi
  
  if echo "$IDENTITIES" | grep -q "Apple Distribution"; then
    print_success "Found Apple Distribution certificates:"
    echo "$IDENTITIES" | grep "Apple Distribution" | while read -r line; do
      cert_name=$(echo "$line" | sed -E 's/.* ([0-9A-F]+) "([^"]+)".*/\2/')
      print_detail "  • $cert_name"
    done
  else
    print_warning "No Apple Distribution certificates found in login keychain"
  fi
  
  if echo "$IDENTITIES" | grep -q "Apple Development"; then
    print_success "Found Apple Development certificates:"
    echo "$IDENTITIES" | grep "Apple Development" | while read -r line; do
      cert_name=$(echo "$line" | sed -E 's/.* ([0-9A-F]+) "([^"]+)".*/\2/')
      print_detail "  • $cert_name"
    done
  else
    print_info "No Apple Development certificates found (may not be needed)"
  fi
  
  # Check certificate validity
  if [ "$VERBOSE" = true ]; then
    echo ""
    print_detail "Certificate Details:"
    security find-identity -v "$LOGIN_KC" 2>/dev/null | while read -r line; do
      if [[ $line =~ ([0-9A-F]{40}) ]]; then
        hash="${BASH_REMATCH[1]}"
        # Extract certificate name
        name=$(echo "$line" | sed -E 's/.* ([0-9A-F]+) "([^"]+)".*/\2/')
        print_detail "  • $name (Hash: $hash)"
      fi
    done
  fi
}

check_keychain_partition_list() {
  print_section "Key Partition List"
  
  print_info "Checking partition list settings for keychains..."
  
  # Check all keychains
  KEYCHAINS_DIR="$HOME/Library/Keychains"
  
  found_any=false
  for kc_path in "$KEYCHAINS_DIR"/*.keychain*; do
    if [ ! -f "$kc_path" ]; then
      continue
    fi
    
    kc_name=$(basename "$kc_path")
    if INFO=$(security show-keychain-info "$kc_path" 2>&1); then
      if echo "$INFO" | grep -q "apple:"; then
        print_success "Partition list configured for: $kc_name"
        found_any=true
        if [ "$VERBOSE" = true ]; then
          echo "$INFO" | while read -r line; do
            print_detail "    $line"
          done
        fi
      else
        print_warning "No partition list for: $kc_name"
      fi
    fi
  done
  
  if [ "$found_any" = false ]; then
    print_error "No keychains have partition lists configured"
    print_detail "This is a CRITICAL issue - it will cause password prompts during builds"
    print_detail "Run: ./scripts/setup-keychain-local.sh"
  fi
}

check_environment_variables() {
  print_section "Environment Variables"
  
  required_vars=(
    "KEYCHAIN_NAME"
    "KEYCHAIN_PASSWORD"
    "KEYCHAIN_PATH"
    "MATCH_KEYCHAIN_NAME"
    "MATCH_KEYCHAIN_PASSWORD"
    "MATCH_KEYCHAIN_PATH"
  )
  
  missing=0
  for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
      print_warning "Not set: $var"
      ((missing++))
    else
      # Mask password in output
      value="${!var}"
      if [[ "$var" == *"PASSWORD"* ]]; then
        value="(hidden)"
      fi
      print_success "$var is set: $value"
    fi
  done
  
  if [ $missing -gt 0 ]; then
    print_detail "Set environment variables:"
    print_detail "  export KEYCHAIN_NAME='wishlist-wizard-build'"
    print_detail "  export KEYCHAIN_PASSWORD='your_password'"
    print_detail "  export KEYCHAIN_PATH=\"\$HOME/Library/Keychains/wishlist-wizard-build.keychain-db\""
    print_detail "  export MATCH_KEYCHAIN_NAME=\"\$KEYCHAIN_NAME\""
    print_detail "  export MATCH_KEYCHAIN_PASSWORD=\"\$KEYCHAIN_PASSWORD\""
    print_detail "  export MATCH_KEYCHAIN_PATH=\"\$KEYCHAIN_PATH\""
  fi
}

check_xcode_settings() {
  print_section "Xcode Configuration"
  
  # Check for development team
  if xcode-select -p >/dev/null 2>&1; then
    print_success "Xcode command line tools installed"
    xcode_path=$(xcode-select -p)
    print_detail "  Location: $xcode_path"
  else
    print_error "Xcode command line tools not found"
    return 1
  fi
  
  # Check for security command
  if command -v security >/dev/null 2>&1; then
    print_success "security command available"
  else
    print_error "security command not found"
    return 1
  fi
  
  # Check for codesign
  if command -v codesign >/dev/null 2>&1; then
    print_success "codesign command available"
  else
    print_error "codesign command not found"
    return 1
  fi
}

check_fastlane_setup() {
  print_section "Fastlane Configuration"
  
  if [ -d "packages/mobile/ios/fastlane" ]; then
    print_success "Fastlane directory exists"
    
    if [ -f "packages/mobile/ios/fastlane/Fastfile" ]; then
      print_success "Fastfile found"
      
      # Check for critical functions
      if grep -q "set_partition_list" packages/mobile/ios/fastlane/Fastfile; then
        print_success "set_partition_list function defined"
      else
        print_warning "set_partition_list function not found"
      fi
      
      if grep -q "set-key-partition-list" packages/mobile/ios/fastlane/Fastfile; then
        print_success "set-key-partition-list commands present"
      else
        print_warning "set-key-partition-list commands not found"
      fi
    else
      print_error "Fastfile not found"
    fi
  else
    print_warning "Fastlane directory not found"
  fi
}

generate_summary() {
  print_header "Diagnostic Summary"
  
  if [ $ISSUES_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
    print_success "All checks passed!"
    echo ""
    print_success "Your keychain is properly configured for iOS development."
    echo ""
    print_info "You should not experience password prompts during builds."
    echo ""
  else
    echo ""
    if [ $ISSUES_FOUND -gt 0 ]; then
      print_error "Found $ISSUES_FOUND critical issue(s)"
    fi
    if [ $WARNINGS_FOUND -gt 0 ]; then
      print_warning "Found $WARNINGS_FOUND warning(s)"
    fi
    echo ""
    print_info "Recommended Actions:"
    echo ""
    
    if [ $ISSUES_FOUND -gt 0 ]; then
      print_detail "1. Run setup script to fix critical issues:"
      print_detail "   ./scripts/setup-keychain-local.sh"
      echo ""
    fi
    
    if [ $WARNINGS_FOUND -gt 0 ]; then
      print_detail "2. Review warnings above and take corrective action"
      print_detail "3. Consult docs/KEYCHAIN_PASSWORD_POPUP_SOLUTIONS.md for detailed guidance"
      echo ""
    fi
    
    print_detail "For more information:"
    print_detail "  • docs/KEYCHAIN_PASSWORD_POPUP_SOLUTIONS.md"
    print_detail "  • docs/DEVELOPER.md"
    print_detail "  • https://docs.fastlane.tools/"
    echo ""
  fi
}

# Main execution
main() {
  print_header "iOS Keychain Diagnostic Tool"
  
  echo "Running diagnostics..."
  echo ""
  
  check_keychain_files
  check_keychain_search_list
  check_default_keychain
  check_certificates
  check_keychain_partition_list
  check_environment_variables
  check_xcode_settings
  check_fastlane_setup
  generate_summary
  
  # Exit code based on issues found
  if [ $ISSUES_FOUND -gt 0 ]; then
    exit 1
  fi
  
  exit 0
}

main
