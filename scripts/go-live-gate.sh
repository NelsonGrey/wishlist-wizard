#!/bin/bash

################################################################################
# Automated Go-Live Readiness Gate
# 
# Purpose: Enforce release readiness before allowing deployment
# Validates: Firebase endpoints, E2E tests, code quality, deployment readiness
# Usage: ./scripts/go-live-gate.sh
# 
# Exit codes:
#   0 = Ready for release
#   1 = Blocking issues found
#   2 = Warnings only (can proceed with caution)
################################################################################

set +e  # Don't exit on first error; collect all issues

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Tracking
BLOCKING_ISSUES=0
WARNINGS=0
CHECKS_PASSED=0

# Helper functions
pass() {
  echo -e "${GREEN}✓ $1${NC}"
  ((CHECKS_PASSED++))
}

fail() {
  echo -e "${RED}✗ $1${NC}"
  ((BLOCKING_ISSUES++))
}

warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
  ((WARNINGS++))
}

info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

section_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
}

################################################################################
# CHECK 1: Git Status
################################################################################
section_header "CHECK 1: Git Status"

if [ "$(git status --porcelain)" != "" ]; then
  warn "Uncommitted changes detected"
  git status --short
else
  pass "Working directory is clean"
fi

# Check branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" == "develop" ] || [ "$CURRENT_BRANCH" == "main" ]; then
  pass "On release branch: $CURRENT_BRANCH"
else
  warn "Not on develop/main branch: $CURRENT_BRANCH"
fi

################################################################################
# CHECK 2: Firebase Endpoint Readiness
################################################################################
section_header "CHECK 2: Firebase Endpoint Readiness"

if [ -f "artifacts/smoke-all-functions-report.json" ]; then
  TOTAL=$(jq '.summary.total' artifacts/smoke-all-functions-report.json)
  PASSED=$(jq '.summary.passed' artifacts/smoke-all-functions-report.json)
  WARNED=$(jq '.summary.warned' artifacts/smoke-all-functions-report.json)
  FAILED=$(jq '.summary.failed' artifacts/smoke-all-functions-report.json)

  info "Endpoint Test Results: $PASSED/$TOTAL passed, $WARNED warned, $FAILED failed"

  if [ "$FAILED" -gt 0 ]; then
    fail "Firebase endpoints have failures: $FAILED endpoint(s) failed"
    jq '.results[] | select(.status=="failed") | "\(.endpoint): \(.message)"' artifacts/smoke-all-functions-report.json
  else
    pass "Firebase endpoints: 0 hard failures"
  fi

  if [ "$PASSED" -ge 60 ]; then
    pass "Sufficient endpoints ready: $PASSED/$TOTAL (≥60 required)"
  else
    fail "Insufficient endpoints ready: $PASSED/$TOTAL (need ≥60)"
  fi
else
  warn "Firebase endpoint report not found. Run: npm run test:functions:smoke:all"
fi

################################################################################
# CHECK 3: User Flow Smoke Tests
################################################################################
section_header "CHECK 3: Core User Flow Tests"

if [ -f "artifacts/smoke-users-report.json" ]; then
  TOTAL_FLOWS=$(jq '.summary.totalCalls' artifacts/smoke-users-report.json)
  PASSED_FLOWS=$(jq '.summary.passedCalls' artifacts/smoke-users-report.json)
  FAILED_FLOWS=$(jq '.summary.failedCalls' artifacts/smoke-users-report.json)

  info "User Flow Results: $PASSED_FLOWS/$TOTAL_FLOWS passed, $FAILED_FLOWS failed"

  if [ "$FAILED_FLOWS" -gt 0 ]; then
    fail "Core user flows have failures: $FAILED_FLOWS flow(s) failed"
  else
    pass "Core user flows: All $PASSED_FLOWS flows pass"
  fi
else
  warn "User flow report not found. Run: npm run test:users:smoke"
fi

################################################################################
# CHECK 4: E2E Test Infrastructure
################################################################################
section_header "CHECK 4: E2E Testing Infrastructure"

if [ -f "playwright.config.ts" ]; then
  pass "Playwright configuration exists"
else
  fail "playwright.config.ts not found"
fi

if [ -d "packages/web/e2e" ]; then
  TEST_FILES=$(find packages/web/e2e -name "*.spec.ts" | wc -l)
  if [ "$TEST_FILES" -ge 3 ]; then
    pass "E2E test suite configured ($TEST_FILES test files)"
  else
    warn "Only $TEST_FILES E2E test files (recommend ≥3)"
  fi
else
  fail "E2E tests not found in packages/web/e2e"
fi

if [ -f ".github/workflows/e2e-tests.yml" ]; then
  pass "GitHub Actions E2E workflow configured"
else
  warn "GitHub Actions E2E workflow not configured"
fi

################################################################################
# CHECK 5: Tier 1 Features Validation
################################################################################
section_header "CHECK 5: Tier 1 Features (Basic/Must Work)"

TIER1_FEATURES=(
  "createUserProfile"
  "getUserProfile"
  "createWishlist"
  "getUserWishlists"
  "addWishlistItem"
  "getWishlistItems"
  "deleteWishlistItem"
  "getSharedWishlist"
  "getUserNotifications"
  "registerDevice"
)

TIER1_COUNT=0
for feature in "${TIER1_FEATURES[@]}"; do
  if jq -e ".results[] | select(.endpoint==\"$feature\" and .status==\"passed\")" artifacts/smoke-all-functions-report.json > /dev/null 2>&1; then
    ((TIER1_COUNT++))
  fi
done

if [ "$TIER1_COUNT" -ge "${#TIER1_FEATURES[@]}" ]; then
  pass "All Tier 1 (basic) features validated: $TIER1_COUNT/${#TIER1_FEATURES[@]}"
else
  fail "Missing Tier 1 features: $TIER1_COUNT/${#TIER1_FEATURES[@]} validated"
fi

################################################################################
# CHECK 6: Tier 2 Features Readiness
################################################################################
section_header "CHECK 6: Tier 2 Features (Advanced/Optional)"

TIER2_FEATURES=(
  "authenticateExtension"
  "addItemFromExtension"
  "linkConvert"
  "trackAnalyticsEvent"
  "getCalendarEvents"
  "saveFCMToken"
)

TIER2_COUNT=0
for feature in "${TIER2_FEATURES[@]}"; do
  if jq -e ".results[] | select(.endpoint==\"$feature\" and .status==\"passed\")" artifacts/smoke-all-functions-report.json > /dev/null 2>&1; then
    ((TIER2_COUNT++))
  fi
done

if [ "$TIER2_COUNT" -ge 5 ]; then
  pass "Tier 2 features ready: $TIER2_COUNT/$TIER2_COUNT (≥5 required)"
else
  warn "Limited Tier 2 features ready: $TIER2_COUNT (nice-to-have, not blocking)"
fi

################################################################################
# CHECK 7: Documentation
################################################################################
section_header "CHECK 7: Release Documentation"

required_docs=(
  "RELEASE_READINESS_TIERED.md"
  "LAUNCH_CHECKLIST.md"
  "E2E_TESTING_GUIDE.md"
)

for doc in "${required_docs[@]}"; do
  if [ -f "$doc" ]; then
    pass "Documentation exists: $doc"
  elif [ -f "docs/$doc" ]; then
    pass "Documentation exists: docs/$doc"
  else
    warn "Missing documentation: $doc"
  fi
done

################################################################################
# CHECK 8: Dependencies
################################################################################
section_header "CHECK 8: Dependencies"

if grep -q '"@playwright/test"' package.json; then
  pass "Playwright test framework installed"
else
  warn "Playwright not in package.json"
fi

if [ -d "node_modules" ]; then
  pass "Node dependencies installed"
else
  warn "Node modules not installed. Run: npm install"
fi

################################################################################
# CHECK 9: TypeScript & Linting
################################################################################
section_header "CHECK 9: Code Quality"

if [ -f "tsconfig.json" ]; then
  pass "TypeScript configuration present"
else
  warn "TypeScript configuration not found"
fi

# Try to run type check if npm script exists
if npm run check >/dev/null 2>&1; then
  if npm run check; then
    pass "TypeScript type checking passes"
  else
    fail "TypeScript type errors found"
  fi
else
  info "Type checking script not available"
fi

################################################################################
# CHECK 10: Deployment Readiness
################################################################################
section_header "CHECK 10: Deployment Readiness"

# Check Firebase config exists
if [ -f "firebase.json" ] || [ -f "firestore.rules" ]; then
  pass "Firebase configuration found"
else
  warn "Firebase configuration not explicitly found"
fi

# Check if this is a monorepo
if [ -f "package.json" ] && grep -q '"workspaces"' package.json; then
  pass "Monorepo structure detected and configured"
else
  info "Monorepo check skipped"
fi

################################################################################
# CHECK 11: Design-Aware Requirements Validation
################################################################################
section_header "CHECK 11: Design-Aware Requirements Validation"

if npm run requirements:verify >/dev/null 2>&1; then
  if REQUIREMENTS_STRICT_ALL=false npm run requirements:verify; then
    pass "Requirements matrix verification passes with persona/flow/design linkage"
  else
    fail "Requirements matrix verification failed (design linkage or verification drift)"
  fi
else
  fail "requirements:verify script unavailable or failing to start"
fi

################################################################################
# Summary & Recommendation
################################################################################
section_header "RELEASE READINESS SUMMARY"

echo ""
echo "Results:"
echo "  ✓ Checks Passed: $CHECKS_PASSED"
echo "  ⚠ Warnings: $WARNINGS"
echo "  ✗ Blocking Issues: $BLOCKING_ISSUES"
echo ""

if [ "$BLOCKING_ISSUES" -eq 0 ]; then
  echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}✓ GO FOR LAUNCH - Release readiness gate PASSED${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
  echo ""
  if [ "$WARNINGS" -gt 0 ]; then
    echo "Note: $WARNINGS informational warnings above. Review before deploying."
  fi
  echo ""
  echo "Next steps:"
  echo "  1. Create pull request with these changes"
  echo "  2. Merge to develop/main branch"
  echo "  3. Deploy to production"
  echo ""
  exit 0
else
  echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}✗ RELEASE BLOCKED - $BLOCKING_ISSUES blocking issue(s) found${NC}"
  echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "Required fixes:"
  echo "  - Review blocking issues above"
  echo "  - Run failing tests locally"
  echo "  - Fix and re-run this gate"
  echo ""
  exit 1
fi
