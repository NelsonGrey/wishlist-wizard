#!/usr/bin/env bash
set -euo pipefail

################################################################################
# recover_keychain.sh
# Utility to safely remove ephemeral keychains created by fastlane helper
# and to restore the default login keychain if present.
# Usage: NEW_LOGIN_PASS=<pass> ./scripts/recover_keychain.sh [--delete-ephemeral] [--restore-login]
################################################################################

DELETE_EPHEMERAL=false
RESTORE_LOGIN=false

for arg in "$@"; do
  case "$arg" in
    --delete-ephemeral)
      DELETE_EPHEMERAL=true
      ;;
    --restore-login)
      RESTORE_LOGIN=true
      ;;
    *)
      echo "Unknown option: $arg"
      exit 2
      ;;
  esac
done

echo "[recover_keychain] Listing current keychains (user):"
security list-keychains -d user | sed 's/"//g' | nl -ba

if $DELETE_EPHEMERAL; then
  echo "[recover_keychain] Deleting ephemeral keychains matching fastlane_tmp_*"
  list=$(security list-keychains -d user | sed 's/[" ]//g' | tr '\n' ' ')
  for kc in $list; do
    short=$(basename "$kc")
    if [[ "$short" == fastlane_tmp_* ]]; then
      echo "Deleting ephemeral keychain: $kc"
      security delete-keychain "$kc" || true
    fi
  done
fi

LOGIN_KC="$HOME/Library/Keychains/login.keychain-db"
if $RESTORE_LOGIN; then
  if [ -f "$LOGIN_KC" ]; then
    echo "[recover_keychain] Restoring default keychain to login.keychain-db"
    security default-keychain -s "$LOGIN_KC" || true
    if [ -n "${NEW_LOGIN_PASS:-}" ]; then
      security unlock-keychain -p "$NEW_LOGIN_PASS" "$LOGIN_KC" || true
    else
      echo "[recover_keychain] No NEW_LOGIN_PASS provided; attempting to unlock without a password"
      security unlock-keychain "$LOGIN_KC" || true
    fi
  else
    echo "[recover_keychain] login.keychain-db not found. If you need to recreate it, use Keychain Access -> Preferences -> Reset My Default Keychain or recreate with security create-keychain"
  fi
fi

echo "[recover_keychain] Completed. Current keychains:"
security list-keychains -d user | sed 's/"//g' | nl -ba

exit 0
