#!/bin/bash
# ═══════════════════════════════════════════════
#   update-firebase.sh
#   Jalankan setelah upload firebase-key.json ke VPS
#   Usage: bash update-firebase.sh
# ═══════════════════════════════════════════════
set -e

API_DIR="/root/api"
KEY_FILE="$API_DIR/firebase-key.json"
ENV_FILE="$API_DIR/.env"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     Update Firebase Config           ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── CEK KEY FILE ──────────────────────────────
if [ ! -f "$KEY_FILE" ]; then
  echo "  ✗ firebase-key.json tidak ditemukan di $KEY_FILE"
  echo ""
  echo "  Cara upload dari komputer lokal kamu:"
  echo "  scp /path/ke/firebase-key.json root@IP_VPS:/root/api/"
  echo ""
  exit 1
fi
echo "  ✓ firebase-key.json ditemukan"

# ── BACA PROJECT ID DARI KEY ──────────────────
PROJECT_ID=$(python3 -c "import json,sys; d=json.load(open('$KEY_FILE')); print(d['project_id'])" 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo "  ✗ Gagal baca project_id dari firebase-key.json"
  exit 1
fi
echo "  ✓ Project ID: $PROJECT_ID"

# ── TEBAK BUCKET NAME ─────────────────────────
BUCKET_GUESS="${PROJECT_ID}.appspot.com"
echo ""
echo "  Nama bucket Firebase Storage biasanya:"
echo "  → $BUCKET_GUESS"
echo ""
read -p "  Masukkan nama bucket (Enter untuk pakai default): " BUCKET_INPUT
BUCKET_NAME="${BUCKET_INPUT:-$BUCKET_GUESS}"
echo "  ✓ Bucket: $BUCKET_NAME"

# ── UPDATE .ENV ───────────────────────────────
if grep -q "FIREBASE_BUCKET" "$ENV_FILE"; then
  sed -i "s|FIREBASE_BUCKET=.*|FIREBASE_BUCKET=${BUCKET_NAME}|" "$ENV_FILE"
else
  echo "FIREBASE_BUCKET=${BUCKET_NAME}" >> "$ENV_FILE"
fi
echo "  ✓ .env diupdate"

# ── PROTECT KEY FILE ─────────────────────────
chmod 600 "$KEY_FILE"
echo "  ✓ firebase-key.json permissions secured"

# ── RESTART API ───────────────────────────────
echo ""
echo "  Restart API..."
pm2 restart my-api
sleep 2

# ── CEK STATUS ────────────────────────────────
if pm2 show my-api | grep -q "online"; then
  echo "  ✓ API berjalan"
else
  echo "  ✗ API error, cek log: pm2 logs my-api"
fi

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     Firebase Berhasil Dikonfigurasi! ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  Test upload:"
echo "  curl -X POST https://api.nyzz.my.id/uploader/image?apikey=API_KEY \\"
echo "       -F 'file=@foto.jpg'"
echo ""
