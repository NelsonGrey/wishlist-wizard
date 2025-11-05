#!/bin/bash

# Local CI/CD Testing Script
# This script allows testing deployment workflows locally without consuming GitHub Actions minutes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-development}"
DRY_RUN="${2:-true}"
WORKFLOW="${3:-ci-cd-pipeline}"

echo -e "${BLUE}🚀 Local CI/CD Testing Script${NC}"
echo -e "${BLUE}================================${NC}"
echo "Environment: $ENVIRONMENT"
echo "Dry Run: $DRY_RUN"
echo "Workflow: $WORKFLOW"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

    # Check if act is installed
    if ! command -v act &> /dev/null; then
        echo -e "${RED}❌ act CLI is not installed. Install with: brew install act${NC}"
        exit 1
    fi

    # Check if firebase CLI is installed
    if ! command -v firebase &> /dev/null; then
        echo -e "${RED}❌ Firebase CLI is not installed. Install with: npm install -g firebase-tools${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ All prerequisites met${NC}"
}

# Setup local environment
setup_environment() {
    echo -e "${YELLOW}🔧 Setting up local environment...${NC}"

    cd "$PROJECT_ROOT"

    # Create .env.local for testing (if it doesn't exist)
    if [ ! -f ".env.local" ]; then
        echo -e "${YELLOW}Creating .env.local for local testing...${NC}"
        cat > .env.local << EOF
# Local testing environment variables
# Copy values from your actual environment files
FIREBASE_TOKEN=your_firebase_token_here
FIREBASE_SERVICE_ACCOUNT_KEY="{}"
EOF
        echo -e "${YELLOW}⚠️  Please update .env.local with your actual secrets${NC}"
    fi

    # Create act secrets file
    mkdir -p .act-secrets
    cat > .act-secrets/secrets << EOF
FIREBASE_TOKEN=${FIREBASE_TOKEN:-test_token}
FIREBASE_SERVICE_ACCOUNT_KEY=${FIREBASE_SERVICE_ACCOUNT_KEY:-"{}"}
EOF

    echo -e "${GREEN}✅ Environment setup complete${NC}"
}

# Test with act
test_with_act() {
    echo -e "${YELLOW}🧪 Testing workflow with act...${NC}"

    cd "$PROJECT_ROOT"

    # Run specific workflow
    case $WORKFLOW in
        "ci-cd-pipeline")
            echo "Testing ci-cd-pipeline.yml..."
            act -j test --secret-file .act-secrets/secrets --env ENVIRONMENT="$ENVIRONMENT" --env DRY_RUN="$DRY_RUN"
            ;;
        "android-distribution")
            echo "Testing android-distribution.yml..."
            act -j distribute-android --secret-file .act-secrets/secrets --env ENVIRONMENT="$ENVIRONMENT" --env DRY_RUN="$DRY_RUN"
            ;;
        "ios-distribution")
            echo "Testing ios-distribution.yml..."
            act -j distribute-ios --secret-file .act-secrets/secrets --env ENVIRONMENT="$ENVIRONMENT" --env DRY_RUN="$DRY_RUN"
            ;;
        "web-deployment")
            echo "Testing web-deployment.yml..."
            act -j deploy-web --secret-file .act-secrets/secrets --env ENVIRONMENT="$ENVIRONMENT" --env DRY_RUN="$DRY_RUN"
            ;;
        *)
            echo -e "${RED}❌ Unknown workflow: $WORKFLOW${NC}"
            echo "Available workflows: ci-cd-pipeline, android-distribution, ios-distribution, web-deployment"
            exit 1
            ;;
    esac
}

# Test deployment scripts locally
test_deployment_scripts() {
    echo -e "${YELLOW}🔧 Testing deployment scripts locally...${NC}"

    cd "$PROJECT_ROOT/packages/mobile"

    # Test Android distribution script
    if [ -f "distribute-android.sh" ]; then
        echo "Testing Android distribution script..."
        if [ "$DRY_RUN" = "true" ]; then
            echo "DRY_RUN=true ./distribute-android.sh debug"
        else
            echo "Would run: ./distribute-android.sh debug"
        fi
    fi

    # Test iOS distribution script
    if [ -f "distribute-ios.sh" ]; then
        echo "Testing iOS distribution script..."
        if [ "$DRY_RUN" = "true" ]; then
            echo "DRY_RUN=true ./distribute-ios.sh debug"
        else
            echo "Would run: ./distribute-ios.sh debug"
        fi
    fi

    cd "$PROJECT_ROOT"
}

# Test Firebase CLI locally
test_firebase_cli() {
    echo -e "${YELLOW}🔥 Testing Firebase CLI locally...${NC}"

    # Test Firebase login status
    if firebase projects:list --token="${FIREBASE_TOKEN:-}" &> /dev/null; then
        echo -e "${GREEN}✅ Firebase authentication working${NC}"
    else
        echo -e "${RED}❌ Firebase authentication failed${NC}"
        echo -e "${YELLOW}💡 Run: firebase login${NC}"
    fi

    # List available projects
    echo "Available Firebase projects:"
    firebase projects:list --token="${FIREBASE_TOKEN:-}" 2>/dev/null | grep -E "(Project ID|wishlist-wizard)" || echo "No projects accessible"
}

# Main execution
main() {
    check_prerequisites
    setup_environment

    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${YELLOW}🏃 Running in DRY RUN mode - no actual deployments${NC}"
    fi

    echo ""
    echo -e "${BLUE}Choose testing approach:${NC}"
    echo "1. Test with act (GitHub Actions simulation)"
    echo "2. Test deployment scripts locally"
    echo "3. Test Firebase CLI locally"
    echo "4. Run all tests"
    echo ""

    read -p "Enter choice (1-4): " choice

    case $choice in
        1)
            test_with_act
            ;;
        2)
            test_deployment_scripts
            ;;
        3)
            test_firebase_cli
            ;;
        4)
            test_with_act
            test_deployment_scripts
            test_firebase_cli
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            exit 1
            ;;
    esac

    echo ""
    echo -e "${GREEN}✅ Local testing complete!${NC}"
    echo -e "${BLUE}💡 Tips:${NC}"
    echo "  - Update .env.local with real secrets for accurate testing"
    echo "  - Use DRY_RUN=true to test without actual deployments"
    echo "  - Check act documentation: https://github.com/nektos/act"
}

# Run main function
main "$@"