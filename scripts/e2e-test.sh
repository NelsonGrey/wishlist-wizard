#!/bin/bash

# E2E Testing Quick Start Script
# Usage: ./scripts/e2e-test.sh [smoke|tier1|tier2|all|ui|debug] [environment]
# Examples:
#   ./scripts/e2e-test.sh smoke              # Run smoke test on dev
#   ./scripts/e2e-test.sh tier1 staging      # Run tier 1 on staging
#   ./scripts/e2e-test.sh ui                 # Open interactive test runner
#   ./scripts/e2e-test.sh all staging        # Run all tests on staging

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
TEST_TYPE="${1:-smoke}"
ENVIRONMENT="${2:-dev}"
TEST_URL=""

# Map environment to URL
case $ENVIRONMENT in
  dev)
    TEST_URL="https://wishlist-wizard-dev.web.app"
    echo -e "${BLUE}Testing against DEV environment${NC}"
    ;;
  staging)
    TEST_URL="https://wishlist-wizard-staging.web.app"
    echo -e "${BLUE}Testing against STAGING environment${NC}"
    ;;
  prod)
    TEST_URL="https://wishlist-wizard.web.app"
    echo -e "${YELLOW}Testing against PRODUCTION environment (smoke only)${NC}"
    ;;
  local)
    TEST_URL="http://localhost:5173"
    echo -e "${BLUE}Testing against LOCAL development server${NC}"
    ;;
  *)
    echo -e "${RED}Unknown environment: $ENVIRONMENT${NC}"
    echo "Valid options: dev, staging, prod, local"
    exit 1
    ;;
esac

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Wishlist Wizard - E2E Test Runner${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Test Type:  $TEST_TYPE"
echo "Environment: $ENVIRONMENT"
echo "Target URL: $TEST_URL"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js is not installed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
fi

# Install Playwright browsers if needed
if [ ! -d "node_modules/@playwright/test" ]; then
  echo -e "${YELLOW}Installing Playwright...${NC}"
  npm install @playwright/test
fi

echo -e "${YELLOW}Installing Playwright browsers (first time only)...${NC}"
npx playwright install --with-deps > /dev/null 2>&1 || true

echo ""
echo -e "${GREEN}Starting E2E tests...${NC}"
echo ""

# Run appropriate test
case $TEST_TYPE in
  smoke)
    TEST_URL="$TEST_URL" npm run test:e2e:smoke
    ;;
  tier1)
    TEST_URL="$TEST_URL" npm run test:e2e:tier1
    ;;
  tier2)
    TEST_URL="$TEST_URL" npm run test:e2e:tier2
    ;;
  all)
    TEST_URL="$TEST_URL" npm run test:e2e:all
    ;;
  ui)
    echo -e "${BLUE}Opening Playwright Test Runner...${NC}"
    npx playwright test --ui packages/web/e2e/
    ;;
  debug)
    echo -e "${BLUE}Opening Playwright Inspector...${NC}"
    npx playwright test --debug packages/web/e2e/
    ;;
  *)
    echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
    echo "Valid options: smoke, tier1, tier2, all, ui, debug"
    exit 1
    ;;
esac

# Test result
TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
  echo -e "${BLUE}View test report:${NC}"
  echo "  npm run test:e2e:report"
  echo ""
else
  echo -e "${RED}✗ Some tests failed${NC}"
  echo ""
  echo -e "${BLUE}View detailed report:${NC}"
  echo "  npm run test:e2e:report"
  echo ""
  echo -e "${BLUE}Debug with interactive UI:${NC}"
  echo "  npm run test:e2e:ui"
  echo ""
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

exit $TEST_EXIT_CODE
