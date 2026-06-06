#!/usr/bin/env bash
# Kaswise hardening — ufw (defense-in-depth untuk port yang dilayani HOST)
# Perimeter utama tetap cloud firewall Biznet. Lihat caveat Docker di README.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "ERROR: jalankan dengan sudo." >&2; exit 1; fi

echo "==> ufw firewall setup"

if ! command -v ufw >/dev/null 2>&1; then
  echo "    Memasang ufw..."
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ufw
fi

# Default policy
ufw --force default deny incoming
ufw --force default allow outgoing

# Port wajib (cloud firewall sudah membatasi juga, ini lapisan kedua)
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP (NPM)'
ufw allow 443/tcp  comment 'HTTPS (NPM)'
ufw allow 81/tcp   comment 'NPM admin (dipakai user, JANGAN ditutup)'

# KRITIS: code-server (code.kaswise.com) berjalan sebagai proses HOST di :8080.
# NPM mencapainya dari container via host.docker.internal (gateway docker bridge).
# Tanpa rule ini, ufw default-deny memblokir jalur itu -> code.kaswise.com DOWN.
# Subnet proxy-network dideteksi otomatis (fallback 172.18.0.0/16).
CODE_SERVER_PORT="${CODE_SERVER_PORT:-8080}"
PROXY_SUBNET="$(docker network inspect proxy-network \
  --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || true)"
PROXY_SUBNET="${PROXY_SUBNET:-172.18.0.0/16}"
ufw allow from "${PROXY_SUBNET}" to any port "${CODE_SERVER_PORT}" proto tcp \
  comment 'NPM bridge -> code-server (KRITIS, jangan hapus)'
echo "    Allow ${PROXY_SUBNET} -> :${CODE_SERVER_PORT} (jalur NPM ke code-server)"

# www.kaswise.com landing preview: vite preview berjalan sebagai proses HOST di :4173,
# NPM (4.conf) mencapainya via gateway docker bridge. Tanpa rule ini ufw default-deny
# memblokir jalur itu -> www.kaswise.com DOWN (timeout). Lihat WEB_LANDING_PHASE_3 doc.
WEB_LANDING_PORT="${WEB_LANDING_PORT:-4173}"
ufw allow from "${PROXY_SUBNET}" to any port "${WEB_LANDING_PORT}" proto tcp \
  comment 'NPM bridge -> web landing preview'
echo "    Allow ${PROXY_SUBNET} -> :${WEB_LANDING_PORT} (jalur NPM ke landing preview)"

# Aktifkan tanpa prompt interaktif
ufw --force enable

echo "==> ufw aktif. Status:"
ufw status verbose

cat <<'EOF'

CATATAN PENTING (Docker bypass):
  Port yang di-PUBLISH container (NPM 80/443) diatur di iptables rantai DOCKER,
  MELEWATI ufw. Jadi ufw di sini melindungi port yang dilayani host langsung
  (SSH, code-server :8080), bukan port container.

  code.kaswise.com (code-server :8080) hanya boleh diakses NPM via docker bridge.
  Pastikan 8080 TIDAK terekspos publik (cloud firewall sudah memblokirnya).
  Jika code-server bind ke 0.0.0.0, pertimbangkan bind ke 127.0.0.1 / host-gateway saja.

  Port 81 (NPM admin) SENGAJA dibuka karena dipakai user. JANGAN ditutup.

  Untuk benar-benar memfilter port container dengan ufw, gunakan ufw-docker:
    https://github.com/chaifeng/ufw-docker
EOF
