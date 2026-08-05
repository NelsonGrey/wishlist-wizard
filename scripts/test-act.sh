#!/bin/bash

# Act Workflow Testing Script
# Test GitHub Actions workflows locally with act to avoid consuming Actions minutes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🎭 Act Workflow Testing${NC}"
echo -e "${BLUE}========================${NC}"

cd "$PROJECT_ROOT"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

    # Check if act is installed
    if ! command -v act &> /dev/null; then
        echo -e "${RED}❌ act CLI is not installed${NC}"
        echo -e "${YELLOW}Install with: brew install act${NC}"
        exit 1
    fi

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running${NC}"
        echo -e "${YELLOW}Start Docker Desktop and try again${NC}"
        exit 1
    fi

    # Check for .act-secrets
    if [ ! -f ".act-secrets/secrets" ]; then
        echo -e "${RED}❌ Real secrets file not found${NC}"
        echo -e "${YELLOW}Create .act-secrets/secrets with your actual secrets${NC}"
        echo -e "${YELLOW}See .act-secrets/test-secrets for the expected format${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Prerequisites met${NC}"
}

# Setup Docker images (one-time setup)
setup_docker_images() {
    echo -e "${YELLOW}🐳 Setting up optimized Docker images for act...${NC}"

    # Use smaller, optimized images
    docker pull node:18-alpine || echo "Failed to pull Node.js Alpine image"
    docker pull node:18-slim || echo "Failed to pull Node.js slim image"

    # Create optimized act image (much smaller than catthehacker/ubuntu)
    echo -e "${YELLOW}Building custom lightweight act image...${NC}"
    cat > Dockerfile.act << EOF
FROM node:18-alpine
RUN apk add --no-cache bash git curl jq
RUN npm install -g @actions/core @actions/github
EOF
    docker build -f Dockerfile.act -t act-lightweight:latest . && rm Dockerfile.act

    echo -e "${GREEN}✅ Optimized Docker images setup${NC}"
}

# Test specific workflow
test_workflow() {
    local workflow="$1"
    local job="$2"
    local event="${3:-push}"

    echo -e "${YELLOW}🧪 Testing workflow: $workflow${NC}"
    echo -e "${YELLOW}Job: $job${NC}"
    echo -e "${YELLOW}Event: $event${NC}"
    echo ""

    # Use optimized container options
    local act_cmd="act -W .github/workflows/$workflow.yml"
    act_cmd="$act_cmd --secret-file .act-secrets/secrets"
    act_cmd="$act_cmd --job $job"
    act_cmd="$act_cmd --container-architecture linux/amd64"
    act_cmd="$act_cmd --pull=false"
    act_cmd="$act_cmd --rm"  # Auto-remove containers after run
    act_cmd="$act_cmd --use-new-action-cache=false"  # Disable action cache to save space
    act_cmd="$act_cmd --artifact-server-path /tmp/act-artifacts"  # Use temp directory

    # Use lightweight image for Node.js jobs
    if [[ "$workflow" == "test-secrets" ]] || [[ "$workflow" == "ci-cd-pipeline" && "$job" == "quality-check" ]]; then
        act_cmd="$act_cmd --container-options=\"--memory=1g --cpus=1\""
        # Use node:18-alpine for Flutter jobs to avoid architecture issues
        if [[ "$workflow" == "ci-cd-pipeline" && "$job" == "quality-check" ]]; then
            act_cmd="$act_cmd -P ubuntu-latest=node:18-alpine"
        fi
    fi

    # Add event-specific options
    case $event in
        "push")
            act_cmd="$act_cmd --eventpath .github/workflows/test-events/push.json"
            ;;
        "workflow_dispatch")
            act_cmd="$act_cmd --eventpath .github/workflows/test-events/workflow_dispatch.json"
            ;;
    esac

    echo "Running: $act_cmd"
    echo ""

    # Run with timeout and cleanup
    if command -v timeout >/dev/null 2>&1; then
        if timeout 600 eval "$act_cmd"; then
            echo -e "${GREEN}✅ Workflow test passed${NC}"
        else
            local exit_code=$?
            if [[ $exit_code -eq 124 ]]; then
                echo -e "${YELLOW}⏰ Workflow test timed out (10 minutes)${NC}"
            else
                echo -e "${RED}❌ Workflow test failed${NC}"
            fi
            echo -e "${YELLOW}💡 This is expected - fix issues locally before pushing to GitHub${NC}"
        fi
    elif command -v gtimeout >/dev/null 2>&1; then
        if gtimeout 600 eval "$act_cmd"; then
            echo -e "${GREEN}✅ Workflow test passed${NC}"
        else
            local exit_code=$?
            if [[ $exit_code -eq 124 ]]; then
                echo -e "${YELLOW}⏰ Workflow test timed out (10 minutes)${NC}"
            else
                echo -e "${RED}❌ Workflow test failed${NC}"
            fi
            echo -e "${YELLOW}💡 This is expected - fix issues locally before pushing to GitHub${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Timeout command not available, running without timeout protection${NC}"
        if eval "$act_cmd"; then
            echo -e "${GREEN}✅ Workflow test passed${NC}"
        else
            echo -e "${RED}❌ Workflow test failed${NC}"
            echo -e "${YELLOW}💡 This is expected - fix issues locally before pushing to GitHub${NC}"
        fi
    fi

    # Cleanup any remaining containers
    docker stop $(docker ps -aq --filter "name=act-") 2>/dev/null || true
    docker rm $(docker ps -aq --filter "name=act-") 2>/dev/null || true
}

# Cleanup Docker resources
cleanup_docker() {
    echo -e "${YELLOW}🧹 Cleaning up Docker resources...${NC}"

    # Stop and remove act containers
    docker stop $(docker ps -aq --filter "name=act-") 2>/dev/null || true
    docker rm $(docker ps -aq --filter "name=act-") 2>/dev/null || true

    # Remove act volumes
    docker volume rm $(docker volume ls -q --filter "name=act-") 2>/dev/null || true

    # Prune system
    docker system prune -f

    echo -e "${GREEN}✅ Docker cleanup completed${NC}"
}

# Create test event files
create_test_events() {
    echo -e "${YELLOW}📝 Creating test event files...${NC}"

    mkdir -p .github/workflows/test-events

    # Push event
    cat > .github/workflows/test-events/push.json << EOF
{
  "push": {
    "ref": "refs/heads/develop",
    "head_commit": {
      "message": "Test commit [DRY-RUN]"
    }
  }
}
EOF

    # Workflow dispatch event
    cat > .github/workflows/test-events/workflow_dispatch.json << EOF
{
  "inputs": {
    "environment": "development",
    "dry_run": "true"
  }
}
EOF

    echo -e "${GREEN}✅ Test event files created${NC}"
}

# Main menu
main_menu() {
    echo ""
    echo -e "${BLUE}Choose workflow to test:${NC}"
    echo "1. 🚀 CI/CD Pipeline - Quality Check"
    echo "2. 🚀 CI/CD Pipeline - Build Web"
    echo "3. 🚀 CI/CD Pipeline - Deploy Web"
    echo "4. 📱 Android Distribution"
    echo "5. 🍎 iOS Distribution"
    echo "6. 🌐 Web Deployment"
    echo "7. 🔐 Test Secrets"
    echo "8. 🐳 Setup Docker Images (one-time)"
    echo "9. 📝 Create Test Events"
    echo "10. 🧹 Cleanup Docker Resources"
    echo "0. Exit"
    echo ""

    read -p "Enter choice (0-10): " choice

    case $choice in
        1)
            test_workflow "ci-cd-pipeline" "quality-check" "push"
            ;;
        2)
            test_workflow "ci-cd-pipeline" "build-web" "workflow_dispatch"
            ;;
        3)
            test_workflow "ci-cd-pipeline" "deploy-web" "workflow_dispatch"
            ;;
        4)
            test_workflow "android-distribution" "distribute-android" "push"
            ;;
        5)
            test_workflow "ios-distribution" "distribute-ios" "push"
            ;;
        6)
            test_workflow "web-deployment" "deploy-web" "push"
            ;;
        7)
            test_workflow "test-secrets" "test-secrets" "workflow_dispatch"
            ;;
        8)
            setup_docker_images
            ;;
        9)
            create_test_events
            ;;
        10)
            cleanup_docker
            ;;
        0)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            ;;
    esac

    # Loop back to menu
    main_menu
}

# Run main function
check_prerequisites
main_menu