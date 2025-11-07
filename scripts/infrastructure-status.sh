#!/bin/bash

# Infrastructure Status Summary for Wishlist Wizard
# Shows current state of self-hosted runners and workflows

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
REPO_URL="https://github.com/mnelson3/wishlist-wizard"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

header() {
    echo -e "${PURPLE}================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================================${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Check Docker runner status
check_docker_runner() {
    header "🐳 Linux Runner Status (Docker)"

    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        cd "$PROJECT_ROOT"

        if docker-compose -f docker-compose.runner.yml ps | grep -q "Up"; then
            success "Docker runner is running"
            echo ""
            docker-compose -f docker-compose.runner.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
        else
            warning "Docker runner is not running"
            echo ""
            info "Start with: ./scripts/manage-docker-runner.sh start"
        fi

        # Check if .env.runner exists
        if [ -f ".env.runner" ]; then
            success ".env.runner file exists"
        else
            warning ".env.runner file missing"
            info "Create with: echo 'RUNNER_TOKEN=your_token' > .env.runner"
        fi
    else
        error "Docker or Docker Compose not installed"
        info "Install Docker Desktop for macOS"
    fi
    echo ""
}

# Check macOS runner status
check_macos_runner() {
    header "🍎 macOS Runner Status"

    local runner_dir="/Users/github-runner/actions-runner"
    local current_user_dir="$HOME/actions-runner"

    # Check for runner in standard locations
    local found_runner=false

    for dir in "$runner_dir" "$current_user_dir"; do
        if [ -d "$dir" ] && [ -f "$dir/config.sh" ]; then
            found_runner=true
            local runner_location="$dir"

            echo -e "${CYAN}Runner found at: $dir${NC}"

            # Check if running
            if pgrep -f "Runner.Listener" > /dev/null; then
                success "macOS runner is running"
            else
                warning "macOS runner is not running"
                info "Start with: ./scripts/manage-macos-runner.sh start"
            fi

            # Check configuration
            if [ -f "$dir/.runner" ]; then
                success "Runner is configured"
            else
                warning "Runner is not configured"
                info "Configure with: ./scripts/manage-macos-runner.sh configure"
            fi

            break
        fi
    done

    if [ "$found_runner" = false ]; then
        warning "macOS runner not found"
        info "Set up with: ./scripts/setup-macos-runner.sh"
    fi

    echo ""
}

# Check workflow status
check_workflows() {
    header "🔄 Workflow Status"

    local workflow_dir="$PROJECT_ROOT/.github/workflows"

    if [ ! -d "$workflow_dir" ]; then
        error "Workflows directory not found"
        return 1
    fi

    echo -e "${CYAN}Workflow configurations:${NC}"
    echo ""

    # Check each workflow
    for workflow in "$workflow_dir"/*.yml; do
        if [ -f "$workflow" ]; then
            local name=$(basename "$workflow" .yml)
            echo -e "${YELLOW}$name:${NC}"

            # Check runner configuration
            if grep -q "runs-on:.*self-hosted" "$workflow"; then
                success "  Uses self-hosted runners"
            elif grep -q "runs-on:.*macos" "$workflow" && grep -q "self-hosted" "$workflow"; then
                success "  Uses self-hosted macOS runners"
            elif grep -q "runs-on:.*macos" "$workflow"; then
                warning "  Uses GitHub-hosted macOS runners (costs apply)"
            else
                info "  Uses GitHub-hosted runners"
            fi

            # Check if enabled
            if grep -q "^[[:space:]]*#[[:space:]]*push:" "$workflow" || grep -q "^[[:space:]]*#[[:space:]]*workflow_dispatch:" "$workflow"; then
                warning "  Automatic triggers disabled"
            else
                success "  Automatic triggers enabled"
            fi

            echo ""
        fi
    done
}

# Cost analysis
cost_analysis() {
    header "💰 Cost Analysis"

    echo -e "${CYAN}Estimated monthly savings with self-hosted runners:${NC}"
    echo ""

    # Rough estimates
    local github_macos_cost=0.08  # $0.08 per minute
    local avg_build_time=20        # 20 minutes average
    local builds_per_month=30      # 30 builds per month

    local monthly_cost=$(echo "scale=2; $github_macos_cost * $avg_build_time * $builds_per_month" | bc)
    local yearly_cost=$(echo "scale=2; $monthly_cost * 12" | bc)

    echo -e "${RED}GitHub-hosted macOS runners:${NC}"
    echo "  Cost per minute: \$$github_macos_cost"
    echo "  Average build time: ${avg_build_time} minutes"
    echo "  Builds per month: $builds_per_month"
    echo "  Monthly cost: \$$monthly_cost"
    echo "  Yearly cost: \$$yearly_cost"
    echo ""

    echo -e "${GREEN}Self-hosted macOS runners:${NC}"
    echo "  Hardware cost: \$1000-2000 (one-time)"
    echo "  Electricity: \$5-10/month"
    echo "  Maintenance: Minimal"
    echo "  Savings: ~90%"
    echo ""

    local yearly_savings=$(echo "scale=2; $yearly_cost * 0.9" | bc)
    echo -e "${GREEN}Potential yearly savings: \$$yearly_savings${NC}"
    echo ""
}

# Recommendations
recommendations() {
    header "🎯 Recommendations"

    local has_docker_runner=false
    local has_macos_runner=false

    # Check Docker runner
    if command -v docker &> /dev/null && [ -f "$PROJECT_ROOT/.env.runner" ]; then
        has_docker_runner=true
    fi

    # Check macOS runner
    if [ -d "/Users/github-runner/actions-runner" ] || [ -d "$HOME/actions-runner" ]; then
        has_macos_runner=true
    fi

    if [ "$has_docker_runner" = false ]; then
        warning "Set up Linux Docker runner for web/API/Android builds"
        info "  Run: ./scripts/setup-self-hosted-runner.sh"
        info "  Then: ./scripts/manage-docker-runner.sh configure"
        echo ""
    fi

    if [ "$has_macos_runner" = false ]; then
        warning "Set up macOS runner for iOS builds"
        info "  Run: ./scripts/setup-macos-runner.sh"
        info "  Then: ./scripts/manage-macos-runner.sh configure"
        echo ""
    fi

    if [ "$has_docker_runner" = true ] && [ "$has_macos_runner" = true ]; then
        success "All runners configured! 🎉"
        info "Monitor costs at: https://github.com/settings/billing"
        echo ""
    fi

    echo -e "${CYAN}Next steps:${NC}"
    echo "1. Set up missing runners"
    echo "2. Test workflows with self-hosted runners"
    echo "3. Monitor GitHub billing for cost reductions"
    echo "4. Update team on infrastructure changes"
    echo ""
}

# Main function
main() {
    header "🏗️  Wishlist Wizard Infrastructure Status"

    echo -e "${CYAN}Repository: $REPO_URL${NC}"
    echo -e "${CYAN}Date: $(date)${NC}"
    echo ""

    check_docker_runner
    check_macos_runner
    check_workflows
    cost_analysis
    recommendations

    header "📚 Resources"
    echo -e "${CYAN}Documentation:${NC}"
    echo "  Linux Runner: ./scripts/setup-self-hosted-runner.sh --help"
    echo "  macOS Runner: ./docs/MACOS_RUNNER_SETUP.md"
    echo "  Management: ./scripts/manage-*-runner.sh"
    echo ""
    echo -e "${CYAN}GitHub Settings:${NC}"
    echo "  Runners: $REPO_URL/settings/actions/runners"
    echo "  Billing: https://github.com/settings/billing"
    echo ""
}

# Run main function
main