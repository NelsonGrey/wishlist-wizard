# Keychain Password Popup Solutions

## Problem Analysis

Your Wishlist Wizard iOS project experiences macOS keychain password popups during:
1. **Fastlane builds** (match, gym, build_app actions)
2. **Xcode code signing** (during manual builds)
3. **Certificate operations** (certificate import/export)
4. **Security commands** in CI/CD workflows

### Root Causes

1. **Missing Key Partition List** - The keychain lacks proper access control lists for Apple tools
2. **Locked Keychains** - Keychains remain locked when `security` commands need access
3. **Missing `OTHER_CODE_SIGN_FLAGS`** - Xcode doesn't know which keychain to use
4. **Interactive Shell** - Fastlane/scripts assume interactive terminal for password entry
5. **Certificate Policy Issues** - Keychains don't grant `codesign` tool access

---

## Solution Implementation

### 1. Set Key Partition List (Priority: CRITICAL)

This is the **most effective solution** for preventing prompts. It allows Apple tools to access keys without asking.

#### In Fastlane (Already Implemented ✓)

Your Fastfile already has this in the `sync_signing` lane:

```ruby
sh("security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k #{keychain_password.shellescape} #{keychain_path.shellescape} 2>/dev/null || true", log: false)
```

✅ **Status**: Implemented in:
- Lines 284-286 (sync_signing lane)
- Lines 334-336 (build_appstore lane)
- Lines 434-436 (build_testflight lane)

#### Verify Before Fastlane

Add this to your CI/CD workflow BEFORE running fastlane:

```bash
#!/bin/bash
# Ensure all keychains have proper access lists

KEYCHAIN_PASSWORD="${MATCH_KEYCHAIN_PASSWORD:-fastlane_password}"
KEYCHAIN_PATH="${MATCH_KEYCHAIN_PATH:-$HOME/Library/Keychains/login.keychain-db}"

# Unlock keychain first
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH" || true

# Set partition list for all Apple tools AND codesign
security set-key-partition-list \
  -S apple-tool:,apple:,codesign: \
  -s \
  -k "$KEYCHAIN_PASSWORD" \
  "$KEYCHAIN_PATH" 2>/dev/null || true

echo "✅ Keychain partition list configured"
```

### 2. Unlock Keychains Before Operations (Priority: HIGH)

Ensure keychains are unlocked with appropriate timeout settings.

#### Implementation Pattern

```bash
# Unlock with 1-hour timeout
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

# Extended timeout (7200 seconds = 2 hours)
security set-keychain-settings -lut 7200 "$KEYCHAIN_PATH"
```

#### In CI/CD Environments

Your `ephemeral_keychain_fastlane_fixed.sh` already does this:

```bash
# Lines 160-161
security unlock-keychain -p "$KC_PASS" "$KC_PATH" 2>/dev/null
security set-keychain-settings -lut 7200 "$KC_PATH" 2>/dev/null
```

✅ **Status**: Implemented in ephemeral keychain wrapper

### 3. Configure Codesign to Target Specific Keychain (Priority: HIGH)

Tell `codesign` utility which keychain to use explicitly.

#### Environment Variables

```bash
# For Fastlane/Xcode builds
export OTHER_CODE_SIGN_FLAGS="--keychain $KEYCHAIN_PATH"

# For direct codesign commands
codesign --keychain "$KEYCHAIN_PATH" [other args]
```

#### In Fastlane

Add to `build_appstore` and `build_testflight` lanes (currently uses xcargs):

```ruby
# Already partially implemented via xcargs
build_app(
  xcargs: "CODE_SIGN_STYLE='Manual' ...",
  # Could also add:
  # OTHER_CODE_SIGN_FLAGS="--keychain #{keychain_path}"
)
```

✅ **Status**: Partially implemented

### 4. Use --keychain Safe Path Format (Priority: MEDIUM)

Ensure no path escaping issues:

```bash
# Safe format (as used in your code)
KEYCHAIN_PATH="$HOME/Library/Keychains/fastlane_tmp_keychain.keychain-db"

# Ensure it exists before use
if [ ! -f "$KEYCHAIN_PATH" ]; then
  echo "ERROR: Keychain not found at: $KEYCHAIN_PATH"
  exit 1
fi

# Use with proper quoting
security unlock-keychain -p "$PASSWORD" "$KEYCHAIN_PATH"
```

---

## Fixes by Component

### A. Fastlane (`packages/mobile/ios/fastlane/Fastfile`)

**Status**: ✅ Already well-protected

**Verifications**:
- [x] `set_partition_list` helper defined (lines 10-22)
- [x] Key partition list set in `sync_signing` (line 286)
- [x] Keychain unlock before build_appstore (line 334)
- [x] Keychain unlock before build_testflight (line 434)
- [x] Extended timeout settings (line 161 in ephemeral_keychain script)

**Recommendations** (Optional Enhancements):
1. Add explicit `OTHER_CODE_SIGN_FLAGS` environment variable export
2. Add final keychain diagnostics on build failure
3. Log actual keychain paths before operations

### B. CI/CD GitHub Actions Workflows

**Action Required**: Add keychain initialization step

Create or update `.github/workflows/deploy-ios.yml`:

```yaml
- name: Initialize Keychain
  run: |
    KEYCHAIN_PASSWORD="${{ secrets.MATCH_KEYCHAIN_PASSWORD }}"
    KEYCHAIN_PATH="$HOME/Library/Keychains/fastlane_tmp_keychain.keychain-db"
    
    # Unlock
    security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH" 2>/dev/null || true
    
    # Set partition list
    security set-key-partition-list \
      -S apple-tool:,apple:,codesign: \
      -s \
      -k "$KEYCHAIN_PASSWORD" \
      "$KEYCHAIN_PATH" 2>/dev/null || true
    
    # Extended timeout
    security set-keychain-settings -lut 7200 "$KEYCHAIN_PATH" 2>/dev/null || true
    
    echo "✅ Keychain initialized"

- name: Run Fastlane Build
  env:
    MATCH_KEYCHAIN_PASSWORD: ${{ secrets.MATCH_KEYCHAIN_PASSWORD }}
    MATCH_KEYCHAIN_NAME: fastlane_tmp_keychain
    MATCH_KEYCHAIN_PATH: ${{ runner.home }}/Library/Keychains/fastlane_tmp_keychain.keychain-db
  run: |
    cd packages/mobile/ios
    fastlane build_appstore
```

### C. Local Development

**For preventing prompts on your local machine**:

```bash
#!/bin/bash
# keychain-setup.sh

set -e

KEYCHAIN_NAME="fastlane_tmp_keychain"
KEYCHAIN_PASSWORD="${KEYCHAIN_PASSWORD:-your_password_here}"
KEYCHAIN_PATH="$HOME/Library/Keychains/${KEYCHAIN_NAME}.keychain-db"

echo "🔐 Setting up keychain: $KEYCHAIN_NAME"

# Create if doesn't exist
if [ ! -f "$KEYCHAIN_PATH" ]; then
  security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
  echo "✅ Created keychain"
fi

# Unlock
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
echo "✅ Unlocked keychain"

# Set partition list (CRITICAL)
security set-key-partition-list \
  -S apple-tool:,apple:,codesign: \
  -s \
  -k "$KEYCHAIN_PASSWORD" \
  "$KEYCHAIN_PATH"
echo "✅ Set partition list"

# Set timeout to 1 hour
security set-keychain-settings -lut 3600 "$KEYCHAIN_PATH"
echo "✅ Set 1-hour timeout"

# Add to search list
security list-keychains -d user -s "$KEYCHAIN_PATH" $(security list-keychains -d user | tr -d '"')
echo "✅ Added to keychain search list"

echo "🎉 Keychain ready!"
```

---

## Troubleshooting Guide

### Symptom: "User interaction is required to unlock the keychain"

**Solution**:
1. Verify keychain file exists: `ls -la ~/Library/Keychains/`
2. Unlock: `security unlock-keychain -p PASSWORD ~/Library/Keychains/login.keychain-db`
3. Set partition list immediately after unlock
4. Verify: `security show-keychain-info ~/Library/Keychains/login.keychain-db`

### Symptom: "The specified keychain could not be found"

**Solution**:
1. Check correct path: `security list-keychains -d user`
2. Ensure full path in environment variables
3. Verify file exists before operations
4. Check for stale `.keychain` vs `.keychain-db` naming

### Symptom: "Code signing identity not found"

**Solution**:
1. Verify certificate is in keychain: `security find-identity -v -p codesigning KEYCHAIN_PATH`
2. Check partition list: `security show-keychain-info KEYCHAIN_PATH`
3. Ensure match ran successfully: `echo $sigh_*_appstore_certificate-name`
4. Verify `MATCH_KEYCHAIN_NAME` and `MATCH_KEYCHAIN_PASSWORD` are set

### Symptom: "Security prompt appears during Xcode build"

**Solution**:
1. Add to Build Phases pre-action:
   ```bash
   security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
   security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
   ```
2. Set `OTHER_CODE_SIGN_FLAGS="--keychain $KEYCHAIN_PATH"` in xcargs
3. Manually allow access in Keychain Access.app once, then check "Always Allow"

---

## Environment Variables Required

### For CI/CD (GitHub Actions)

```
MATCH_KEYCHAIN_PASSWORD    # Password for ephemeral keychain
MATCH_KEYCHAIN_NAME        # Name (e.g., fastlane_tmp_keychain)
MATCH_KEYCHAIN_PATH        # Full path to keychain file
APP_STORE_CONNECT_KEY      # ASC API key (base64 or PEM)
APP_STORE_CONNECT_KEY_ID   # ASC Key ID
APP_STORE_CONNECT_ISSUER_ID # ASC Issuer ID
```

### For Local Development

```bash
export KEYCHAIN_PASSWORD="your_password"
export MATCH_KEYCHAIN_NAME="fastlane_tmp_keychain"
export MATCH_KEYCHAIN_PATH="$HOME/Library/Keychains/fastlane_tmp_keychain.keychain-db"
```

---

## Verification Checklist

- [ ] Keychain file exists at expected path
- [ ] Keychain is readable: `security show-keychain-info KEYCHAIN_PATH`
- [ ] Certificate is in keychain: `security find-identity -v -p codesigning KEYCHAIN_PATH`
- [ ] Partition list is set: Look for `apple:` in `security show-keychain-info` output
- [ ] Codesign can access certificate without prompt:
  ```bash
  codesign -v --keychain "$KEYCHAIN_PATH" file_to_sign
  ```
- [ ] Fastlane variables are exported: `echo $MATCH_KEYCHAIN_NAME`
- [ ] No stale fastlane keychains: `security list-keychains | grep fastlane`

---

## Additional Resources

- [Apple Security Framework Documentation](https://developer.apple.com/documentation/security)
- [Fastlane Match Guide](https://docs.fastlane.tools/actions/match/)
- [Codesign Man Page](https://ss64.com/osx/codesign.html)
- [Your ephemeral_keychain_fastlane_fixed.sh](../scripts/ephemeral_keychain_fastlane_fixed.sh)
- [Your Fastfile Implementation](../packages/mobile/ios/fastlane/Fastfile)

---

## Summary

Your codebase is **already well-configured** for handling keychain access. The main protections are:

1. ✅ **Ephemeral keychain creation** with dedicated password
2. ✅ **Key partition list setting** for Apple tool access
3. ✅ **Keychain locking/unlocking** around operations
4. ✅ **Cleanup and recovery** scripts for stale keychains

**Most prompts should be eliminated** by ensuring:
- Keychain is properly initialized before Fastlane runs
- Environment variables (`MATCH_KEYCHAIN_PASSWORD`, etc.) are set
- `security set-key-partition-list` runs immediately after keychain creation
- No interactive shell assumptions in CI/CD

If prompts still occur, use the **Troubleshooting Guide** above to diagnose by checking keychain status and partition list configuration.
