#!/bin/bash

# Dry Run CI/CD Pipeline
# This script simulates the CI/CD pipeline locally without consuming GitHub Actions minutes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Dry Run CI/CD Pipeline${NC}"
echo -e "${BLUE}=========================${NC}"

cd "$PROJECT_ROOT"

# Simulate quality checks
run_quality_checks() {
    echo -e "${YELLOW}🔍 Running Quality Checks...${NC}"

    # Run TypeScript checks
    echo "Running TypeScript checks..."
    if npm run type-check; then
        echo -e "${GREEN}✅ TypeScript checks passed${NC}"
    else
        echo -e "${RED}❌ TypeScript checks failed${NC}"
        return 1
    fi

    # Run linting
    echo "Running linting..."
    if npm run lint; then
        echo -e "${GREEN}✅ Linting passed${NC}"
    else
        echo -e "${RED}❌ Linting failed${NC}"
        return 1
    fi

    # Run tests
    echo "Running tests..."
    if npm test; then
        echo -e "${GREEN}✅ Tests passed${NC}"
    else
        echo -e "${RED}❌ Tests failed${NC}"
        return 1
    fi
}

# Simulate web build
run_web_build() {
    echo -e "${YELLOW}🌐 Building Web App...${NC}"

    cd packages/web

    # Install dependencies
    echo "Installing web dependencies..."
    if npm ci; then
        echo -e "${GREEN}✅ Web dependencies installed${NC}"
    else
        echo -e "${RED}❌ Web dependencies failed${NC}"
        return 1
    fi

    # Build web app
    echo "Building web app..."
    if npm run build; then
        echo -e "${GREEN}✅ Web app built successfully${NC}"
    else
        echo -e "${RED}❌ Web build failed${NC}"
        return 1
    fi

    cd "$PROJECT_ROOT"
}

# Simulate deployment (dry run)
simulate_deployment() {
    echo -e "${YELLOW}🚀 Simulating Deployment...${NC}"

    ENVIRONMENT="${1:-development}"

    case $ENVIRONMENT in
        "production")
            PROJECT_ID="wishlist-wizard-prod"
            CONFIG_FILE="firebase.prod.json"
            ;;
        "staging")
            PROJECT_ID="wishlist-wizard-staging"
            CONFIG_FILE="firebase.staging.json"
            ;;
        *)
            PROJECT_ID="wishlist-wizard-dev"
            CONFIG_FILE="firebase.dev.json"
            ;;
    esac

    echo "Environment: $ENVIRONMENT"
    echo "Project ID: $PROJECT_ID"
    echo "Config File: $CONFIG_FILE"

    # Check if Firebase CLI is authenticated
    if firebase projects:list --token="${FIREBASE_TOKEN:-}" &> /dev/null; then
        echo -e "${GREEN}✅ Firebase authentication valid${NC}"

        # Simulate deployment
        echo "Would deploy to Firebase Hosting..."
        echo "Command: firebase use $PROJECT_ID && firebase deploy --only hosting:website"
        echo -e "${GREEN}✅ Deployment simulation successful${NC}"
    else
        echo -e "${RED}❌ Firebase authentication failed${NC}"
        echo -e "${YELLOW}💡 Run: firebase login${NC}"
        return 1
    fi
}

# Main execution
main() {
    ENVIRONMENT="${1:-development}"

    echo "Environment: $ENVIRONMENT"
    echo ""

    # Run quality checks
    if run_quality_checks; then
        echo -e "${GREEN}✅ Quality checks passed${NC}"
    else
        echo -e "${RED}❌ Quality checks failed${NC}"
        exit 1
    fi

    echo ""

    # Run web build
    if run_web_build; then
        echo -e "${GREEN}✅ Web build successful${NC}"
    else
        echo -e "${RED}❌ Web build failed${NC}"
        exit 1
    fi

    echo ""

    # Simulate deployment
    if simulate_deployment "$ENVIRONMENT"; then
        echo -e "${GREEN}✅ Deployment simulation successful${NC}"
    else
        echo -e "${RED}❌ Deployment simulation failed${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}🎉 Dry run completed successfully!${NC}"
    echo -e "${BLUE}💡 Next steps:${NC}"
    echo "  1. Fix any issues found in this dry run"
    echo "  2. Test with act: ./scripts/test-cicd-local.sh $ENVIRONMENT true ci-cd-pipeline"
    echo "  3. When ready, push to GitHub to trigger real deployment"
}

# Run main function
main "$@"