#!/usr/bin/env bash
# Safe update for Sima Beauty on the VPS.
# Usage (from the project folder):  npm run deploy
set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PM2_APP="${PM2_APP:-sima}"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "ERROR: .env is missing. Copy .env.example to .env and fill it in first."
  exit 1
fi
PORT="$(grep -E '^PORT=' .env | cut -d= -f2 | tr -d '[:space:]')"
PORT="${PORT:-5001}"

echo "===== 1. GET THE LATEST CODE ====="
if [[ -d .git ]]; then
  git fetch --prune origin
  git reset --hard origin/main
else
  echo "(not a git folder, using the files that are here)"
fi

echo "===== 2. INSTALL PACKAGES (including build tools) ====="
if [[ -f package-lock.json ]]; then
  npm ci --include=dev --no-audit --no-fund
else
  npm install --include=dev --no-audit --no-fund
fi

echo "===== 3. BUILD (the live site keeps running on the old build) ====="
npm run build
test -s dist/index.cjs
test -s dist/public/index.html

echo "===== 4. RESTART ====="
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP" --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi

echo "===== 5. WAIT UNTIL IT ANSWERS ====="
for attempt in $(seq 1 30); do
  if curl --fail --silent "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
    echo "Sima Beauty is healthy after ${attempt}s"
    pm2 save
    echo "DEPLOY COMPLETE"
    exit 0
  fi
  sleep 1
done

echo "ERROR: the app did not become healthy in 30 seconds. Last log lines:"
pm2 logs "$PM2_APP" --lines 60 --nostream || true
exit 1
