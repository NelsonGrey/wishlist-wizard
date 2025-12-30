#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Ephemeral keychain helper for Fastlane (robust version)
# - Creates a temporary keychain
# - Optionally imports a P12 into that keychain
# - Sets MATCH_KEYCHAIN_NAME and MATCH_KEYCHAIN_PASSWORD env exports for Fastlane
# - Runs the provided command string
# - Restores the original keychain and deletes the temporary keychain on exit
################################################################################

if [ "$#" -lt 1 ]; then
  echo "Usage: CERT_P12_PATH=path CERT_P12_PASSWORD=pw $0 \"fastlane command\""
  exit 2
fi

FASTLANE_CMD="$1"

# If not in CI, run directly (avoids surprising local keychain changes)
if [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ]; then
  echo "[ephemeral-keychain] Not running in CI; executing command directly"
  set -x
  eval "$FASTLANE_CMD"
  set +x
  exit 0
fi

echo "[ephemeral-keychain] Running in CI; using ephemeral keychain"

# Some runner setups can get left in a bad state where the default keychain
# still points at a previously-created fastlane tmp keychain (which may have
# been deleted). When that happens, Fastlane can end up generating/importing
# keys into the login keychain while our keychain search list excludes it.
# Normalize early so we always have a sane baseline.
LOGIN_KC="$HOME/Library/Keychains/login.keychain-db"
if [ ! -f "$LOGIN_KC" ]; then
  LOGIN_KC="$HOME/Library/Keychains/login.keychain"
fi
if [ -f "$LOGIN_KC" ]; then
  echo "[ephemeral-keychain] Detected login keychain: $LOGIN_KC"
else
  echo "[ephemeral-keychain] WARNING: No login keychain found at expected paths"
  echo "[ephemeral-keychain] Keychains directory listing (top-level):"
  ls -la "$HOME/Library/Keychains" 2>/dev/null | head -n 50 || true
fi
if [ -f "$LOGIN_KC" ]; then
  CURRENT_DEFAULT_KC=$(security default-keychain -d user 2>/dev/null | tr -d '"' | xargs || true)
  if [ -z "${CURRENT_DEFAULT_KC:-}" ] || [[ "$CURRENT_DEFAULT_KC" == *fastlane_tmp_* ]] || [ ! -f "$CURRENT_DEFAULT_KC" ]; then
    security default-keychain -d user -s "$LOGIN_KC" 2>/dev/null || true
    security default-keychain -s "$LOGIN_KC" 2>/dev/null || true
    security list-keychains -d user -s "$LOGIN_KC" 2>/dev/null || true
    security list-keychains -s "$LOGIN_KC" 2>/dev/null || true
  fi
fi

# Best-effort cleanup of leftover ephemeral keychains from previous runs
if command -v security >/dev/null 2>&1; then
  # Clean up both the legacy randomized keychains and the fixed-name keychain.
  for fixed in "$HOME/Library/Keychains/fastlane_tmp_keychain.keychain-db" \
              "$HOME/Library/Keychains/fastlane_tmp_keychain-db" \
              "$HOME/Library/Keychains/fastlane_tmp_keychain" \
              "$HOME/Library/Keychains/fastlane_tmp_keychain.keychain"; do
    if [ -f "$fixed" ]; then
      security delete-keychain "$fixed" 2>/dev/null || true
    fi
  done

  if security list-keychains -d user 2>/dev/null | grep -q "fastlane_tmp_"; then
    security list-keychains -d user 2>/dev/null | grep "fastlane_tmp_" | while read -r kc; do
      kc_path=$(echo "$kc" | tr -d '"' | xargs)
      if [ -n "$kc_path" ] && [[ "$kc_path" == *fastlane_tmp_* ]]; then
        security delete-keychain "$kc_path" 2>/dev/null || true
      fi
    done
  fi
fi

KC_BASENAME="fastlane_tmp_keychain"
KC_NAME="$KC_BASENAME.keychain-db"
# Create the ephemeral keychain outside of ~/Library/Keychains so other desktop
# apps don't start prompting for it if the user default/search list gets altered.
KC_DIR="${RUNNER_TEMP:-/tmp}"
KC_PATH="$KC_DIR/$KC_NAME"

# NOTE: Avoid using a `tr </dev/urandom | head` pipeline here.
# On some macOS runner setups, `tr` can get stuck and never terminates,
# which stalls the entire GitHub Actions job.
# IMPORTANT: Do NOT reuse MATCH_PASSWORD here.
# MATCH_PASSWORD is for decrypting the match repo and may contain shell-special
# characters or newlines that can break underlying `security` invocations.
# Always use a dedicated keychain password.
KC_PASS="${MATCH_KEYCHAIN_PASSWORD:-}"
if [ -z "${KC_PASS}" ]; then
  if command -v python3 >/dev/null 2>&1; then
    KC_PASS=$(python3 - <<'PY'
import secrets
import string

alphabet = string.ascii_letters + string.digits
print(''.join(secrets.choice(alphabet) for _ in range(24)))
PY
)
  else
    KC_PASS=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24 || echo "fastlane-pass")
  fi
fi

echo "[ephemeral-keychain] Creating temporary keychain: $KC_NAME"
security create-keychain -p "$KC_PASS" "$KC_PATH"

ORIG_DEFAULT_KC=$(security default-keychain -d user 2>/dev/null | tr -d '"' | xargs || true)
if [ -z "${ORIG_DEFAULT_KC:-}" ]; then
  echo "[ephemeral-keychain] WARNING: Unable to determine original default keychain"
fi

# If the runner was already misconfigured and points at a previous fastlane
# temp keychain, treat login as the original default for restoration/search.
if [[ "${ORIG_DEFAULT_KC:-}" == *fastlane_tmp_* ]] && [ -f "$LOGIN_KC" ]; then
  ORIG_DEFAULT_KC="$LOGIN_KC"
fi

# Capture original keychain list so we can restore it
ORIG_KEYCHAIN_LIST=()
while IFS= read -r item; do
  trimmed=$(echo "$item" | tr -d '"' | xargs)
  if [ -n "$trimmed" ] && [ -f "$trimmed" ]; then
    ORIG_KEYCHAIN_LIST+=("$trimmed")
  fi
done < <(security list-keychains -d user 2>/dev/null || true)

cleanup() {
  set +e
  echo "[ephemeral-keychain] Cleaning up"

  if [ -n "${ORIG_DEFAULT_KC:-}" ] && [ -f "$ORIG_DEFAULT_KC" ]; then
    security default-keychain -d user -s "$ORIG_DEFAULT_KC" 2>/dev/null || true
    security default-keychain -s "$ORIG_DEFAULT_KC" 2>/dev/null || true
  fi


  DID_RETRY=0
  if [ ${#ORIG_KEYCHAIN_LIST[@]} -gt 0 ]; then
    security list-keychains -d user -s "${ORIG_KEYCHAIN_LIST[@]}" 2>/dev/null || true
    security list-keychains -s "${ORIG_KEYCHAIN_LIST[@]}" 2>/dev/null || true
  fi

  if [ -n "${KC_PATH:-}" ] && [ -f "$KC_PATH" ] && [[ "$KC_PATH" != *login.keychain* ]]; then
    security delete-keychain "$KC_PATH" 2>/dev/null || true
    rm -f "$KC_PATH" 2>/dev/null || true
  fi
}
# Ensure cleanup runs on normal exit AND when the job is terminated.
trap cleanup EXIT INT TERM HUP

echo "[ephemeral-keychain] Configuring temporary keychain"
# NOTE: We intentionally do NOT set the user default keychain or user search list
# to the ephemeral keychain. On self-hosted Macs this can cause unrelated desktop
# apps (e.g., Microsoft OneNote) to repeatedly prompt for keychain access.
#
# Instead, we rely on Fastlane `match` importing into MATCH_KEYCHAIN_PATH and we
# pass explicit keychain flags to codesign/xcodebuild via OTHER_CODE_SIGN_FLAGS.
security unlock-keychain -p "$KC_PASS" "$KC_PATH" 2>/dev/null
security set-keychain-settings -lut 7200 "$KC_PATH" 2>/dev/null

echo "[ephemeral-keychain] Keychain preflight"
security default-keychain -d user 2>/dev/null || true
security list-keychains -d user 2>/dev/null || true
security show-keychain-info "$KC_PATH" 2>/dev/null || true

if [ -n "${CERT_P12_PATH:-}" ]; then
  if [ ! -f "$CERT_P12_PATH" ]; then
    echo "[ephemeral-keychain] ERROR: CERT_P12_PATH set but file not found: $CERT_P12_PATH"
    exit 3
  fi

  echo "[ephemeral-keychain] Importing certificate into temporary keychain"
  security import "$CERT_P12_PATH" -k "$KC_PATH" -P "${CERT_P12_PASSWORD:-}" -T /usr/bin/codesign -T /usr/bin/security 2>/dev/null || true
  # Apply partition list to all sign-capable private keys (not just the first match)
  security set-key-partition-list -S apple-tool:,apple:,codesign: -s -t private -k "$KC_PASS" "$KC_PATH" 2>/dev/null || true
fi

export MATCH_KEYCHAIN_NAME="$KC_BASENAME"
export MATCH_KEYCHAIN_PASSWORD="$KC_PASS"
export MATCH_KEYCHAIN_PATH="$KC_PATH"

# Ensure codesign/xcodebuild can target the ephemeral keychain without touching
# global keychain defaults/search list.
export OTHER_CODE_SIGN_FLAGS="--keychain $KC_PATH"

if [ -n "${GITHUB_ENV:-}" ] && [ -w "$GITHUB_ENV" ]; then
  echo "MATCH_KEYCHAIN_NAME=$KC_BASENAME" >> "$GITHUB_ENV"
  echo "MATCH_KEYCHAIN_PASSWORD=$KC_PASS" >> "$GITHUB_ENV"
  echo "MATCH_KEYCHAIN_PATH=$KC_PATH" >> "$GITHUB_ENV"
fi

echo "[ephemeral-keychain] Running command: $FASTLANE_CMD"
set -x
set +e
eval "$FASTLANE_CMD"
CMD_STATUS=$?
set -e
set +x

DID_RETRY=0

if [ "${CMD_STATUS:-1}" -ne 0 ]; then
  echo "[ephemeral-keychain] Command failed (exit ${CMD_STATUS}); collecting keychain diagnostics"
  # Ensure the keychain is unlocked for diagnostics.
  security unlock-keychain -p "$KC_PASS" "$KC_PATH" 2>/dev/null || true
  echo "[ephemeral-keychain] Identities in ephemeral keychain (valid only): $KC_PATH"
  security find-identity -v -p codesigning "$KC_PATH" 2>&1 || true
  echo "[ephemeral-keychain] Identities in ephemeral keychain (valid-only, very verbose): $KC_PATH"
  security find-identity -vv -p codesigning "$KC_PATH" 2>&1 || true
  echo "[ephemeral-keychain] Identities in ephemeral keychain (including invalid): $KC_PATH"
  security find-identity -p codesigning "$KC_PATH" 2>&1 || true
  echo "[ephemeral-keychain] Identities in ephemeral keychain (macappstore policy): $KC_PATH"
  security find-identity -p macappstore "$KC_PATH" 2>&1 || true
  echo "[ephemeral-keychain] Identities in ephemeral keychain (macappstore policy, valid only): $KC_PATH"
  security find-identity -v -p macappstore "$KC_PATH" 2>&1 || true
  echo "[ephemeral-keychain] Identities in ephemeral keychain (including invalid, very verbose): $KC_PATH"
  security find-identity -vv -p codesigning "$KC_PATH" 2>&1 || true

  echo "[ephemeral-keychain] Private keys in ephemeral keychain (sign-capable)"
  KEY_SIGNABLE_OUT=$(security find-key -t private -s "$KC_PATH" 2>&1 || true)
  echo "$KEY_SIGNABLE_OUT"
  KEY_APP_LABELS_HEX=$(echo "$KEY_SIGNABLE_OUT" | sed -n 's/.*0x00000006 <blob>=0x\([0-9A-Fa-f]*\).*/\1/p' | tr '[:lower:]' '[:upper:]' | tr '\n' ' ' | xargs || true)
  if [ -n "${KEY_APP_LABELS_HEX:-}" ]; then
    echo "[ephemeral-keychain] Sign-capable private key application labels (hex): $KEY_APP_LABELS_HEX"
  else
    echo "[ephemeral-keychain] No sign-capable private key application labels found"
  fi

  echo "[ephemeral-keychain] Apple Distribution certificate public key hashes (hpky)"
  DIST_CERT_Z_OUT=$(security find-certificate -a -c "Apple Distribution" -Z "$KC_PATH" 2>&1 || true)
  echo "$DIST_CERT_Z_OUT"
  CERT_HPKY_LIST=$(echo "$DIST_CERT_Z_OUT" | sed -n 's/.*"hpky"<blob>=0x\([0-9A-Fa-f]*\).*/\1/p' | tr '[:lower:]' '[:upper:]' | tr '\n' ' ' | xargs || true)
  if [ -n "${CERT_HPKY_LIST:-}" ]; then
    echo "[ephemeral-keychain] Apple Distribution hpky values: $CERT_HPKY_LIST"
    if [ -n "${KEY_APP_LABELS_HEX:-}" ]; then
      for hpky in $CERT_HPKY_LIST; do
        for keylbl in $KEY_APP_LABELS_HEX; do
          if [ "$hpky" = "$keylbl" ]; then
            echo "[ephemeral-keychain] ✅ Found matching cert hpky == private key label: $hpky"
          fi
        done
      done
    fi
  else
    echo "[ephemeral-keychain] No Apple Distribution hpky values found"
  fi
  echo "[ephemeral-keychain] Private keys in ephemeral keychain (all private keys)"
  security find-key -t private "$KC_PATH" 2>&1 || true

  echo "[ephemeral-keychain] Codesign smoke test (uses identity hash if available)"
  echo "[ephemeral-keychain] Keychain search list (before codesign smoke test)"
  security list-keychains -d user 2>&1 || true
  security list-keychains -d user -s "$KC_PATH" 2>&1 || true
  security list-keychains -s "$KC_PATH" 2>&1 || true
  security default-keychain -d user -s "$KC_PATH" 2>&1 || true
  security default-keychain -s "$KC_PATH" 2>&1 || true
  security unlock-keychain -p "$KC_PASS" "$KC_PATH" 2>&1 || true
  echo "[ephemeral-keychain] Identities via default search list (including invalid)"
  security find-identity -p codesigning 2>&1 || true
  echo "[ephemeral-keychain] Identities via default search list (valid only)"
  security find-identity -v -p codesigning 2>&1 || true

  IDENTITY_SHA=$(security find-identity -p codesigning "$KC_PATH" 2>/dev/null | awk '/"Apple Distribution:/{print $2; exit}')
  IDENTITY_NAME=$(security find-identity -p codesigning "$KC_PATH" 2>/dev/null | sed -n 's/.*"\(Apple Distribution:[^"]*\)".*/\1/p' | head -n 1)
  if [ -n "${IDENTITY_SHA:-}" ] && [ -x /usr/bin/codesign ]; then
    CS_TMP=$(mktemp /tmp/codesign_smoke.XXXXXX)
    cp /usr/bin/true "$CS_TMP" 2>/dev/null || true
    echo "[ephemeral-keychain] codesign -s (sha1): $IDENTITY_SHA"
    /usr/bin/codesign -f -s "$IDENTITY_SHA" --keychain "$KC_PATH" --timestamp=none "$CS_TMP" 2>&1 || true
    if [ -n "${IDENTITY_NAME:-}" ]; then
      echo "[ephemeral-keychain] codesign -s (name): $IDENTITY_NAME"
      /usr/bin/codesign -f -s "$IDENTITY_NAME" --keychain "$KC_PATH" --timestamp=none "$CS_TMP" 2>&1 || true
    fi
    /usr/bin/codesign -dv "$CS_TMP" 2>&1 || true
    rm -f "$CS_TMP" 2>/dev/null || true
  else
    echo "[ephemeral-keychain] Skipping codesign smoke test (no identity hash or codesign binary)"
  fi

  # If a matching identity exists but isn't considered "valid", it's usually
  # because the private key ACL/partition list isn't set correctly for
  # non-interactive codesigning. Attempt a one-time repair + retry.
  if [ "${DID_RETRY}" -eq 0 ]; then
    EPHEMERAL_ALL=$(security find-identity -p codesigning "$KC_PATH" 2>&1 || true)
    EPHEMERAL_VALID=$(security find-identity -v -p codesigning "$KC_PATH" 2>&1 || true)
    if echo "$EPHEMERAL_ALL" | grep -Eq '\b[1-9][0-9]* identities found\b' && echo "$EPHEMERAL_VALID" | grep -q "0 valid identities found"; then
      echo "[ephemeral-keychain] Detected invalid identity; attempting partition list repair and retry"
      security unlock-keychain -p "$KC_PASS" "$KC_PATH" 2>/dev/null || true
      # Re-apply partition list to all sign-capable private keys in the keychain.
      # Do this per-key (by application label) to avoid only updating the first match.
      REPAIR_KEYS_OUT=$(security find-key -t private -s "$KC_PATH" 2>&1 || true)
      REPAIR_KEY_LABELS=$(echo "$REPAIR_KEYS_OUT" | sed -n 's/.*0x00000006 <blob>=0x\([0-9A-Fa-f]*\).*/\1/p' | tr '[:lower:]' '[:upper:]' | xargs || true)
      if [ -n "${REPAIR_KEY_LABELS:-}" ]; then
        for keylbl in $REPAIR_KEY_LABELS; do
          security set-key-partition-list -S apple-tool:,apple:,codesign: -s -t private -a "$keylbl" -k "$KC_PASS" "$KC_PATH" 2>&1 || true
        done
      else
        security set-key-partition-list -S apple-tool:,apple:,codesign: -s -t private -k "$KC_PASS" "$KC_PATH" 2>&1 || true
      fi

      # Some tools (including `match`) verify identities using the keychain
      # search list (no explicit keychain argument). Re-assert the intended
      # default/search list before retrying.
      security list-keychains -d user -s "$KC_PATH" 2>/dev/null || true
      security list-keychains -s "$KC_PATH" 2>/dev/null || true
      security default-keychain -d user -s "$KC_PATH" 2>/dev/null || true
      security default-keychain -s "$KC_PATH" 2>/dev/null || true
      security unlock-keychain -p "$KC_PASS" "$KC_PATH" 2>/dev/null || true

      DID_RETRY=1
      echo "[ephemeral-keychain] Retrying command once: $FASTLANE_CMD"
      set -x
      set +e
      eval "$FASTLANE_CMD"
      CMD_STATUS=$?
      set -e
      set +x
    fi
  fi

  if [ "${CMD_STATUS:-1}" -eq 0 ]; then
    echo "[ephemeral-keychain] Retry succeeded"
  else
    if [ -f "$LOGIN_KC" ] && [ "$LOGIN_KC" != "$KC_PATH" ]; then
      echo "[ephemeral-keychain] Identities in login keychain: $LOGIN_KC"
      security find-identity -v -p codesigning "$LOGIN_KC" 2>&1 || true
      security find-identity -p codesigning "$LOGIN_KC" 2>&1 || true
    fi
    if [ -n "${ORIG_DEFAULT_KC:-}" ] && [ -f "$ORIG_DEFAULT_KC" ]; then
      echo "[ephemeral-keychain] Identities in original default keychain: $ORIG_DEFAULT_KC"
      security find-identity -v -p codesigning "$ORIG_DEFAULT_KC" 2>&1 || true
      security find-identity -p codesigning "$ORIG_DEFAULT_KC" 2>&1 || true
    fi
    echo "[ephemeral-keychain] Identities across all keychains"
    security find-identity -v -p codesigning 2>&1 || true
    security find-identity -p codesigning 2>&1 || true

  echo "[ephemeral-keychain] Trust check for Apple Distribution certificate (policy: codeSign)"
  DIST_CERT_TMP=$(mktemp /tmp/apple_distribution.XXXXXX.pem)
  if security find-certificate -a -c "Apple Distribution" -p "$KC_PATH" >"$DIST_CERT_TMP" 2>/dev/null; then
    echo "[ephemeral-keychain] Apple Distribution certificate details"
    security find-certificate -a -c "Apple Distribution" -Z "$KC_PATH" 2>&1 || true
    security find-certificate -a -c "Apple Distribution" -p "$KC_PATH" \
      | openssl x509 -noout -subject -issuer -dates 2>/dev/null || true

    echo "[ephemeral-keychain] Attempt to match identity certificate to private key"
    # There may be multiple Apple Distribution certs in the keychain. We want the
    # cert corresponding to the identity hash shown by `security find-identity`.
    IDENTITY_SHA_LOCAL=$(security find-identity -p codesigning "$KC_PATH" 2>/dev/null | awk '/"Apple Distribution:/{print $2; exit}' | tr '[:lower:]' '[:upper:]')
    if [ -n "${IDENTITY_SHA_LOCAL:-}" ]; then
      echo "[ephemeral-keychain] Identity SHA-1 (from find-identity): $IDENTITY_SHA_LOCAL"
      CERT_SPLIT_DIR=$(mktemp -d /tmp/apple_dist_certs.XXXXXX)
      csplit -s -f "$CERT_SPLIT_DIR/cert_" -b "%03d.pem" "$DIST_CERT_TMP" '/-----BEGIN CERTIFICATE-----/' '{*}' >/dev/null 2>&1 || true
      MATCHED_CERT_PATH=""
      for cert_file in "$CERT_SPLIT_DIR"/cert_*.pem; do
        if [ ! -s "$cert_file" ]; then
          continue
        fi
        CERT_FPR=$(openssl x509 -in "$cert_file" -noout -fingerprint -sha1 2>/dev/null | sed 's/^SHA1 Fingerprint=//' | tr -d ':' | tr '[:lower:]' '[:upper:]')
        if [ "$CERT_FPR" = "$IDENTITY_SHA_LOCAL" ]; then
          MATCHED_CERT_PATH="$cert_file"
          break
        fi
      done

      if [ -n "$MATCHED_CERT_PATH" ]; then
        echo "[ephemeral-keychain] Matched identity certificate PEM: $MATCHED_CERT_PATH"
        CERT_PUB_SHA1_HEX=$(openssl x509 -in "$MATCHED_CERT_PATH" -pubkey -noout 2>/dev/null \
          | openssl pkey -pubin -outform DER 2>/dev/null \
          | openssl dgst -sha1 -binary 2>/dev/null \
          | xxd -p -c 100 2>/dev/null \
          | tr -d '\n' \
          | tr '[:lower:]' '[:upper:]' || true)
        if [ -n "${CERT_PUB_SHA1_HEX:-}" ]; then
          echo "[ephemeral-keychain] CERT_PUB_SHA1_HEX=$CERT_PUB_SHA1_HEX"
          if [ -n "${KEY_APP_LABEL_HEX:-}" ] && [ "$KEY_APP_LABEL_HEX" != "$CERT_PUB_SHA1_HEX" ]; then
            echo "[ephemeral-keychain] NOTE: private key label != cert pubkey sha1 (likely key/cert mismatch)"
          fi
          echo "[ephemeral-keychain] Attempting to locate matching private key by application label (-a)"
          security find-key -t private -a "$CERT_PUB_SHA1_HEX" "$KC_PATH" 2>&1 || true
        else
          echo "[ephemeral-keychain] Unable to compute CERT_PUB_SHA1_HEX for matched cert"
        fi
      else
        echo "[ephemeral-keychain] Unable to locate PEM for identity SHA-1 within exported Apple Distribution certs; falling back to first exported cert"
        CERT_PUB_SHA1_HEX=$(openssl x509 -in "$DIST_CERT_TMP" -pubkey -noout 2>/dev/null \
          | openssl pkey -pubin -outform DER 2>/dev/null \
          | openssl dgst -sha1 -binary 2>/dev/null \
          | xxd -p -c 100 2>/dev/null \
          | tr -d '\n' \
          | tr '[:lower:]' '[:upper:]' || true)
        if [ -n "${CERT_PUB_SHA1_HEX:-}" ]; then
          echo "[ephemeral-keychain] CERT_PUB_SHA1_HEX=$CERT_PUB_SHA1_HEX"
          if [ -n "${KEY_APP_LABEL_HEX:-}" ] && [ "$KEY_APP_LABEL_HEX" != "$CERT_PUB_SHA1_HEX" ]; then
            echo "[ephemeral-keychain] NOTE: private key label != cert pubkey sha1 (likely key/cert mismatch)"
          fi
          security find-key -t private -a "$CERT_PUB_SHA1_HEX" "$KC_PATH" 2>&1 || true
        else
          echo "[ephemeral-keychain] Unable to compute CERT_PUB_SHA1_HEX from first exported cert"
        fi
      fi

      rm -rf "$CERT_SPLIT_DIR" 2>/dev/null || true
    else
      echo "[ephemeral-keychain] Unable to determine identity SHA-1 from find-identity"
    fi

    security find-certificate -a -c "Apple Distribution" -p "$KC_PATH" \
      | openssl x509 -noout -text 2>/dev/null \
      | egrep -A2 -i 'X509v3 Key Usage|Extended Key Usage|Authority Key Identifier|Subject Key Identifier|Basic Constraints' \
      | head -n 120 || true

    VERIFY_ARGS=(security verify-cert -c "$DIST_CERT_TMP" -p codeSign -v -k "$KC_PATH")
    if [ -f "$LOGIN_KC" ] && [ "$LOGIN_KC" != "$KC_PATH" ]; then
      VERIFY_ARGS+=( -k "$LOGIN_KC" )
    fi
    "${VERIFY_ARGS[@]}" 2>&1 || true

    if command -v security >/dev/null 2>&1; then
      echo "[ephemeral-keychain] Trust check with revocation (OCSP + require)"
      security verify-cert -c "$DIST_CERT_TMP" -p codeSign -v -k "$KC_PATH" -R ocsp -R require 2>&1 || true
    fi
  else
    echo "[ephemeral-keychain] Unable to export Apple Distribution cert from $KC_PATH"
  fi
  rm -f "$DIST_CERT_TMP" 2>/dev/null || true

  echo "[ephemeral-keychain] Key inventory (filtered) in ephemeral keychain"
  # `dump-keychain` can be noisy; filter down to item labels/metadata.
  security dump-keychain "$KC_PATH" 2>/dev/null | egrep -i 'class:|keyclass|labl|alis|priv|public key|private key|Imported Private Key' | head -n 250 || true

  security find-certificate -a -c "Apple Distribution" -Z "$KC_PATH" 2>&1 || true
  security find-certificate -a -c "Apple Worldwide Developer Relations" -Z "$KC_PATH" 2>&1 || true
  fi
fi

echo "[ephemeral-keychain] Command finished; cleanup via EXIT trap"

exit "$CMD_STATUS"
