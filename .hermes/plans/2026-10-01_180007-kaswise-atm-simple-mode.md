# Kaswise ATM Simple Mode Implementation Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task. Setiap task harus melewati review spec compliance lalu code quality sebelum lanjut.

**Goal:** Menyederhanakan Kaswise menjadi aplikasi finansial dengan lima tujuan utama—Beranda, Transaksi, Catat, Laporan, dan Dompet—serta memindahkan fitur lanjutan ke pusat pengaturan, dengan prinsip **Amati, Tiru, Modifikasi (ATM)** dan identitas Kaswise sendiri.

**Architecture:** Pertahankan Expo Router, Supabase, finance context personal/household, wallet balance trigger, dan seluruh route yang sudah ada. Perubahan dilakukan sebagai lapisan information architecture dan presentation di atas workflow yang sudah teruji, dilindungi feature flag `simpleNavigation` untuk rollout bertahap. Tidak ada route atau fitur lama yang dihapus; route sekunder hanya disembunyikan dari tab bar dan tetap bisa dibuka lewat Settings/deep link.

**Tech Stack:** Expo Router 6, React Native 0.81, React 19, TypeScript, Supabase, Jest + React Native Testing Library, Expo PWA export.

---

## 1. Product Direction: Amati, Tiru, Modifikasi

### Yang diamati dari Moonveo

- Lima destinasi primer yang jelas.
- Tombol input di tengah sebagai aksi paling penting.
- Fitur kompleks tidak memenuhi dashboard; ditaruh di settings/detail screen.
- Form dan card memiliki satu pekerjaan utama per layar.
- Voice, scan/attach, category configuration, recurring finance, dan period customization terasa sebagai workflow, bukan sekadar kumpulan menu.

### Yang ditiru sebagai konsep

- **5-tab finance-first shell.**
- **Action-first Capture Hub.**
- **Settings sebagai command center.**
- Progressive disclosure: advanced controls muncul hanya saat dibutuhkan.
- Satu hierarchy visual dominan per screen.

### Yang dimodifikasi agar menjadi Kaswise

- Palet tetap Kaswise Finance Editorial: `paper`, `white`, `ink`, `navySurface`, `blueDeep`, `blueBright`, semantic income/expense.
- Bahasa dan contoh transaksi Indonesia-first: QRIS, e-wallet, tanggal gajian, rekening koran, rumah tangga.
- Finance context personal/household tetap terlihat dan diterapkan pada semua query.
- AI capture tetap preview-before-confirm untuk foto/voice; text instant save mengikuti perilaku saat ini.
- Tidak meniru logo, nama menu, warna teal/black, ilustrasi, wording, atau layout pixel-per-pixel Moonveo.

### Design rules yang dikunci

1. Satu screen = satu pekerjaan utama.
2. Maksimal dua CTA primer dalam satu viewport.
3. Advanced options masuk Settings, modal, atau detail route.
4. Tidak membuat fitur palsu/placeholder yang terlihat aktif.
5. Semua finansial query mempertahankan `activeContext`.
6. Saldo wallet tetap dikelola database trigger; UI tidak mengubah saldo langsung.
7. Existing deep link tetap valid.
8. Target sentuh minimum 44px dan seluruh action memiliki accessibility label.

---

## 2. Keputusan yang Sudah Disetujui

- Primary tabs menjadi:
  1. `index` — Beranda
  2. `transactions` — Transaksi
  3. `capture` — Catat (center action)
  4. `reports` — Laporan
  5. `wallets` — Dompet
- `settings` tidak lagi menjadi primary tab pada Simple Mode.
- Settings dibuka lewat profile/avatar control di header Beranda.
- Settings dan seluruh secondary routes tetap ada agar deep link serta workflow lama tidak rusak.

---

## 3. Current-State Notes

### Current primary navigation

File: `apps/mobile/app/(tabs)/_layout.tsx`

Saat ini primary routes adalah:

```ts
index, transactions, capture, reports, settings
```

`wallets`, `budgets`, `bills`, `groups`, `imports`, dan `transaction-new` sudah terdaftar sebagai hidden routes.

### Existing capabilities yang dapat dipakai ulang

- Text capture: `apps/mobile/app/(tabs)/capture.tsx`
- Receipt/photo OCR: `apps/mobile/app/(tabs)/capture.tsx`
- Voice capture behind flag: `featureFlags.voiceNote`
- Manual entry/edit: `apps/mobile/app/(tabs)/transaction-new.tsx`
- Statement import behind flag: `apps/mobile/app/(tabs)/imports.tsx`
- Wallet management: `apps/mobile/app/(tabs)/wallets.tsx`
- Category budget envelopes: `apps/mobile/app/(tabs)/budgets.tsx`
- Bills/reminders: `apps/mobile/app/(tabs)/bills.tsx`
- Household/family: `apps/mobile/app/(tabs)/groups.tsx`
- Reports with custom periods: `apps/mobile/app/(tabs)/reports.tsx`
- Settings currently contains profile, plan, family, import, notifications, appearance, language, security, legal, account deletion, and seed/demo utilities.

### Relevant tests

- `apps/mobile/__tests__/tabs-layout-spacing.test.tsx`
- `apps/mobile/__tests__/tabs-index.test.tsx`
- `apps/mobile/__tests__/capture-envelope-suggestion.test.tsx`
- `apps/mobile/__tests__/capture-gating.test.tsx`
- `apps/mobile/__tests__/wallets-screen.test.tsx`
- `apps/mobile/__tests__/settings-screen.test.tsx`
- `apps/mobile/__tests__/imports-screen.test.tsx`
- `apps/mobile/__tests__/motion-all-screens-coverage.test.ts`
- `apps/mobile/__tests__/screen-shells.test.tsx`

### Worktree safety

Saat plan ini dibuat, repo memiliki untracked user artifacts yang tidak terkait redesign:

- `.hermes/plans/2026-07-20_062632-voice-note-mvp.md`
- `apps/mobile/kaswise-current.png`
- `apps/mobile/scripts/capture-theme-preview.cjs`
- `apps/mobile/theme-preview/`

Executor **dilarang menghapus, memindahkan, memformat, atau memasukkan file tersebut ke commit** tanpa instruksi eksplisit.

---

## 4. Scope

### Phase 1 — Execute in this plan

- Feature-flagged Simple Navigation.
- Wallet menggantikan Settings di primary tab bar.
- Avatar/profile Beranda membuka Settings.
- Settings menjadi command center dengan grouping jelas.
- Home disederhanakan menjadi calm financial cockpit.
- Capture dirapikan menjadi action-first hub tanpa mengubah backend behavior.
- Wallet dipoles sebagai primary destination tanpa membuat asset/debt data palsu.
- Focused tests, full regression, PWA export, marker verification, dan visual QA.

### Phase 2 — Separate follow-up epics, not implemented here

- Recurring transactions engine yang benar-benar membuat transaksi terjadwal.
- Payday budget cycle global yang menyatukan Budget + Reports.
- Share extension / screenshot scanner dari aplikasi lain.
- iOS Shortcuts / Android share intent automation.
- Receivable/debt/fixed asset ledger.
- Tags dan multi-currency.

Alasan: kelima area tersebut membutuhkan contract data/schema/OS integration tersendiri. Menggabungkannya ke UI redesign akan membuat risiko regresi terlalu tinggi.

---

# Implementation Tasks

## Execution Status

Status rule: `[x]` means implementation and verification passed; independent spec/quality review gates must also pass before progressing. Tasks 1–3 have passing implementation tests but their previously skipped independent reviews are now being backfilled. Task 4 is resumed with an implementer subagent; no production deployment is authorized. Preserve decorative wallet stack regardless of audit suggestions until explicit approval after before/after visual QA.

- [x] Task 0 — Baseline preserved, branch `feat/kaswise-simple-mode` created, baseline type-check + focused Jest PASS.
- [x] Task 1 — Implementation `ddc0342`, test isolation fix `28f03a3`; independent spec PASS and code-quality APPROVED. Focused tests/default+canary and type-check PASS.
- [x] Task 2 — Fifth primary tab Wallets under flag. Commit `a0402e3`; tests/type-check PASS; independent spec PASS and code-quality APPROVED.
- [x] Task 3 — Home profile/avatar opens Settings. Commit `30eb0c1`; tests/type-check PASS; independent spec PASS and code-quality APPROVED.
- [x] Task 4 — Settings primitives `ebd455a`; parent tests PASS, independent spec PASS and code-quality APPROVED. Review batch: 5 suites / 28 tests, type-check, deploy script syntax PASS. Browser/device QA remains Task11.
- [x] Task 5 — Settings command center `bf7460f`; parent regression 3 suites/36 passed/8 intentional skips. Independent spec PASS and quality APPROVED; mobile type-check PASS. Browser/device visual gate remains Task11; no deploy.
- [x] Task 6 — Home cockpit `55021c0` + fix `9623943`. Spec re-review PASS; independent code-quality APPROVED (21/21 focused + cross-consumer sweep 89 pass; i18n parity id/en 97 keys, `moneySpace` in both; no duplicate testIDs, entrance indices correct, no new queries). Decision: unconditional localized/period-aware captions kept (fixes factually wrong legacy copy). Visual QA Task11; no deploy.
- [x] Task 7 — Capture hub final head `b3b741a` (db6bbe5 → 7321bf8 → b3b741a). Spec review PASS; independent code-quality APPROVED, mutation-tested (removing each fix fails only its own test). Reviewer ran the full mobile suite at this head: 70 suites / 501 passed / 8 skipped / 0 failed. Task11 visual gate for capture states remains; no deploy.
- [x] Task 9 — SPEC PASS + QUALITY APPROVED at `af981f5` (reviewer ran 64 tests + type-check; verified `canGoBack` exists at runtime in expo-router 6.0.23, no replace-instead-of-back, no loops/dead ends, notification/deep-link targets intact, hidden-set ≡ map-keys test is two-directional). Follow-up hardening dispatched for three actionable minors: tautological fallback VALUES (needs an explicit expected mapping), untested `upgrade-retry-check` poll path + asymmetric `router.back()` assertion, and the uncleared 1500 ms timer that can navigate after unmount (teleport risk via the new replace branch). Deferred as documented follow-up: duplicated paid-handling block, `transaction-new.tsx:832` in-form cancel, and the pre-existing no-exit affordance on `/upgrade` idle/error + legal screens.
- [x] Task 8 — Wallets final head `ff87151`. Spec re-review PASS + quality APPROVED at `3da3498`; polish adds scroll-into-view for the simple-mode create/edit forms and legacy order assertions. Parent rerun `wallets-screen` 30/30 PASS; part of the 6-suite/111-test post-review verification. Visual QA Task11 done; no deploy.
- [x] Task 10 — All gates PASS at `d5cd7a9`: focused 8 suites/182 passed; full mobile 71 suites/568 passed/8 intentional skips/576; workspace type-check exit 0; lint 0 errors (63 pre-existing legacy-web warnings); web Vitest 11/11; PWA export + `check:bundle` 35/35 markers + registry valid + marker sync no-diff; `git diff --check` clean; only pre-existing untracked user artifacts remain.
- [x] Task 11 — COMPLETE: checklist verified at 384×848 in the exported PWA (flag ON, OFF, empty, EN) with captures and probes in `/tmp/kaswise-qa/`. One Critical found and fixed (`d38c7f4` tab bar hidden on Home — re-verified in the rebuilt bundle for both modes), two warnings fixed (`3da3498`, `ff87151`), household/viewer variant only covered by unit tests (fixture limitation), and the `/upgrade` + legal-screen cold-exit gap recorded as follow-up. Full log in the Task 11 execution log section. Post-review commits then verified by an independent reviewer: **APPROVED, no issues** (scope exact per commit, tab-bar resolution correct for every segment case with no nested groups to misclassify, wallets scroll non-disruptive, fallback mapping literal is no longer tautological, upgrade timer genuinely cancelled via `clearPaidExit` + `mountedRef`, focused 6-suite run twice at 111/111 with no order dependence, no secrets).
- [x] Task 12 — CANARY LIVE (user-approved 2026-10-01 21:5x): deployed `d5cd7a9` to the production PWA target with `EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION=true`; live bundle `entry-dced743f07d297f002e3457af0ed6c3a.js` (35/35 markers, marker diff: candidate == live); live readback confirmed 5 tabs (Beranda/Transaksi/Catat/Laporan/Dompet), tab bar visible on Home cold and after returning from Dompet, avatar "Buka pengaturan" → `/settings` command center, Capture hub with destination context, no production writes (all non-GET Supabase traffic blocked). Rollback backup: `/home/Danu88/services/nginx-proxy-manager/rollback-20261001-215933`. Rollout record committed separately as `49c88e0`. Full log in the Task 12 execution log section. Remaining user decision: keep the canary enabled or promote to the default for everyone.

## Task 0: Preserve Baseline and Create an Isolated Implementation Branch

**Objective:** Memastikan redesign tidak mencampur user artifacts atau perubahan lain.

**Files:** Tidak ada source file yang diubah.

**Step 1: Record baseline**

```bash
cd /home/Danu88/apps/kaswise
git status --short
git branch --show-current
git log -1 --oneline
git stash create "pre-kaswise-simple-mode"
```

Expected:
- Snapshot object ID tercetak jika tracked worktree dirty.
- Untracked artifacts tetap ada dan tidak tersentuh.

**Step 2: Create dedicated branch**

```bash
git switch -c feat/kaswise-simple-mode
```

Jika branch sudah ada, checkout branch tersebut; jangan reset branch lain.

**Step 3: Run baseline gates**

```bash
pnpm type-check
pnpm --filter mobile exec jest __tests__/tabs-layout-spacing.test.tsx __tests__/tabs-index.test.tsx __tests__/settings-screen.test.tsx __tests__/capture-envelope-suggestion.test.tsx __tests__/wallets-screen.test.tsx --runInBand --coverage=false
```

Expected: PASS before implementation.

**Commit:** Tidak perlu commit.

---

## Task 1: Add a Safe `simpleNavigation` Feature Flag

**Objective:** Menyediakan rollout switch yang default OFF sehingga production surface tidak berubah sampai canary disetujui.

**Files:**
- Modify: `apps/mobile/src/config/features.ts`
- Modify: `apps/mobile/scripts/deploy-pwa.mjs`
- Test: create `apps/mobile/src/config/features.test.ts` jika belum ada dedicated test; jika ada, extend existing file.

**Step 1: Write failing flag tests**

Test behaviors:

```ts
expect(featureFlags.simpleNavigation).toBe(false);
(globalThis as any).__KASWISE_FEATURE_FLAGS__ = { simpleNavigation: true };
expect(featureFlags.simpleNavigation).toBe(true);
```

Pastikan cleanup global dilakukan di `afterEach`.

**Step 2: Run RED**

```bash
pnpm --filter mobile exec jest src/config/features.test.ts --runInBand --coverage=false
```

Expected: FAIL because `simpleNavigation` does not exist.

**Step 3: Implement minimal flag contract**

Target shape:

```ts
type FeatureOverride = {
  importStatement?: boolean;
  voiceNote?: boolean;
  simpleNavigation?: boolean;
};

export const featureFlags = {
  // existing getters
  get simpleNavigation() {
    return (
      featureOverrides()?.simpleNavigation ??
      flagEnabled(processEnv?.EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION)
    );
  },
};
```

**Step 4: Inject runtime value in PWA deploy**

In `apps/mobile/scripts/deploy-pwa.mjs`, read and inject:

```js
process.env.EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION
```

Do not rely only on the shell environment used during build; it must enter the generated runtime config block beside `EXPO_PUBLIC_FEATURE_VOICE_NOTE`.

**Step 5: Run GREEN**

```bash
pnpm --filter mobile exec jest src/config/features.test.ts --runInBand --coverage=false
pnpm --filter mobile type-check
```

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/mobile/src/config/features.ts apps/mobile/src/config/features.test.ts apps/mobile/scripts/deploy-pwa.mjs
git commit -m "feat(mobile): add simple navigation rollout flag"
```

---

## Task 2: Switch the Five Primary Tabs Under the Flag

**Objective:** Simple Mode menggunakan Home / Transactions / Capture / Reports / Wallets, sementara legacy mode tetap memakai Settings sebagai tab kelima.

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`
- Modify: `apps/mobile/src/i18n/i18n-context.tsx`
- Test: `apps/mobile/__tests__/tabs-layout-spacing.test.tsx`

**Step 1: Write failing navigation tests**

Add two external-behavior cases:

1. Flag OFF → visible screens remain `index, transactions, capture, reports, settings`.
2. Flag ON → visible screens become `index, transactions, capture, reports, wallets`, while `settings.options.href === null`.

Mock shape:

```ts
let mockSimpleNavigation = false;

jest.mock("../src/config/features", () => ({
  featureFlags: {
    get simpleNavigation() {
      return mockSimpleNavigation;
    },
  },
}));
```

**Step 2: Run RED**

```bash
pnpm --filter mobile exec jest __tests__/tabs-layout-spacing.test.tsx --runInBand --coverage=false
```

Expected: Simple Mode case FAILS because Settings is still visible.

**Step 3: Implement conditional routes**

Required behavior:

- `PRIMARY_TAB_ROUTES` is derived from flag inside `TabsLayout`, not frozen at module import.
- Settings options:
  - Simple Mode: `href: null`, hidden route with back header.
  - Legacy: primary tab with settings icon.
- Wallet options:
  - Simple Mode: visible primary tab, `headerShown: false`, wallet icon, localized label.
  - Legacy: hidden route with existing back header.

Add translations:

```ts
tabWallets: "Dompet" // id
tabWallets: "Wallets" // en
```

Do not rename route files.

**Step 4: Run GREEN**

```bash
pnpm --filter mobile exec jest __tests__/tabs-layout-spacing.test.tsx --runInBand --coverage=false
pnpm --filter mobile type-check
```

Expected: PASS in both flag states.

**Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\)/_layout.tsx apps/mobile/src/i18n/i18n-context.tsx apps/mobile/__tests__/tabs-layout-spacing.test.tsx
git commit -m "feat(mobile): make wallets the fifth simple-mode tab"
```

---

## Task 3: Make the Home Profile Control the Settings Entrypoint

**Objective:** Settings tetap mudah ditemukan setelah keluar dari tab bar.

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Test: `apps/mobile/__tests__/tabs-index.test.tsx`

**Step 1: Write failing behavior tests**

Test Indonesian and accessibility behavior:

```ts
const profile = screen.getByLabelText("Buka pengaturan");
expect(profile.props.accessibilityRole).toBe("button");
fireEvent.press(profile);
expect(mockPush).toHaveBeenCalledWith("/(tabs)/settings");
```

Optionally add English case if language helper already exists:

```ts
"Open settings"
```

**Step 2: Run RED**

```bash
pnpm --filter mobile exec jest __tests__/tabs-index.test.tsx -t "opens Settings" --runInBand --coverage=false
```

Expected: FAIL because `home-avatar` is currently a `View`.

**Step 3: Implement minimal control**

- Replace avatar wrapper `View` with `Pressable`.
- Keep `testID="home-avatar"`, current styles, image/avatar/initial rendering.
- Add `accessibilityRole="button"`, localized accessibility label, `hitSlop={12}`.
- Navigate to `/(tabs)/settings`.
- Do not add a duplicate gear icon; avatar is the settings/profile affordance.

**Step 4: Run GREEN**

```bash
pnpm --filter mobile exec jest __tests__/tabs-index.test.tsx --runInBand --coverage=false
```

Expected: existing avatar/photo tests and new navigation test all PASS.

**Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx apps/mobile/__tests__/tabs-index.test.tsx
git commit -m "feat(mobile): open settings from the home profile control"
```

---

## Task 4: Build a Reusable Settings Command-Center Row

**Objective:** Menghindari ad-hoc card markup dan membuat Settings mudah dipindai.

**Files:**
- Create: `apps/mobile/src/components/settings/SettingsNavigationRow.tsx`
- Create: `apps/mobile/src/components/settings/SettingsSection.tsx`
- Test: create `apps/mobile/src/components/settings/SettingsNavigationRow.test.tsx`

**Public interface:**

```ts
type SettingsNavigationRowProps = {
  testID: string;
  icon: KaswiseIconName;
  title: string;
  description?: string;
  badge?: string;
  onPress: () => void;
};

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};
```

**Step 1: Write failing component tests**

Test observable behavior:
- renders title and description;
- has button role and accessible label;
- fires `onPress` once;
- touch target has `minHeight >= 56` after `StyleSheet.flatten`.

**Step 2: Run RED**

```bash
pnpm --filter mobile exec jest src/components/settings/SettingsNavigationRow.test.tsx --runInBand --coverage=false
```

Expected: FAIL because component does not exist.

**Step 3: Implement using Kaswise identity**

- White/paper surface.
- Blue/ink icon bubble.
- One line title, max two lines helper.
- Chevron on right.
- No Moonveo color or pixel layout copying.

**Step 4: Run GREEN**

```bash
pnpm --filter mobile exec jest src/components/settings/SettingsNavigationRow.test.tsx --runInBand --coverage=false
```

**Step 5: Commit**

```bash
git add apps/mobile/src/components/settings/SettingsNavigationRow.tsx apps/mobile/src/components/settings/SettingsSection.tsx apps/mobile/src/components/settings/SettingsNavigationRow.test.tsx
git commit -m "feat(mobile): add settings command-center primitives"
```

---

## Task 5: Reorganize Settings into Four Scannable Groups

**Objective:** Mengubah Settings dari halaman panjang menjadi command center tanpa menghapus fungsi.

**Files:**
- Modify: `apps/mobile/app/(tabs)/settings.tsx`
- Modify: `apps/mobile/__tests__/settings-screen.test.tsx`
- Reuse: `apps/mobile/src/components/settings/SettingsNavigationRow.tsx`

**Required grouping:**

### A. Keuangan

- Compact `FinanceContextSwitcher` / active money-space summary at the top so users know whether the following tools will operate on Personal or Household data.
- `Dompet & akun` → `/(tabs)/wallets`
- `Kategori & anggaran` → `/(tabs)/budgets`
- `Tagihan & pengingat` → `/(tabs)/bills`
- `Import rekening koran` → `/(tabs)/imports`, shown only when rollout policy permits; otherwise hidden or clearly disabled, never misleading.

### B. Keluarga

- `Pusat keluarga` → `/(tabs)/groups`
- Existing personal/household context behavior remains elsewhere; do not duplicate context state inside Settings.

### C. Aplikasi

- Notification inbox → `/notifications` while notification preferences remain inline.
- Notifications
- Language
- Appearance/theme
- Plan/upgrade

### D. Account & support

- Profile/photo/avatar
- Password/security
- Legal/support
- Account deletion
- Logout

**Step 1: Extend settings tests**

Assert:
- four group headings render;
- active finance space is visible before finance commands;
- each navigation row routes correctly;
- all existing language/theme/profile/security/legal/logout tests remain valid;
- import row honors `featureFlags.importStatement`;
- notification inbox routes to `/notifications`, while notification preferences stay inline;
- route labels work in ID and EN.

Important existing-test correction: `apps/mobile/__tests__/settings-screen.test.tsx` currently asserts that finance quick-access rows such as Dompet, Anggaran, Tagihan, and Import are absent. Replace that obsolete assertion intentionally with command-center navigation assertions; do not add a second contradictory test.

**Step 2: Run RED**

```bash
pnpm --filter mobile exec jest __tests__/settings-screen.test.tsx --runInBand --coverage=false
```

Expected: new group/route assertions FAIL.

**Step 3: Implement only presentation regrouping**

- Do not rewrite account deletion, notification mutation, seed utilities, auth, or entitlement logic.
- Use extracted row/section components.
- Existing test IDs for critical workflows must stay stable.
- Seed/demo utilities should move into a low-emphasis `Developer / Demo data` section and remain gated as currently intended.

**Step 4: Run GREEN**

```bash
pnpm --filter mobile exec jest __tests__/settings-screen.test.tsx --runInBand --coverage=false
pnpm --filter mobile type-check
```

**Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\)/settings.tsx apps/mobile/__tests__/settings-screen.test.tsx
git commit -m "feat(mobile): turn settings into a finance command center"
```

---

## Task 6: Simplify Home into a Calm Financial Cockpit

**Objective:** Beranda menjawab tiga pertanyaan saja: saldo berapa, bulan/periode ini bagaimana, dan apa yang perlu diperhatikan.

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/__tests__/tabs-index.test.tsx`
- Possibly modify: `apps/mobile/scripts/live-feature-registry.json` only if markers intentionally change.

**Simple Mode hierarchy:**

1. Greeting + notification + profile/settings.
2. Finance context switcher.
3. Hero:
   - total balance;
   - active period;
   - remaining/deficit;
   - monthly/period expense;
   - privacy toggle.
4. One consolidated `Perlu perhatian` rail before routine history:
   - review-required takes priority;
   - budget alerts may appear as a second concise row;
   - section is omitted when neither exists.
5. Recent transactions: maximum three visible rows, CTA `Semua`.

**Explicit removals in Simple Mode:**

- Remove `Kelola dompet` from hero because Wallet is now a primary tab.
- Do not add a quick-action grid; the visually dominant center Capture tab already owns transaction entry.
- Show at most two concise exception rows inside one attention section, never separate competing alert cards.
- Do not add charts to Home; charts remain in Reports.
- Pertahankan decorative wallet-card stack pada implementasi awal. Nilai ulang setelah visual QA; hapus hanya jika terbukti membuat hero terlalu padat, mengganggu hierarchy, atau menduplikasi informasi tanpa membantu identitas Kaswise.
- Make expense copy period-aware: `Pengeluaran bulan ini` for current month and `Pengeluaran periode ini` for saved/custom periods.
- Localize `FinanceContextSwitcher` caption from the hardcoded `Profile` to `Ruang uang` / `Money space`.

**Step 1: Write failing tests**

Test Simple Mode behavior only:
- profile settings control exists;
- only three recent transactions render;
- wallet manage CTA absent from hero;
- one attention wrapper maximum with at most two exception rows;
- custom report periods use period-aware expense copy;
- decorative wallet stack tetap tampil dan tidak mengganggu keterbacaan balance/period metrics;
- finance context test remains intact.

Legacy flag OFF tests must continue to pass.

**Step 2: Run RED**

```bash
pnpm --filter mobile exec jest __tests__/tabs-index.test.tsx --runInBand --coverage=false
```

**Step 3: Implement as conditional presentation**

Do not duplicate data fetching. Derive presentation from existing state:

```ts
const recentItems = featureFlags.simpleNavigation
  ? transactions.slice(0, 3)
  : transactions;

const attentionItems = [
  reviewSummary?.count ? "review" : null,
  primaryEnvelopeAlert ? "budget" : null,
].filter(Boolean).slice(0, 2);
```

Prefer extracting a small `HomeAttentionSection` presentational component only if `index.tsx` becomes harder to read; do not create an abstract dashboard framework.

**Step 4: Run GREEN**

```bash
pnpm --filter mobile exec jest __tests__/tabs-index.test.tsx --runInBand --coverage=false
pnpm --filter mobile type-check
```

**Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx apps/mobile/__tests__/tabs-index.test.tsx apps/mobile/scripts/live-feature-registry.json apps/mobile/scripts/required-markers.json
git commit -m "feat(mobile): simplify home around balance capture and attention"
```

Only stage registry files if they actually changed.

---

## Task 7: Make Capture an Action-First Kaswise Hub

**Objective:** Mempermudah pemilihan input tanpa mengubah transaction creation semantics.

**Files:**
- Modify: `apps/mobile/app/(tabs)/capture.tsx`
- Modify: `apps/mobile/__tests__/capture-envelope-suggestion.test.tsx`
- Modify: `apps/mobile/__tests__/capture-gating.test.tsx`
- Possibly modify: `apps/mobile/__tests__/voice-intake.test.ts`

**Simple Mode presentation:**

- Header: `Catat transaksi` / `Add transaction`.
- Short promise: `Pilih cara tercepat. Kaswise rapikan sisanya.`
- Large primary options:
  - Voice when `voiceNote=true`;
  - Text;
  - Photo/receipt.
- Secondary actions:
  - Manual detail → `/(tabs)/transaction-new`;
  - Import statement → `/(tabs)/imports` only when flag enabled.
- Once a mode is selected, show only that mode’s active form/preview; do not stack all mode explanations.
- Render one mutually exclusive workspace state at a time:
  1. idle/input;
  2. processing;
  3. extracted review;
  4. success;
  5. error/retry.
- Show a compact destination row above the active input with active money space and selected wallet. Reuse `FinanceContextSwitcher`; do not create parallel context state.
- Receipt flow must be `Pilih foto → automatic processing → extracted review → Simpan transaksi`. Retire the duplicate manual `capture-receipt-process` action; retry belongs in the error state.

**Behavior that must not change:**

- `getCaptureModes()` and voice gating semantics.
- Photo entitlement limits.
- Receipt upload fallback on RLS error.
- Preview/confirm before saving image and voice transactions.
- Active finance context and selected wallet.
- Envelope suggestion/allocation behavior.

**Step 1: Write failing UI behavior tests**

Add tests for:
- action cards and accessibility labels;
- manual route;
- import route only when enabled;
- disabled voice never renders voice action;
- selected mode only renders its relevant panel;
- `capture-input` is absent while processing, review, or success workspace is active;
- destination visibly identifies Personal/Household context and selected wallet;
- receipt selection does not expose both process and confirm actions;
- success CTA says `Catat transaksi lain`, not `Langsung simpan`;
- no text containing `Moonveo/Monveo` in product UI.

**Step 2: Run RED**

```bash
pnpm --filter mobile exec jest __tests__/capture-envelope-suggestion.test.tsx __tests__/capture-gating.test.tsx --runInBand --coverage=false
```

**Step 3: Implement presentation changes**

Use existing finance-editorial tokens and Kaswise icon registry. Do not copy Moonveo’s black/teal styling or wording.

Support optional entry search param for quick actions:

```ts
?mode=text
?mode=photo
?mode=voice
```

Validate unknown values and fall back to `getDefaultCaptureMode`.

Recommended stable IDs:

```text
capture-workspace-idle
capture-workspace-review
capture-destination
capture-wallet-selector
capture-wallet-${wallet.id}
capture-text-submit
capture-success-review
capture-success-new
capture-error-retry
```

**Step 4: Run GREEN**

```bash
pnpm --filter mobile exec jest __tests__/capture-envelope-suggestion.test.tsx __tests__/capture-gating.test.tsx __tests__/voice-intake.test.ts --runInBand --coverage=false
pnpm --filter mobile type-check
```

**Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\)/capture.tsx apps/mobile/__tests__/capture-envelope-suggestion.test.tsx apps/mobile/__tests__/capture-gating.test.tsx apps/mobile/__tests__/voice-intake.test.ts
git commit -m "feat(mobile): simplify capture into an action-first hub"
```

---

## Task 8: Polish Wallets as a Primary Destination

**Objective:** Membuat tab Wallet terasa layak sebagai destinasi utama tanpa menciptakan domain baru yang belum didukung backend.

**Files:**
- Modify: `apps/mobile/app/(tabs)/wallets.tsx`
- Modify: `apps/mobile/__tests__/wallets-screen.test.tsx`

**Simple Mode hierarchy:**

1. Total balance hero.
2. Scope/context label (Personal or Household).
3. Active wallet count.
4. Wallet/account list.
5. Add wallet CTA.
6. Filters become secondary horizontal controls or sheet; do not dominate first viewport.

**Required constraints:**

- Existing create/edit/delete behavior remains.
- Balance is read-only and transaction-managed.
- `useFocusEffect` and realtime refresh remain.
- Household permissions continue to control create/edit actions.
- Do not add `Fixed Assets`, `Money Owed`, or `Debt` cards until real services/schema exist.

**Step 1: Extend wallet tests**

Test:
- primary hero and active count;
- active finance context label;
- create/edit/delete remain functional;
- direct balance editing remains unavailable;
- viewer/permission state remains respected.

**Step 2: Run RED**

```bash
pnpm --filter mobile exec jest __tests__/wallets-screen.test.tsx --runInBand --coverage=false
```

**Step 3: Implement presentation only**

Retain existing service calls and database invariants. Remove visual density, not capability.

**Step 4: Run GREEN**

```bash
pnpm --filter mobile exec jest __tests__/wallets-screen.test.tsx --runInBand --coverage=false
pnpm --filter mobile type-check
```

**Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\)/wallets.tsx apps/mobile/__tests__/wallets-screen.test.tsx
git commit -m "feat(mobile): promote wallets as a primary finance destination"
```

---

## Task 9: Protect Route, Motion, and Live Marker Contracts

**Objective:** Menjaga hidden route/deep link, motion identity, dan production bundle checks tetap valid.

**Files:**
- Modify if necessary: `apps/mobile/__tests__/motion-all-screens-coverage.test.ts`
- Modify if necessary: `apps/mobile/__tests__/screen-shells.test.tsx`
- Modify if necessary: `apps/mobile/scripts/live-feature-registry.json`
- Regenerate if necessary: `apps/mobile/scripts/required-markers.json`

**Step 1: Add route contract assertions**

Verify:
- `settings`, `budgets`, `bills`, `groups`, `imports`, `transaction-new` remain registered;
- Simple Mode only changes tab-bar visibility;
- PageEntrance/Staggered coverage remains on all routes;
- stable keys remain on conditional sections.
- cold deep links to hidden routes have a safe back fallback: use `router.back()` when history exists, otherwise `router.replace("/(tabs)/settings")` or the relevant primary route;
- public PWA paths `/settings`, `/wallets`, `/budgets`, `/bills`, `/groups`, `/imports`, `/notifications`, and `/transaction-new` remain valid;
- notification payload targets are not changed in this phase.

**Step 2: Run tests**

```bash
pnpm --filter mobile exec jest __tests__/tabs-layout-spacing.test.tsx __tests__/motion-all-screens-coverage.test.ts __tests__/screen-shells.test.tsx --runInBand --coverage=false
```

**Step 3: Synchronize live markers only if intentional IDs changed**

```bash
pnpm --filter mobile sync:required-markers
pnpm --filter mobile verify:live-registry
```

Never delete a critical marker just to make the validator pass. Update the source registry with its replacement and preserve equivalent user behavior.

**Step 4: Commit**

```bash
git add apps/mobile/__tests__/motion-all-screens-coverage.test.ts apps/mobile/__tests__/screen-shells.test.tsx apps/mobile/scripts/live-feature-registry.json apps/mobile/scripts/required-markers.json
git commit -m "test(mobile): protect simple-mode route and marker contracts"
```

Only stage files that changed.

---

## Task 10: Run Full Deterministic Gates

**Objective:** Membuktikan redesign tidak merusak mobile, legacy web, type safety, atau PWA export.

**Files:** No source changes unless fixing genuine regressions.

**Step 1: Focused regression**

```bash
pnpm --filter mobile exec jest \
  __tests__/tabs-layout-spacing.test.tsx \
  __tests__/tabs-index.test.tsx \
  __tests__/settings-screen.test.tsx \
  __tests__/capture-envelope-suggestion.test.tsx \
  __tests__/capture-gating.test.tsx \
  __tests__/wallets-screen.test.tsx \
  __tests__/imports-screen.test.tsx \
  __tests__/motion-all-screens-coverage.test.ts \
  --runInBand --coverage=false
```

Expected: all PASS.

**Step 2: Full mobile suite**

Run as a background process in Telegram/Hermes environments:

```bash
pnpm --filter mobile test -- --runInBand --coverage=false
```

Expected baseline target: `67 suites / 439 tests` or higher, all PASS. If test count changes, explain exactly why.

**Step 3: Workspace gates**

```bash
pnpm type-check
pnpm lint
pnpm --filter web test
pnpm --filter mobile verify:live-registry
```

Expected:
- Type-check PASS.
- Lint exits 0; existing legacy-web warnings may remain but no new errors/warnings in touched files.
- Web Vitest PASS.
- Registry PASS.

**Step 4: PWA export and bundle checks**

Run as background process:

```bash
EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION=true pnpm --filter mobile export:pwa
pnpm --filter mobile check:bundle
```

Expected: export and marker checks PASS.

**Step 5: Diff hygiene**

```bash
git diff --check
git status --short
git diff --stat
```

Expected:
- no whitespace errors;
- only intended tracked files changed;
- pre-existing untracked user artifacts remain untouched.

---

## Task 11: Perform Visual QA at Real Mobile Width

**Objective:** Memastikan hasil benar-benar lebih sederhana, bukan hanya lulus test.

**Files:** No source changes unless visual defects are found.

**Required screenshots:**

Flag OFF:
- Home baseline.

Flag ON:
- Home populated.
- Home empty state.
- Capture text.
- Capture photo.
- Capture voice if enabled.
- Wallet personal.
- Wallet household/viewer if fixture supports it.
- Settings top and command-center groups.

**Viewport:** At least 384×848 to match the supplied reference recording’s mobile class.

**Visual QA checklist:**

- [x] Exactly five primary tabs — verified in the exported bundle and on live `app.kaswise.com`: Beranda, Transaksi, Catat, Laporan, Dompet (legacy build: …Setelan).
- [x] Center Capture action is visually dominant but not oversized — visual QA at 384×848, both flag modes.
- [x] Settings is discoverable from avatar/profile — live click on the `Buka pengaturan` avatar control navigates to `/settings` (command center renders; verified pre- and post-promotion).
- [x] No screen shows two competing primary CTAs — reviewed in Home, Capture, Wallets, Settings captures (simple + legacy).
- [x] No duplicated Wallet/Settings navigation affordance — Settings is reachable only from the avatar in Simple Mode; the fifth tab is Wallets; legacy keeps Settings as the tab with wallets hidden.
- [x] Home first viewport answers balance, period status, and next action — balance + active period verified in the built and live PWA. Caveat: the "next action" attention rail only renders when review/budget alerts exist, which the mock fixtures do not produce; its rendering path is covered by unit tests, not by a visual capture.
- [x] Decorative wallet stack tetap dipertahankan pada kandidat awal; keputusan menghapusnya hanya boleh dibuat setelah perbandingan screenshot before/after dan persetujuan user — stack still present in every capture; removal not performed and remains an open user decision by design.
- [x] Text is readable with no clipping in Indonesian and English — checked in ID, EN, and empty-state captures at 384×848.
- [x] Touch targets are at least 44px — primary controls verified tappable in the live PWA (avatar 40×40 visual + `hitSlop` from the Task 2/3 code review; tab bar items 69×52). INFO: the two icon buttons in the Home header render 34×34 visually and rely on `hitSlop` for the 44px target — worth a device-level re-check in a later pass.
- [x] Kaswise blue/ink/paper identity is intact — palette unchanged across all captures.
- [x] No Moonveo logo, wording, palette, or pixel-level composition appears — verified visually and by the `/Moonveo|Monveo/i` test guard in the capture suite.
- [x] Household context is visible and permissions remain honest — `Konteks: Pribadi` (and the household alternative) renders, wallet create/edit stays permission-gated, and balance stays read-only. Caveat: the household/viewer variant was not captured visually because the fixtures have no household rows; it is covered by unit tests only.
- [x] No fake assets/debt/recurring features appear — no Fixed Assets / Money Owed / Debt cards in the built or live app.

**Severity:**
- Critical: broken route, unreadable content, hidden primary action, permission leak.
- Warning: density, inconsistent spacing, duplicated helper copy.
- Info: optional polish.

Every Critical issue must be fixed and screenshots repeated.

### Task 11 execution log (2026-10-01, source review at `d5cd7a9`)

Harness: exported PWA (`pnpm --filter mobile export:pwa`), served statically, Chromium/Playwright at **384×848** with a mocked Supabase session and fixture rows (wallets, transactions, budgets, bills, profile). Simple mode activated by injecting the same runtime flag block `deploy-pwa.mjs` writes (`EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION`). Captures and probes live in `/tmp/kaswise-qa/`; the user's `theme-preview/` screenshots were never touched. Each screen captured with flag ON, flag OFF (baseline), empty-data ON, and ON in English.

| Checklist item | Result | Evidence |
| --- | --- | --- |
| Exactly five primary tabs | PASS | `aria-label` list on `/` — ON: Beranda, Transaksi, Catat, Laporan, **Dompet**; OFF: …**Setelan** |
| Center Capture action dominant but not oversized | PASS | capture screenshot: single primary "Simpan transaksi", 3 large mode options, no competing CTA |
| Settings discoverable from avatar/profile | PASS | Home header avatar → `/(tabs)/settings` (Task 3, covered by tests + DOM check) |
| No screen shows two competing primary CTAs | PASS | Home, Capture, Wallets, Settings captures |
| No duplicated Wallet/Settings navigation affordance | PASS | Home has no "Kelola dompet" link under the flag; goal link kept for legacy only |
| Home first viewport answers balance, period, next action | PASS | Total saldo + "Periode aktif: Okt 2026" + Sisa/Pengeluaran cards; attention rail renders only when an alert exists |
| Decorative wallet stack retained | PASS | Rendered with populated fixture ("KASWISE / 2 dompet aktif"); removal still requires explicit user approval |
| No clipping, ID and EN | PASS | ID + EN captures of Home/Capture/Wallets/Settings; no truncated strings |
| Touch targets ≥ 44 px | PASS | measured: tab bar 52, wallet CTA 52, filter chips 44, action buttons 44 |
| Kaswise blue/ink/paper identity intact | PASS | palette unchanged in all captures |
| No Moonveo logo/wording/palette | PASS | no Moonveo/Monveo string in product UI; visual composition independent |
| Household context visible, permissions honest | PARTIAL | Personal context verified; household/viewer variant not exercised (fixture lacks household rows) — covered by unit tests instead |
| No fake assets/debt/recurring features | PASS | no Fixed Assets / Money Owed / Debt cards anywhere |
| Content not permanently hidden behind the floating tab bar | PASS | overlap probe after scrolling to bottom on Home/Wallets/Transactions/Reports: zero overlaps in both flag modes |

**Critical issue found and fixed:** on the Home route the floating tab bar rendered `display: none` (measured: height 0 at `/`, cold and after warm tab-click; `flex`/52 px on `/wallets/`), because `useSegments()` ends with the group segment `"(tabs)"` for the index route and `primaryTabRoutes` did not match it. Pre-existing in baseline `abe9a66`, but made critical by the redesign (Home is the anchor screen). Fixed in `d38c7f4` (`!lastSegment || /^\(.*\)$/.test(lastSegment) ? "index" : lastSegment`), verified in the rebuilt bundle: `/` now reports `flex`, height 52, top 780, five tabs, in both flag modes.

**Warnings (fixed during QA):** simple-mode wallet create/edit forms opened below the fold with no scroll-into-view (`ff87151`); wallet legacy loading/error/empty states were dropped by the earlier Task 8 commit (`3da3498`).

**Info/deferred:** `/upgrade` idle/error phases and the legal screens (`help/terms/privacy/contact/account-deletion`) still have no in-app exit when opened cold from the PWA — pre-existing, same failure class as the Task 9 fallbacks, recorded as follow-up.

---

## Task 12: Canary Rollout, Readback, and Final Commit Hygiene

**Objective:** Mengaktifkan Simple Mode secara aman setelah local gates dan visual QA lulus.

**Prerequisite:** Explicit user approval before deploy or production flag change.

**Step 1: Build exact clean commit**

Use a clean worktree pinned to the candidate commit. Do not deploy from the dirty development worktree.

**Step 2: Canary with flag ON**

Set:

```bash
EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION=true
```

Ensure deploy runtime injection contains the same value.

**Step 3: Verify live state**

- Open the real Kaswise PWA origin.
- Confirm exact JS bundle filename matches candidate export.
- Confirm five visible tabs are Home / Transactions / Capture / Reports / Wallets.
- Open Settings from avatar.
- Open Wallet tab and return to Home.
- Verify Capture text/photo workflow without writing production data unless a dedicated test account is used.
- Read back required marker count and release report.

**Step 4: Rollback criterion**

Disable `EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION` if any of these occur:
- Settings unreachable;
- wallet route fails in personal or household context;
- auth/deep links regress;
- capture input no longer preserves context;
- live bundle marker mismatch.

**Step 5: Commit any rollout-only config separately**

```bash
git commit -m "chore(mobile): enable simple navigation canary"
```

Do not mix rollout config with UI source commits.

### Task 12 execution log (2026-10-01, canary enabled)

**User approval:** "Lanjut deploy canary dengan flag On + readback live" (explicit consent recorded before any production change).

**Release candidate:** `d5cd7a9` + rollout record `49c88e0`. Source verified as the exact candidate with no tracked modifications (`git rev-parse HEAD` == `d5cd7a9`, `git status --porcelain` shows only the pre-existing untracked user artifacts).

**Backup / rollback points:** `/home/Danu88/services/nginx-proxy-manager/rollback-20261001-215933/` holds `index.html.prev`, `manifest.json.prev`, `previous-entry-bundle.txt` (`entry-1ea9e3c2d30cdfa42b32f64a77c37e8c.js`), and `deployed-at.txt`. Deploy is additive — the previous bundle and assets stay on disk, so rollback is a file restore:

```bash
BK=/home/Danu88/services/nginx-proxy-manager/rollback-20261001-215933
TARGET=/home/Danu88/services/nginx-proxy-manager/placeholder
cp "$BK/index.html.prev" "$TARGET/index.html"
for r in login register forgot-password reset-password auth/callback help terms privacy contact account-deletion notifications upgrade transactions transaction-new capture wallets budgets bills reports groups imports settings; do cp "$BK/index.html.prev" "$TARGET/$r/index.html"; done
# then hard-reload the PWA (or bump the service worker) and re-run: KASWISE_LIVE_URL=https://app.kaswise.com/ node apps/mobile/scripts/verify-live-url.mjs
```

**Deploy:** `SKIP_LIVE_QUALITY=1 ALLOW_NON_PROD_BRANCH=1 EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION=true KASWISE_PWA_TARGET=/home/Danu88/services/nginx-proxy-manager/placeholder KASWISE_LIVE_URL=https://app.kaswise.com/ corepack pnpm --filter mobile deploy:pwa` → "Deployed mobile PWA dist", target bundle markers 35/35, marker diff "candidate and live are the same bundle", live URL verify pass, release report generated.

**Two tooling pitfalls found (follow-up work):**

1. `deploy:pwa` runs its `predeploy` → `quality:live` (registry, type-check, Jest live-regression, export, bundle check) **with the canary env var still set**, so the Jest gate renders the app in Simple Mode and every legacy-copy assertion fails (10 failures in `capture-envelope-suggestion.test.tsx` expecting "Langsung simpan" while the UI rendered the Simple-Mode promise). The same gates run clean without the flag at the same commit (full suite 71/71, focused 8/8, type-check, export, 35/35 markers) — the gate must validate source, not the rollout flag. Recommended fix: strip `EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION`/`EXPO_PUBLIC_FEATURE_VOICE_NOTE` from the child env inside `runLiveQualityGate()`, or move the runtime-injection flag read out of `process.env` for gate purposes. Workaround used here: run the gates separately at the identical commit, then deploy with `SKIP_LIVE_QUALITY=1` so the injection still carries the flag.
2. A clean `git worktree` build is not possible with symlinked `node_modules`: tests and `tsc` pass, but Metro cannot resolve `expo-router/entry.js` through the symlink (`Unable to resolve module ./../../home/Danu88/...`). The release build was therefore produced from the main checkout, pinned to the exact candidate commit with an empty tracked diff. If a strict isolated-worktree build is required, install dependencies inside the worktree instead of symlinking.

**Live readback (https://app.kaswise.com, 384×848, Supabase traffic mocked with writes blocked):**

- Injected runtime flag: `EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION = "true"` (confirmed in the served HTML).
- Live bundle `entry-dced743f07d297f002e3457af0ed6c3a.js` — identical to the candidate export; 35/35 registry markers present live.
- Primary tabs on `/`: `Beranda, Transaksi, Catat, Laporan, Dompet` (5) with the tab bar rendered (`display: flex`, 52 px) — the Task 11 Critical fix confirmed in production.
- Cold open of `/` keeps the tab bar; returning from `/wallets/` via the Dompet → Beranda tab click lands on `/` with the bar still visible.
- Home avatar control `Buka pengaturan` → navigates to `/settings`; the Settings command center renders Keuangan (Ruang uang context + Dompet & akun, Kategori & anggaran, Tagihan & pengingat), Keluarga (Pusat Keluarga), Aplikasi (Kotak masuk notifikasi + PREFERENSI NOTIFIKASI toggles).
- `/wallets/` renders hero total → `Konteks: Pribadi` → `2 akun aktif` → wallet list.
- `/capture/` renders the action hub with the destination context row and the Teks/Foto options; no production data was written (non-GET Supabase requests were blocked at the network layer).
- Out of scope for this readback: real household/viewer context (needs a live household account), voice mode (flag off in production), and a real authenticated capture save (deliberately not performed against production data).

**Rollback trigger (unchanged):** Settings unreachable, a wallet route failing in either context, auth/deep-link regression, capture losing context, or a live bundle marker mismatch → restore the backup above and verify the live bundle returns to `entry-1ea9e3c2…`.

### Task 12 follow-ups — (a) deploy-gate fix, (b) promotion to default

**Pitfall 1 fixed — `82d922d` `fix(mobile): keep rollout flags out of the pre-deploy quality gate`.** New `apps/mobile/scripts/rollout-flags.cjs` (`ROLLOUT_FLAG_ENV_KEYS`, `stripRolloutFlagsFromEnv`) and `deploy-pwa.mjs:93` now runs the pre-deploy gate as `run('pnpm quality:live', { env: stripRolloutFlagsFromEnv(process.env) })`, so the gate validates source instead of the rollout flag, while the runtime-injection path still reads the raw value. Parent verification: `__tests__/rollout-flags.test.ts` + capture suites 35/35 PASS, `node --check` OK. Root cause was reproduced by the worker (flag set → exactly the 10 reported `capture-envelope-suggestion` failures; flag stripped → 144/144).

**Promotion (b) — `8557262` + `fb9f466` + rollout record `cfc2665`.** Tooling commit adds `ROLLOUT_CONFIG_PATH`, `readRolloutConfig()` (never throws; `{}` on missing/invalid/non-object) and `resolveRolloutFlagValue()` with precedence **process.env → `.env` → committed rollout config → `''`**, plus boolean→string coercion; `publicRuntimeConfigBlock()` now resolves `simpleNavigation`, `voiceNote`, and `importStatement` through it. Rollout-config commit adds `apps/mobile/rollout-flags.json` = `{ "simpleNavigation": true }` — kept separate from the tooling commit, one-line revertible, and the CODE default in `src/config/features.ts` stays OFF so dev/test keep exercising legacy. Independent check: env absent → `"true"`; `EXPO_PUBLIC_FEATURE_SIMPLE_NAVIGATION=false` → `"false"` (operator override / rollback proven); `voiceNote` and `importStatement` stay `""`. Note: the deploy script previously did not inject `IMPORT_STATEMENT` at all; it now resolves to `''` when unset, which is behavior-identical to the code default OFF and additionally honours an explicit env override.

**Promotion deploy (no env flag — the committed config is the only source):** full pre-deploy gate PASSED this time (10 suites / 144 tests, the same suite that failed 10 assertions before the gate fix), deploy verified: target markers 35/35, marker diff "candidate and live are the same bundle", live URL references `entry-dced743f07d297f002e3457af0ed6c3a.js`, 35/35 markers live. Live injected block now reads `VOICE_NOTE = ""`, `SIMPLE_NAVIGATION = "true"`, `IMPORT_STATEMENT = ""`. Post-promotion readback: 5 tabs (Beranda/Transaksi/Catat/Laporan/Dompet) with the tab bar visible, wallet context intact, and the Home avatar `Buka pengaturan` → `/settings` still works (no rollback trigger). Rollback for the promoted state: set the env var to `false` at deploy time (or flip `rollout-flags.json` to `false` and redeploy); full legacy restore remains the `rollback-20261001-215933` backup.

### Penutupan 3 titik cakupan QA + kriteria "touch target ≥44px" (2026-10-02, deploy `8fb683a`)

Tiga titik yang sebelumnya diakui sebagai cakupan parsial kini ditutup dan diverifikasi, lalu seluruh pekerjaan dideploy ke produksi:

1. **Rail next-action Home — SELESAI & terverifikasi visual.** Dengan fixture alert (2 transaksi perlu dicek + envelope over-budget), viewport pertama Home menampilkan saldo, "Periode aktif: Okt 2026", "2 transaksi perlu dicek → Cek sekarang", "Makan & Minum lewat budget — Lewat Rp150.000 sampai 31/10 → Lihat", lalu "Terakhir"; tanpa clipping.
2. **Touch target ≥44px — SELESAI, diukur di produksi, 0 temuan.** `hitSlop` terbukti TIDAK berlaku di build web/PWA, jadi perbaikan dilakukan di layout. Enam commit: `ab69d80` Home (bell, avatar, hide-amounts, "Semua →"), `f293699` Reports (Bagikan, 3 tab chip, 5 period chip), `5c23992` Groups (2 tombol), `52635ca` Notifications (back + retry), `fca6516` Capture (chip dompet), `8fb683a` Settings ("Ubah foto profil" 93×14 dan "Upgrade ke Premium" 162×42). Pola seragam: `Pressable` menjadi kotak transparan ≥44×44, gaya pill/chip/switch dipindah ke `View` dalam sehingga warna/radius/label tidak berubah.
3. **Konteks household/viewer — SELESAI + residu ditutup.** Add-CTA sudah benar; residu Edit/Hapus per-kartu ditutup di `8671388` memakai sinyal `canCreate` dari `useFinanceContext()` (`personal` ATAU `role !== "viewer"`), dengan `disabled` + `accessibilityState={{ disabled: true }}` + gaya pudar. **Keputusan sadar:** gate ini berbasis konteks aktif (sama seperti add-CTA), sehingga viewer yang sedang berada di konteks keluarga tidak bisa mengedit dompet pribadinya dari layar itu dan perlu berpindah ke konteks Pribadi (satu ketukan). Alternatif per-kartu lebih presisi tetapi menyimpang dari pola yang sudah ada; dicatat sebagai kandidat revisi.

**Verifikasi kuantitatif (probe area tap nyata + kepemilikan titik tengah + tumpang-tindih antar elemen interaktif, menelusuri seluruh halaman):**

| Permukaan | Kontrol diperiksa | <44px | Center "dicuri" | Tumpang-tindih |
| --- | --- | --- | --- | --- |
| 10 rute (Home, Settings, Reports, Groups, Notifications, Capture, Transactions, Budgets, Bills, Wallets) — build lokal flag ON | 99 | 0 | 0 | 0 |
| 10 rute yang sama di produksi (`8fb683a`) | 99 | 0 | 0 | 0 |

Cek visual pada build baru: Home (greeting tetap satu baris, bell + avatar rapi, "Semua →" rata kanan), Settings (kartu profil, "Ubah Foto Profil", section AKUN & KEAMANAN berjarak normal — margin negatif penahan ring 15px tidak menggeser atau menabrak), Reports (pill Ringkasan/Kategori/Perbandingan dan chip periode utuh), Capture (chip "Simpan ke BCA" normal), Notifications (back arrow sejajar judul).

**Gate & deploy:** full mobile suite di HEAD `8fb683a` = **72 suites / 72 passed, 605 passed, 8 skipped, 613 total**; type-check 0 error; export PWA 22 SPA fallback; bundle `entry-478e0648b64b447284374f7ebdfae1ce.js` dengan 35/35 marker; `verify-live-url` PASS; catatan rilis `b3b52a9`. Deploy dilakukan lewat jalur eksplisit `ALLOW_NON_PROD_BRANCH=1` (guard branch menolak branch `feat/*` — perilaku benar). Backup rollback: `rollback-20261002-020706/index.html`; rollback fungsional tetap cukup dengan `rollout-flags.json` → `false` lalu redeploy.

---

# Acceptance Criteria

## Functional

- [x] Simple Mode has exactly five primary tabs: Home, Transactions, Capture, Reports, Wallets — verified in the exported bundle (`aria-label` list on `/`: Beranda, Transaksi, Catat, Laporan, Dompet).
- [x] Settings opens from Home avatar/profile control — `30eb0c1`; avatar pressable with localized label and `hitSlop`, pushes `/(tabs)/settings`; confirmed in the built app (Settings renders with the back header).
- [x] Hidden secondary routes remain deep-linkable — `26f2b74` route-contract + PWA-path assertions; `verify:live-registry` and 22 SPA fallback routes unchanged; safe back fallback added for cold entry.
- [x] Settings exposes finance, family, app, and account groups — `bf7460f` (verified visually: Keuangan / Keluarga / Aplikasi with the inbox and inline preferences kept distinct).
- [x] Capture exposes only enabled input modes and preserves existing save semantics — `db6bbe5` + `7321bf8` + `b3b741a`; voice gated by flag, import by flag, `?mode=` validated with entitlement gating; envelope allocation, RLS fallback, and preview/confirm unchanged.
- [x] Wallet operations preserve active finance context and DB-triggered balance rules — `39ab74a` + `3da3498` + `ff87151`; balance stays read-only, no client balance write, `useFocusEffect` + realtime intact, household permissions still gate create/edit.
- [x] Legacy navigation remains available when flag is OFF — legacy Home (with the `Kelola` link), legacy Capture copy, Settings as a visible tab, and the 8 intentional skips all verified in the flag-OFF build.

## Identity

- [x] Kaswise Finance Editorial palette remains the visual source of truth — unchanged palette in all captures.
- [x] Indonesian finance vocabulary and household workflow remain prominent — ID/EN parity verified (97 keys each); personal/household context labels visible.
- [x] No Moonveo brand elements or pixel-level cloning — no Moonveo/Monveo string in product UI; navigation pattern adapted via Amati–Tiru–Modifikasi only.
- [x] The result feels calmer and more focused without looking generic — Home reduced to balance/period/attention/recent, Capture reduced to one action hub; decorative wallet stack retained at the user's request.

## Quality

- [x] Focused Jest suites PASS — 8 suites / 182 passed / 8 intentional skips at `d5cd7a9`.
- [x] Full mobile Jest suite PASS — **71 suites / 71 passed, 568 passed, 8 skipped, 576 total** (baseline was 67 suites / 439 tests; the delta is the 14 new redesign tests plus the intentional Simple-Mode-only skips). Final head `8fb683a` after touch-target + viewer-gating work: **72 suites / 72 passed, 605 passed, 8 skipped, 613 total**.
- [x] Workspace type-check PASS — `pnpm type-check` (mobile + web) exit 0.
- [x] Lint exits 0 with no new touched-file warnings — 63 pre-existing warnings, all in legacy `apps/web`.
- [x] Web Vitest remains PASS — 3 files / 11 tests.
- [x] PWA export and bundle marker checks PASS — export OK (22 SPA fallback routes), `✅ All 35 required markers present in entry-dced743f…js`, `✅ Live feature registry valid (12 features, 35 required markers)`, `sync:required-markers` produced no diff.
- [x] Visual QA has zero Critical issues — the one Critical found (tab bar hidden on the Home route) was fixed in `d38c7f4` and re-verified in the rebuilt bundle for both flag modes; remaining items are warnings (fixed) and info/deferred notes.
- [x] No unrelated untracked artifact enters any commit — `git status --short` shows only the pre-existing untracked user artifacts; `git diff --check` clean.

---

# Follow-up Feature Roadmap (Separate Plans)

## Epic A: Payday Cycle

Goal: satu tanggal awal periode (contoh tanggal 25) mengontrol Reports dan Budget cycles secara konsisten.

Needs:
- persisted user preference;
- report-period integration;
- budget calculation tests;
- migration/default behavior;
- ID/EN settings UI.

## Epic B: Recurring Transactions

Goal: bills/reminders dapat menghasilkan draft atau transaksi terjadwal dengan explicit confirmation policy.

Needs:
- recurrence contract;
- timezone/idempotency;
- background scheduler or edge function;
- duplicate protection;
- wallet trigger safety.

## Epic C: Screenshot and Share Intake

Goal: user share screenshot/receipt dari aplikasi lain ke Kaswise lalu preview sebelum save.

Needs:
- first phase: image picker reuse;
- later: native share extension/Android intent;
- OCR privacy and file lifecycle;
- active context and wallet selection.

## Epic D: Receivables, Debt, and Assets

Goal: wallet overview dapat menampilkan uang dipinjamkan, utang, dan aset tetap berdasarkan data nyata.

Needs:
- separate schema and accounting semantics;
- no reuse of wallet balance columns;
- settlement workflow;
- household permissions;
- reports inclusion rules.

## Epic E: Shortcuts and Automation

Goal: quick-add from iOS Shortcuts/Android share actions without weakening auth or preview safety.

Needs:
- deep-link contract;
- signed/validated payload;
- app-open confirmation;
- duplicate/idempotency key;
- platform-specific implementation.

---

# Execution Guidance for Another Model

1. Read this plan and `CLAUDE.md` before editing.
2. Load skills:
   - `subagent-driven-development`
   - `tdd`
   - `coding-debugging-workflow`
   - `mobile-feature-rollout-workflows`
3. Execute one numbered task at a time.
4. Follow RED → GREEN → REFACTOR; do not batch all tests first and implementation later.
5. Commit after each task using the prescribed narrow commit.
6. After each task, run a spec-compliance review and code-quality review.
7. Never modify user-owned untracked assets.
8. Stop before Task 12 deployment and request explicit approval.
