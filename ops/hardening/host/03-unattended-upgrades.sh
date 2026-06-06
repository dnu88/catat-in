#!/usr/bin/env bash
# Kaswise hardening — auto security updates (unattended-upgrades)
set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "ERROR: jalankan dengan sudo." >&2; exit 1; fi

CFG_DIR="$(cd "$(dirname "$0")/.." && pwd)/config"
echo "==> Unattended-upgrades setup"

if ! dpkg -s unattended-upgrades >/dev/null 2>&1; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unattended-upgrades apt-listchanges
fi

install -m 0644 "${CFG_DIR}/50unattended-upgrades" /etc/apt/apt.conf.d/50unattended-upgrades
install -m 0644 "${CFG_DIR}/20auto-upgrades"       /etc/apt/apt.conf.d/20auto-upgrades

systemctl enable --now unattended-upgrades >/dev/null 2>&1 || true

echo "    Dry-run verifikasi konfigurasi:"
unattended-upgrade --dry-run --debug 2>&1 | grep -iE "allowed origins|checking|adjusting" | head -n 15 || true

echo "==> Unattended-upgrades aktif (security-only, tanpa auto-reboot)."
