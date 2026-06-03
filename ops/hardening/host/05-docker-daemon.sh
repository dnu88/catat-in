#!/usr/bin/env bash
# Kaswise hardening — Docker daemon
# Memasang /etc/docker/daemon.json: log rotation (cegah disk penuh),
# live-restore (container tetap jalan saat daemon restart), no-new-privileges default.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "ERROR: jalankan dengan sudo." >&2; exit 1; fi

SRC="$(cd "$(dirname "$0")/.." && pwd)/config/docker-daemon.json"
DST="/etc/docker/daemon.json"
echo "==> Docker daemon hardening"

# Butuh jq untuk merge aman bila daemon.json sudah ada
if [[ -f "${DST}" ]]; then
  echo "    daemon.json sudah ada — backup + merge."
  cp -a "${DST}" "${DST}.bak-$(date +%Y%m%d%H%M%S)"
  if command -v jq >/dev/null 2>&1; then
    # File baru menimpa key yang sama, mempertahankan key lain milik user.
    tmp="$(mktemp)"
    jq -s '.[0] * .[1]' "${DST}" "${SRC}" > "${tmp}"
    install -m 0644 "${tmp}" "${DST}"
    rm -f "${tmp}"
  else
    echo "    WARNING: jq tidak ada. Menimpa daemon.json (backup sudah dibuat)."
    install -m 0644 "${SRC}" "${DST}"
  fi
else
  install -d -m 0755 /etc/docker
  install -m 0644 "${SRC}" "${DST}"
fi

echo "    daemon.json terpasang:"
cat "${DST}"

# Validasi JSON
if command -v jq >/dev/null 2>&1; then
  jq empty "${DST}" && echo "    OK: JSON valid."
fi

cat <<'EOF'

==> Konfigurasi terpasang TAPI belum aktif.
    Perlu restart Docker daemon sekali. Dengan live-restore,
    container yang sedang jalan TIDAK ikut mati saat restart daemon.
EOF

read -r -p "Restart Docker sekarang? (yes/NO): " ans
if [[ "${ans}" == "yes" ]]; then
  systemctl restart docker
  sleep 2
  echo "==> Docker di-restart. Status container:"
  docker ps --format "table {{.Names}}\t{{.Status}}" || true
else
  echo "==> Dilewati. Aktifkan nanti dengan: sudo systemctl restart docker"
fi
