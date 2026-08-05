#!/bin/bash

################################################################################
# iOS Keychain Setup for Local Development
# 
# This script configures your local macOS keychain for iOS app development
# to prevent password prompts during builds.
#
# Usage:
#   ./scripts/setup-keychain-local.sh [--password PASSWORD] [--name KEYCHAIN_NAME]
#
# Examples:
#   ./scripts/setup-keychain-local.sh
#   ./scripts/setup-keychain-local.sh --password myPassword123
#   ./scripts/setup-keychain-local.sh --name myDevKeychain --password secure
#
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
KEYCHAIN_NAME="wishlist-wizard-build"
KEYCHAIN_PASSWORD=""
USE_LOGIN_KEYCHAIN=false

# Function to print colored output
print_header() {
  echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Parse command line arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --password)
        KEYCHAIN_PASSWORD="$2"
        shift 2
        ;;
      --name)
        KEYCHAIN_NAME="$2"
        shift 2
        ;;
      --use-login)
        USE_LOGIN_KEYCHAIN=true
        shift
        ;;
      --help)
        show_help
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done
}

show_help() {
  cat << EOF
iOS Keychain Setup for Local Development

Usage:
  ./scripts/setup-keychain-local.sh [OPTIONS]

Options:
  --password PASSWORD    Keychain password (prompted if not provided)
  --name KEYCHAIN_NAME   Keychain name (default: wishlist-wizard-build)
  --use-login           Configure the login keychain instead of creating new one
  --help                Display this help message

Examples:
  # Interactive (prompts for password)
  ./scripts/setup-keychain-local.sh

  # With password
  ./scripts/setup-keychain-local.sh --password "MySecurePassword123"

  # Use login keychain
  ./scripts/setup-keychain-local.sh --use-login

  # Custom name with password
  ./scripts/setup-keychain-local.sh --name my-dev-keychain --password "P@ssw0rd"

EOF
}

# Function to prompt for password if not provided
prompt_password() {
  if [ -z "$KEYCHAIN_PASSWORD" ]; then
    echo ""
    print_header "Enter a password for the keychain"
    echo "  (This password will be used to unlock the keychain for builds)"
    read -sp "  Keychain Password: " KEYCHAIN_PASSWORD
    echo ""
    read -sp "  Confirm Password: " CONFIRM_PASSWORD
    echo ""
    
    if [ "$KEYCHAIN_PASSWORD" != "$CONFIRM_PASSWORD" ]; then
      print_error "Passwords do not match"
      exit 1
    fi
  fi
}

# Function to detect login keychain path
detect_login_keychain() {
  if [ -f "$HOME/Library/Keychains/login.keychain-db" ]; then
    echo "$HOME/Library/Keychains/login.keychain-db"
  elif [ -f "$HOME/Library/Keychains/login.keychain" ]; then
    echo "$HOME/Library/Keychains/login.keychain"
  else
    print_error "Login keychain not found"
    exit 1
  fi
}

# Main setup function
setup_keychain() {
  echo ""
  print_header "iOS Keychain Setup"
  
  if [ "$USE_LOGIN_KEYCHAIN" = true ]; then
    KEYCHAIN_PATH=$(detect_login_keychain)
    print_success "Using login keychain: $KEYCHAIN_PATH"
  else
    KEYCHAIN_PATH="$HOME/Library/Keychains/${KEYCHAIN_NAME}.keychain-db"
    
    # Check if keychain already exists
    if [ -f "$KEYCHAIN_PATH" ]; then
      print_warning "Keychain already exists: $KEYCHAIN_PATH"
      echo "  The existing keychain will be reconfigured."
    else
      print_header "Creating new keychain: $KEYCHAIN_NAME"
      security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
      print_success "Keychain created"
    fi
  fi
  
  echo ""
  print_header "Configuring Keychain"
  
  # Unlock keychain
  echo "  → Unlocking keychain..."
  security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH" 2>/dev/null || {
    print_error "Failed to unlock keychain. Password incorrect?"
    exit 1
  }
  print_success "Keychain unlocked"
  
  # Set extended timeout (2 hours)
  echo "  → Setting timeout to 2 hours..."
  security set-keychain-settings -lut 7200 "$KEYCHAIN_PATH"
  print_success "Timeout configured"
  
  # Set key partition list (CRITICAL for preventing prompts)
  echo "  → Setting key partition list..."
  security set-key-partition-list \
    -S apple-tool:,apple:,codesign: \
    -s \
    -k "$KEYCHAIN_PASSWORD" \
    "$KEYCHAIN_PATH" 2>/dev/null || true
  print_success "Key partition list configured"
  
  # Add to keychain search list
  if [ "$USE_LOGIN_KEYCHAIN" = false ]; then
    echo "  → Adding to keychain search list..."
    security list-keychains -d user -s "$KEYCHAIN_PATH" $(security list-keychains -d user | tr -d '"')
    print_success "Added to search list"
  fi
  
  echo ""
  print_header "Keychain Configuration Complete"
  echo ""
  echo "📋 Keychain Details:"
  echo "  Name: $KEYCHAIN_NAME"
  echo "  Path: $KEYCHAIN_PATH"
  echo "  Status: Ready for code signing"
  echo ""
}

# Function to export environment variables
export_env_variables() {
  print_header "Environment Variables"
  echo ""
  echo "Add these to your shell profile (~/.zshrc or ~/.bash_profile):"
  echo ""
  echo "export KEYCHAIN_NAME=\"$KEYCHAIN_NAME\""
  echo "export KEYCHAIN_PATH=\"$KEYCHAIN_PATH\""
  echo "export KEYCHAIN_PASSWORD=\"$KEYCHAIN_PASSWORD\""
  echo "export MATCH_KEYCHAIN_NAME=\"$KEYCHAIN_NAME\""
  echo "export MATCH_KEYCHAIN_PASSWORD=\"$KEYCHAIN_PASSWORD\""
  echo "export MATCH_KEYCHAIN_PATH=\"$KEYCHAIN_PATH\""
  echo "export OTHER_CODE_SIGN_FLAGS=\"--keychain $KEYCHAIN_PATH\""
  echo ""
  
  # Optional: Create .env file
  ENV_FILE=".env.keychain"
  if [ -w "$(dirname "$(pwd)")/$ENV_FILE" ] 2>/dev/null || [ -w "$(pwd)" ]; then
    print_header "Creating .env file"
    cat > "$ENV_FILE" << EOF
# iOS Keychain Configuration
# Source this file before building: source .env.keychain

export KEYCHAIN_NAME="$KEYCHAIN_NAME"
export KEYCHAIN_PATH="$KEYCHAIN_PATH"
export KEYCHAIN_PASSWORD="$KEYCHAIN_PASSWORD"
export MATCH_KEYCHAIN_NAME="$KEYCHAIN_NAME"
export MATCH_KEYCHAIN_PASSWORD="$KEYCHAIN_PASSWORD"
export MATCH_KEYCHAIN_PATH="$KEYCHAIN_PATH"
export OTHER_CODE_SIGN_FLAGS="--keychain $KEYCHAIN_PATH"

# Fastlane configuration
export FASTLANE_USER="$DEVELOPER_EMAIL"
export FASTLANE_PASSWORD="$FASTLANE_PASSWORD"
EOF
    print_success "Created $ENV_FILE"
    echo "  Usage: source $ENV_FILE"
  fi
}

# Function to verify setup
verify_setup() {
  echo ""
  print_header "Verifying Setup"
  
  # Check keychain exists
  if [ ! -f "$KEYCHAIN_PATH" ]; then
    print_error "Keychain file not found"
    return 1
  fi
  print_success "Keychain file exists"
  
  # Check keychain info
  if security show-keychain-info "$KEYCHAIN_PATH" >/dev/null 2>&1; then
    print_success "Keychain is accessible"
  else
    print_warning "Keychain info not available"
  fi
  
  # Check partition list
  if security show-keychain-info "$KEYCHAIN_PATH" 2>/dev/null | grep -q "apple:"; then
    print_success "Key partition list configured"
  else
    print_warning "Key partition list may not be configured"
  fi
  
  # Try to unlock to verify password
  if security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH" 2>/dev/null; then
    print_success "Keychain password verified"
  else
    print_error "Unable to verify keychain password"
    return 1
  fi
}

# Function to show next steps
show_next_steps() {
  echo ""
  print_header "Next Steps"
  echo ""
  echo "1. Add environment variables to your shell:"
  echo "   Paste the export commands above into your ~/.zshrc or ~/.bash_profile"
  echo ""
  echo "2. Source the environment:"
  echo "   source ~/.zshrc  (or ~/.bash_profile)"
  echo ""
  echo "3. Install certificates:"
  echo "   • If using Fastlane match, it will import certificates automatically"
  echo "   • Otherwise, export your distribution certificate and import:"
  echo "     security import cert.p12 -k \"$KEYCHAIN_PATH\" -P password"
  echo ""
  echo "4. Configure Fastlane:"
  echo "   cd packages/mobile/ios"
  echo "   bundle install"
  echo "   fastlane setup"
  echo ""
  echo "5. Build and test:"
  echo "   fastlane build_debug"
  echo "   fastlane build_release"
  echo ""
  echo "📚 For more information, see:"
  echo "   • docs/KEYCHAIN_PASSWORD_POPUP_SOLUTIONS.md"
  echo "   • packages/mobile/ios/fastlane/Fastfile"
  echo "   • scripts/ephemeral_keychain_fastlane_fixed.sh"
  echo ""
}

# Run cleanup on exit
cleanup() {
  if [ $? -ne 0 ]; then
    echo ""
    print_error "Setup did not complete successfully"
    echo "Run the script again or check the instructions in docs/KEYCHAIN_PASSWORD_POPUP_SOLUTIONS.md"
  fi
}

trap cleanup EXIT

# Main execution
main() {
  parse_args "$@"
  prompt_password
  setup_keychain
  verify_setup
  export_env_variables
  show_next_steps
  
  echo ""
  print_success "Keychain setup complete!"
  echo ""
}

main "$@"
