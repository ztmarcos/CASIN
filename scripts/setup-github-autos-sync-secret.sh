#!/usr/bin/env bash
# Configura secrets de GitHub para el cron de autos sync.
# Requiere: gh auth login (una vez)
#
# Uso:
#   ./scripts/setup-github-autos-sync-secret.sh
#   ./scripts/setup-github-autos-sync-secret.sh --token mi-token-opcional

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="${GITHUB_REPO:-ztmarcos/CASIN}"
SA_FILE="$ROOT/casinbbdd-firebase-adminsdk-hnwk0-d3e04afbfd.json"
SECRET_NAME="FIREBASE_SERVICE_ACCOUNT_CASINBBDD"

GH="$(command -v gh || true)"
if [[ -z "$GH" ]]; then
  echo "❌ Instala GitHub CLI: brew install gh"
  exit 1
fi

if ! "$GH" auth status >/dev/null 2>&1; then
  echo "🔐 Inicia sesión en GitHub (se abrirá el navegador)..."
  "$GH" auth login -h github.com -p https -w
fi

if [[ ! -f "$SA_FILE" ]]; then
  echo "❌ No encuentro el service account: $SA_FILE"
  exit 1
fi

echo "📦 Repo: $REPO"
echo "🔑 Secret: $SECRET_NAME"

"$GH" secret set "$SECRET_NAME" \
  --repo "$REPO" \
  --body-file "$SA_FILE"

echo "✅ Secret $SECRET_NAME configurado en $REPO"

if [[ "${1:-}" == "--token" && -n "${2:-}" ]]; then
  "$GH" secret set AUTOS_SYNC_TOKEN --repo "$REPO" --body "$2"
  echo "✅ Secret AUTOS_SYNC_TOKEN configurado"
fi

echo ""
echo "Secrets actuales:"
"$GH" secret list --repo "$REPO"
