# Kaswise · Mobile UI Kit

Click-thru recreation of the Kaswise mobile app, based on `mobile/app/` and `mobile/src/` in the codebase.

## Run

Open `index.html`. The kit auto-mounts inside an iOS device frame.

## Flow

1. **Splash** — `Catat.in` ground (`#1D4ED8`) with two soft orbs. Tap *Mulai gratis* or *Sudah punya akun? Masuk*.
2. **Login** — Hero panel + form card. Both buttons route into the app.
3. **Beranda (Home)** — Topbar greeting, indigo balance hero, 4 quick-action cards, mini Anggaran preview, recent transactions, AI insight card. *Lihat →* on Anggaran jumps to Budgets.
4. **Transaksi (Transactions)** — Active-filter pills + full transaction list.
5. **Anggaran (Budgets)** — Total card, month chips, three budget states (ok / warn / over).
6. **Laporan (Reports)** — Income/Expense metrics, 6-month bar trend, category breakdown.
7. **Setelan (Settings)** — Profile card, settings rows, sign-out.
8. **Catat manual** — Sheet from the center "+" FAB. Type toggle, Rp prefix nominal input, deskripsi, wallet pills, category chips with icon bubble. *Simpan transaksi* fires the AI confirmation toast.

## Files

| File | Role |
|---|---|
| `index.html` | Boot file. Loads React, Phosphor, then the JSX modules below. |
| `ios-frame.jsx` | iPhone-style device frame (starter component). |
| `Components.jsx` | Atoms + molecules: `Button`, `Pill`, `IconBubble`, `ProgressBar`, `BottomTabs`, `InputField`, `HeroBalance`, `TransactionRow`, `BudgetCard`, `MetricCard`, `MonthChip`, `ScreenHeader`, `SectionCard`, `QuickActionCard`, `StatusBadge`. |
| `Screens.jsx` | Full screens: `SplashScreen`, `LoginScreen`, `HomeScreen`, `TransactionsScreen`, `BudgetsScreen`, `ReportsScreen`, `SettingsScreen`, `ManualTransactionScreen`, `AIToast`. |
| `App.jsx` | Shell — owns `stage` (splash/login/app), `tab`, `manualOpen`, `toast`. |

All components consume the `KS` token object (mirrors `mobile/src/theme/tokens.ts`) and the `ksFont` stack. To re-skin globally, edit `KS` at the top of `Components.jsx`.

## Source of truth

| Recreation | Codebase source |
|---|---|
| `SplashScreen` | `mobile/src/screens/onboarding/SplashScreen.tsx` |
| `LoginScreen` | `mobile/app/(auth)/login.tsx` + `mobile/src/components/ui/AuthScreen.tsx` |
| `HomeScreen` | `mobile/src/screens/tabs/HomeScreen.tsx` |
| `TransactionsScreen` | `mobile/src/screens/tabs/TransactionsScreen.tsx` |
| `BudgetsScreen` | `mobile/src/screens/tabs/BudgetsScreen.tsx` |
| `ReportsScreen` | `mobile/src/screens/tabs/ReportsScreen.tsx` |
| `SettingsScreen` | `mobile/app/(tabs)/settings.tsx` (paraphrased) |
| `ManualTransactionScreen` | `mobile/app/(tabs)/transaction-new.tsx` |
| `BottomTabs` | `mobile/src/navigation/BottomTabShell.tsx` |
| `IconBubble`, `Pill`, `InputField` | `mobile/src/components/ui/*` |

## Known shortcuts

- **No real persistence.** All state is local React; `Simpan transaksi` just toasts.
- **AI / Supabase / OCR** flows are mocked — the "confidence 0.92" toast is decorative.
- **Charts** are CSS bars matching the codebase's own mock (`ReportsScreen.tsx` does the same).
- **Settings** rows are paraphrased; the live screen has language toggle, theme select, and data export.
- The bottom bar shows 4 tabs (Beranda / Transaksi / Laporan / Setelan); **Anggaran** is reached from Home's *Lihat →* link, matching the in-product navigation hierarchy.

## Extending

To add a screen:
1. Write a function component in `Screens.jsx` that returns a div styled with `screenContainer`.
2. Export it via the `Object.assign(window, …)` block at the bottom.
3. Route to it in `App.jsx` by adding a new `tab` value and case in the switch, plus a tab entry in `BottomTabs` (`Components.jsx`).
