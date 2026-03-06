#!/usr/bin/env bash
# After redeploying Cloud Functions, run this to get the new URLs and update the frontend env.
# Usage: ./scripts/update-frontend-api-url.sh
# Optionally: ./scripts/update-frontend-api-url.sh --deploy   (runs firebase deploy --only functions first)

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [[ "$1" == "--deploy" ]]; then
  echo "Deploying functions..."
  firebase deploy --only functions 2>&1 | tee /tmp/firebase-deploy-out.txt
  DEPLOY_OUT=/tmp/firebase-deploy-out.txt
else
  echo "Run firebase deploy --only functions and paste the output, or run with --deploy."
  echo "Parsing from last deploy output if present..."
  DEPLOY_OUT=/tmp/firebase-deploy-out.txt
  if [[ ! -f "$DEPLOY_OUT" ]]; then
    echo "No /tmp/firebase-deploy-out.txt. Run: ./scripts/update-frontend-api-url.sh --deploy"
    exit 1
  fi
fi

# Extract "Function URL (api(us-central1)): https://api-XXXXX-uc.a.run.app"
FULL_API_URL=$(grep -E "Function URL \(api\(" "$DEPLOY_OUT" | sed -n 's/.*: \(https:\/\/[^[:space:]]*\).*/\1/p' | head -1)
if [[ -z "$FULL_API_URL" ]]; then
  echo "Could not parse API URL from deploy output."
  exit 1
fi

# RUN_APP_HASH = suffix shared by all functions, e.g. d7zlm7v4qa-uc.a.run.app
RUN_APP_HASH="${FULL_API_URL#https://api-}"

echo ""
echo "Add or update these in frontend/.env or frontend/.env.production (then rebuild frontend):"
echo ""
echo "VITE_FIREBASE_API_BASE=${FULL_API_URL}"
echo "VITE_RUN_APP_HASH=${RUN_APP_HASH}"
echo ""
echo "Or export and build:"
echo "  export VITE_FIREBASE_API_BASE=${FULL_API_URL}"
echo "  export VITE_RUN_APP_HASH=${RUN_APP_HASH}"
echo "  cd frontend && npm run build"
echo ""

# Optionally patch frontend/.env.production if it exists
ENV_PROD="$REPO_ROOT/frontend/.env.production"
if [[ -f "$ENV_PROD" ]]; then
  if grep -q "VITE_FIREBASE_API_BASE" "$ENV_PROD"; then
    sed -i.bak "s|VITE_FIREBASE_API_BASE=.*|VITE_FIREBASE_API_BASE=${FULL_API_URL}|" "$ENV_PROD"
    sed -i.bak "s|VITE_RUN_APP_HASH=.*|VITE_RUN_APP_HASH=${RUN_APP_HASH}|" "$ENV_PROD"
    echo "Updated $ENV_PROD (backup .bak created)."
  else
    echo "VITE_FIREBASE_API_BASE=${FULL_API_URL}" >> "$ENV_PROD"
    echo "VITE_RUN_APP_HASH=${RUN_APP_HASH}" >> "$ENV_PROD"
    echo "Appended to $ENV_PROD."
  fi
else
  echo "Creating $ENV_PROD with API URLs..."
  echo "VITE_FIREBASE_API_BASE=${FULL_API_URL}" > "$ENV_PROD"
  echo "VITE_RUN_APP_HASH=${RUN_APP_HASH}" >> "$ENV_PROD"
fi
