#!/bin/bash

# 📊 Monitoring & Alerting System
# Automated monitoring of all services with intelligent alerting and auto-healing

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
NC='\033[0m' # No Color

# Configuration
MONITOR_INTERVAL="${MONITOR_INTERVAL:-300}"  # 5 minutes default
ALERT_EMAIL="${ALERT_EMAIL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
LOG_FILE="${LOG_FILE:-monitoring.log}"
HEALTH_FILE="${HEALTH_FILE:-health-status.json}"

# Monitoring thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=5000  # 5 seconds

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

log_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
    echo -e "${PURPLE}$(printf '%.0s=' {1..50})${NC}"
}

# Send alert notifications
send_alert() {
    local level="$1"
    local service="$2"
    local message="$3"
    local details="$4"

    local subject="[$level] $service - $message"
    local body="Service: $service
Level: $level
Message: $message
Time: $(date)
Details: $details

System Info:
$(uname -a)
Uptime: $(uptime)
Load Average: $(uptime | awk -F'load average:' '{ print $2 }')"

    # Email alert
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$body" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || true
    fi

    # Slack alert
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$subject\",\"attachments\":[{\"text\":\"$body\"}]}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi

    # Log alert
    case $level in
        "CRITICAL")
            log_error "ALERT: $subject - $details"
            ;;
        "WARNING")
            log_warning "ALERT: $subject - $details"
            ;;
        "INFO")
            log_info "ALERT: $subject - $details"
            ;;
    esac
}

# System resource monitoring
monitor_system_resources() {
    log_info "Monitoring system resources..."

    # CPU usage
    CPU_USAGE=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | tr -d '%')
    CPU_USAGE=${CPU_USAGE%.*}

    if [ "$CPU_USAGE" -gt "$CPU_THRESHOLD" ]; then
        send_alert "WARNING" "System" "High CPU usage detected" "CPU: ${CPU_USAGE}% (threshold: ${CPU_THRESHOLD}%)"
    fi

    # Memory usage
    MEMORY_USAGE=$(vm_stat | grep "Pages active" | awk '{print $3}' | tr -d '.')
    TOTAL_MEMORY=$(echo "$(sysctl -n hw.memsize) / 1024 / 1024 / 1024" | bc)
    ACTIVE_MEMORY=$((MEMORY_USAGE * 4096 / 1024 / 1024))  # Convert to MB
    MEMORY_PERCENT=$((ACTIVE_MEMORY * 100 / TOTAL_MEMORY))

    if [ "$MEMORY_PERCENT" -gt "$MEMORY_THRESHOLD" ]; then
        send_alert "WARNING" "System" "High memory usage detected" "Memory: ${MEMORY_PERCENT}% (${ACTIVE_MEMORY}MB/${TOTAL_MEMORY}MB)"
    fi

    # Disk usage
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')

    if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
        send_alert "CRITICAL" "System" "Low disk space" "Disk usage: ${DISK_USAGE}% (threshold: ${DISK_THRESHOLD}%)"
    fi

    # Update health status
    jq --arg cpu "$CPU_USAGE" --arg memory "$MEMORY_PERCENT" --arg disk "$DISK_USAGE" \
        '.system = {cpu: $cpu, memory: $memory, disk: $disk, timestamp: now | todate}' \
        "$HEALTH_FILE" > "${HEALTH_FILE}.tmp" && mv "${HEALTH_FILE}.tmp" "$HEALTH_FILE"
}

# GitHub Actions monitoring
monitor_github_actions() {
    log_info "Monitoring GitHub Actions..."

    # Check if GitHub CLI is authenticated
    if ! gh auth status > /dev/null 2>&1; then
        log_warning "GitHub CLI not authenticated - skipping GitHub Actions monitoring"
        jq '.github = {status: "not_authenticated", timestamp: now | todate}' \
            "$HEALTH_FILE" > "${HEALTH_FILE}.tmp" && mv "${HEALTH_FILE}.tmp" "$HEALTH_FILE"
        return
    fi

    # Check runner status
    RUNNERS=$(gh api repos/mnelson3/wishlist-wizard/actions/runners --jq '.runners[] | select(.status == "online") | .name' 2>/dev/null)

    if [ -z "$RUNNERS" ]; then
        send_alert "CRITICAL" "GitHub Actions" "No runners online" "All GitHub runners are offline"
    else
        RUNNER_COUNT=$(echo "$RUNNERS" | wc -l)
        log_success "GitHub runners online: $RUNNER_COUNT"
    fi

    # Check recent workflow runs
    FAILED_RUNS=$(gh run list --repo mnelson3/wishlist-wizard --limit 5 --json status,conclusion | jq '.[] | select(.status == "completed" and .conclusion == "failure") | .databaseId' | wc -l 2>/dev/null || echo "0")

    if [ "$FAILED_RUNS" -gt 0 ]; then
        send_alert "WARNING" "GitHub Actions" "Recent workflow failures detected" "$FAILED_RUNS workflows failed in the last 5 runs"
    fi

    # Update health status
    jq --arg runners "$RUNNER_COUNT" --arg failed "$FAILED_RUNS" \
        '.github = {runners_online: $runners, recent_failures: $failed, timestamp: now | todate}' \
        "$HEALTH_FILE" > "${HEALTH_FILE}.tmp" && mv "${HEALTH_FILE}.tmp" "$HEALTH_FILE"
}

# Firebase services monitoring
monitor_firebase() {
    log_info "Monitoring Firebase services..."

    # Check Firebase projects
    for env in development staging production; do
        project_id="wishlist-wizard-${env}"

        # Check hosting
        if curl -s --max-time 10 "https://${project_id}.web.app" | grep -q "wishlist"; then
            log_success "Firebase Hosting ($env): OK"
        else
            send_alert "CRITICAL" "Firebase Hosting" "Service unavailable" "Environment: $env, URL: https://${project_id}.web.app"
        fi

        # Check functions
        if curl -s --max-time 10 "https://us-central1-${project_id}.cloudfunctions.net/api/health" | grep -q "ok"; then
            log_success "Firebase Functions ($env): OK"
        else
            send_alert "WARNING" "Firebase Functions" "Health check failed" "Environment: $env"
        fi

        # Check Firestore
        # This would require Firebase Admin SDK or REST API access
        log_info "Firestore monitoring requires additional setup"
    done

    # Update health status
    jq '.firebase = {hosting: "monitored", functions: "monitored", firestore: "pending", timestamp: now | todate}' \
        "$HEALTH_FILE" > "${HEALTH_FILE}.tmp" && mv "${HEALTH_FILE}.tmp" "$HEALTH_FILE"
}

# Docker services monitoring
monitor_docker() {
    log_info "Monitoring Docker services..."

    if ! docker info > /dev/null 2>&1; then
        send_alert "CRITICAL" "Docker" "Docker daemon unavailable" "Cannot connect to Docker daemon"
        return
    fi

    # Check runner container
    if docker ps | grep -q "wishlist-wizard-github-runner"; then
        log_success "GitHub runner container: Running"
    else
        send_alert "CRITICAL" "Docker" "GitHub runner container not running" "Attempting auto-restart..."

        # Auto-healing: restart container
        if [ -f "docker-compose.runner.yml" ]; then
            docker compose -f docker-compose.runner.yml restart
            sleep 10

            if docker ps | grep -q "wishlist-wizard-github-runner"; then
                send_alert "INFO" "Docker" "GitHub runner container restarted successfully" "Auto-healing successful"
            else
                send_alert "CRITICAL" "Docker" "Failed to restart GitHub runner container" "Manual intervention required"
            fi
        fi
    fi

    # Check container resource usage
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemPerc}}" | while read -r line; do
        if [[ $line == *"wishlist"* ]]; then
            container=$(echo "$line" | awk '{print $1}')
            cpu=$(echo "$line" | awk '{print $2}' | tr -d '%')
            mem=$(echo "$line" | awk '{print $3}' | tr -d '%')

            if [ "${cpu%.*}" -gt 80 ]; then
                send_alert "WARNING" "Docker" "High CPU usage in container" "Container: $container, CPU: $cpu%"
            fi

            if [ "${mem%.*}" -gt 85 ]; then
                send_alert "WARNING" "Docker" "High memory usage in container" "Container: $container, Memory: $mem%"
            fi
        fi
    done

    # Update health status
    jq '.docker = {daemon: "running", containers: "monitored", timestamp: now | todate}' \
        "$HEALTH_FILE" > "${HEALTH_FILE}.tmp" && mv "${HEALTH_FILE}.tmp" "$HEALTH_FILE"
}

# API endpoint monitoring
monitor_api_endpoints() {
    log_info "Monitoring API endpoints..."

    ENDPOINTS_production="https://api.wishlist-wizard-prod.web.app"
    ENDPOINTS_staging="https://api.wishlist-wizard-staging.web.app"
    ENDPOINTS_development="http://localhost:5001/wishlist-wizard-dev/us-central1/api"

    for env in production staging development; do
        url=""
        case $env in
            production) url="$ENDPOINTS_production" ;;
            staging) url="$ENDPOINTS_staging" ;;
            development) url="$ENDPOINTS_development" ;;
        esac

        # Health check
        start_time=$(date +%s%3N)
        response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" --max-time 10 "$url/health" 2>/dev/null || echo "HTTPSTATUS:000;TIME:10.000")
        end_time=$(date +%s%3N)

        http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://' | sed -e 's/;TIME.*//')
        response_time=$(echo "$response" | tr -d '\n' | sed -e 's/.*;TIME://')

        # Convert response time to milliseconds
        response_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "10000")

        if [ "$http_code" = "200" ] && [ "${response_ms%.*}" -lt "$RESPONSE_TIME_THRESHOLD" ]; then
            log_success "API ($env): OK (${response_ms%.*}ms)"
        elif [ "$http_code" = "200" ]; then
            send_alert "WARNING" "API" "Slow response time" "Environment: $env, Response time: ${response_ms%.*}ms"
        else
            send_alert "CRITICAL" "API" "Endpoint unavailable" "Environment: $env, HTTP: $http_code, URL: $url"
        fi
    done

    # Update health status
    jq '.api = {endpoints: "monitored", response_times: "tracked", timestamp: now | todate}' \
        "$HEALTH_FILE" > "${HEALTH_FILE}.tmp" && mv "${HEALTH_FILE}.tmp" "$HEALTH_FILE"
}

# Certificate monitoring
monitor_certificates() {
    log_info "Monitoring SSL certificates..."

    CERT_DIR="certs"
    CERT_FILE="$CERT_DIR/cert.pem"

    if [ -f "$CERT_FILE" ]; then
        # Check certificate expiry
        EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
        EXPIRY_DATE=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRY" +%s 2>/dev/null || date -d "$EXPIRY" +%s)
        CURRENT_DATE=$(date +%s)
        DAYS_LEFT=$(( (EXPIRY_DATE - CURRENT_DATE) / 86400 ))

        if [ $DAYS_LEFT -lt 7 ]; then
            send_alert "CRITICAL" "SSL Certificate" "Certificate expires soon" "Days left: $DAYS_LEFT"
        elif [ $DAYS_LEFT -lt 30 ]; then
            send_alert "WARNING" "SSL Certificate" "Certificate expires soon" "Days left: $DAYS_LEFT"
        else
            log_success "SSL certificate valid for $DAYS_LEFT days"
        fi

        # Update health status
        jq --arg days "$DAYS_LEFT" \
            '.certificates = {days_left: $days, status: "valid", timestamp: now | todate}' \
            "$HEALTH_FILE" > "${HEALTH_FILE}.tmp" && mv "${HEALTH_FILE}.tmp" "$HEALTH_FILE"
    else
        send_alert "WARNING" "SSL Certificate" "No certificate found" "SSL certificate monitoring not configured"
        jq '.certificates = {status: "missing", timestamp: now | todate}' \
            "$HEALTH_FILE" > "${HEALTH_FILE}.tmp" && mv "${HEALTH_FILE}.tmp" "$HEALTH_FILE"
    fi
}

# Generate monitoring report
generate_report() {
    log_info "Generating monitoring report..."

    REPORT_FILE="monitoring-report-$(date +%Y%m%d).json"

    # Create comprehensive report
    jq --arg timestamp "$(date)" \
        --arg uptime "$(uptime)" \
        --arg load_avg "$(uptime | awk -F'load average:' '{ print $2 }')" \
        '. + {report_generated: $timestamp, system_uptime: $uptime, system_load: $load_avg}' \
        "$HEALTH_FILE" > "$REPORT_FILE"

    log_success "Monitoring report generated: $REPORT_FILE"
}

# Auto-healing functions
auto_heal() {
    log_info "Running auto-healing checks..."

    # Restart failed services
    if ! docker ps | grep -q "wishlist-wizard-github-runner"; then
        log_info "Attempting to restart GitHub runner..."
        if [ -f "docker-compose.runner.yml" ]; then
            docker compose -f docker-compose.runner.yml up -d
        fi
    fi

    # Clean up old containers
    docker container prune -f > /dev/null 2>&1

    # Clean up old images
    docker image prune -f > /dev/null 2>&1

    log_success "Auto-healing checks completed"
}

# Main monitoring loop
main() {
    log_header "🚀 Wishlist Wizard - Monitoring & Alerting System"

    cd "$PROJECT_ROOT"

    # Initialize health status file
    if [ ! -f "$HEALTH_FILE" ]; then
        echo '{"initialized": true, "timestamp": "'$(date)'"}' | jq . > "$HEALTH_FILE"
    fi

    # Load environment variables
    if [ -f ".env.automation" ]; then
        source .env.automation
    fi

    # Single run or continuous monitoring
    if [ "${1:-}" = "--once" ]; then
        log_info "Running single monitoring cycle..."

        monitor_system_resources
        monitor_github_actions
        monitor_firebase
        monitor_docker
        monitor_api_endpoints
        monitor_certificates
        auto_heal
        generate_report

        log_success "Monitoring cycle completed"
    else
        log_info "Starting continuous monitoring (interval: ${MONITOR_INTERVAL}s)..."
        log_info "Press Ctrl+C to stop"

        while true; do
            monitor_system_resources
            monitor_github_actions
            monitor_firebase
            monitor_docker
            monitor_api_endpoints
            monitor_certificates
            auto_heal

            # Generate report daily
            if [ $(date +%H%M) = "0000" ]; then
                generate_report
            fi

            sleep "$MONITOR_INTERVAL"
        done
    fi
}

# Show usage
show_usage() {
    echo "📊 Monitoring & Alerting System"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --once              Run single monitoring cycle"
    echo "  --help              Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  MONITOR_INTERVAL    Monitoring interval in seconds (default: 300)"
    echo "  ALERT_EMAIL         Email address for alerts"
    echo "  SLACK_WEBHOOK       Slack webhook URL for alerts"
    echo "  LOG_FILE           Log file path (default: monitoring.log)"
    echo "  HEALTH_FILE        Health status file (default: health-status.json)"
}

# Parse arguments
case ${1:-} in
    --help|-h)
        show_usage
        exit 0
        ;;
    --once)
        main --once
        ;;
    *)
        main
        ;;
esac