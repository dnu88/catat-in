#!/usr/bin/env bash
# Kaswise hardening — audit posture (READ-ONLY, aman dijalankan kapan saja)
# Tidak mengubah apa pun. Hanya melaporkan status.
set -uo pipefail

pass(){ printf '  \033[32m[ OK ]\033[0m %s\n' "$1"; }
warn(){ printf '  \033[33m[WARN]\033[0m %s\n' "$1"; }
fail(){ printf '  \033[31m[FAIL]\033[0m %s\n' "$1"; }
head(){ printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

TARGET_USER="${SUDO_USER:-${USER}}"

head "SSH"
# Panggil sshd -T SEKALI (lebih andal daripada beberapa invocation terpisah).
SSHD_EFF="$(sshd -T 2>/dev/null || true)"
if grep -qi '^passwordauthentication no' <<<"${SSHD_EFF}"; then
  pass "PasswordAuthentication no"
else
  warn "PasswordAuthentication masih aktif (jalankan host/01-ssh-hardening.sh)"
fi
if grep -qi '^permitrootlogin no' <<<"${SSHD_EFF}"; then
  pass "PermitRootLogin no"
else
  warn "PermitRootLogin belum no"
fi
# sshd -T menormalkan 'yes' menjadi 'all' untuk AllowTcpForwarding.
if grep -qiE '^allowtcpforwarding (yes|all|local|remote)' <<<"${SSHD_EFF}"; then
  pass "AllowTcpForwarding aktif (SSH tunnel NPM aman)"
else
  warn "AllowTcpForwarding nonaktif — tunnel ke NPM port 81 bisa putus!"
fi

head "Firewall (ufw)"
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -qi '^Status: active'; then
  pass "ufw aktif"
  ufw status 2>/dev/null | grep -E '(^| )(22|80|81|443)/' | sed 's/^/      /'
else
  warn "ufw belum aktif (host/02-firewall-ufw.sh)"
fi

head "Auto security updates"
if dpkg -s unattended-upgrades >/dev/null 2>&1; then
  pass "unattended-upgrades terpasang"
  grep -q 'Unattended-Upgrade "1"' /etc/apt/apt.conf.d/20auto-upgrades 2>/dev/null \
    && pass "auto-upgrade enabled" || warn "20auto-upgrades belum aktif"
else
  warn "unattended-upgrades belum terpasang (host/03-unattended-upgrades.sh)"
fi

head "fail2ban"
if systemctl is-active --quiet fail2ban 2>/dev/null; then
  pass "fail2ban running"
  fail2ban-client status sshd 2>/dev/null | grep -iE 'currently|total' | sed 's/^/      /' || true
else
  warn "fail2ban tidak aktif (host/04-fail2ban.sh)"
fi

head "Docker daemon"
if [[ -f /etc/docker/daemon.json ]]; then
  if grep -q 'max-size' /etc/docker/daemon.json; then
    pass "log rotation dikonfigurasi"
  else
    warn "daemon.json ada tapi tanpa log rotation"
  fi
  grep -q 'live-restore' /etc/docker/daemon.json && pass "live-restore set" || warn "live-restore belum set"
else
  warn "/etc/docker/daemon.json tidak ada (host/05-docker-daemon.sh)"
fi

head "Secrets & permissions"
ENVF="/home/Danu88/catat-in/.env.production"
if [[ -f "${ENVF}" ]]; then
  perm="$(stat -c '%a' "${ENVF}")"
  [[ "${perm}" == "600" ]] && pass ".env.production chmod 600" || fail ".env.production chmod ${perm} (harus 600: chmod 600 ${ENVF})"
else
  warn ".env.production tidak ditemukan di path standar"
fi

head "Port LISTEN publik (0.0.0.0 / ::)"
if command -v ss >/dev/null 2>&1; then
  ss -tlnH 2>/dev/null | awk '{print $4}' | grep -E '0\.0\.0\.0|\[::\]|\*' \
    | sed 's/^/      /' || echo "      (tidak ada)"
  echo "      -> Diharapkan publik: 22/80/443 + 81 (NPM admin, dipakai user)."
  echo "      -> 8080 (code-server) JANGAN publik."
fi

head "Container restart policy"
if command -v docker >/dev/null 2>&1; then
  docker ps --format '{{.Names}}' 2>/dev/null | while read -r c; do
    rp="$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$c" 2>/dev/null)"
    [[ "$rp" == "unless-stopped" || "$rp" == "always" ]] \
      && pass "$c restart=$rp" || warn "$c restart=$rp (sebaiknya unless-stopped)"
  done
fi

printf '\n\033[1mAudit selesai.\033[0m Jalankan skrip host/* untuk memperbaiki item WARN/FAIL.\n'
