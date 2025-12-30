# 🚀 Zero-Touch DevOps - Quick Reference for AI Agents

## 🎯 Mission Brief
Implement the Wishlist Wizard zero-touch DevOps automation suite on a new project. This eliminates manual credential management and provides automated CI/CD, monitoring, and deployment.

## 📋 Critical Success Factors

### 1. **Bash 3.2 Compatibility** (MACOS PRIORITY)
**CRITICAL REQUIREMENT**: macOS uses Bash 3.2 - NO associative arrays allowed!

```bash
# ❌ NEVER USE (Bash 4.0+ only)
declare -A CONFIGS
CONFIGS["dev"]="project-dev"

# ✅ ALWAYS USE (Bash 3.2+ compatible)
CONFIGS_dev="project-dev"
```

### 2. **File Structure Template**
```
project-root/
├── automate.sh                    # Master controller
├── .env.automation               # Configuration (NEVER commit)
├── scripts/
│   ├── manage-environments.sh    # Environment management
│   ├── monitoring.sh             # Health monitoring
│   ├── token-rotation.sh         # Credential rotation
│   └── automate-all.sh           # Deployment orchestration
├── docker-compose.runner.yml     # GitHub runner config
└── ZERO_TOUCH_DEVOPS_IMPLEMENTATION_GUIDE.md  # Full documentation
```

### 3. **Mobile App Deployment** (NEW!)
**iOS App Store & Android Play Store automation**

```bash
# Deploy iOS app to TestFlight/App Store
./automate.sh deploy ios development    # TestFlight
./automate.sh deploy ios production     # App Store

# Deploy Android app to Play Store
./automate.sh deploy android staging    # Internal/Beta track
./automate.sh deploy android production # Production track
```

**Fastlane Integration:**
- iOS: `packages/mobile/ios/fastlane/` (TestFlight + App Store)
- Android: `packages/mobile/android/fastlane/` (Google Play)

### 4. **macOS Runner Directory Isolation** (CRITICAL!)
**ES Module Conflict Prevention**

For projects with `"type": "module"` in `package.json`, macOS runners MUST be installed OUTSIDE the project directory:

```bash
# ❌ WRONG - Causes ES module conflicts
~/Projects/my-project/actions-runner/

# ✅ CORRECT - Isolated environment
~/actions-runner-my-project/
```

**Error Prevention:**
- `ReferenceError: require is not defined in ES module scope`
- Runner CommonJS code conflicts with project ES modules
- Always isolate runners for modern Node.js projects

### 4. **Core Components Priority Order**
1. **Master Controller** (`automate.sh`) - Unified interface
2. **Environment Manager** - Multi-environment setup
3. **Monitoring System** - Health checks and alerts
4. **GitHub Runners** - CI/CD execution
5. **Token Rotation** - Automated credential management
6. **Mobile Deployment** - iOS/Android app stores

## 🛠️ Implementation Checklist

### Phase 1: Foundation (Required First)
- [ ] Copy `automate.sh` template
- [ ] Create `.env.automation` from template
- [ ] Implement environment manager script
- [ ] Test Bash 3.2 compatibility

### Phase 2: Infrastructure
- [ ] Set up GitHub self-hosted runners
- [ ] Configure Docker containers
- [ ] Initialize Firebase projects
- [ ] Set up monitoring system

### Phase 3: Integration
- [ ] Connect GitHub Actions workflows
- [ ] Configure deployment pipelines
- [ ] Set up alerting (email/Slack)
- [ ] Enable token rotation
- [ ] **Configure mobile app deployment (iOS/Android)**

### Phase 4: Validation
- [ ] Test full deployment cycle
- [ ] Verify monitoring alerts
- [ ] Confirm auto-healing works
- [ ] **Test mobile app deployment to stores**
- [ ] Document customizations

## 🔧 Key Technical Patterns

### Error Handling
```bash
# Always check for required tools
command -v jq >/dev/null 2>&1 || { echo "jq required"; exit 1; }

# Handle authentication gracefully
if ! gh auth status >/dev/null 2>&1; then
    log_warning "GitHub CLI not authenticated - skipping..."
    return
fi
```

### Configuration Management
```bash
# Load environment variables safely
if [ -f ".env.automation" ]; then
    source .env.automation
fi

# Use environment-specific variables
PROJECT_ID=$(eval "echo \$ENV_CONFIGS_$ENVIRONMENT")
```

### Logging Standards
```bash
# Consistent log format
log_info() { echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" | tee -a "$LOG_FILE"; }
log_success() { echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1" | tee -a "$LOG_FILE"; }
log_error() { echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" | tee -a "$LOG_FILE"; }
```

## 🚨 Common Pitfalls to Avoid

### 1. **Associative Arrays** (Will break on macOS)
- Replace `declare -A` with variable naming: `CONFIGS_dev=`
- Use `eval` for dynamic access: `eval "echo \$CONFIGS_$ENV"`

### 2. **Missing Authentication Checks**
- Always check `gh auth status` before GitHub operations
- Handle unauthenticated state gracefully

### 3. **Hardcoded Project Names**
- Replace all `wishlist-wizard` references with variables
- Use `PROJECT_NAME` environment variable

### 4. **Missing Error Handling**
- Use `set -e` at script start
- Check command exit codes
- Provide meaningful error messages

### 5. **macOS Runner ES Module Conflicts**
- **CRITICAL**: Never install macOS runner inside projects with `"type": "module"`
- Always use isolated directory: `~/actions-runner-{project-name}/`
- Prevents `ReferenceError: require is not defined in ES module scope`
- Runner CommonJS conflicts with project ES modules

### 6. **Inconsistent Logging**
- Use standardized log functions
- Include timestamps in all logs
- Tee output to log files

## 📚 Resource References

### Primary Documentation
- `ZERO_TOUCH_DEVOPS_IMPLEMENTATION_GUIDE.md` - Complete implementation guide
- `.env.automation.example` - Configuration template
- `docker-compose.runner.yml` - Runner configuration

### Code Templates
- `automate.sh` - Master controller template
- `scripts/manage-environments.sh` - Environment management
- `scripts/monitoring.sh` - Monitoring system

### Validation Commands
```bash
# Test basic functionality
./automate.sh health

# Verify monitoring
./automate.sh monitor once

# Check environment setup
./automate.sh environment status development

# Test deployment (dry run first)
./automate.sh deploy web development
```

## 🎯 Success Criteria

### Functional Requirements
- [ ] `./automate.sh` commands work without errors
- [ ] GitHub runners register and execute jobs
- [ ] Monitoring system detects issues and sends alerts
- [ ] Environment configurations deploy successfully
- [ ] Token rotation works automatically
- [ ] **Mobile apps deploy to app stores successfully**

### Compatibility Requirements
- [ ] Runs on macOS (Bash 3.2)
- [ ] Runs on Linux (Bash 4.0+)
- [ ] No associative array usage
- [ ] Graceful degradation when services unavailable

### Quality Requirements
- [ ] Comprehensive error handling
- [ ] Consistent logging format
- [ ] Clear user feedback
- [ ] Automated recovery mechanisms

## 🚀 Quick Start Commands

```bash
# 1. Copy templates
cp ZERO_TOUCH_DEVOPS_IMPLEMENTATION_GUIDE.md /path/to/new/project/
cp automate.sh.template /path/to/new/project/automate.sh
cp .env.automation.example /path/to/new/project/.env.automation

# 2. Customize project names
sed -i 's/wishlist-wizard/your-project-name/g' automate.sh

# 3. Test compatibility
bash --version  # Must be 3.2+ for macOS
./automate.sh --help

# 4. Configure environment
./automate.sh environment setup development

# 5. Start monitoring
./automate.sh monitor start
```

## 📞 Emergency Contacts

### If Implementation Fails
1. Check Bash version: `bash --version`
2. Verify no associative arrays: `grep "declare -A" scripts/*.sh`
3. Test individual components: `./automate.sh health`
4. Review logs: `tail -f monitoring.log`

### Critical Issues
- **Bash compatibility**: Replace associative arrays immediately
- **Authentication failures**: Check `gh auth status`
- **Deployment failures**: Review GitHub Actions logs
- **Monitoring not working**: Check jq installation and permissions

---

**Remember**: This solution was built specifically to work across different projects. Focus on Bash 3.2 compatibility and the master controller pattern. The full implementation guide contains all detailed code templates.</content>
<parameter name="filePath">/Users/marknelson/Circus/Repositories/wishlist-wizard/ZERO_TOUCH_DEVOPS_QUICK_REFERENCE.md