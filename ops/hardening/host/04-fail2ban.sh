#!/usr/bin/env bash
# Kaswise hardening — fail2ban (SSH brute-force protection)
set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "ERROR: jalankan dengan sudo." >&2; exit 1; fi

CFG="$(cd "$(dirname "$0")/.." && pwd)/config/jail.local"
echo "==> fail2ban setup"

if ! command -v fail2ban-server >/dev/null 2>&1; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq fail2ban
fi

# Backup jail.local lama bila ada
if [[ -f /etc/fail2ban/jail.local ]]; then
  cp -a /etc/fail2ban/jail.local "/etc/fail2ban/jail.local.bak-$(date +%Y%m%d%H%M%S)"
fi

install -m 0644 "${CFG}" /etc/fail2ban/jail.local

systemctl enable fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban

sleep 1
echo "==> Status jail:"
fail2ban-client status 2>/dev/null || true
fail2ban-client status sshd 2>/dev/null || true
echo "==> fail2ban aktif (jail sshd + recidive)."
