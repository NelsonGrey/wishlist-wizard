#!/bin/bash

# Safe Commit Script
# This script helps you commit changes without accidentally triggering expensive GitHub Actions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛡️ Safe Commit Script${NC}"
echo -e "${BLUE}=====================${NC}"

cd "$PROJECT_ROOT"

# Check git status
echo -e "${YELLOW}📋 Checking git status...${NC}"
if ! git diff --quiet || ! git diff --staged --quiet; then
    echo "You have uncommitted changes."
else
    echo -e "${GREEN}✅ Working directory is clean${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Choose commit type:${NC}"
echo "1. 🚀 Production commit (triggers deployment)"
echo "2. 🧪 Development commit (safe, no Actions triggered)"
echo "3. 🏃 Dry-run commit (tests pipeline, minimal Actions)"
echo "4. 📝 Regular commit (safe, no Actions triggered)"
echo ""

read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo -e "${YELLOW}🚀 Production commit selected${NC}"
        echo "This will trigger deployment to production environment."
        read -p "Are you sure? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            git add .
            read -p "Commit message: " message
            git commit -m "$message"
            echo -e "${GREEN}✅ Committed. Push to main branch to deploy.${NC}"
        else
            echo "Commit cancelled."
            exit 1
        fi
        ;;
    2)
        echo -e "${YELLOW}🧪 Development commit selected${NC}"
        echo "This commit will NOT trigger any GitHub Actions."
        git add .
        read -p "Commit message: " message
        git commit -m "$message [SAFE]"
        echo -e "${GREEN}✅ Safe commit created. Push when ready.${NC}"
        ;;
    3)
        echo -e "${YELLOW}🏃 Dry-run commit selected${NC}"
        echo "This will trigger minimal Actions for testing (dry-run mode)."
        git add .
        read -p "Commit message: " message
        git commit -m "$message [DRY-RUN]"
        echo -e "${GREEN}✅ Dry-run commit created. Push to trigger testing.${NC}"
        ;;
    4)
        echo -e "${YELLOW}📝 Regular commit selected${NC}"
        echo "This commit will NOT trigger any GitHub Actions."
        git add .
        read -p "Commit message: " message
        git commit -m "$message"
        echo -e "${GREEN}✅ Regular commit created. Push when ready.${NC}"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo "  - Run './scripts/dry-run-pipeline.sh' to test locally first"
echo "  - Use 'git push origin develop' only when ready"
echo "  - For production: push to main branch"