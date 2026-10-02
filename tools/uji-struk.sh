#!/usr/bin/env bash
# Uji pembaca struk AI memakai kunci produksi — TANPA menyentuh kuota atau DB.
#
# Cara pakai (dari laptop/VPS):
#   bash tools/uji-struk.sh
#
# Yang diuji: config -> pilih provider gambar -> panggilan API sungguhan -> parse JSON.
# Gambar uji dibuat oleh tools/buat-struk-uji.py (struk sintetis, total Rp 88.000).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="$(cd "$HERE/.." && pwd)"
IMG=/tmp/kw-struk-uji.png

cd "$DIR"

python3 "$HERE/buat-struk-uji.py"

docker run --rm \
  --env-file .env.production-runtime \
  -e PYTHONPATH=/app \
  -v "$DIR/backend:/app" \
  -v "$HERE/verifikasi-struk.py:/tmp/verifikasi-struk.py:ro" \
  -v "$IMG:/tmp/struk-uji.png:ro" \
  -w /app \
  --entrypoint python \
  "$(docker compose -f docker-compose.production.yml --env-file .env.production-runtime config --images | head -1)" \
  /tmp/verifikasi-struk.py
