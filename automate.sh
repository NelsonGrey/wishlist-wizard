#!/bin/bash

# 🎯 Master Automation Controller
# Unified interface for all Wishlist Wizard automation tasks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
COMMAND="${1:-help}"
SUBCOMMAND="${2:-}"
ENVIRONMENT="${3:-development}"

# Helper functions
log_header() {
    echo -e "${PURPLE}🎯 $1${NC}"
    echo -e "${PURPLE}$(printf '%.0s=' {1..60})${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Show banner
show_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                    🎯 Wishlist Wizard                       ║
║                   Master Automation                        ║
║                                                              ║
║  🚀 Complete automation for CI/CD, deployments, monitoring  ║
║  🔐 Token management, environment configuration, security   ║
║  📊 Health monitoring, alerting, and auto-healing           ║
║  🔄 Zero-touch operations for all services                  ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Load environment variables from .env.automation.<environment> if it exists
ENVIRONMENT="${ENVIRONMENT:-development}"
AUTOMATION_ENV_FILE=".env.automation.${ENVIRONMENT}"
if [ -f "$AUTOMATION_ENV_FILE" ]; then
    log_info "Loading configuration from $AUTOMATION_ENV_FILE"
    set -a
    source "$AUTOMATION_ENV_FILE"
    set +a
elif [ -f ".env.automation" ]; then
    log_warning "Loading configuration from deprecated .env.automation"
    set -a
    source .env.automation
    set +a
else
    log_warning "$AUTOMATION_ENV_FILE not found. Some features may not work."
    log_info "Copy .env.automation.development.example to $AUTOMATION_ENV_FILE and configure it."
fi

# Validate environment
validate_environment() {
    local valid_envs=("development" "staging" "production")
    if [[ ! " ${valid_envs[@]} " =~ " $ENVIRONMENT " ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        echo "Valid environments: ${valid_envs[*]}"
        exit 1
    fi
}

# Setup GitHub CLI authentication (CRITICAL for zero-touch operation)
setup_github_cli() {
    log_header "GitHub CLI Authentication Setup"

    # Check if GH_TOKEN is provided
    if [ -z "$GH_TOKEN" ]; then
        log_error "GH_TOKEN environment variable is required for GitHub CLI authentication"
        log_info "Please set GH_TOKEN in your $AUTOMATION_ENV_FILE file"
        log_info "Get a token from: https://github.com/settings/tokens"
        exit 1
    fi

    # Check if GitHub CLI is installed
    if ! command -v gh &> /dev/null; then
        log_info "Installing GitHub CLI..."
        if command -v brew &> /dev/null; then
            brew install gh
        elif command -v apt &> /dev/null; then
            curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
            sudo apt update
            sudo apt install gh
        else
            log_error "GitHub CLI installation not supported on this system"
            log_info "Please install GitHub CLI manually: https://cli.github.com/"
            exit 1
        fi
    fi

    # Configure GitHub CLI with token
    log_info "Configuring GitHub CLI authentication..."
    echo "$GH_TOKEN" | gh auth login --with-token

    # Verify authentication
    if gh auth status &> /dev/null; then
        log_success "GitHub CLI authentication successful"
        # Set Git config for commits (optional)
        if [ -n "$GIT_USER_NAME" ] && [ -n "$GIT_USER_EMAIL" ]; then
            git config --global user.name "$GIT_USER_NAME"
            git config --global user.email "$GIT_USER_EMAIL"
            log_info "Git user configured: $GIT_USER_NAME <$GIT_USER_EMAIL>"
        fi
    else
        log_error "GitHub CLI authentication failed"
        exit 1
    fi
}

# Automation commands
cmd_setup() {
    log_header "Complete System Setup"
    validate_environment

    log_info "Running complete automation setup for $ENVIRONMENT..."

    # GitHub CLI authentication (CRITICAL for zero-touch operation)
    setup_github_cli

    # Environment setup
    ./scripts/manage-environments.sh "$ENVIRONMENT" setup

    # Token management
    ./scripts/token-rotation.sh --force

    # Docker setup
    ./scripts/automate-all.sh "$ENVIRONMENT" true false

    # Initial deployment
    ./scripts/automate-all.sh "$ENVIRONMENT" false false

    log_success "Complete setup finished!"
    log_info "Run './automate.sh monitor start' to begin monitoring"
}

cmd_deploy() {
    log_header "Automated Deployment"
    validate_environment

    case $SUBCOMMAND in
        "full")
            log_info "Running full deployment for $ENVIRONMENT..."
            ./scripts/automate-all.sh "$ENVIRONMENT" false false
            ;;
        "web")
            log_info "Deploying web application..."
            firebase use "wishlist-wizard-${ENVIRONMENT}"
            firebase deploy --only hosting --project "wishlist-wizard-${ENVIRONMENT}"
            ;;
        "api")
            log_info "Deploying API functions..."
            firebase use "wishlist-wizard-${ENVIRONMENT}"
            firebase deploy --only functions --project "wishlist-wizard-${ENVIRONMENT}"
            ;;
        "mobile")
            log_info "Deploying mobile PWA..."
            firebase use "wishlist-wizard-${ENVIRONMENT}"
            firebase deploy --only hosting --project "wishlist-wizard-${ENVIRONMENT}"
            ;;
        "ios")
            deploy_mobile_ios "$ENVIRONMENT"
            ;;
        "android")
            deploy_mobile_android "$ENVIRONMENT"
            ;;
        *)
            log_error "Invalid deployment target: $SUBCOMMAND"
            echo "Usage: $0 deploy [full|web|api|mobile|ios|android] [environment]"
            exit 1
            ;;
    esac

    log_success "Deployment completed!"
}

cmd_monitor() {
    log_header "Monitoring & Alerting"

    case $SUBCOMMAND in
        "start")
            log_info "Starting monitoring system..."
            nohup ./scripts/monitoring.sh > monitoring.out 2>&1 &
            echo $! > monitoring.pid
            log_success "Monitoring started (PID: $(cat monitoring.pid))"
            ;;
        "stop")
            if [ -f "monitoring.pid" ]; then
                kill "$(cat monitoring.pid)" 2>/dev/null || true
                rm monitoring.pid
                log_success "Monitoring stopped"
            else
                log_warning "No monitoring process found"
            fi
            ;;
        "status")
            if [ -f "monitoring.pid" ] && kill -0 "$(cat monitoring.pid)" 2>/dev/null; then
                log_success "Monitoring is running (PID: $(cat monitoring.pid))"
            else
                log_warning "Monitoring is not running"
            fi
            ;;
        "once")
            log_info "Running single monitoring cycle..."
            ./scripts/monitoring.sh --once
            ;;
        *)
            log_error "Invalid monitor command: $SUBCOMMAND"
            echo "Usage: $0 monitor [start|stop|status|once]"
            exit 1
            ;;
    esac
}

cmd_tokens() {
    log_header "Token Management"

    case $SUBCOMMAND in
        "rotate")
            log_info "Rotating all tokens and credentials..."
            ./scripts/token-rotation.sh --force
            ;;
        "status")
            log_info "Checking token status..."
            ./scripts/token-rotation.sh --dry-run
            ;;
        "github")
            log_info "Managing GitHub tokens..."
            ./scripts/update-linux-runner-token.sh
            ;;
        *)
            log_error "Invalid token command: $SUBCOMMAND"
            echo "Usage: $0 tokens [rotate|status|github]"
            exit 1
            ;;
    esac
}

cmd_environment() {
    log_header "Environment Management"

    case $SUBCOMMAND in
        "setup")
            validate_environment
            ./scripts/manage-environments.sh "$ENVIRONMENT" setup
            ;;
        "sync")
            validate_environment
            ./scripts/manage-environments.sh "$ENVIRONMENT" sync-secrets
            ;;
        "status")
            validate_environment
            ./scripts/manage-environments.sh "$ENVIRONMENT" status
            ;;
        "rotate")
            validate_environment
            ./scripts/manage-environments.sh "$ENVIRONMENT" rotate-secrets
            ;;
        *)
            log_error "Invalid environment command: $SUBCOMMAND"
            echo "Usage: $0 environment [setup|sync|status|rotate] [environment]"
            exit 1
            ;;
    esac
}

cmd_backup() {
    log_header "Backup & Recovery"

    case $SUBCOMMAND in
        "create")
            log_info "Creating system backup..."
            ./scripts/automate-all.sh development false false  # This includes backup
            ;;
        "list")
            log_info "Available backups:"
            ls -la backups/ 2>/dev/null || echo "No backups found"
            ;;
        "restore")
            BACKUP_FILE="$3"
            if [ -z "$BACKUP_FILE" ]; then
                log_error "Backup file required"
                echo "Usage: $0 backup restore <backup-file>"
                exit 1
            fi
            log_info "Restoring from backup: $BACKUP_FILE"
            # Implement restore logic here
            log_warning "Restore functionality not yet implemented"
            ;;
        *)
            log_error "Invalid backup command: $SUBCOMMAND"
            echo "Usage: $0 backup [create|list|restore <file>]"
            exit 1
            ;;
    esac
}

cmd_health() {
    log_header "System Health Check"

    log_info "Running comprehensive health check..."

    # Quick health checks
    echo "🔍 System Resources:"
    top -l 1 | head -5

    echo ""
    echo "🐳 Docker Status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -10

    echo ""
    echo "🔥 Firebase Status:"
    firebase projects:list 2>/dev/null | grep "wishlist-wizard" | head -3 || echo "Firebase CLI available but projects not accessible"

    echo ""
    echo "🤖 GitHub Runners:"
    gh api repos/mnelson3/wishlist-wizard/actions/runners --jq '.runners[] | "\(.name): \(.status)"' 2>/dev/null || echo "GitHub API not accessible"

    echo ""
    echo "📊 Detailed Report:"
    ./scripts/monitoring.sh --once 2>/dev/null || echo "Monitoring not configured"
}

cmd_docker() {
    log_header "Docker Management"

    case $SUBCOMMAND in
        "build")
            log_info "Building all Docker images..."
            ./scripts/automate-all.sh development false true  # Dry run for build only
            ;;
        "runner")
            case $4 in
                "start")
                    ./scripts/manage-docker-runner.sh start
                    ;;
                "stop")
                    ./scripts/manage-docker-runner.sh stop
                    ;;
                "restart")
                    ./scripts/manage-docker-runner.sh restart
                    ;;
                "logs")
                    ./scripts/manage-docker-runner.sh logs
                    ;;
                *)
                    log_error "Invalid runner command: $4"
                    echo "Usage: $0 docker runner [start|stop|restart|logs]"
                    exit 1
                    ;;
            esac
            ;;
        *)
            log_error "Invalid docker command: $SUBCOMMAND"
            echo "Usage: $0 docker [build|runner <command>]"
            exit 1
            ;;
    esac
}

# Mobile deployment functions
deploy_mobile_ios() {
    local env="$1"
    log_header "iOS Mobile App Deployment - $env"

    # Check prerequisites
    if ! command -v flutter &> /dev/null; then
        log_error "Flutter not found. Please install Flutter SDK."
        exit 1
    fi

    if ! command -v fastlane &> /dev/null; then
        log_error "Fastlane not found. Please install Fastlane."
        exit 1
    fi

    # Navigate to mobile project
    cd packages/mobile

    log_info "Building iOS app for $env..."

    # App Store Connect env vars
    FASTLANE_APPLE_ID="${FASTLANE_APPLE_ID}"
    FASTLANE_TEAM_ID="${FASTLANE_TEAM_ID}"
    FASTLANE_ITC_TEAM_ID="${FASTLANE_ITC_TEAM_ID}"
    APP_STORE_CONNECT_KEY_ID="${APP_STORE_CONNECT_KEY_ID}"
    APP_STORE_CONNECT_ISSUER_ID="${APP_STORE_CONNECT_ISSUER_ID}"
    APP_STORE_CONNECT_KEY="${APP_STORE_CONNECT_KEY}"

    # Set environment variables for Fastlane
    export FASTLANE_APPLE_ID="$FASTLANE_APPLE_ID"
    export FASTLANE_TEAM_ID="$FASTLANE_TEAM_ID"
    export FASTLANE_ITC_TEAM_ID="$FASTLANE_ITC_TEAM_ID"
    export APP_STORE_CONNECT_KEY_ID="$APP_STORE_CONNECT_KEY_ID"
    export APP_STORE_CONNECT_ISSUER_ID="$APP_STORE_CONNECT_ISSUER_ID"
    export APP_STORE_CONNECT_KEY="$APP_STORE_CONNECT_KEY"
    export MATCH_GIT_URL="$MATCH_GIT_URL"
    export BETA_FEEDBACK_EMAIL="$BETA_FEEDBACK_EMAIL"

    # Build and deploy based on environment
    case $env in
        "development")
            log_info "Deploying to TestFlight (Development)..."
            cd ios
            fastlane beta
            ;;
        "staging")
            log_info "Deploying to TestFlight (Staging)..."
            cd ios
            fastlane beta
            ;;
        "production")
            log_info "Deploying to App Store (Production)..."
            cd ios
            fastlane release
            ;;
    esac

    cd "$PROJECT_ROOT"
    log_success "iOS deployment completed for $env!"
}

deploy_mobile_android() {
    local env="$1"
    log_header "Android Mobile App Deployment - $env"

    # Check prerequisites
    if ! command -v flutter &> /dev/null; then
        log_error "Flutter not found. Please install Flutter SDK."
        exit 1
    fi

    # Navigate to mobile project
    cd packages/mobile

    log_info "Building Android app for $env..."

    # Set build configuration
    export MOBILE_BUILD_MODE="${MOBILE_BUILD_MODE:-release}"
    export MOBILE_BUILD_NUMBER="${MOBILE_BUILD_NUMBER:-1}"
    export MOBILE_VERSION_NAME="${MOBILE_VERSION_NAME:-1.0.0}"
    export MOBILE_VERSION_CODE="${MOBILE_VERSION_CODE:-1}"

    # Build APK/AAB
    log_info "Building Flutter app..."
    flutter clean
    flutter pub get

    case $env in
        "development")
            flutter build apk --debug --build-name="$MOBILE_VERSION_NAME" --build-number="$MOBILE_BUILD_NUMBER"
            ;;
        "staging")
            flutter build appbundle --build-name="$MOBILE_VERSION_NAME" --build-number="$MOBILE_BUILD_NUMBER"
            ;;
        "production")
            flutter build appbundle --build-name="$MOBILE_VERSION_NAME" --build-number="$MOBILE_BUILD_NUMBER"
            ;;
    esac

    # Deploy to Google Play
    log_info "Deploying to Google Play Store..."

    # Set Google Play configuration
    export GOOGLE_PLAY_SERVICE_ACCOUNT_KEY="$GOOGLE_PLAY_SERVICE_ACCOUNT_KEY"
    export ANDROID_TRACK="${ANDROID_TRACK:-internal}"
    export ANDROID_IN_APP_UPDATE_PRIORITY="${ANDROID_IN_APP_UPDATE_PRIORITY:-3}"

    # Use fastlane or direct upload
    if command -v fastlane &> /dev/null; then
        cd android
        case $env in
            "development"|"staging")
                fastlane internal
                ;;
            "production")
                fastlane production
                ;;
        esac
    else
        log_warning "Fastlane not available, skipping automated upload"
        log_info "Manual upload required to Google Play Console"
        log_info "APK/AAB location: build/app/outputs/"
    fi

    cd "$PROJECT_ROOT"
    log_success "Android deployment completed for $env!"
}

cmd_help() {
    show_banner

    echo -e "${WHITE}USAGE:${NC}"
    echo "  ./automate.sh <command> [subcommand] [environment]"
    echo ""

    echo -e "${WHITE}COMMANDS:${NC}"
    echo -e "${CYAN}  setup${NC}                    Complete system setup and configuration"
    echo -e "${CYAN}  deploy${NC}     <target>      Deploy to specified target (full|web|api|mobile|ios|android)"
    echo -e "${CYAN}  monitor${NC}    <action>      Monitoring system (start|stop|status|once)"
    echo -e "${CYAN}  tokens${NC}     <action>      Token management (rotate|status|github)"
    echo -e "${CYAN}  environment${NC} <action>     Environment management (setup|sync|status|rotate)"
    echo -e "${CYAN}  backup${NC}     <action>      Backup operations (create|list|restore)"
    echo -e "${CYAN}  health${NC}                  System health check"
    echo -e "${CYAN}  docker${NC}     <action>      Docker management (build|runner)"
    echo ""

    echo -e "${WHITE}ENVIRONMENTS:${NC}"
    echo "  development (default), staging, production"
    echo ""

    echo -e "${WHITE}EXAMPLES:${NC}"
    echo "  ./automate.sh setup                    # Complete setup"
    echo "  ./automate.sh deploy full production   # Full production deployment"
    echo "  ./automate.sh deploy ios production    # Deploy iOS app to App Store"
    echo "  ./automate.sh deploy android staging   # Deploy Android app to Play Store"
    echo "  ./automate.sh monitor start            # Start monitoring"
    echo "  ./automate.sh tokens rotate            # Rotate all tokens"
    echo "  ./automate.sh environment setup staging # Setup staging environment"
    echo "  ./automate.sh health                   # Health check"
    echo ""

    echo -e "${WHITE}CONFIGURATION:${NC}"
    echo "  Create .env.automation.<environment> file with:"
    echo "  - ALERT_EMAIL: Email for notifications"
    echo "  - SLACK_WEBHOOK: Slack webhook URL"
    echo "  - DOCKER_REGISTRY: Private registry URL"
    echo "  - MONITOR_INTERVAL: Monitoring interval (seconds)"
}

# Main command dispatcher
main() {
    cd "$PROJECT_ROOT"

    case $COMMAND in
        "setup")
            cmd_setup
            ;;
        "deploy")
            cmd_deploy
            ;;
        "monitor")
            cmd_monitor
            ;;
        "tokens")
            cmd_tokens
            ;;
        "environment"|"env")
            cmd_environment
            ;;
        "backup")
            cmd_backup
            ;;
        "health")
            cmd_health
            ;;
        "docker")
            cmd_docker
            ;;
        "help"|"-h"|"--help"|"")
            cmd_help
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            echo ""
            cmd_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"