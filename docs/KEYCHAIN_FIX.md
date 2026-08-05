# Keychain Password Prompt Fix

## Issue
macOS keychain password prompts were appearing repeatedly across multiple applications due to LaunchAgent services trying to access GitHub credentials.

## Root Cause
Multiple automated services were accessing GitHub credentials stored in the macOS keychain:

1. **LaunchAgent Token-Refresh Services**: `com.*.runner-token-refresh.plist` files running token-refresh scripts every few minutes
2. **Cron Jobs**: Three cron jobs running runner monitor scripts every 5-10 minutes
   - `/monitor.sh` (every 5 minutes)
   - `master-runner-monitor.sh` (every 5 minutes)
   - `docker-runner-monitor.sh` (every 10 minutes)

All of these scripts called GitHub CLI (`gh api`) which triggered keychain authentication prompts.

## Solution Applied (Feb 24, 2026)

### 1. Removed Token-Refresh LaunchAgents
- Unloaded and removed `com.modulo-squares.runner-token-refresh.plist` from `~/Library/LaunchAgents/`
- Deleted `com.wishlist-wizard.runner-token-refresh.plist` from repository to prevent future installation
- No token-refresh services are needed since GitHub CLI manages authentication automatically

### 2. Removed Cron Jobs
- Removed all runner monitor cron jobs that were calling `gh api`
- Backup saved to `/tmp/crontab_backup.txt`
- These scheduled jobs were the primary cause of repeated keychain prompts

### 3. Deprecated token-refresh.sh Script
- Updated `token-refresh.sh` to show deprecation warning
- Script now exits immediately with helpful message
- Original code preserved for reference

### 4. Why This Works
- GitHub CLI (`gh`) manages its own authentication via `~/.config/gh/hosts.yml`
- Tokens are refreshed automatically when needed
- No background services required
- No keychain access needed for normal operation

## Verification
```bash
# Check no token-refresh services are running
launchctl list | grep token
# Should output: "No token-refresh services running"

# Check no monitor cron jobs are running  
crontab -l
# Should output nothing (empty crontab)

# Verify GitHub CLI is still authenticated
gh auth status
# Should show: "✓ Logged in to github.com"

# Check LaunchAgents directory
ls ~/Library/LaunchAgents/ | grep token-refresh
# Should output nothing
```

## Action Required for Other Repositories

If you have similar keychain issues with other repositories, apply the same fix:

### For modulo-squares repository:
```bash
cd ~/Circus/Repositories/modulo-squares
git rm com.modulo-squares.runner-token-refresh.plist
# Update token-refresh.sh with deprecation notice (same as wishlist-wizard)
```

### For vehicle-vitals repository:
```bash
cd ~/Circus/Repositories/vehicle-vitals
# Check if token-refresh plist exists
test -f com.vehicle-vitals.runner-token-refresh.plist && git rm com.vehicle-vitals.runner-token-refresh.plist
# Check LaunchAgents
ls ~/Library/LaunchAgents/ | grep vehicle-vitals.*token
```

### For nelson-grey repository:
```bash
cd ~/Circus/Repositories/nelson-grey
# Check if token-refresh plist exists
test -f com.nelson-grey.runner-token-refresh.plist && git rm com.nelson-grey.runner-token-refresh.plist
# Update shared library if needed
```

## Files Modified
- `com.wishlist-wizard.runner-token-refresh.plist` - Deleted
- `token-refresh.sh` - Deprecated with notice
- `~/Library/LaunchAgents/com.modulo-squares.runner-token-refresh.plist` - Removed from system
- Crontab - Removed 3 monitor script entries (backup saved to `/tmp/crontab_backup.txt`)

## GitHub Actions Runners
GitHub Actions self-hosted runners continue to work normally. They have their own authentication mechanism and don't rely on these token-refresh scripts.

## References
- GitHub CLI Authentication: https://cli.github.com/manual/gh_auth_login
- macOS LaunchAgents: https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html
