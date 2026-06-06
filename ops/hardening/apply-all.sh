#!/usr/bin/env bash
# Kaswise hardening — orchestrator interaktif.
# Menjalankan skrip host/* secara berurutan dengan konfirmasi per langkah.
set -uo pipefail

if [[ $EUID -ne 0 ]]; then echo "ERROR: jalankan dengan sudo." >&2; exit 1; fi

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "================================================================"
echo " Kaswise Operational Hardening — apply-all"
echo " Setiap langkah minta konfirmasi. Ctrl-C untuk batal kapan saja."
echo "================================================================"

run_step() {
  local script="$1" desc="$2"
  echo
  echo "----------------------------------------------------------------"
  echo " LANGKAH: ${desc}"
  echo " Skrip:   ${script}"
  echo "----------------------------------------------------------------"
  read -r -p " Jalankan langkah ini? (yes/skip/abort): " ans
  case "${ans}" in
    yes)   bash "${script}" || { echo "  Langkah GAGAL: ${desc}"; read -r -p "  Lanjut ke langkah berikut? (yes/NO): " c; [[ "$c" == "yes" ]] || exit 1; } ;;
    skip)  echo "  Dilewati: ${desc}" ;;
    *)     echo "  Dibatalkan."; exit 0 ;;
  esac
}

# Audit awal
echo; echo ">>> Audit posture awal:"
bash "${DIR}/verify/audit.sh" || true

run_step "${DIR}/host/01-ssh-hardening.sh"        "SSH hardening (butuh authorized_keys)"
run_step "${DIR}/host/02-firewall-ufw.sh"          "ufw firewall (22/80/443)"
run_step "${DIR}/host/03-unattended-upgrades.sh"   "Auto security updates"
run_step "${DIR}/host/04-fail2ban.sh"              "fail2ban (SSH)"
run_step "${DIR}/host/05-docker-daemon.sh"         "Docker daemon (log rotation + live-restore)"

echo
echo ">>> Audit posture akhir:"
bash "${DIR}/verify/audit.sh" || true

echo
echo "Selesai. Item opsional yang TIDAK otomatis:"
echo "  - Container hardening : docker/compose.hardening.yml (lihat README)"
echo "  - Backup terjadwal    : backup/backup.sh (pasang cron)"
