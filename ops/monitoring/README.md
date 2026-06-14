# Stack Monitoring VPS Kaswise

Berisi Uptime Kuma, Beszel (hub+agent), Portainer. Terpisah dari stack aplikasi.

## Deploy
1. Salin folder ini ke `/home/Danu88/monitoring/` di VPS.
2. `cp .env.example .env` lalu isi `BESZEL_KEY` (dari Beszel Hub, lihat plan Task 6).
3. `docker compose up -d uptime-kuma beszel portainer`
4. Setelah `BESZEL_KEY` terisi: `docker compose up -d beszel-agent`

## Network
Join ke `proxy-network` (eksternal) — sama dengan NPM & backend.
Akses hanya via NPM (subdomain status/health/panel.kaswise.com), tidak expose port ke host.

## Update aman
`docker compose pull && docker compose up -d` — tidak memengaruhi kaswise-backend.

## Referensi
- Spec: `docs/superpowers/specs/2026-06-13-vps-monitoring-dashboard-design.md`
- Rencana pemasangan: `docs/superpowers/plans/2026-06-13-vps-monitoring-dashboard.md`
