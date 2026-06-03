#!/usr/bin/env bash
# Kaswise hardening — SSH
# Memasang drop-in sshd config dengan guard agar tidak mengunci user keluar.
# Idempoten: aman dijalankan berkali-kali.
set -euo pipefail

DROPIN_SRC="$(cd "$(dirname "$0")/.." && pwd)/config/sshd_hardening.conf"
DROPIN_DST="/etc/ssh/sshd_config.d/99-kaswise-hardening.conf"
TARGET_USER="${SUDO_USER:-${USER}}"

echo "==> SSH hardening untuk user: ${TARGET_USER}"

if [[ $EUID -ne 0 ]]; then
  echo "ERROR: jalankan dengan sudo." >&2
  exit 1
fi

# --- GUARD: pastikan ada authorized_keys valid sebelum disable password auth ---
USER_HOME="$(getent passwd "${TARGET_USER}" | cut -d: -f6)"
AUTH_KEYS="${USER_HOME}/.ssh/authorized_keys"

if [[ ! -s "${AUTH_KEYS}" ]]; then
  cat >&2 <<EOF
ERROR: Tidak ditemukan kunci SSH di ${AUTH_KEYS}.
Mematikan PasswordAuthentication sekarang bisa mengunci kamu keluar.

Tambahkan public key dulu, mis. dari mesin lokal:
  ssh-copy-id ${TARGET_USER}@103.93.163.51

Lalu jalankan ulang skrip ini.
EOF
  exit 1
fi
echo "    OK: authorized_keys ditemukan (guard lolos)."

# --- Pasang drop-in ---
install -m 0644 "${DROPIN_SRC}" "${DROPIN_DST}"
echo "    Drop-in dipasang: ${DROPIN_DST}"

# --- Validasi config sebelum reload ---
if ! sshd -t; then
  echo "ERROR: sshd -t gagal. Menghapus drop-in agar tidak merusak SSH." >&2
  rm -f "${DROPIN_DST}"
  exit 1
fi
echo "    OK: sshd -t valid."

# --- Reload (bukan restart, agar sesi aktif tidak putus) ---
systemctl reload ssh 2>/dev/null || systemctl reload sshd
echo "==> SSH ter-harden. Sesi aktif TIDAK diputus."
echo "    Uji dari sesi BARU sebelum menutup sesi ini:"
echo "      ssh ${TARGET_USER}@103.93.163.51"
