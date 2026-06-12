# Changelog Guide

Dokumen ini menjelaskan format changelog yang konsisten untuk repo `catat-in`.

## Prinsip

- Satu changelog canonical: `docs/changelog/CHANGELOG.md`.
- Gunakan gaya "Keep a Changelog": ringkas, mudah dipindai, dan dikelompokkan per kategori.
- Changelog mencatat dampak ke pengguna / QA / perilaku sistem, bukan diff file.
- Detail teknis lengkap tetap ada di PR, release report, roadmap, atau CLAUDE.md.

## Struktur yang disarankan

Setiap entry rilis memakai format:

```md
## YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Docs
- ...
```

## Aturan penulisan

- Pakai tanggal ISO (`YYYY-MM-DD`).
- Maksimal 3–7 bullet per kategori.
- Sebutkan PR / commit jika relevan.
- Fokus pada perubahan yang terlihat oleh user, QA, atau operasi deploy.
- Hindari paragraf panjang; satu bullet = satu ide.
- Jika ada breaking change, tulis jelas di bagian `Changed` atau `Fixed`.

## Kategori

- `Added` — fitur baru
- `Changed` — perilaku berubah / polish / refactor yang berdampak
- `Fixed` — bug fix
- `Docs` — perubahan dokumentasi atau panduan
- `Removed` — penghapusan fitur / API / UI
- `Security` — patch keamanan atau hardening

## Hubungan dengan dokumen lain

- `docs/releases/*` = release report teknis per deploy
- `docs/plans/*` = roadmap dan progress implementasi
- `CLAUDE.md` = konteks kerja dan guardrails repo
- `docs/changelog/CHANGELOG.md` = ringkasan perubahan yang dibaca manusia

## Template entry baru

```md
## 2026-06-12

### Added
- Transaction Review Queue: dashboard CTA + transaction review filter (PR #14).

### Fixed
- Lowered review-confidence threshold to reduce false positives (PR #15).
- Bills now use stable name-based colors, and monthly "Mark Paid" correctly marks `is_paid=true` before rolling forward (PR #16).

### Docs
- Updated CLAUDE.md and roadmap notes to keep the implementation trail complete.
```
