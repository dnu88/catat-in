#!/usr/bin/env bash
# Kaswise hardening — backup state kritis yang TIDAK ada di git.
# Mem-backup: secrets, data NPM (cert + config), dan build PWA placeholder.
# Simpan terenkripsi/off-site sesuai kebutuhan. Skrip ini hanya membuat arsip lokal.
set -euo pipefail

DEST="${BACKUP_DIR:-/home/Danu88/backups}"
KEEP="${BACKUP_KEEP:-14}"          # jumlah arsip yang disimpan
TS="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${DEST}/kaswise-state-${TS}.tar.gz"

# Hanya state yang TIDAK tergantikan. Data finansial ada di Supabase Cloud
# (managed backups). placeholder/ (build PWA ~290M) SENGAJA tidak di-backup
# karena regenerable: `corepack pnpm --filter mobile export:pwa && deploy:pwa`.
SOURCES=(
  "/home/Danu88/catat-in/.env.production"
  "/home/Danu88/nginx-proxy-manager/data"
  "/home/Danu88/nginx-proxy-manager/letsencrypt"
)

mkdir -p "${DEST}"
chmod 700 "${DEST}"

echo "==> Backup state Kaswise → ${ARCHIVE}"
existing=()
for s in "${SOURCES[@]}"; do
  if [[ -e "${s}" ]]; then
    existing+=("${s}")
    echo "    + ${s}"
  else
    echo "    - (lewati, tidak ada) ${s}"
  fi
done

if [[ ${#existing[@]} -eq 0 ]]; then
  echo "ERROR: tidak ada sumber yang bisa di-backup." >&2
  exit 1
fi

tar -czf "${ARCHIVE}" --absolute-names "${existing[@]}"
chmod 600 "${ARCHIVE}"

# Checksum integritas (untuk verifikasi backup tidak korup saat restore)
( cd "${DEST}" && sha256sum "$(basename "${ARCHIVE}")" > "$(basename "${ARCHIVE}").sha256" )
chmod 600 "${ARCHIVE}.sha256"
echo "    OK: $(du -h "${ARCHIVE}" | cut -f1) → ${ARCHIVE}"
echo "    sha256: $(cut -d' ' -f1 "${ARCHIVE}.sha256")"

# Rotasi: simpan KEEP arsip terbaru
mapfile -t old < <(ls -1t "${DEST}"/kaswise-state-*.tar.gz 2>/dev/null | tail -n +$((KEEP+1)))
if [[ ${#old[@]} -gt 0 ]]; then
  echo "==> Rotasi: hapus ${#old[@]} arsip lama (simpan ${KEEP} terbaru)"
  for f in "${old[@]}"; do rm -f "${f}" "${f}.sha256" && echo "    - ${f}"; done
fi

echo "==> Selesai."
echo "    Saran: salin arsip ke off-site (mis. rclone ke object storage) + enkripsi."
echo "    Otomatiskan via cron, mis. harian 03:00:"
echo "      0 3 * * * /home/Danu88/catat-in/ops/hardening/backup/backup.sh >> /home/Danu88/backups/backup.log 2>&1"
