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

# ── 3. google-services.json ──────────────────────────────────────────────────

echo ""
yellow "── google-services.json ────────────────────────────────────────────────"

REPO_ROOT="$(realpath "$(dirname "$0")/..")"
GSVC_PATH="$REPO_ROOT/apps/mobile/google-services.json"
[[ ! -f "$GSVC_PATH" ]] && GSVC_PATH="$REPO_ROOT/.credentials/google-services.json"

if [[ ! -f "$GSVC_PATH" ]]; then
  while true; do
    read -rp "  Path to google-services.json: " GSVC_PATH
    GSVC_PATH="${GSVC_PATH/#\~/$HOME}"
    [[ -f "$GSVC_PATH" ]] && break
    red "  File not found: $GSVC_PATH"
  done
fi

push "GOOGLE_SERVICES_JSON_BASE64" "$(base64 -w 0 < "$GSVC_PATH")"

# ── 4. Firebase Admin SDK JSON ───────────────────────────────────────────────

echo ""
yellow "── Firebase Admin SDK (FCM service account) ────────────────────────────"

ADMINSDK_PATH="$(find "$REPO_ROOT/.credentials" "$REPO_ROOT" \
  -maxdepth 2 \( -name "*firebase-adminsdk*.json" -o -name "commuter-app-abc-*.json" \) \
  ! -path "*/node_modules/*" ! -name "google-services.json" 2>/dev/null | head -1)"

if [[ -n "$ADMINSDK_PATH" ]]; then
  echo "  Found: $(basename "$ADMINSDK_PATH")"
else
  while true; do
    read -rp "  Path to firebase-adminsdk JSON: " ADMINSDK_PATH
    ADMINSDK_PATH="${ADMINSDK_PATH/#\~/$HOME}"
    [[ -f "$ADMINSDK_PATH" ]] && break
    red "  File not found: $ADMINSDK_PATH"
  done
fi

push "FIREBASE_ADMIN_SDK_BASE64" "$(base64 -w 0 < "$ADMINSDK_PATH")"

# ── 5. Release keystore ──────────────────────────────────────────────────────

echo ""
yellow "── Android Release Keystore ────────────────────────────────────────────"

KEYSTORE_PATH="$(find "$REPO_ROOT/.credentials" \( -name "*.jks" -o -name "*.bak.jks" -o -name "*.keystore" \) 2>/dev/null | head -1)"
CREDS_MD="$(find "$REPO_ROOT/.credentials" -name "*credentials*.md" 2>/dev/null | head -1)"

if [[ -n "$KEYSTORE_PATH" ]]; then
  echo "  Found keystore: $(basename "$KEYSTORE_PATH")"
else
  while true; do
    read -rp "  Path to .jks / .keystore file: " KEYSTORE_PATH
    KEYSTORE_PATH="${KEYSTORE_PATH/#\~/$HOME}"
    [[ -f "$KEYSTORE_PATH" ]] && break
    red "  File not found: $KEYSTORE_PATH"
  done
fi

if [[ -n "$CREDS_MD" ]]; then
  echo "  Found credentials: $(basename "$CREDS_MD")"
  KEYSTORE_PASSWORD="$(grep -i "keystore password" "$CREDS_MD" | grep -oP ':\s*\K\S+')"
  KEY_ALIAS="$(grep -i "key alias" "$CREDS_MD" | grep -oP ':\s*\K\S+')"
  KEY_PASSWORD="$(grep -i "key password" "$CREDS_MD" | grep -oP ':\s*\K\S+')"
else
  read -rsp "  Keystore password: " KEYSTORE_PASSWORD; echo ""
  read -rp  "  Key alias: " KEY_ALIAS
  read -rsp "  Key password: " KEY_PASSWORD; echo ""
fi

[[ -z "$KEY_PASSWORD" ]] && KEY_PASSWORD="$KEYSTORE_PASSWORD"

push "KEYSTORE_BASE64"    "$(base64 -w 0 < "$KEYSTORE_PATH")"
push "KEYSTORE_PASSWORD"  "$KEYSTORE_PASSWORD"
push "KEY_ALIAS"          "$KEY_ALIAS"
push "KEY_PASSWORD"       "$KEY_PASSWORD"

# ── 6. Expo secrets ──────────────────────────────────────────────────────────

echo ""
yellow "── Expo / EAS Secrets ──────────────────────────────────────────────────"

if ! command -v eas &>/dev/null; then
  yellow "  eas-cli not found — skipping Expo secrets. Install with: npm i -g eas-cli"
else
  EAS="$(command -v eas)"

  # EXPO_TOKEN for CI
  EXPO_TOKEN="$(read_env EXPO_TOKEN "$REPO_ROOT/.credentials/expo.env")"
  if [[ -z "$EXPO_TOKEN" ]]; then
    read -rsp "  EXPO_TOKEN (from expo.dev/settings/access-tokens): " EXPO_TOKEN; echo ""
  else
    echo "  Found EXPO_TOKEN in .credentials/expo.env"
  fi
  if [[ -n "$EXPO_TOKEN" ]]; then
    push "EXPO_TOKEN" "$EXPO_TOKEN"

    # Push GOOGLE_SERVICES_JSON as an Expo env secret
    EXPO_TOKEN="$EXPO_TOKEN" eas env:create \
      --scope project \
      --name GOOGLE_SERVICES_JSON \
      --type file \
      --value "$GSVC_PATH" \
      --environment production \
      --visibility secret \
      --force \
      --non-interactive \
    && green "  ✓ GOOGLE_SERVICES_JSON (Expo)" \
    || yellow "  ⚠ GOOGLE_SERVICES_JSON Expo push failed"
  else
    yellow "  Skipping Expo secrets (no token provided)"
  fi
fi

# ── done ─────────────────────────────────────────────────────────────────────

echo ""
green "All secrets pushed to $REPO."
echo ""
echo "Verify GitHub: https://github.com/$REPO/settings/secrets/actions"
echo "Verify Expo:   https://expo.dev/accounts/radityaharya/projects/commuter/secrets"
