#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     NyzzAPI v2 — Auto Setup          ║"
echo "╚══════════════════════════════════════╝"
echo ""

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="/root/api"

# ── 1. SYSTEM PACKAGES ───────────────────────
echo "[1/7] Install system packages..."
apt-get update -qq
apt-get install -y -qq postgresql postgresql-contrib curl build-essential
echo "      ✓ Done"

# ── 2. NODE.JS ────────────────────────────────
echo "[2/7] Check Node.js..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
fi
echo "      ✓ Node $(node -v)"

# ── 3. POSTGRESQL ────────────────────────────
echo "[3/7] Setup PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

DB_PASS=$(openssl rand -hex 16)
sudo -u postgres psql -c "CREATE USER nyzz WITH PASSWORD '$DB_PASS';" 2>/dev/null || \
  sudo -u postgres psql -c "ALTER USER nyzz WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE nyzzapi OWNER nyzz;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nyzzapi TO nyzz;" 2>/dev/null || true
echo "      ✓ PostgreSQL ready"

# ── 4. COPY FILES ─────────────────────────────
echo "[4/7] Copy API files..."
mkdir -p $API_DIR
cp -r $REPO_DIR/* $API_DIR/
echo "      ✓ Files copied to $API_DIR"

# ── 5. SETUP .ENV ─────────────────────────────
echo "[5/7] Setup environment..."
JWT_SECRET=$(openssl rand -hex 32)

if [ ! -f "$API_DIR/.env" ]; then
  cat > $API_DIR/.env << ENVEOF
DATABASE_URL=postgresql://nyzz:${DB_PASS}@localhost:5432/nyzzapi
JWT_SECRET=${JWT_SECRET}
FIREBASE_BUCKET=NAMA_PROJECT.appspot.com
PORT=3000
ENVEOF
  echo "      ✓ .env created"
else
  # Update DB_PASS saja jika .env sudah ada
  sed -i "s|postgresql://nyzz:.*@|postgresql://nyzz:${DB_PASS}@|" $API_DIR/.env
  echo "      ⚠ .env sudah ada, DB password diupdate"
fi

# ── 6. NPM INSTALL ────────────────────────────
echo "[6/7] Install Node packages..."
cd $API_DIR && npm install --silent
echo "      ✓ Done"

# ── 7. PM2 & NGINX ────────────────────────────
echo "[7/7] Setup PM2 & Nginx..."
npm install -g pm2 --silent 2>/dev/null || true
pm2 delete my-api 2>/dev/null || true
pm2 start $API_DIR/index.js --name "my-api"
pm2 save
pm2 startup 2>/dev/null | grep "sudo" | bash 2>/dev/null || true

cat > /etc/nginx/sites-available/api.nyzz.my.id << 'NGINXEOF'
server {
    listen 80;
    server_name api.nyzz.my.id;
    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF
ln -sf /etc/nginx/sites-available/api.nyzz.my.id /etc/nginx/sites-enabled/ 2>/dev/null || true
nginx -t && systemctl reload nginx
echo "      ✓ Done"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║           Setup Selesai! ✓           ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  API    : http://api.nyzz.my.id"
echo "  DB Pass: $DB_PASS  ← simpan ini!"
echo ""
echo "  ── LANGKAH SELANJUTNYA ──────────────"
echo "  1. Setup Firebase (ikuti panduan di bawah)"
echo "  2. Jalankan: bash $API_DIR/update-firebase.sh"
echo "  ─────────────────────────────────────"
echo ""
echo "  PANDUAN FIREBASE STORAGE:"
echo "  a) Buka https://console.firebase.google.com"
echo "  b) Create project → nama bebas (misal: nyzz-api)"
echo "  c) Build → Storage → Get started → Production mode"
echo "  d) Project Settings → Service accounts"
echo "     → Generate new private key → download .json"
echo "  e) Upload .json ke VPS:"
echo "     scp firebase-key.json root@IP_VPS:/root/api/"
echo "  f) Edit FIREBASE_BUCKET di /root/api/.env"
echo "     (nama bucket ada di Storage tab, misal: nyzz-api.appspot.com)"
echo "  g) Jalankan: bash /root/api/update-firebase.sh"
echo ""
