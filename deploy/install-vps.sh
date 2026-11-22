#!/usr/bin/env bash
# Sima Beauty safe/coexisting demo installer for a shared VPS.
# NEVER modifies nginx, firewall, apt packages, global Node, PM2 or existing services.
# It uses a separate app directory, local PostgreSQL database, dedicated user/service, and TCP 5001.
# Intentionally aborts if prerequisites are missing or resources conflict.
set -Eeuo pipefail
trap 'echo "[Sima] Stopped at line $LINENO. Existing apps/services were not restarted or reconfigured." >&2' ERR

APP=/var/www/sima-beauty
REPO=https://github.com/mohammadadeela/sima-beauty.git
NODE_HOME=/opt/sima-node-22
WEB_USER=simaweb
DB_USER=sima_beauty_app
DB_NAME=sima_beauty_test
APP_PORT=5001
SERVICE=/etc/systemd/system/sima-beauty.service
CREDS=/root/sima-beauty-login.txt
MARKER=.sima-standalone-managed

fail() { echo "[Sima] SAFE STOP: $*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || fail 'Run as root (sudo bash).'
[[ -f /etc/debian_version ]] && command -v systemctl >/dev/null || fail 'Ubuntu/Debian VPS with systemd required.'

# Preflight first: no apt upgrade/install, no nginx reload, no UFW changes, no global Node/PM2 changes.
for bin in git curl tar xz awk grep openssl sha256sum runuser psql createdb ss useradd chown chmod; do
  command -v "$bin" >/dev/null || fail "Missing prerequisite $bin. Not installing system packages to protect other websites."
done
id postgres >/dev/null 2>&1 || fail 'Local PostgreSQL system user is missing.'
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -tAc 'SELECT 1' 2>/dev/null | grep -qx 1 || fail 'Existing local PostgreSQL is not accessible. Will not start/restart it.'
PUBLIC_IP="$(curl -4 -fsSL --max-time 12 https://api.ipify.org)" || fail 'Cannot retrieve public IP.'
[[ "$PUBLIC_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail 'Invalid public IP.'

MANAGED=0
if [[ -d "$APP" && -f "$APP/$MARKER" ]]; then
  MANAGED=1
  [[ -d "$APP/.git" ]] && [[ -f "$APP/.env" ]] && [[ -f "$SERVICE" ]] || fail 'Incomplete Sima installation; will not overwrite files.'
  [[ "$(git -C "$APP" remote get-url origin)" == "$REPO" ]] || fail 'Directory belongs to a different repository.'
  id "$WEB_USER" >/dev/null 2>&1 || fail 'Sima service user is missing.'
  [[ -f "$CREDS" ]] || fail 'Sima credentials are missing; will not regenerate/overwrite secrets.'
else
  [[ ! -e "$APP" && ! -L "$APP" ]] || fail "Directory $APP already exists, refusing to use/overwrite it."
  [[ ! -e "$SERVICE" && ! -L "$SERVICE" ]] || fail 'A service with the Sima name already exists.'
  ! id "$WEB_USER" >/dev/null 2>&1 || fail 'The simaweb account already exists; refusing to modify it.'
  [[ ! -e "$CREDS" ]] || fail 'A Sima credentials file already exists.'
  [[ "$(runuser -u postgres -- psql -XAtc "SELECT count(*) FROM pg_roles WHERE rolname='$DB_USER'")" == '0' ]] || fail 'Sima DB role already exists; refusing password changes.'
  [[ "$(runuser -u postgres -- psql -XAtc "SELECT count(*) FROM pg_database WHERE datname='$DB_NAME'")" == '0' ]] || fail 'Sima database already exists; refusing to modify it.'
  if ss -H -ltn | awk -v p=":$APP_PORT" '$4 ~ (p "$") {found=1} END {exit !found}'; then
    fail "TCP port $APP_PORT is already in use. Refusing to interfere with existing service."
  fi
fi
if [[ -e "$NODE_HOME" ]]; then
  [[ -x "$NODE_HOME/bin/node" ]] && "$NODE_HOME/bin/node" -e 'process.exit(process.versions.node.startsWith("22.")?0:1)' || fail 'Standalone Node directory exists but is not Node 22.'
fi

echo '[Sima] Preflight passed. Existing websites, nginx, firewall, PM2, system packages and PostgreSQL service will NOT be changed.'

# Download Node only into its dedicated directory. Does not change OS Node/npm.
if [[ ! -e "$NODE_HOME" ]]; then
  case "$(uname -m)" in x86_64) ARCH=x64 ;; aarch64|arm64) ARCH=arm64 ;; *) fail 'Unsupported CPU architecture.' ;; esac
  WORK="$(mktemp -d)"
  trap 'rm -rf "$WORK"' EXIT
  curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o "$WORK/SHASUMS256.txt"
  TAR_NAME="$(awk -v arch="$ARCH" '$2 ~ ("^node-v[0-9.]+-linux-" arch "\\.tar\\.xz$") { print $2; exit }' "$WORK/SHASUMS256.txt")"
  [[ -n "$TAR_NAME" ]] || fail 'No matching Node.js archive.'
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$TAR_NAME" -o "$WORK/$TAR_NAME"
  ( cd "$WORK" && grep -F "  $TAR_NAME" SHASUMS256.txt | sha256sum -c - )
  mkdir -p "$NODE_HOME"
  tar -xJf "$WORK/$TAR_NAME" --strip-components=1 -C "$NODE_HOME"
  rm -rf "$WORK"
  trap - EXIT
fi
export PATH="$NODE_HOME/bin:$PATH"

if [[ "$MANAGED" -eq 0 ]]; then
  echo '[Sima] Initial setup: adding only Sima resources.'
  git clone --branch main --depth 1 "$REPO" "$APP"
  useradd --system --user-group --home-dir "$APP" --shell /usr/sbin/nologin "$WEB_USER"
  mkdir -p "$APP/uploads" /var/cache/sima-beauty
  DB_PASS="$(openssl rand -hex 24)"
  ADMIN_PASS="$(openssl rand -hex 24)"
  ADMIN_EMAIL=admin@sima.test
  runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS'" >/dev/null
  runuser -u postgres -- createdb -O "$DB_USER" "$DB_NAME"
  cat > "$APP/.env" <<ENV
DATABASE_URL=postgres://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME
SESSION_SECRET=$(openssl rand -hex 48)
PORT=$APP_PORT
HOST=0.0.0.0
SITE_URL=http://$PUBLIC_IP:$APP_PORT
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASS
SEED_DEMO=false
INSECURE_COOKIES=true
UPLOAD_DIR=$APP/uploads
ENV
  cat > "$CREDS" <<LOGIN
Sima Beauty — FICTIONAL TEST DATA ONLY
Store: http://$PUBLIC_IP:$APP_PORT
Admin: http://$PUBLIC_IP:$APP_PORT/admin
Email: $ADMIN_EMAIL
Password: $ADMIN_PASS
LOGIN
  chmod 600 "$CREDS"
  printf 'managed-by=sima-standalone-installer\n' > "$APP/$MARKER"
  chown -R "$WEB_USER:$WEB_USER" "$APP" /var/cache/sima-beauty
  chmod 600 "$APP/.env"
else
  echo '[Sima] Updating only the previously managed Sima install.'
  [[ -z "$(git -C "$APP" status --porcelain --untracked-files=no)" ]] || fail 'Local Sima changes detected; not overwriting.'
  git -C "$APP" fetch origin main
  git -C "$APP" merge --ff-only FETCH_HEAD
  mkdir -p /var/cache/sima-beauty
  chown -R "$WEB_USER:$WEB_USER" /var/cache/sima-beauty
fi

# All npm operations are local to Sima's files, under a dedicated unprivileged user.
runuser -u "$WEB_USER" -- env PATH="$PATH" NPM_CONFIG_CACHE=/var/cache/sima-beauty/npm npm --prefix "$APP" ci --include=dev --no-audit --no-fund
runuser -u "$WEB_USER" -- env PATH="$PATH" npm --prefix "$APP" run check
runuser -u "$WEB_USER" -- env PATH="$PATH" npm --prefix "$APP" run build
test -s "$APP/dist/public/index.html" && test -s "$APP/dist/index.cjs" || fail 'Build missing artifacts.'
runuser -u "$WEB_USER" -- env PATH="$PATH" npm --prefix "$APP" run seed

if [[ "$MANAGED" -eq 0 ]]; then
  cat > "$SERVICE" <<UNIT
[Unit]
Description=Sima Beauty DEMO store (isolated TCP $APP_PORT)
After=network.target

[Service]
Type=simple
User=$WEB_USER
Group=$WEB_USER
WorkingDirectory=$APP
Environment=NODE_ENV=production
Environment=PATH=$NODE_HOME/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=$NODE_HOME/bin/node $APP/dist/index.cjs
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=$APP/uploads

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload  # only registers the Sima unit; does not restart other services
  systemctl enable --now sima-beauty.service
else
  systemctl restart sima-beauty.service  # only Sima, never another service
fi

HEALTHY=0
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 3 "http://127.0.0.1:$APP_PORT/api/health" 2>/dev/null | grep -q '"ok":true'; then HEALTHY=1; break; fi
  sleep 2
done
if [[ "$HEALTHY" -ne 1 ]]; then
  journalctl -u sima-beauty.service -n 60 --no-pager >&2
  fail 'Sima did not pass health check. No existing website or service was restarted.'
fi

echo
printf '===============================================\n'
echo '  SIMA BEAUTY DEMO — RUNNING'
echo "  Store: http://$PUBLIC_IP:$APP_PORT"
echo "  Admin: http://$PUBLIC_IP:$APP_PORT/admin"
echo "  Credentials: sudo cat $CREDS"
echo '  If the IP:5001 URL is blocked, check your Hostinger firewall.'
echo '  This installer deliberately does NOT change firewall or Nginx.'
echo '  HTTP for testing only; do not use real customer data or transactions.'
printf '===============================================\n'
