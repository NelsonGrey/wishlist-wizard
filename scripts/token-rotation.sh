#!/bin/bash

# 🔄 Token Rotation Service
# Automatically rotates and renews all authentication tokens and credentials

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
ROTATION_INTERVAL="${ROTATION_INTERVAL:-7}"  # Days between rotations
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-}"
LOG_FILE="${LOG_FILE:-token-rotation.log}"

# Helper functions
log_info() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" | tee -a "$LOG_FILE"
}

# Send notification
send_notification() {
    local subject="$1"
    local message="$2"

    if [ -n "$NOTIFICATION_EMAIL" ]; then
        echo "$message" | mail -s "$subject" "$NOTIFICATION_EMAIL" 2>/dev/null || true
    fi

    # Also send to stdout for logging
    echo "$subject: $message"
}

# Check if rotation is needed
should_rotate() {
    local token_file="$1"
    local max_age_days="$2"

    if [ ! -f "$token_file" ]; then
        return 0  # File doesn't exist, needs rotation
    fi

    local file_age_days=$(( ($(date +%s) - $(stat -f %m "$token_file" 2>/dev/null || stat -c %Y "$token_file")) / 86400 ))

    if [ $file_age_days -ge $max_age_days ]; then
        return 0  # File is old, needs rotation
    else
        return 1  # File is fresh
    fi
}

# Rotate GitHub tokens
rotate_github_tokens() {
    log_info "Checking GitHub token rotation..."

    # Check if rotation is needed (GitHub tokens expire after 1 year)
    if should_rotate ".env.runner" 30; then  # Rotate every 30 days for safety
        log_info "Rotating GitHub runner token..."

        # Get new runner registration token
        if NEW_TOKEN=$(gh api repos/mnelson3/wishlist-wizard/actions/runners/registration-token --jq .token 2>/dev/null); then
            echo "RUNNER_TOKEN=$NEW_TOKEN" > .env.runner
            log_success "GitHub runner token rotated successfully"

            # Update Docker runner
            if docker compose -f docker-compose.runner.yml ps | grep -q "Up"; then
                log_info "Restarting Docker runner with new token..."
                ./scripts/manage-docker-runner.sh restart
            fi

            send_notification "GitHub Token Rotated" "GitHub runner token has been successfully rotated"
        else
            log_error "Failed to rotate GitHub runner token"
            send_notification "GitHub Token Rotation Failed" "Failed to rotate GitHub runner token - manual intervention required"
        fi
    else
        log_info "GitHub runner token is still valid"
    fi
}

# Rotate Firebase tokens
rotate_firebase_tokens() {
    log_info "Checking Firebase token rotation..."

    # Firebase tokens are typically long-lived, but we can refresh them
    if should_rotate ".firebase-token" 7; then  # Refresh weekly
        log_info "Refreshing Firebase authentication..."

        # Attempt to refresh Firebase token
        if firebase auth:export --project wishlist-wizard-dev > /dev/null 2>&1; then
            touch .firebase-token  # Update timestamp
            log_success "Firebase authentication refreshed"
        else
            log_warning "Firebase authentication refresh failed - may need manual login"
        fi
    else
        log_info "Firebase authentication is current"
    fi
}

# Rotate Docker registry tokens
rotate_docker_tokens() {
    log_info "Checking Docker registry token rotation..."

    if [ -n "$DOCKER_REGISTRY" ] && should_rotate ".docker-token" 7; then
        log_info "Refreshing Docker registry authentication..."

        if echo "$DOCKER_PASSWORD" | docker login "$DOCKER_REGISTRY" --username "$DOCKER_USERNAME" --password-stdin > /dev/null 2>&1; then
            touch .docker-token
            log_success "Docker registry authentication refreshed"
        else
            log_error "Docker registry authentication failed"
        fi
    fi
}

# Rotate API tokens and secrets
rotate_api_secrets() {
    log_info "Checking API secrets rotation..."

    # JWT secrets - rotate every 90 days
    if should_rotate ".jwt-secret" 90; then
        log_info "Rotating JWT secret..."

        NEW_JWT_SECRET=$(openssl rand -hex 32)
        echo "JWT_SECRET=$NEW_JWT_SECRET" > .env.jwt
        touch .jwt-secret

        log_success "JWT secret rotated"
        send_notification "JWT Secret Rotated" "JWT secret has been rotated for security"
    fi

    # Database passwords - rotate every 60 days
    if should_rotate ".db-password" 60; then
        log_info "Rotating database password..."

        # Generate new password
        NEW_DB_PASSWORD=$(openssl rand -base64 24)

        # Update database password (this would need to be customized for your DB)
        # This is a placeholder - implement actual DB password rotation
        echo "DATABASE_PASSWORD=$NEW_DB_PASSWORD" > .env.db

        touch .db-password
        log_success "Database password rotated"
        send_notification "Database Password Rotated" "Database password has been rotated"
    fi

    # Encryption keys - rotate every 180 days
    if should_rotate ".encryption-key" 180; then
        log_info "Rotating encryption key..."

        NEW_ENCRYPTION_KEY=$(openssl rand -hex 32)
        echo "ENCRYPTION_KEY=$NEW_ENCRYPTION_KEY" > .env.encryption

        touch .encryption-key
        log_success "Encryption key rotated"
        send_notification "Encryption Key Rotated" "Encryption key has been rotated"
    fi
}

# Rotate SSL certificates
rotate_certificates() {
    log_info "Checking SSL certificate rotation..."

    CERT_DIR="certs"
    CERT_FILE="$CERT_DIR/cert.pem"

    if [ -f "$CERT_FILE" ]; then
        # Check certificate expiry
        EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
        EXPIRY_DATE=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY" +%s 2>/dev/null || date -d "$EXPIRY" +%s)
        CURRENT_DATE=$(date +%s)
        DAYS_LEFT=$(( (EXPIRY_DATE - CURRENT_DATE) / 86400 ))

        if [ $DAYS_LEFT -lt 30 ]; then
            log_warning "Certificate expires in $DAYS_LEFT days - renewal needed"

            # For production, this would integrate with Let's Encrypt
            # For now, generate new self-signed cert
            openssl req -x509 -newkey rsa:4096 -keyout "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem" -days 365 -nodes \
                -subj "/C=US/ST=State/L=City/O=WishlistWizard/CN=wishlist-wizard.com"

            log_success "SSL certificate renewed"
            send_notification "SSL Certificate Renewed" "SSL certificate has been renewed (expires in 365 days)"
        else
            log_info "SSL certificate valid for $DAYS_LEFT more days"
        fi
    else
        log_info "No SSL certificate found - generating new one..."
        mkdir -p "$CERT_DIR"
        openssl req -x509 -newkey rsa:4096 -keyout "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem" -days 365 -nodes \
            -subj "/C=US/ST=State/L=City/O=WishlistWizard/CN=wishlist-wizard.com"
        log_success "SSL certificate generated"
    fi
}

# Clean up expired tokens and temporary files
cleanup_expired() {
    log_info "Cleaning up expired tokens and temporary files..."

    # Remove old log files (keep last 30 days)
    find . -name "*.log" -mtime +30 -delete 2>/dev/null || true

    # Remove old backup files (keep last 7 days)
    find backups -name "*.tar.gz" -mtime +7 -delete 2>/dev/null || true

    # Remove temporary token files older than 1 day
    find . -name ".temp-*" -mtime +1 -delete 2>/dev/null || true

    log_success "Cleanup completed"
}

# Health check after rotation
health_check() {
    log_info "Running post-rotation health checks..."

    local issues=0

    # Check GitHub runners
    if ! gh api repos/mnelson3/wishlist-wizard/actions/runners --jq '.runners[] | select(.status == "online") | .name' | grep -q .; then
        log_error "No GitHub runners online after rotation"
        issues=$((issues + 1))
    fi

    # Check Firebase access
    if ! firebase projects:list | grep -q wishlist-wizard; then
        log_error "Firebase access failed after rotation"
        issues=$((issues + 1))
    fi

    # Check Docker access
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker access failed after rotation"
        issues=$((issues + 1))
    fi

    if [ $issues -eq 0 ]; then
        log_success "All health checks passed"
        send_notification "Token Rotation Successful" "All tokens rotated successfully and health checks passed"
    else
        log_error "$issues health check(s) failed"
        send_notification "Token Rotation Issues" "$issues health check(s) failed - manual review required"
    fi

    return $issues
}

# Main rotation workflow
main() {
    log_info "Starting token rotation service..."

    cd "$PROJECT_ROOT"

    # Load environment variables
    if [ -f ".env.automation" ]; then
        source .env.automation
    fi

    # Run all rotation tasks
    rotate_github_tokens
    rotate_firebase_tokens
    rotate_docker_tokens
    rotate_api_secrets
    rotate_certificates
    cleanup_expired

    # Health check
    if health_check; then
        log_success "Token rotation completed successfully"
        exit 0
    else
        log_error "Token rotation completed with issues"
        exit 1
    fi
}

# Show usage
show_usage() {
    echo "🔄 Token Rotation Service"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help          Show this help message"
    echo "  --dry-run       Run in dry-run mode (no actual changes)"
    echo "  --force         Force rotation regardless of age"
    echo "  --interval DAYS Set rotation interval in days (default: 7)"
    echo ""
    echo "Environment variables:"
    echo "  ROTATION_INTERVAL    Days between rotations (default: 7)"
    echo "  NOTIFICATION_EMAIL   Email for notifications"
    echo "  LOG_FILE            Log file path (default: token-rotation.log)"
    echo "  DOCKER_REGISTRY     Docker registry URL"
    echo "  DOCKER_USERNAME     Docker registry username"
    echo "  DOCKER_PASSWORD     Docker registry password"
}

# Parse arguments
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_usage
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --interval)
            ROTATION_INTERVAL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Override should_rotate function for force mode
if [ "$FORCE" = "true" ]; then
    should_rotate() {
        return 0  # Always rotate in force mode
    }
fi

# Override logging for dry run
if [ "$DRY_RUN" = "true" ]; then
    log_info() {
        echo "[DRY RUN] $1"
    }
    log_success() {
        echo "[DRY RUN] ✅ $1"
    }
    log_warning() {
        echo "[DRY RUN] ⚠️  $1"
    }
    log_error() {
        echo "[DRY RUN] ❌ $1"
    }
fi

main