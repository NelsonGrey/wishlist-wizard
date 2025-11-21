#!/usr/bin/env bash
# scripts/update_asc_key.sh
# Updates ASC API key after manual rotation in App Store Connect
# Usage: ./scripts/update_asc_key.sh <new_key_id> <path_to_p8_file>

set -euo pipefail

if [ $# -ne 2 ]; then
    echo "❌ Usage: $0 <new_key_id> <path_to_p8_file>"
    echo "Example: $0 QUN383U3G3 ~/Downloads/AuthKey_QUN383U3G3.p8"
    exit 1
fi

NEW_KEY_ID="$1"
P8_FILE="$2"

if [ ! -f "$P8_FILE" ]; then
    echo "❌ P8 file not found: $P8_FILE"
    exit 1
fi

echo "🔄 Updating ASC API Key..."
echo "📝 New Key ID: $NEW_KEY_ID"
echo "📁 P8 File: $P8_FILE"

# Base64 encode the P8 file
B64_CONTENT=$(base64 -i "$P8_FILE")

# Update the iOS environment file
ENV_FILE="packages/mobile/ios/.env"
if [ -f "$ENV_FILE" ]; then
    # Update ASC_KEY_ID
    sed -i.bak "s/ASC_KEY_ID=.*/ASC_KEY_ID=$NEW_KEY_ID/" "$ENV_FILE"

    # Update ASC_PRIVATE_KEY
    sed -i.bak "s|ASC_PRIVATE_KEY=.*|ASC_PRIVATE_KEY=$B64_CONTENT|" "$ENV_FILE"

    rm -f "${ENV_FILE}.bak"
    echo "✅ Updated $ENV_FILE"
else
    echo "❌ Environment file not found: $ENV_FILE"
    exit 1
fi

# Update GitHub secrets
if command -v gh >/dev/null 2>&1; then
    echo -n "$NEW_KEY_ID" | gh secret set ASC_KEY_ID --repo mnelson3/wishlist-wizard
    echo -n "$B64_CONTENT" | gh secret set ASC_PRIVATE_KEY --repo mnelson3/wishlist-wizard
    echo "✅ Updated GitHub secrets"
else
    echo "⚠️  gh CLI not found. Manually update GitHub secrets:"
    echo "   ASC_KEY_ID: $NEW_KEY_ID"
    echo "   ASC_PRIVATE_KEY: $B64_CONTENT"
fi

echo ""
echo "🎉 ASC API Key updated successfully!"
echo "📋 Next steps:"
echo "   1. Revoke the old key in App Store Connect UI"
echo "   2. Test iOS builds to verify the new key works"
echo "   3. Update any other systems using the old key"