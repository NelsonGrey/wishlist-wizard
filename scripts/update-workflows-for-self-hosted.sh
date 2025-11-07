#!/bin/bash
# update-workflows-for-self-hosted.sh
# Script to update GitHub workflows to use self-hosted runners

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Updating Workflows for Self-Hosted Runners${NC}"
echo -e "${BLUE}=============================================${NC}"

# Function to update a workflow file
update_workflow() {
    local file="$1"
    local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"

    echo -e "${YELLOW}📝 Processing: $file${NC}"

    # Create backup
    cp "$file" "$backup"
    echo -e "${GREEN}✅ Backup created: $backup${NC}"

    # Update ubuntu-latest to self-hosted
    if grep -q "runs-on: ubuntu-latest" "$file"; then
        sed -i 's/runs-on: ubuntu-latest/runs-on: [self-hosted, ubuntu-latest]/g' "$file"
        echo -e "${GREEN}✅ Updated ubuntu-latest runners${NC}"
    fi

    # Keep macOS runners as-is (they need GitHub's macOS runners)
    if grep -q "runs-on: macos-latest" "$file"; then
        echo -e "${YELLOW}⚠️  Keeping macOS runner (requires GitHub hosted)${NC}"
    fi

    echo ""
}

# Find all workflow files
WORKFLOW_DIR=".github/workflows"
if [ ! -d "$WORKFLOW_DIR" ]; then
    echo -e "${RED}❌ Workflow directory not found: $WORKFLOW_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}🔍 Finding workflow files...${NC}"
WORKFLOW_FILES=$(find "$WORKFLOW_DIR" -name "*.yml" -o -name "*.yaml")

if [ -z "$WORKFLOW_FILES" ]; then
    echo -e "${RED}❌ No workflow files found${NC}"
    exit 1
fi

echo -e "${GREEN}📋 Found workflow files:${NC}"
echo "$WORKFLOW_FILES"
echo ""

# Process each workflow file
for file in $WORKFLOW_FILES; do
    # Skip iOS workflow (needs macOS)
    if [[ "$file" == *"ios"* ]] || [[ "$file" == *"macos"* ]]; then
        echo -e "${YELLOW}⏭️  Skipping macOS-dependent workflow: $file${NC}"
        continue
    fi

    update_workflow "$file"
done

echo -e "${GREEN}✅ Workflow updates complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Summary of changes:${NC}"
echo "- Ubuntu runners now use: [self-hosted, ubuntu-latest]"
echo "- macOS runners unchanged (require GitHub hosted)"
echo "- Backups created for all modified files"
echo ""
echo -e "${BLUE}🎯 Next steps:${NC}"
echo "1. Set up self-hosted runners using setup-self-hosted-runner.sh"
echo "2. Register runners with your repository"
echo "3. Test workflows with self-hosted runners"
echo "4. Monitor performance and costs"