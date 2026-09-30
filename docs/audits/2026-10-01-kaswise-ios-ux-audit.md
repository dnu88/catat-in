# Kaswise iOS UI/UX Audit

**Tanggal:** 2026-10-01  
**Auditor:** Hermes Agent / GPT-5.6 (senior iOS product-design review)  
**Target:** `apps/mobile` — Expo / React Native / PWA  
**Bahasa desain aktif:** Finance Editorial  
**Metode:** visual review terhadap screenshot bundle terbaru + static source audit + tiga audit paralel (iOS HIG, design system, accessibility).

## Scope dan batasan

- Screenshot terbaru diregenerasi dari bundle produksi terbaru menggunakan session mock lokal dan respons Supabase kosong; tidak ada data production yang disentuh.
- Empty-state, navigation, layout, controls, source tokens, interaction semantics, dan accessibility diaudit.
- Visual keadaan dengan data padat (list transaksi nyata, donut/chart terisi, budget aktif, tagihan terlambat) belum divalidasi lewat simulator dengan akun seeded.
- Skill “impeccable” tidak tersedia di environment ini. Audit memakai skill `kaswise-mobile-finance-editorial` dan rubric `visual-qa-review`.

## Executive verdict

Kaswise sudah memiliki **identitas visual yang jelas dan lebih premium** daripada aplikasi finansial utilitarian biasa: gradient navy–blue konsisten, warm-paper surface, Phosphor icons, angka finansial menonjol, serta empty states yang relatif tenang. Namun, aplikasi belum terasa seperti produk iOS matang karena struktur navigasi dan form masih menyerupai responsive web/PWA yang dibungkus native.

**Status:** `PASS WITH MAJOR REVISIONS`  
**Blocker sebelum menyebutnya iOS-polished:** risiko hapus dompet, date picker tidak operabel untuk VoiceOver, tab Capture tidak bernama secara aksesibel, dan dual-theme runtime.

## Yang sudah kuat

1. **Brand direction jelas:** gradient navy → electric blue, warm paper, white surfaces, dan tonal-blue icon vocabulary terasa konsisten pada screenshot terbaru.
2. **Hierarchy angka finansial kuat:** saldo dan summary mudah ditemukan.
3. **Primary button foundation cukup baik:** shared `Button` punya min-height 44 pt, disabled/busy state, dan accessibility role/state.
4. **Entrance motion sudah menghormati Reduce Motion** dan memiliki test.
5. **Transaction dan budget deletion sudah memakai destructive confirmation.**
6. **Kategori Reports/Anggaran terbaru sudah keluar dari rainbow/confetti** dan memakai tonal blue.
7. **Tidak ada global font-scaling lock;** Dynamic Type tidak sengaja dimatikan.

---

# P0 — wajib diperbaiki dulu

## P0.1 — Hapus dompet langsung tanpa konfirmasi/undo

**Bukti source:** `app/(tabs)/wallets.tsx:277-289`, tombol `:632-644` langsung memanggil `deleteWallet()`.

**Risiko:** satu tap dapat menghapus struktur finansial dan relasinya tanpa menjelaskan konsekuensi.

**Fix:**
- Native `Alert.alert` / action sheet dengan nama dompet dan konsekuensi.
- `Batal` default, `Hapus` destructive.
- Ideal: soft-delete + snackbar **Urungkan**.

**Acceptance:** tidak ada jalur delete wallet tanpa confirmation; test memastikan cancel tidak memanggil service.

## P0.2 — Date wheel custom tidak operabel dengan VoiceOver

**Bukti source:** `src/components/date/IOSWheelDatePicker.tsx:132-180`; item visual berupa `View`, tanpa `accessibilityRole="adjustable"`, `accessibilityValue`, atau increment/decrement actions. Item tinggi 34 pt.

**Fix terbaik:** native iOS date picker (`@react-native-community/datetimepicker`) dan `<input type="date">` pada web. Jika custom dipertahankan, setiap kolom harus menjadi satu adjustable control dengan current/min/max value dan accessibility actions.

**Acceptance:** pengguna VoiceOver dapat mendengar dan mengubah tahun/bulan/tanggal tanpa gesture scroll visual.

## P0.3 — Tab Capture tidak memiliki accessible name

**Bukti source:** `tabCapture: ''` pada `src/i18n/i18n-context.tsx`; dipakai oleh `app/(tabs)/_layout.tsx`. Label visual seluruh tab juga disembunyikan.

**Fix:** isi nama `Catat` / `Add transaction`; bila label visual tetap tersembunyi, route/title aksesibel tidak boleh kosong.

**Acceptance:** VoiceOver mengumumkan “Catat, tab” dan status selected.

## P0.4 — Dua sistem tema aktif bersamaan

**Bukti source:** `src/theme/tokens.ts` masih punya runtime **Dark Luxury**; preferensi awal mengikuti `system`, sedangkan layar mencampur `fe.paper/fe.white` dengan `theme.colors.*`.

**Risiko:** pada perangkat dark mode, surface tetap warm paper tetapi input/text/status bisa mengambil token gelap lama → UI hibrida dan potensi kontras rusak.

**Fix:**
- Opsi rekomendasi: operational UI light-first, resolve ke satu Finance Editorial palette.
- Jika dark mode wajib: bangun Finance Editorial Dark yang lengkap; jangan mencampur `fe.*` statis dengan token mode lama.

**Acceptance:** snapshot light/dark seluruh layar tidak memiliki surface/text campuran; Dark Luxury tidak lagi menjadi runtime operational theme.

---

# P1 — high-impact usability dan product coherence

## P1.1 — Arsitektur navigasi salah lapis: task/detail screens berada di Tabs

`wallets`, `budgets`, `bills`, `groups`, `imports`, `transaction-new` didaftarkan sebagai hidden `Tabs.Screen`. Akibatnya tab bar tetap menjadi bagian layout layar sekunder.

**Efek visual:**
- Transaction Manual menampilkan **dua back control**: navigation bar “Kembali” + back button di hero.
- Floating tab bar menutupi date wheel/form bawah.
- Reports terlihat memiliki filter/content yang masuk ke belakang tab bar.

**Fix:** hanya lima destination utama berada di Tabs. Layar task/detail dipindah ke root/nested Stack; create/edit gunakan stack push atau form sheet.

## P1.2 — Floating tab bar memakai clearance magic number

Tab bar absolute (`height: 64`), sementara layar menambah spacer manual 60/100/120/130 px.

**Fix:** gunakan `useBottomTabBarHeight()` + `insets.bottom`; padding konten dihitung dinamis. Hapus `<View style={{height: 100}} />`.

## P1.3 — Top safe area belum konsisten

Main tabs menonaktifkan header dan memakai padding/negative margin tetap; root sudah memiliki SafeAreaProvider tetapi tidak dipakai konsisten.

**Fix:** shared `TabScreen` / `OperationalScreen` dengan `SafeAreaView edges={["top"]}` atau `paddingTop: insets.top`.

## P1.4 — Form panjang tidak keyboard-safe

Transaction New, Wallet, Budget, dan Groups memakai ScrollView tanpa pola KeyboardAvoidingView/sticky CTA yang konsisten.

**Fix:** shared keyboard-safe form shell:
- `KeyboardAvoidingView` (`padding` iOS),
- `keyboardDismissMode="interactive"`,
- automatic keyboard insets,
- scroll-to-focused field,
- sticky CTA di atas keyboard,
- Next/Done flow.

## P1.5 — Manual Transaction mencampur kategori pemasukan dan pengeluaran

Saat **Pengeluaran** dipilih, screenshot terbaru tetap menampilkan **Gaji, Bonus, Freelance**. Source `transaction-new.tsx` menyimpan `CategoryOption` tanpa type dan tidak memfilter berdasarkan `txType`.

**Fix:** bawa `type` dari taxonomy/DB ke `CategoryOption`; expense hanya menampilkan expense, income hanya income; transfer tidak menampilkan kategori.

## P1.6 — Local icon vocabulary Transaction New sudah stale

Fallback lokal masih memetakan:
- Kesehatan → `sport`
- Pendidikan → `file`
- Gaji → `card`
- Bonus → `gift`
- Freelance → `investment`
- Personal Shopping → `groceries`

Ini berbeda dari mapping kanonik yang baru (`firstAid`, `graduationCap`, `bank`, `trophy`, `briefcase`, `tag`).

**Fix:** hapus map/fallback lokal; konsumsi `categoryDefinitions` + `resolveCategoryVisual` sebagai sumber tunggal.

## P1.7 — Capture menjanjikan Voice ketika feature production OFF

Subtitle tetap berkata “Suara, teks, atau struk” ketika mode Voice tidak muncul.

**Fix:** copy conditional mengikuti `featureFlags.voiceNote`, misalnya “Teks atau struk—pilih input tercepat.”

## P1.8 — Reports membuang area above-the-fold ketika data kosong

`heroBubbleCluster` memiliki `minHeight: 238`, sehingga hero menjadi bidang gradient kosong besar saat belum ada transaksi.

**Fix:** collapse hero state saat no-data: tinggi ringkas 150–180, tampilkan satu empty insight/CTA; expanded visualization hanya ketika data ada.

## P1.9 — Design system belum satu sumber

`finance-editorial.ts` dan `tokens.ts` memiliki warna teks berbeda. Audit statis menemukan:
- 19 ukuran font,
- 22 nilai radius,
- puluhan palette/rgba literal,
- hanya Bills dan Budgets yang memakai shared `ScreenHeader`; layar lain membuat hero sendiri.

**Fix:** satu canonical token source + semantic primitives:
- `OperationalHero`
- `SurfaceGroup` / `SurfaceRow`
- `FinancialAmount`
- `SegmentedControl`
- `FilterChip`
- `KeyboardSafeForm`

## P1.10 — Hero geometry tidak konsisten

Dashboard/Transactions/Wallets/Reports memakai radius bawah 42/full-width; Bills/Budgets/Groups memakai rounded rectangle semua sudut; Capture/Transaction New/Imports memakai geometri lain.

**Fix:** satu `OperationalHero` dengan varian `fullBleed`, `compact`, dan `analytics`, tetap satu kontrak radius/spacing.

## P1.11 — Hierarchy terlalu mengandalkan 700/800 weight

Banyak label/meta memakai extrabold; editorial hierarchy seharusnya lebih didorong size, whitespace, dan grouping.

**Fix:**
- 800 hanya untuk hero metrics.
- 600 untuk headings/action labels.
- 400/500 untuk body/meta.
- Minimum support text 11–12 pt; Reports masih punya label 8–9 pt.

## P1.12 — Color contrast gagal pada sejumlah text tokens

Rasio terukur pada putih:
- `fe.muted #A3A5A8`: **2.47:1**
- income `#168FA8`: **3.80:1**
- blue bright `#178BD0`: **3.72:1**
- success `#22C55E`: **2.28:1**

Warna-warna ini aman untuk dekorasi/large graphics tetapi tidak untuk body text kecil.

**Fix:** pisahkan decorative vs text tokens; gunakan text colors yang mencapai ≥4.5:1 untuk teks normal.

## P1.13 — Async/error states belum diumumkan dan kadang berubah menjadi empty state

Tidak ditemukan live region/announce pattern. Notifications menelan error lalu dapat tampil “Belum ada notifikasi”.

**Fix:** explicit Loading/Empty/Error/Success states; `accessibilityRole="alert"` untuk error; polite live announcement; retry action.

## P1.14 — Modal/bottom sheet tidak mengelola safe area dan accessibility focus

Reports memiliki beberapa custom modal; Settings profile sheet tidak memakai modal semantics/focus management.

**Fix:** native sheet jika memungkinkan; jika custom, tambahkan safe area bottom, `accessibilityViewIsModal`, escape, initial focus, focus trap (web), dan restore focus.

---

# P2 — polish dan consistency

1. **Tab labels visual disembunyikan.** Ikon Transactions/Reports tidak cukup universal; tampilkan label singkat atau setidaknya beri label pada compact state tertentu.
2. **Touch targets <44 pt:** date confirm 38, budget edit/delete 36, profile close 36, premium CTA 34, transaction selection 42.
3. **Settings switch digambar manual:** semantik sudah baik, tetapi gunakan native `Switch` untuk motion/tint/platform behavior.
4. **Tidak ada haptic feedback:** tambahkan selection haptic untuk segmented/chip, impact ringan untuk add/save, notification warning untuk destructive errors; hormati user/system setting.
5. **Swipe actions tetap berada dalam accessibility tree ketika tersembunyi:** hide descendants saat closed; expose custom accessibility actions.
6. **Notifications empty state memakai ikon `home`, bukan `notification`.**
7. **Emoji masih dipakai pada Wallet/Upgrade:** pindah ke Phosphor/KaswiseIcon.
8. **Focus-visible PWA tidak konsisten:** shared Pressable perlu focus ring.
9. **Dynamic Type belum dites:** banyak fixed heights dan horizontal controls berisiko clipping pada AX sizes.
10. **Logo polygon anak memberi coordinate labels ke VoiceOver:** hanya parent logo yang boleh accessible.
11. **Settings helper text disembunyikan dengan `display: none`:** expose sebagai accessibilityHint atau visible supporting copy.
12. **Bills/transfer belum konsisten memakai financial semantic color helper.**

---

# Screen-by-screen visual notes

## Dashboard
- **Bagus:** summary saldo sangat jelas; gradient dan paper transition kuat.
- **Perlu:** empty state terlalu kecil dan pasif dibanding ruang kosong; CTA “Tambah transaksi” seharusnya langsung muncul, bukan hanya instruksi “gunakan tombol +”.
- **Perlu:** “Semua →” terlalu redup; tap target/contrast perlu diperkuat.

## Transactions
- **Bagus:** filter hierarchy mudah dipindai.
- **Perlu:** dua lapis segmented controls terlalu banyak; pertimbangkan period control sebagai horizontal menu/sheet dan type filter sebagai satu segmented row.
- **Perlu:** FAB + central Capture tab menduplikasi primary action.

## Capture
- **Bagus:** fokus pada satu task, CTA jelas.
- **Perlu:** conditional voice copy; form harus keyboard-safe; “Simpan ke” tanpa wallet perlu action langsung “Buat dompet”.

## Reports
- **Bagus:** summary card overlap terasa premium.
- **Perlu:** no-data hero terlalu tinggi; premium upsell mendominasi sebelum nilai gratis terlihat; tab bar menutupi lower controls.

## Settings
- **Bagus:** grouping mudah dipahami.
- **Perlu:** gunakan grouped inset-list iOS dengan row separators/consistent row height; loading spinner yatim perlu skeleton/label; native Switch; lower content tertutup tab bar.

## Wallets
- **Bagus:** saldo menjadi focal point.
- **Perlu:** decorative layered wallet card terlihat seperti disabled/ghost content ketika empty; ganti dengan CTA empty-state yang konkret.

## Budgets
- **Bagus:** struktur Active / Review / Archive jelas.
- **Perlu:** summary card terlalu banyak explanatory copy; prioritaskan angka dan status. Tombol edit/delete harus ≥44 pt.

## Bills
- **Bagus:** period/status filters cukup jelas.
- **Perlu:** empty state seharusnya memiliki CTA “Tambah tagihan”, bukan hanya deskripsi.

## Groups
- **Bagus:** create/join intent jelas.
- **Perlu:** dua CTA kecil di hero kurang platform-native; gunakan primary action + secondary menu/sheet.

## Import
- **Perlu:** layar “feature sedang disiapkan” sebaiknya tidak menjadi destination aktif. Hilangkan dari navigation hingga actionable, atau sediakan waitlist/notify action.

## Transaction New
- **Critical UX:** kategori tidak mengikuti tipe transaksi.
- **Perlu:** duplicate back control, stale icon vocabulary, keyboard-safe footer, date picker native.

## Notifications
- **Perlu:** wrong empty icon, explicit error/retry, back accessibility label, dan content-aware empty CTA.

---

# Rekomendasi roadmap

## Phase 1 — Safety & blockers (1–2 hari)

1. Confirmation/undo delete wallet.
2. Accessible name tab Capture.
3. Filter categories by transaction type + replace stale local icon map.
4. Conditional Capture subtitle.
5. Fix notification empty icon/error state.
6. Raise all touch targets to 44 pt.

## Phase 2 — iOS navigation & forms (3–5 hari)

1. Move hidden task/detail routes from Tabs to Stack.
2. Remove duplicate back buttons.
3. Dynamic bottom clearance from tab bar height/insets.
4. Safe-area-aware `TabScreen` and sheets.
5. Keyboard-safe form shell + native date picker.
6. Native Switch + basic haptics.

## Phase 3 — Design-system consolidation (4–7 hari)

1. Remove runtime Dark Luxury mixing; establish one Finance Editorial token graph.
2. Build shared OperationalHero and surface primitives.
3. Collapse typography roles and remove <11 pt text.
4. Replace local hex/rgba/palette definitions.
5. Normalize card/radius/spacing contracts.

## Phase 4 — Accessibility and dense-data QA (3–5 hari)

1. Modal focus management and live regions.
2. VoiceOver audit: tabs, forms, swipe actions, charts, logo.
3. Dynamic Type AX1–AX5.
4. iPhone SE / Dynamic Island / Pro Max / iPad portrait-landscape.
5. Seeded screenshots: long Indonesian/English copy, 50 transactions, 12 categories, overbudget, overdue bills, errors, loading, offline.

---

# Definition of Done for “iOS-polished”

- Zero destructive action without confirmation or undo.
- Only top-level destinations live in Tab Navigator.
- No content underlaps floating tab bar or Dynamic Island at any supported size.
- Every touch target ≥44×44 pt.
- Every interactive control has accessible name/role/state.
- VoiceOver can complete manual transaction and date selection.
- No body/support text below 11 pt; all normal text contrast ≥4.5:1.
- Dynamic Type AX5 does not clip critical copy/actions.
- One canonical Finance Editorial token source; no runtime Dark Luxury mixing.
- Screen hero, card, segmented control, and form patterns are shared primitives.
- Empty/loading/error/success are distinct states with retry where relevant.
- Populated and empty screenshots pass visual regression on iPhone SE, standard iPhone, Pro Max, and iPad.
