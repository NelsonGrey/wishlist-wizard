# iOS Keychain Setup - Quick Start Guide

## Problem

You're getting macOS keychain password popups during iOS builds, code signing, or Fastlane operations.

## Quick Fix (≈2 minutes)

### Step 1: Run the Setup Script

```bash
./scripts/setup-keychain-local.sh
```

This script will:
- ✅ Create an ephemeral keychain for builds
- ✅ Set the key partition list (prevents prompts)
- ✅ Configure timeout settings
- ✅ Export environment variables

### Step 2: Add to Your Shell Profile

The script will output commands like this:

```bash
export KEYCHAIN_NAME="wishlist-wizard-build"
export KEYCHAIN_PATH="$HOME/Library/Keychains/wishlist-wizard-build.keychain-db"
export MATCH_KEYCHAIN_NAME="wishlist-wizard-build"
export MATCH_KEYCHAIN_PASSWORD="your_password"
export MATCH_KEYCHAIN_PATH="$HOME/Library/Keychains/wishlist-wizard-build.keychain-db"
```

Add these to `~/.zshrc` (or `~/.bash_profile` for bash):

```bash
nano ~/.zshrc
# Paste the export commands
# Press Ctrl+O, Enter to save, Ctrl+X to exit

source ~/.zshrc
```

### Step 3: Verify Setup

```bash
./scripts/diagnose-keychain.sh
```

Expected output:
```
✅ Keychains directory exists
✅ Login keychain exists: login.keychain-db
✅ Keychain is valid
✅ Found Apple Distribution certificates
✅ Partition list configured for: wishlist-wizard-build.keychain-db
✅ All checks passed!
```

## Done! 🎉

No more keychain password popups during builds.

---

## If Prompts Still Appear

### 1. Verify Keychain is Unlocked

```bash
security unlock-keychain -p "YOUR_PASSWORD" "$HOME/Library/Keychains/wishlist-wizard-build.keychain-db"
```

### 2. Re-run Partition List Setup

```bash
KEYCHAIN_PATH="$HOME/Library/Keychains/wishlist-wizard-build.keychain-db"
KEYCHAIN_PASSWORD="your_password"

security set-key-partition-list \
  -S apple-tool:,apple:,codesign: \
  -s \
  -k "$KEYCHAIN_PASSWORD" \
  "$KEYCHAIN_PATH"
```

### 3. Run Diagnostics

```bash
./scripts/diagnose-keychain.sh --verbose
```

### 4. Check Xcode Settings

In Xcode, set:
- Build Settings → Code Signing Identity → "Apple Distribution"
- Build Settings → Provisioning Profile → Your profile
- Build Settings → Development Team → Your team ID

---

## For CI/CD (GitHub Actions)

Your workflows use `.github/workflows/ios-build.yml` which includes:

1. **Keychain initialization** (automatic)
2. **Certificate import** (automatic)
3. **Partition list setup** (automatic)
4. **Cleanup** (automatic)

No additional setup needed - just ensure these secrets are configured:

```
MATCH_KEYCHAIN_PASSWORD
IOS_DISTRIBUTION_P12_BASE64
IOS_DISTRIBUTION_P12_PASSWORD
APP_STORE_CONNECT_KEY
APP_STORE_CONNECT_KEY_ID
APP_STORE_CONNECT_ISSUER_ID
```

---

## File Reference

### Setup & Diagnostics Scripts
- **Setup**: [`scripts/setup-keychain-local.sh`](../scripts/setup-keychain-local.sh)
- **Diagnose**: [`scripts/diagnose-keychain.sh`](../scripts/diagnose-keychain.sh)
- **Ephemeral Keychain**: [`scripts/ephemeral_keychain_fastlane_fixed.sh`](../scripts/ephemeral_keychain_fastlane_fixed.sh)

### Configuration Files
- **Fastfile**: [`packages/mobile/ios/fastlane/Fastfile`](../packages/mobile/ios/fastlane/Fastfile)
- **GitHub Workflow**: [`.github/workflows/ios-build.yml`](./../.github/workflows/ios-build.yml)

### Documentation
- **Full Guide**: [`docs/KEYCHAIN_PASSWORD_POPUP_SOLUTIONS.md`](KEYCHAIN_PASSWORD_POPUP_SOLUTIONS.md)
- **Keychain Recovery**: [`scripts/recover_keychain.sh`](../scripts/recover_keychain.sh)

---

## Understanding the Fix

### The Problem
When Xcode or Fastlane tries to sign code or access certificates, macOS prompts for a keychain password because the keychain doesn't trust these tools by default.

### The Solution
The **key partition list** tells macOS to allow specific tools (apple, codesign) access to keychain items without prompting:

```bash
security set-key-partition-list \
  -S apple-tool:,apple:,codesign: \  # Allow these tools
  -s \
  -k "$PASSWORD" \
  "$KEYCHAIN_PATH"
```

This is **the single most important line** that prevents prompts.

---

## Common Scenarios

### Local Development
```bash
# Execute once
./scripts/setup-keychain-local.sh

# Then add to ~/.zshrc
source ~/.zshrc

# Verify
./scripts/diagnose-keychain.sh

# Build normally
cd packages/mobile
flutter build ios --release
```

### CI/CD
```bash
# Already configured in: .github/workflows/ios-build.yml
# No additional setup required
# Keychain is created, configured, and cleaned up automatically
```

### Xcode Direct Build
```bash
# 1. Run setup
./scripts/setup-keychain-local.sh

# 2. configure environment
source ~/.zshrc

# 3. Open Xcode
open packages/mobile/ios/Runner.xcworkspace

# 4. Build normally (Cmd+B)
```

### Fastlane from Command Line
```bash
# 1. Setup keychain
./scripts/setup-keychain-local.sh

# 2. Configure shell
source ~/.zshrc

# 3. Run Fastlane
cd packages/mobile/ios
fastlane build_appstore
```

---

## Troubleshooting Matrix

| Symptom | Cause | Solution |
|---------|-------|----------|
| "User interaction required" | Keychain locked | `scripts/setup-keychain-local.sh --use-login` |
| "Code signing identity not found" | No certificates | Import certificates or run match |
| "Keychain could not be found" | Wrong path | Verify `KEYCHAIN_PATH` environment variable |
| "Prompt appears during build" | No partition list | Re-run `setup-keychain-local.sh` |
| "Access denied" | Wrong password | Verify `KEYCHAIN_PASSWORD` is correct |

---

## Environment Variables Cheat Sheet

```bash
# Keychain location
KEYCHAIN_PATH="$HOME/Library/Keychains/wishlist-wizard-build.keychain-db"

# Keychain name (without .keychain-db extension)
KEYCHAIN_NAME="wishlist-wizard-build"

# Password (keep secure!)
KEYCHAIN_PASSWORD="your_secure_password"

# For Fastlane
MATCH_KEYCHAIN_NAME="$KEYCHAIN_NAME"
MATCH_KEYCHAIN_PASSWORD="$KEYCHAIN_PASSWORD"
MATCH_KEYCHAIN_PATH="$KEYCHAIN_PATH"

# For Xcode
OTHER_CODE_SIGN_FLAGS="--keychain $KEYCHAIN_PATH"
CODE_SIGN_IDENTITY="Apple Distribution"
DEVELOPMENT_TEAM="YOUR_TEAM_ID"
PROVISIONING_PROFILE_SPECIFIER="Your Profile Name"
```

---

## Need More Help?

1. **Detailed Guide**: See [`docs/KEYCHAIN_PASSWORD_POPUP_SOLUTIONS.md`](KEYCHAIN_PASSWORD_POPUP_SOLUTIONS.md)
2. **Run Diagnostics**: `./scripts/diagnose-keychain.sh --verbose`
3. **Check Logs**: Look for "partition list" or "unlock-keychain" in build logs
4. **Manual Unlock**: `security unlock-keychain -p PASSWORD KEYCHAIN_PATH`
5. **Verify Certs**: `security find-identity -v -p codesigning KEYCHAIN_PATH`

---

## Prevention Tips

✅ **Do:**
- Run setup script after macOS updates
- Backup your keychain password securely
- Keep environment variables in `.env` files
- Use ephemeral keychains in CI/CD
- Run diagnostics monthly

❌ **Don't:**
- Commit passwords to Git (use GitHub Secrets)
- Reuse passwords across keychains
- Delete keychains without backup
- Ignore keychain errors in logs
- Hardcode paths in scripts

---

**Last Updated**: 2024
**Status**: ✅ Current and tested
**Platform**: macOS 12.0+
