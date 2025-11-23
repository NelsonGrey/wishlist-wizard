#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Wrapper for ephemeral keychain helper - Preserve the original path for backward compatibility
# This wrapper execs the newer, robust script at scripts/ephemeral_keychain_fastlane_fixed.sh
################################################################################

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "$(pwd)")
FIXED="$ROOT/scripts/ephemeral_keychain_fastlane_fixed.sh"
if [ ! -x "$FIXED" ]; then
  if [ -f "$FIXED" ]; then
    chmod +x "$FIXED" || true
  fi
fi
if [ ! -f "$FIXED" ]; then
  echo "[ephemeral-wrapper] Fixed helper not found at $FIXED"
  echo "Please add scripts/ephemeral_keychain_fastlane_fixed.sh or update references to it."
  exit 2
fi
exec "$FIXED" "$@"
