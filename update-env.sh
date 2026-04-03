#!/bin/bash
# ═══════════════════════════════════════════════
#   update-env.sh
#   Update nilai apapun di .env tanpa edit manual
#   Usage: bash update-env.sh KEY "VALUE"
#   Contoh: bash update-env.sh JWT_SECRET "rahasia123"
#           bash update-env.sh FIREBASE_BUCKET "project.appspot.com"
# ═══════════════════════════════════════════════

API_DIR="/root/api"
ENV_FILE="$API_DIR/.env"
KEY="$1"
VALUE="$2"

if [ -z "$KEY" ] || [ -z "$VALUE" ]; then
  echo ""
  echo "Usage: bash update-env.sh KEY VALUE"
  echo ""
  echo "Contoh:"
  echo "  bash update-env.sh FIREBASE_BUCKET nyzz-api.appspot.com"
  echo "  bash update-env.sh JWT_SECRET secret123"
  echo "  bash update-env.sh PORT 3001"
  echo ""
  echo "Isi .env saat ini:"
  echo "─────────────────"
  grep -v "PASSWORD\|SECRET\|KEY" "$ENV_FILE" 2>/dev/null || echo "  (file tidak ditemukan)"
  exit 1
fi

if grep -q "^${KEY}=" "$ENV_FILE" 2>/dev/null; then
  sed -i "s|^${KEY}=.*|${KEY}=${VALUE}|" "$ENV_FILE"
  echo "  ✓ Updated: ${KEY}=${VALUE}"
else
  echo "${KEY}=${VALUE}" >> "$ENV_FILE"
  echo "  ✓ Added: ${KEY}=${VALUE}"
fi

echo "  Restart API..."
pm2 restart my-api 2>/dev/null && echo "  ✓ API restarted" || echo "  ⚠ Restart manual: pm2 restart my-api"
