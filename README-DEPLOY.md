# Deploy produksi backend Kaswise (git worktree)

Folder ini adalah **git worktree** dari repo utama `~/apps/kaswise`. Fungsinya: konteks build
+ konfigurasi runtime container backend produksi (`kaswise-backend`).

- **Dipindahkan 2026-10-03** dari `/tmp/kaswise-finance-editorial-deploy` → `~/services/kaswise-finance-editorial-deploy`.
  Sebelumnya folder ini ada di `/tmp` sehingga **hilang kalau VPS reboot** (dan bersama dia, satu-satunya
  salinan `docker-compose.production.yml` hasil rekonstruksi hardening + file env runtime).
- **Path kanonik sekarang: `~/services/kaswise-finance-editorial-deploy`** (jangan dipindah tanpa
  memperbarui `docs`/catatan; nama folder harus tetap sama karena nama project compose diturunkan
  dari basename folder — kalau berubah, container lama tidak lagi dikenali project yang sama).
- Sumber kode utama tetap `~/apps/kaswise` (branch `release/v2-transaction-entry`).
- Compose: `docker-compose.production.yml` — project `kaswise-finance-editorial-deploy`, container
  `kaswise-backend`, image `kaswise-finance-editorial-deploy-backend`.
- Rahasia: `.env.production-runtime` (mode 600, **jangan pernah** di-commit; sudah ada di `.gitignore`).
  Isinya diekstrak dari container live saat migrasi ke DeepSeek; nilai rahasia tidak pernah dicetak ke chat.

## Menyalakan / mengganti container backend

```bash
cd ~/services/kaswise-finance-editorial-deploy
docker compose -f docker-compose.production.yml --env-file .env.production-runtime up -d --build

# WAJIB setiap kali container backend diganti:
docker restart nginx-proxy-manager
```

> **Kenapa restart proxy wajib?** nginx-proxy-manager menyimpan IP upstream container lama
> (DNS Docker di-cache). Tanpa restart, trafik tetap menuju container lama → `502` / "Load failed"
> di HP padahal container baru sehat. Pernah terjadi saat migrasi provider AI.

## Uji konfigurasi TANPA menyentuh produksi

```bash
docker run --rm --env-file .env.production-runtime kaswise-finance-editorial-deploy-backend \
  python -c "from app.core.config import settings; print('KONFIGURASI OK', settings.AI_PROVIDER_PRIMARY)"
```

## Rollback

- Image lama disimpan: `kaswise-backend:pre-deepseek`; container lama: `kaswise-backend-rollback`.
- Arsip gambar lama (nama `*_bak_*`) = container gagal saat config load; JANGAN dijalankan.
- Karena backend **dibaked ke image** (bukan bind mount), setiap perubahan kode backend butuh
  rebuild (`up -d --build`), lalu restart proxy.

## Verifikasi cepat setelah deploy

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep kaswise-backend   # harus (healthy)
curl -s -o /dev/null -w '%{http_code}\n' https://app.kaswise.com/     # 200
```

Catatan insiden & riwayat: `~/apps/kaswise/.hermes/plans/2026-10-02_070744-kaswise-transaction-flow-v2.md`
(bagian insiden AI/DeepSeek) dan `...2026-10-02_231011-kaswise-ai-autosave-text.md`.
