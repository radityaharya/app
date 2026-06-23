#!/usr/bin/env bash
# Push all secrets needed for GitHub Actions APK builds to radityaharya/app.
# Run this once locally. Requires: gh (authenticated), base64.

set -euo pipefail

REPO="radityaharya/app"
MOBILE_ENV="$(dirname "$0")/../apps/mobile/.env"

# ── helpers ──────────────────────────────────────────────────────────────────

green()  { printf "\033[0;32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[0;33m%s\033[0m\n" "$*"; }
red()    { printf "\033[0;31m%s\033[0m\n" "$*"; }
push()   {
  local name="$1" value="$2"
  gh secret set "$name" --body "$value" --repo "$REPO"
  green "  ✓ $name"
}
read_env() {
  local key="$1" file="$2"
  grep -E "^${key}=" "$file" 2>/dev/null | cut -d= -f2- | tr -d '"' || true
}

echo ""
yellow "── Commuter GitHub Secrets Setup ─────────────────────────────────────"
echo "   Repo: $REPO"
echo ""

# ── 1. Verify gh auth ────────────────────────────────────────────────────────

if ! gh auth status --hostname github.com &>/dev/null; then
  red "Not logged in to gh. Run: gh auth login"
  exit 1
fi

# ── 2. Google Maps key from mobile .env ──────────────────────────────────────

MAPS_KEY="$(read_env GOOGLE_MAPS_ANDROID_KEY "$MOBILE_ENV")"
if [[ -z "$MAPS_KEY" ]]; then
  yellow "GOOGLE_MAPS_ANDROID_KEY not found in apps/mobile/.env"
  read -rp "  Enter GOOGLE_MAPS_ANDROID_KEY: " MAPS_KEY
fi
push "GOOGLE_MAPS_ANDROID_KEY" "$MAPS_KEY"

# ── 3. Release keystore ──────────────────────────────────────────────────────

echo ""
yellow "── Android Release Keystore ────────────────────────────────────────────"
echo "   Download your keystore from expo.dev:"
echo "   expo.dev/accounts/radityaharya/projects/commuter/credentials"
echo "   → Android → Build Credentials → ⋮ → Download keystore"
echo ""

while true; do
  read -rp "  Path to downloaded .jks / .keystore file: " KEYSTORE_PATH
  KEYSTORE_PATH="${KEYSTORE_PATH/#\~/$HOME}"
  [[ -f "$KEYSTORE_PATH" ]] && break
  red "  File not found: $KEYSTORE_PATH"
done

read -rsp "  Keystore password: " KEYSTORE_PASSWORD; echo ""
read -rp  "  Key alias: " KEY_ALIAS
read -rsp "  Key password (leave blank if same as keystore password): " KEY_PASSWORD; echo ""
[[ -z "$KEY_PASSWORD" ]] && KEY_PASSWORD="$KEYSTORE_PASSWORD"

KEYSTORE_B64="$(base64 -w 0 < "$KEYSTORE_PATH")"

push "KEYSTORE_BASE64"    "$KEYSTORE_B64"
push "KEYSTORE_PASSWORD"  "$KEYSTORE_PASSWORD"
push "KEY_ALIAS"          "$KEY_ALIAS"
push "KEY_PASSWORD"       "$KEY_PASSWORD"

# ── done ─────────────────────────────────────────────────────────────────────

echo ""
green "All secrets pushed to $REPO."
echo ""
echo "Verify at: https://github.com/$REPO/settings/secrets/actions"
