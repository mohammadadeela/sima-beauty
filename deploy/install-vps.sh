#!/usr/bin/env bash
# One-command, repeatable Sima Beauty test deployment on Hostinger Ubuntu/Debian VPS.
# Installs an isolated Node 22 runtime, PostgreSQL database, systemd service, and IP-based Nginx site.
# For DEMO TESTING ONLY: HTTP without a domain is not suitable for real customer/admin data.
set -Eeuo pipefail
trap 'echo "[Sima] Installation failed on line $LINENO. See output above." >&2' ERR

APP=/var/www/sima-beauty
REPO=https://github.com/mohammadadeela/sima-beauty.git
NODE_HOME=/opt/sima-node-22
WEB_USER=simaweb
DB_USER=sima_beauty_app
DB_NAME=sima_beauty_test
APP_PORT=5001
CREDS=/root/sima-beauty-login.txt

if [[ ${EUID} -ne 0 ]]; then echo 'Run with sudo: curl ... | sudo bash' >&2; exit 1; fi
if [[ ! -e /etc/debian_version ]] || ! command -v systemctl >/dev/null; then
  echo 'Requires an Ubuntu/Debian VPS with systemd (not shared hosting).' >&2; exit 1
fi
export DEBIAN_FRONTEND=noninteractive

echo '[1/8] Installing system requirements (without changing other Node versions)...'
apt-get update -qq
apt-get install -y -qq ca-certificates curl git xz-utils openssl nginx postgresql
systemctl enable --now postgresql nginx

if [[ ! -x "$NODE_HOME/bin/node" ]] || ! "$NODE_HOME/bin/node" -e 'const [maj,min]=process.versions.node.split(".").map(Number);process.exit(maj===22&&min>=12?0:1)'; then
  echo '[2/8] Installing standalone Node.js 22...'
  case "$(uname -m)" in x86_64) ARCH=x64 ;; aarch64|arm64) ARCH=arm64 ;; *) echo 'Unsupported CPU architecture'; exit 1 ;; esac
  WORK="$(mktemp -d)"
  trap 'rm -rf "$WORK"' EXIT
  curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o "$WORK/SHA256SUMS"
  TAR_NAME="$(awk -v arch="$ARCH" '$2 ~ ("^node-v[0-9.]+-linux-" arch "\\.tar\\.xz$") { print $2; exit }' "$WORK/SHA256SUMS")"
  test -n "$TAR_NAME" || { echo 'Node.js download archive not found'; exit 1; }
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$TAR_NAME" -o "$WORK/$TAR_NAME"
  ( cd "$WORK" && grep -F "  $TAR_NAME" SHA256SUMS | sha256sum -c - )
  mkdir -p "$NODE_HOME"
  tar -xJf "$WORK/$TAR_NAME" --strip-components=1 -C "$NODE_HOME"
  rm -rf "$WORK"
  trap - EXIT
fi
export PATH="$NODE_HOME/bin:$PATH"
node --version
npm --version

if ! id "$WEB_USER" >/dev/null 2>&1; then
  useradd --system --user-group --home-dir "$APP" --shell /usr/sbin/nologin "$WEB_USER"
fi

if [[ -d "$APP/.git" ]]; then
  echo '[3/8] Updating Sima Beauty from main...'
  git -C "$APP" fetch --prune origin main
  git -C "$APP" reset --hard origin/main
elif [[ ! -e "$APP" ]] || [[ -d "$APP" && -z "$(ls -A "$APP")" ]]; then
  echo '[3/8] Cloning Sima Beauty...'
  if [[ -d "$APP" ]]; then rmdir "$APP"; fi
  git clone --branch main --depth 1 "$REPO" "$APP"
else
  echo "The directory $APP exists but is not a git clone. Refusing to overwrite it." >&2
  exit 1
fi
mkdir -p "$APP/uploads" /var/cache/sima-beauty
chown -R "$WEB_USER:$WEB_USER" "$APP" /var/cache/sima-beauty
chmod 755 "$APP"

systemctl enable --now postgresql
if [[ ! -f "$APP/.env" ]]; then
  echo '[4/8] Creating isolated PostgreSQL database and test credentials...'
  DB_PASS="$(openssl rand -hex 24)"
  ADMIN_PASS="$(openssl rand -hex 16)"
  ADMIN_EMAIL=admin@sima.test
  if runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -qx '1'; then
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS'" >/dev/null
  else
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS'" >/dev/null
  fi
  if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -qx '1'; then
    runuser -u postgres -- createdb --owner "$DB_USER" "$DB_NAME"
  fi
  PUBLIC_IP="$(curl -4 -fsSL --max-time 15 https://api.ipify.org)"
  [[ "$PUBLIC_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Cannot determine public IPv4'; exit 1; }
  cat > "$APP/.env" <<EOF
DATABASE_URL=postgres://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME
SESSION_SECRET=$(openssl rand -hex 48)
PORT=$APP_PORT
HOST=127.0.0.1
SITE_URL=http://$PUBLIC_IP
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASS
SEED_DEMO=false
# For a disposable HTTP/IP test only. Change to false when HTTPS is configured.
INSECURE_COOKIES=true
UPLOAD_DIR=$APP/uploads
EOF
  cat > "$CREDS" <<EOF
Sima Beauty TEST ONLY
URL: http://$PUBLIC_IP
Admin: http://$PUBLIC_IP/admin
Email: $ADMIN_EMAIL
Password: $ADMIN_PASS
EOF
  chmod 600 "$CREDS"
  chown "$WEB_USER:$WEB_USER" "$APP/.env"
  chmod 600 "$APP/.env"
else
  echo '[4/8] Keeping existing database and .env credentials...'
  PUBLIC_IP="$(curl -4 -fsSL --max-time 15 https://api.ipify.org)"
fi

if command -v ss >/dev/null && ss -ltn | grep -qE "[:.]$APP_PORT[[:space:]]" && ! systemctl is-active --quiet sima-beauty.service; then
  echo "Port $APP_PORT is already used by another service. Stopping to protect it." >&2
  exit 1
fi

echo '[5/8] Installing dependencies and building storefront...'
runuser -u "$WEB_USER" -- env PATH="$PATH" NPM_CONFIG_CACHE=/var/cache/sima-beauty/npm npm --prefix "$APP" ci --include=dev --no-audit --no-fund
runuser -u "$WEB_USER" -- env PATH="$PATH" npm --prefix "$APP" run build
test -s "$APP/dist/public/index.html"
test -s "$APP/dist/index.cjs"

echo '[6/8] Initializing database and fictional demo records...'
# seed.ts initializes tables; it adds the demo catalogue only on an empty database.
runuser -u "$WEB_USER" -- env PATH="$PATH" npm --prefix "$APP" run seed

cat > /etc/systemd/system/sima-beauty.service <<EOF
[Unit]
Description=Sima Beauty demo store
Wants=network-online.target
After=network-online.target postgresql.service

[Service]
Type=simple
User=$WEB_USER
Group=$WEB_USER
WorkingDirectory=$APP
Environment=NODE_ENV=production
Environment=PATH=$NODE_HOME/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=$NODE_HOME/bin/node $APP/dist/index.cjs
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=$APP/uploads

[Install]
WantedBy=multi-user.target
EOF

# Dedicated IP-based Nginx site. Does not change existing domain server blocks.
echo '[7/8] Configuring IP-based Nginx reverse proxy...'
cat > /etc/nginx/sites-available/sima-beauty-ip <<EOF
server {
    listen 80;
    server_name $PUBLIC_IP;
    client_max_body_size 16m;
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sfn /etc/nginx/sites-available/sima-beauty-ip /etc/nginx/sites-enabled/sima-beauty-ip
nginx -t
systemctl daemon-reload
systemctl enable --now sima-beauty.service
systemctl restart sima-beauty.service
systemctl reload nginx
if command -v ufw >/dev/null && ufw status | grep -q '^Status: active'; then ufw allow 80/tcp; fi

echo '[8/8] Checking health endpoint...'
HEALTHY=0
for attempt in $(seq 1 45); do
  if curl -fsS "http://127.0.0.1:$APP_PORT/api/health" | grep -q '"ok":true'; then HEALTHY=1; break; fi
  sleep 2
done
if [[ "$HEALTHY" -ne 1 ]]; then
  echo 'The app failed health check. Recent logs:' >&2
  journalctl -u sima-beauty.service -n 70 --no-pager >&2
  exit 1
fi
if ! curl -fsS -H "Host: $PUBLIC_IP" http://127.0.0.1/api/health | grep -q '"ok":true'; then
  echo 'WARNING: The site works internally, but Nginx IP routing may be blocked or overridden.' >&2
fi

echo
echo '================================================='
echo '  SIMA BEAUTY TEST DEPLOYMENT IS RUNNING'
echo "  Store:  http://$PUBLIC_IP"
echo "  Admin:  http://$PUBLIC_IP/admin"
echo '  Check:  curl http://127.0.0.1:5001/api/health'
echo '  Update: sudo bash /var/www/sima-beauty/deploy/install-vps.sh'
if [[ -f "$CREDS" ]]; then
  echo '  Admin credentials (also saved as root-only file):'
  cat "$CREDS"
fi
echo '  IMPORTANT: HTTP test only. Do not use real data or passwords until HTTPS.'
echo '  If remote access is blocked, allow port 80 in the Hostinger VPS firewall.'
echo '================================================='
