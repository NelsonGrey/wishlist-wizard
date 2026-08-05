#!/bin/bash
# monitor-github-actions-costs.sh
# Script to monitor GitHub Actions usage and costs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
GITHUB_TOKEN="${GITHUB_TOKEN:-$1}"
REPO="${REPO:-mnelson3/wishlist-wizard}"
MONTHS_BACK="${MONTHS_BACK:-1}"

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}❌ GitHub token required. Set GITHUB_TOKEN environment variable or pass as argument.${NC}"
    echo -e "${YELLOW}Get token from: https://github.com/settings/tokens${NC}"
    exit 1
fi

echo -e "${BLUE}📊 GitHub Actions Cost Monitor${NC}"
echo -e "${BLUE}==============================${NC}"

# Function to make GitHub API calls
github_api() {
    local endpoint="$1"
    curl -s -H "Authorization: token $GITHUB_TOKEN" \
         -H "Accept: application/vnd.github.v3+json" \
         "https://api.github.com/repos/$REPO/$endpoint"
}

# Get workflow runs for the last N months
get_workflow_runs() {
    local months="$1"
    local since=$(date -d "$months months ago" +%Y-%m-%dT%H:%M:%SZ)

    echo -e "${YELLOW}📅 Fetching workflow runs since $since...${NC}"

    github_api "actions/runs?created=>=$since&per_page=100" | \
    jq -r '.workflow_runs[] | "\(.created_at)|\(.conclusion)|\(.run_duration_ms)|\(.runner_group_name)//\"github-hosted\""' | \
    head -50  # Limit to recent runs for analysis
}

# Calculate costs
calculate_costs() {
    local data="$1"
    local total_duration=0
    local github_runs=0
    local self_hosted_runs=0
    local github_cost=0

    echo "$data" | while IFS='|' read -r created_at conclusion duration_ms runner_group; do
        if [ "$conclusion" = "success" ] || [ "$conclusion" = "failure" ]; then
            duration_minutes=$((duration_ms / 60000))

            if [ "$runner_group" = "github-hosted" ] || [ "$runner_group" = "null" ]; then
                github_runs=$((github_runs + 1))
                # Standard runner cost: $0.008/minute
                run_cost=$(echo "scale=4; $duration_minutes * 0.008" | bc)
                github_cost=$(echo "scale=4; $github_cost + $run_cost" | bc)
            else
                self_hosted_runs=$((self_hosted_runs + 1))
            fi

            total_duration=$((total_duration + duration_minutes))
        fi
    done

    echo "$github_runs|$self_hosted_runs|$total_duration|$github_cost"
}

# Main execution
WORKFLOW_DATA=$(get_workflow_runs "$MONTHS_BACK")
COST_DATA=$(calculate_costs "$WORKFLOW_DATA")

IFS='|' read -r github_runs self_hosted_runs total_duration github_cost <<< "$COST_DATA"

# Display results
echo ""
echo -e "${GREEN}📈 Usage Summary (Last $MONTHS_BACK month$( [ $MONTHS_BACK -gt 1 ] && echo "s" ))${NC}"
echo -e "${GREEN}========================================================${NC}"
echo -e "GitHub Hosted Runs: ${YELLOW}$github_runs${NC}"
echo -e "Self-Hosted Runs:   ${GREEN}$self_hosted_runs${NC}"
echo -e "Total Duration:     ${BLUE}$total_duration minutes${NC}"
echo ""

echo -e "${GREEN}💰 Cost Analysis${NC}"
echo -e "${GREEN}================${NC}"
echo -e "GitHub Actions Cost: ${RED}\$$github_cost${NC}"

if [ "$github_runs" -gt 0 ]; then
    avg_cost_per_run=$(echo "scale=4; $github_cost / $github_runs" | bc)
    echo -e "Average Cost/Run:    ${YELLOW}\$$avg_cost_per_run${NC}"
fi

if [ "$total_duration" -gt 0 ]; then
    cost_per_minute=$(echo "scale=4; $github_cost / $total_duration" | bc)
    echo -e "Cost/Minute:         ${YELLOW}\$$cost_per_minute${NC}"
fi

# Recommendations
echo ""
echo -e "${BLUE}💡 Recommendations${NC}"
echo -e "${BLUE}==================${NC}"

if [ "$github_runs" -gt 0 ] && [ "$self_hosted_runs" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Consider migrating to self-hosted runners to reduce costs${NC}"
    monthly_savings=$(echo "scale=2; $github_cost * 0.9" | bc)
    echo -e "${GREEN}💰 Potential Monthly Savings: ~\$$monthly_savings${NC}"
elif [ "$self_hosted_runs" -gt 0 ]; then
    echo -e "${GREEN}✅ Self-hosted runners are in use!${NC}"
    if [ "$github_runs" -gt "$self_hosted_runs" ]; then
        echo -e "${YELLOW}📈 Consider migrating more workflows to self-hosted runners${NC}"
    fi
fi

# Show recent runs
echo ""
echo -e "${BLUE}🔍 Recent Workflow Runs${NC}"
echo -e "${BLUE}=======================${NC}"
echo "$WORKFLOW_DATA" | head -10 | while IFS='|' read -r created_at conclusion duration_ms runner_group; do
    duration_minutes=$((duration_ms / 60000))
    runner_type=$([ "$runner_group" = "github-hosted" ] || [ "$runner_group" = "null" ] && echo "GitHub" || echo "Self-hosted")
    echo -e "${YELLOW}$(date -d "$created_at" +%Y-%m-%d)${NC} | ${BLUE}$runner_type${NC} | ${GREEN}$duration_minutes min${NC} | ${conclusion}"
done

echo ""
echo -e "${GREEN}✅ Cost monitoring complete!${NC}"