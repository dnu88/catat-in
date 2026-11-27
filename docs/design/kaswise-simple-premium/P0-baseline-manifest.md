# P0 Baseline Manifest — Kaswise Simple Premium Experience

Recorded: 2026-10-03 (WIB). Plan: `2026-10-03_070927-kaswise-simple-premium-experience.md`.
Workspace: `/home/Danu88/apps/kaswise` · active app `apps/mobile` · branch `release/v2-transaction-entry`.
**No source, DB, flag, or payment config was changed by this P0 work.** Only new untracked docs under `docs/design/`.

## T01 — Baseline state

### Git state (dirty + untracked preserved, nothing reset/cleaned/committed)
19 entries. Modified (tracked, uncommitted bugfixes — MUST stay in baseline):
- `apps/mobile/__tests__/capture-entry-v2.test.tsx`
- `apps/mobile/__tests__/receipt-entry-mode.test.tsx`
- `apps/mobile/__tests__/transaction-new-compact.test.tsx`
- `apps/mobile/__tests__/transaction-new-edit-mode.test.tsx`
- `apps/mobile/app/(tabs)/capture.tsx`
- `apps/mobile/app/(tabs)/transaction-new.tsx`
- `apps/mobile/src/services/billing.test.ts`
- `apps/mobile/src/services/transaction-entry-persistence.test.ts`
- `apps/mobile/src/services/transaction-entry-persistence.ts`
- `backend/app/services/payments/orchestrator.py`
- `backend/app/services/payments/providers/midtrans.py`
- `backend/tests/test_payment_provider_selection.py`
- `backend/tests/test_reconcile_mayar_notification.py`

Untracked:
- `.hermes/plans/2026-10-03_070927-kaswise-simple-premium-experience.md`
- `apps/mobile/src/services/transaction-entry-reconciliation.test.ts`
- `backend/tests/test_payment_safety_regressions.py`
- `docs/qa/` (release evidence)
- `docs/releases/2026-10-02-47508bf.md`
- `supabase/tests/live/60_assert_edit_balance.sql`

### Actual feature flags (source = `apps/mobile/src/config/features.ts`)
`importStatement`, `simpleNavigation`, `voiceNote`, `transactionEntryV2`, `aiAutosaveText`.
Rollout config `apps/mobile/rollout-flags.json` (live committed state):
```json
{"simpleNavigation": true, "transactionEntryV2": true, "aiAutosaveText": true}
```
Live public flags (from `docs/qa/mobile-release-verification.json`): SIMPLE_NAVIGATION=true, TRANSACTION_ENTRY_V2=true, AI_AUTOSAVE_TEXT=true, VOICE_NOTE='', IMPORT_STATEMENT=''.

**Note:** the plan references `scripts/rollout-flags.cjs`; actual paths are `apps/mobile/scripts/rollout-flags.cjs`, `apps/mobile/rollout-flags.json`, `apps/mobile/scripts/deploy-pwa.mjs`, `apps/mobile/scripts/live-feature-registry.json`. Source wins over plan text.

### Baseline gate results (this run, real output)
| Gate | Command | Result |
|---|---|---|
| Type-check | `corepack pnpm type-check` | **PASS — exit 0** |
| Focused guard tests | 11 suites (list in plan §9) | **PASS — 11/11 suites, 114/114 tests, exit 0** |

Previous release baseline (for reference, NOT re-claimed as this run): 89 suites / 806 passed / 8 skipped; backend 93 passed; 39 markers; PWA bundle `entry-8ab6b0080f2f4e8626de86007b40f2a1.js` sha256 `d237b2da…4838f`.

### Host resources (plan risk §10)
- `df -h /` → **98% used, 1.2G available** ⚠ — build/export/deploy must be serial; avoid parallel heavy jobs.
- `free -m` → total 7939MB, available ~2421MB, swap nearly full (17MB free) ⚠.

## T02 — Before state (recorded, not re-designed)

### Screens captured (real app renders)
`apps/mobile/theme-preview/{dashboard,transactions,wallets,reports,settings,capture,transaction-new}.png`
(dashboard = Beranda/Home; transaction-new = manual entry).
Live release: `docs/qa/mobile-release-capture.png`, `docs/qa/mobile-release-manual.png`.

Observed baseline hierarchy:
- **Home (Beranda):** greeting + context switcher → `Total saldo` → period chip → `Sisa bulan ini` / `Pengeluaran` → `Terakhir` list + `Semua`. No dedicated "Catat" CTA in hero — entry relies on centre `+` tab.
- **Capture:** header → `TUJUAN TRANSAKSI` card (context pill + wallet pill) → mode chips `Teks|Foto` (Suara hidden when unavailable) → helper → textarea → primary `Cek transaksi` → secondary `Isi detail manual`.
- **Manual (Catat Manual):** `NOMINAL` → `JENIS TRANSAKSI` (Pengeluaran/Pemasukan/Transfer) → rows Kategori / Dompet / Tanggal → `Tambah detail` disclosure (collapsed) → `Simpan Transaksi`. Save disabled until required fields valid.
- **Wallets (Dompet):** `+ Baru` CTA → `Total Saldo Semua Akun` → type chips → list; **decorative glass wallet stack present** (must be preserved).
- **Reports (Laporan):** context/period/share chips → Pemasukan / Pengeluaran / Tabungan → AI insight card → Dompet section.
- **Settings:** profile card → TAMPILAN / AKUN & KEAMANAN / PAKET / KELUARGA / BAHASA APLIKASI / NOTIFIKASI sections (already grouped rows).

### Tap-count conventions to measure later (T12, T26)
- Manual happy path ≤3 taps nav/action from Home (excl. typing); extra wallet/category selection must be counted, not hidden.
- Keyboard must not cover active field / validation / the single save button.
- Viewports: 360×800, 390×844 (+430×932), 44×44 px targets.

### Known gap (explicit, to be closed — not just noted)
Before-frames for **Home / Transactions / single-review / batch-review** are the empty-state renders above. Populated single-review and batch-review before-frames require a running app with a disposable account; they will be captured in **P2/P3 against the local preview stub** once `playwright.experience.config.ts` exists (T12/T26), and added here. No live production credentials are used by default.

## T03 — Wireframe candidates (static fixture)
`docs/design/kaswise-simple-premium/wireframes.html` (+ per-frame PNGs `wf_A wf_B wf_C wf_R1 wf_R2 wf_R3 wf_R4`).
- **A Composer-first**, **B Sheet-first** (not default), **C Context-first**.
- Recommended **A+C**: dedicated Capture, one dominant composer, calm context/wallet row, sheets only for field choice.
- Also mocked: single review (amount anchor), batch review (N + total, collapsed rows, auto-expanded problem row), and the mandatory **unknown-outcome** state (no false success, `Cek status`, no re-create from edited payload).

## Gate
**T04 approval required before any source change.** Awaiting user decision on: layout A+C, default text vs manual, batch card pattern, Home-change priority.
