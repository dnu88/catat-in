# Mobile Home Dark Luxury Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `apps/mobile/app/(tabs)/index.tsx` match `Kaswise Design System/ui_kits/mobile/Screens.jsx` HomeScreen with Dark Luxury tokens, softer neon-green usage, and objective validation.

**Architecture:** Keep this pass scoped to Home/Dashboard. Add focused Home primitives under `apps/mobile/src/screens/home/` so the tab screen stays readable, then make `index.tsx` compose the target structure. Use tests to lock structure/copy and token usage before visual QA.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest, `@testing-library/react-native`, existing Kaswise theme/I18n providers, existing `IconBubble` primitive.

---

## File Structure

- Create: `docs/plan/HOME-DARK-LUXURY-PARITY-MATRIX.md`
  - Responsibility: reference-to-implementation checklist for Home parity.
- Create: `apps/mobile/src/screens/home/homeReferenceData.ts`
  - Responsibility: stable reference labels/data for the Home parity baseline.
- Create: `apps/mobile/src/screens/home/HomeDarkLuxuryPrimitives.tsx`
  - Responsibility: Home-only primitives translated from the design-system UI kit (`HeroBalance`, quick actions, section card, transaction rows, insight card).
- Modify: `apps/mobile/app/(tabs)/index.tsx`
  - Responsibility: compose the Home screen in the same order as `Screens.jsx` using the new Home primitives.
- Create: `apps/mobile/app/(tabs)/index.test.tsx`
  - Responsibility: regression tests for Home structure, labels, route actions, and softened neon usage.
- Modify only if necessary: `apps/mobile/src/theme/tokens.ts`
  - Responsibility: add missing alpha/helper token values only if implementation cannot express soft green usage locally; do not change `brandPrimary` from `#A3FF12`.

---

### Task 1: Add the Home parity matrix

**Files:**
- Create: `docs/plan/HOME-DARK-LUXURY-PARITY-MATRIX.md`

- [ ] **Step 1: Create the parity matrix document**

Write this file exactly as the initial matrix:

```markdown
# Home Dark Luxury Parity Matrix

**Reference:** `Kaswise Design System/ui_kits/mobile/Screens.jsx` HomeScreen  
**Component references:** `Kaswise Design System/ui_kits/mobile/Components.jsx`  
**Implementation target:** `apps/mobile/app/(tabs)/index.tsx`

## Acceptance Threshold

- Layout drift target: 1–2px where React Native can express the same value.
- Token colors: exact Dark Luxury values.
- Green softness: `#A3FF12` remains primary token; most non-CTA usage uses alpha backgrounds/borders/glows.
- No direct cherry-pick from `fabb395` token branch.

## Matrix

| Area | Reference | Target implementation | Required parity | Validation |
|---|---|---|---|---|
| Screen container | `screenContainer`, `SCREEN_PAD = 16` | `index.tsx` root `ScrollView` content | dark background, horizontal padding 16, section rhythm | screenshot + style constants |
| Topbar | `HomeScreen` lines 114–125 | `DashboardScreen` topbar | greeting `Halo, Danu`, month, 36px avatar, top padding 6 | render test + screenshot |
| Hero balance | `HeroBalance` | `HomeHeroBalance` | card radius 24, padding 18, dark card, soft border, clipped emerald/navy blooms, stats row | render test + screenshot |
| Quick actions | `QuickActionCard` row | `HomeQuickActionRow` | 4 equal cards: Manual, AI Chat, Struk, Import; radius 16; icon size 32; label 11/700 | render test + route press test |
| Budget card | `SectionCard title="Anggaran"` | `HomeBudgetCard` | title, green action pill, Makan 77%, 620rb / 800rb, progress bar | render test + screenshot |
| Recent card | `SectionCard title="Terakhir"` | `HomeRecentTransactions` | action `Semua →`, 3 rows: Indomaret, Fore Coffee, Grab Car | render test + screenshot |
| Insight card | inline Home insight | `HomeInsightCard` | muted card, info bubble, title/body copy, radius 16, line-height 1.5 | render test + screenshot |
| Green usage | `KS.brand` / alpha styles | all Home primitives | full green only CTA/active; alpha for bubbles/borders/glows | token assertions + visual QA |
| Motion | approved spec | `Animated` entrance + press states | subtle fade/slide and press opacity/scale; no harsh flash | manual QA |
```

- [ ] **Step 2: Commit the matrix**

Run:

```bash
git add docs/plan/HOME-DARK-LUXURY-PARITY-MATRIX.md
git commit -m "docs: add home dark luxury parity matrix"
```

Expected: commit succeeds.

---

### Task 2: Write failing Home parity tests

**Files:**
- Create: `apps/mobile/app/(tabs)/index.test.tsx`

- [ ] **Step 1: Create the failing test file**

Create `apps/mobile/app/(tabs)/index.test.tsx` with this content:

```tsx
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { ThemeProvider } from '../../src/theme/theme-context'
import { I18nProvider } from '../../src/i18n/i18n-context'
import DashboardScreen from './index'

const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

function renderDashboard() {
  return render(
    <ThemeProvider>
      <I18nProvider>
        <DashboardScreen />
      </I18nProvider>
    </ThemeProvider>,
  )
}

describe('DashboardScreen dark luxury Home parity', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('renders the Screens.jsx Home section order and labels', async () => {
    const screen = renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Halo, Danu')).toBeTruthy()
    })

    expect(screen.getByText('Total saldo')).toBeTruthy()
    expect(screen.getByText('Rp 4.250.000')).toBeTruthy()
    expect(screen.getByText('Pemasukan')).toBeTruthy()
    expect(screen.getByText('Pengeluaran')).toBeTruthy()
    expect(screen.getByText('Tabungan')).toBeTruthy()

    expect(screen.getByText('Manual')).toBeTruthy()
    expect(screen.getByText('AI Chat')).toBeTruthy()
    expect(screen.getByText('Struk')).toBeTruthy()
    expect(screen.getByText('Import')).toBeTruthy()

    expect(screen.getByText('Anggaran')).toBeTruthy()
    expect(screen.getByText('Lihat →')).toBeTruthy()
    expect(screen.getByText('Makan')).toBeTruthy()
    expect(screen.getByText('77%')).toBeTruthy()
    expect(screen.getByText('620rb / 800rb')).toBeTruthy()
    expect(screen.getByText('Sisa 180rb · Hampir habis')).toBeTruthy()

    expect(screen.getByText('Terakhir')).toBeTruthy()
    expect(screen.getByText('Semua →')).toBeTruthy()
    expect(screen.getByText('Indomaret')).toBeTruthy()
    expect(screen.getByText('Fore Coffee')).toBeTruthy()
    expect(screen.getByText('Grab Car')).toBeTruthy()

    expect(screen.getByText('Insight harian')).toBeTruthy()
    expect(screen.getByText(/Pengeluaran kategori/)).toBeTruthy()
  })

  it('routes primary Home actions to the expected tabs', async () => {
    const screen = renderDashboard()

    fireEvent.press(screen.getByText('Manual'))
    expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/capture')

    fireEvent.press(screen.getByText('Import'))
    expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/imports')

    fireEvent.press(screen.getByText('Lihat →'))
    expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/budgets')

    fireEvent.press(screen.getByText('Semua →'))
    expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/transactions')
  })

  it('uses softened neon green usage without changing the primary token', async () => {
    const screen = renderDashboard()

    const cta = screen.getByTestId('home-budget-action')
    expect(cta.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ backgroundColor: '#A3FF12' }),
    ]))

    const primaryBubble = screen.getByTestId('home-quick-action-manual')
    const primaryBubbleStyle = getFlattenedStyle(primaryBubble)
    expect(
      SOFT_GREEN_BACKGROUNDS.includes(primaryBubbleStyle.backgroundColor as string)
        || SOFT_GREEN_BORDERS.includes(primaryBubbleStyle.borderColor as string),
    ).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests to verify RED**

Run:

```bash
pnpm --filter mobile test -- app/\(tabs\)/index.test.tsx --runInBand
```

Expected: FAIL because the current screen still uses the old labels (`Selamat datang, Danu`, `Teks`, `Foto`, `Suara`, `Transaksi Terbaru`) and does not expose the requested test IDs.

- [ ] **Step 3: Commit the failing tests**

Run:

```bash
git add apps/mobile/app/\(tabs\)/index.test.tsx
git commit -m "test(mobile): lock home dark luxury parity contract"
```

Expected: commit succeeds with a failing test committed intentionally for TDD.

---

### Task 3: Add stable Home reference data

**Files:**
- Create: `apps/mobile/src/screens/home/homeReferenceData.ts`

- [ ] **Step 1: Create reference data constants**

Create `apps/mobile/src/screens/home/homeReferenceData.ts`:

```ts
import type { KaswiseIconName } from '../../components/icons/kaswise-icons'

export type HomeQuickAction = {
  id: 'manual' | 'ai' | 'receipt' | 'import'
  label: string
  icon: KaswiseIconName
  tone: 'primary' | 'accent' | 'success' | 'info'
  route?: string
}

export type HomeStat = {
  label: string
  value: string
}

export type HomeTransaction = {
  id: string
  merchant: string
  sublabel: string
  amount: string
  icon: KaswiseIconName
  tone: 'primary' | 'warning'
}

export const homeStats: HomeStat[] = [
  { label: 'Pemasukan', value: '8,00 Jt' },
  { label: 'Pengeluaran', value: '3,75 Jt' },
  { label: 'Tabungan', value: '53%' },
]

export const homeQuickActions: HomeQuickAction[] = [
  { id: 'manual', label: 'Manual', icon: 'transactions', tone: 'primary', route: '/(tabs)/capture' },
  { id: 'ai', label: 'AI Chat', icon: 'insight', tone: 'accent' },
  { id: 'receipt', label: 'Struk', icon: 'capture', tone: 'success', route: '/(tabs)/capture' },
  { id: 'import', label: 'Import', icon: 'imports', tone: 'info', route: '/(tabs)/imports' },
]

export const homeTransactions: HomeTransaction[] = [
  { id: 'indomaret', merchant: 'Indomaret', sublabel: 'Hari ini · GoPay', amount: '-45rb', icon: 'transactions', tone: 'primary' },
  { id: 'fore-coffee', merchant: 'Fore Coffee', sublabel: 'Hari ini · GoPay', amount: '-38rb', icon: 'budgets', tone: 'warning' },
  { id: 'grab-car', merchant: 'Grab Car', sublabel: 'Kemarin · GoPay', amount: '-22rb', icon: 'card', tone: 'primary' },
]
```

- [ ] **Step 2: Run type-check to verify the new file compiles**

Run:

```bash
pnpm --filter mobile type-check
```

Expected: PASS or fail only if an icon name is invalid. If an icon name is invalid, inspect `apps/mobile/src/components/icons/kaswise-icons.tsx` and replace it with the closest existing `KaswiseIconName`.

- [ ] **Step 3: Commit**

Run:

```bash
git add apps/mobile/src/screens/home/homeReferenceData.ts
git commit -m "feat(mobile): add home reference data"
```

Expected: commit succeeds.

---

### Task 4: Add Home Dark Luxury primitives

**Files:**
- Create: `apps/mobile/src/screens/home/HomeDarkLuxuryPrimitives.tsx`

- [ ] **Step 1: Create the primitives file**

Create `apps/mobile/src/screens/home/HomeDarkLuxuryPrimitives.tsx` with these components:

```tsx
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { IconBubble } from '../../components/ui/IconBubble'
import { useTheme } from '../../theme/theme-context'
import type { HomeQuickAction, HomeStat, HomeTransaction } from './homeReferenceData'

function softGreen(alpha: number) {
  return `rgba(163, 255, 18, ${alpha})`
}

function softNavy(alpha: number) {
  return `rgba(74, 128, 240, ${alpha})`
}

export function HomeTopbar() {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.topbar}>
      <View>
        <Text style={styles.greeting}>Halo, Danu</Text>
        <Text style={styles.month}>April 2026</Text>
      </View>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>DB</Text>
      </View>
    </View>
  )
}

export function HomeHeroBalance({ stats }: { stats: HomeStat[] }) {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.heroCard}>
      <View pointerEvents="none" style={[styles.heroBloom, styles.heroBloomGreen]} />
      <View pointerEvents="none" style={[styles.heroBloom, styles.heroBloomNavy]} />

      <View style={styles.heroHeader}>
        <View style={styles.walletPill}>
          <Text style={styles.walletPillText}>Main Wallet</Text>
        </View>
        <Text style={styles.manageText}>Manage</Text>
      </View>

      <View style={styles.heroAmountBlock}>
        <Text style={styles.heroLabel}>Total saldo</Text>
        <View style={styles.heroAmountRow}>
          <Text style={styles.heroAmount}>Rp 4.250.000</Text>
          <View style={styles.deltaPill}>
            <Text style={styles.deltaText}>↗ 15%</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function HomeQuickActionRow({
  actions,
  onPress,
}: {
  actions: HomeQuickAction[]
  onPress: (action: HomeQuickAction) => void
}) {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.quickActionRow}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          testID={`home-quick-action-${action.id}`}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.quickActionCard,
            action.id === 'manual' && styles.quickActionPrimarySoft,
            pressed && styles.pressed,
          ]}
          onPress={() => onPress(action)}
        >
          <IconBubble name={action.icon} tone={action.tone} size={32} />
          <Text style={styles.quickActionLabel}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

export function HomeSectionCard({
  title,
  action,
  actionTestID,
  onActionPress,
  children,
}: {
  title: string
  action?: string
  actionTestID?: string
  onActionPress?: () => void
  children: ReactNode
}) {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <Text style={styles.sectionCardTitle}>{title}</Text>
        {action && onActionPress ? (
          <Pressable
            testID={actionTestID}
            accessibilityRole="button"
            onPress={onActionPress}
            style={({ pressed }) => [styles.actionPill, pressed && styles.pressed]}
          >
            <Text style={styles.actionPillText}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  )
}

export function HomeBudgetSummary() {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.budgetBody}>
      <View style={styles.budgetTopRow}>
        <Text style={styles.budgetTitle}>Makan</Text>
        <Text style={styles.budgetPct}>77%</Text>
      </View>
      <Text style={styles.budgetMeta}>620rb / 800rb</Text>
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>
      <Text style={styles.budgetFooter}>Sisa 180rb · Hampir habis</Text>
    </View>
  )
}

export function HomeTransactionRows({ transactions }: { transactions: HomeTransaction[] }) {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  return (
    <View>
      {transactions.map((tx, index) => (
        <View key={tx.id} style={[styles.txRow, index === transactions.length - 1 && styles.txRowLast]}>
          <IconBubble name={tx.icon} tone={tx.tone} size={36} />
          <View style={styles.txBody}>
            <Text style={styles.txMerchant}>{tx.merchant}</Text>
            <Text style={styles.txSublabel}>{tx.sublabel}</Text>
          </View>
          <Text style={styles.txAmount}>{tx.amount}</Text>
        </View>
      ))}
    </View>
  )
}

export function HomeInsightCard() {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.insightCard}>
      <IconBubble name="insight" tone="info" size={36} />
      <View style={styles.insightBody}>
        <Text style={styles.insightTitle}>Insight harian</Text>
        <Text style={styles.insightText}>
          Pengeluaran kategori <Text style={styles.insightBold}>Belanja</Text> melebihi 10% bulan ini. Mungkin saatnya rem sebentar?
        </Text>
      </View>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    topbar: {
      paddingTop: 6,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    greeting: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    month: {
      color: theme.colors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.brandPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: theme.colors.textInverse,
      fontSize: 12,
      fontWeight: '800',
    },
    heroCard: {
      marginBottom: 8,
      padding: 18,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    heroBloom: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
    },
    heroBloomGreen: {
      top: -60,
      right: -60,
      backgroundColor: softGreen(0.14),
    },
    heroBloomNavy: {
      bottom: -80,
      left: -60,
      backgroundColor: softNavy(0.08),
    },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    walletPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
    walletPillText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    manageText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    heroAmountBlock: {
      marginBottom: 14,
    },
    heroLabel: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginBottom: 4,
    },
    heroAmountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: 10,
    },
    heroAmount: {
      color: theme.colors.textPrimary,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.6,
    },
    deltaPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: softGreen(0.10),
      borderWidth: 1,
      borderColor: softGreen(0.20),
    },
    deltaText: {
      color: theme.colors.brandPrimary,
      fontSize: 11,
      fontWeight: '800',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    statCard: {
      flex: 1,
      padding: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
    statLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
    },
    statValue: {
      marginTop: 2,
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    quickActionRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    quickActionCard: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      gap: 6,
    },
    quickActionPrimarySoft: {
      borderColor: softGreen(0.20),
      backgroundColor: softGreen(0.04),
    },
    quickActionLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    sectionCard: {
      marginBottom: 10,
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface,
      gap: 10,
    },
    sectionCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionCardTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    actionPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.brandPrimary,
      shadowColor: theme.colors.brandPrimary,
      shadowOpacity: 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    actionPillText: {
      color: theme.colors.textInverse,
      fontSize: 12,
      fontWeight: '800',
    },
    budgetBody: {
      gap: 6,
    },
    budgetTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    budgetTitle: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    budgetPct: {
      color: theme.colors.warning,
      fontSize: 12,
      fontWeight: '800',
    },
    budgetMeta: {
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    progressFill: {
      width: '77%',
      height: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.warning,
    },
    budgetFooter: {
      marginTop: 2,
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSoft,
    },
    txRowLast: {
      borderBottomWidth: 0,
    },
    txBody: {
      flex: 1,
      minWidth: 0,
    },
    txMerchant: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    txSublabel: {
      marginTop: 2,
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    txAmount: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: '800',
    },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surfaceMuted,
    },
    insightBody: {
      flex: 1,
    },
    insightTitle: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    insightText: {
      marginTop: 4,
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    insightBold: {
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    pressed: {
      opacity: 0.84,
      transform: [{ scale: 0.98 }],
    },
  })
}
```

- [ ] **Step 2: Run the Home test and type-check**

Run:

```bash
pnpm --filter mobile test -- app/\(tabs\)/index.test.tsx --runInBand
pnpm --filter mobile type-check
```

Expected after only this task: tests may still fail because `index.tsx` is not yet using the primitives, but type-check should pass. If TypeScript fails due to unsupported theme property names, inspect `apps/mobile/src/theme/mobile-theme.ts` and replace with the available equivalent while preserving Dark Luxury colors.

- [ ] **Step 3: Commit**

Run:

```bash
git add apps/mobile/src/screens/home/HomeDarkLuxuryPrimitives.tsx
git commit -m "feat(mobile): add dark luxury home primitives"
```

Expected: commit succeeds.

---

### Task 5: Compose Home screen to match `Screens.jsx`

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Replace Home composition with the target structure**

Replace the current body of `apps/mobile/app/(tabs)/index.tsx` with this focused composition. Keep imports exactly as shown:

```tsx
import { useMemo, useRef, useEffect } from 'react'
import { Animated, ScrollView, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'

import { useTheme } from '../../src/theme/theme-context'
import {
  homeQuickActions,
  homeStats,
  homeTransactions,
  type HomeQuickAction,
} from '../../src/screens/home/homeReferenceData'
import {
  HomeBudgetSummary,
  HomeHeroBalance,
  HomeInsightCard,
  HomeQuickActionRow,
  HomeSectionCard,
  HomeTopbar,
  HomeTransactionRows,
} from '../../src/screens/home/HomeDarkLuxuryPrimitives'

export default function DashboardScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const styles = useMemo(() => createStyles(theme), [theme])
  const entrance = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start()
  }, [entrance])

  const animatedStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  }

  const handleQuickAction = (action: HomeQuickAction) => {
    if (action.route) {
      router.push(action.route as any)
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={animatedStyle}>
          <HomeTopbar />
          <HomeHeroBalance stats={homeStats} />
          <HomeQuickActionRow actions={homeQuickActions} onPress={handleQuickAction} />

          <HomeSectionCard
            title="Anggaran"
            action="Lihat →"
            actionTestID="home-budget-action"
            onActionPress={() => router.push('/(tabs)/budgets')}
          >
            <HomeBudgetSummary />
          </HomeSectionCard>

          <HomeSectionCard
            title="Terakhir"
            action="Semua →"
            actionTestID="home-transactions-action"
            onActionPress={() => router.push('/(tabs)/transactions')}
          >
            <HomeTransactionRows transactions={homeTransactions} />
          </HomeSectionCard>

          <HomeInsightCard />
        </Animated.View>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 0,
      paddingBottom: 26,
    },
    footerSpacer: {
      height: 100,
    },
  })
}
```

- [ ] **Step 2: Run the focused test to verify GREEN**

Run:

```bash
pnpm --filter mobile test -- app/\(tabs\)/index.test.tsx --runInBand
```

Expected: PASS. If the `softened neon` test fails because React Native returns function-style Pressable styles, resolve the `style` callback and flatten it before asserting that the primary bubble uses a soft green background alpha in the approved `0.08`-`0.14` range or a soft green border alpha in the approved `0.18`-`0.25` range.

- [ ] **Step 3: Run type-check**

Run:

```bash
pnpm --filter mobile type-check
```

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "feat(mobile): align home screen with dark luxury design system"
```

Expected: commit succeeds.

---

### Task 6: Visual QA and parity checklist closeout

**Files:**
- Modify: `docs/plan/HOME-DARK-LUXURY-PARITY-MATRIX.md`
- Optional create: `docs/plan/HOME-DARK-LUXURY-PARITY-QA.md`

- [ ] **Step 1: Run full focused validation commands**

Run:

```bash
pnpm --filter mobile test -- app/\(tabs\)/index.test.tsx --runInBand
pnpm --filter mobile type-check
```

Expected: both commands PASS.

- [ ] **Step 2: Run broader mobile tests if focused checks pass**

Run:

```bash
pnpm --filter mobile test -- --runInBand
```

Expected: PASS. If unrelated pre-existing failures appear, document exact failing tests in `HOME-DARK-LUXURY-PARITY-QA.md` and keep the focused Home test result separate.

- [ ] **Step 3: Capture or manually inspect Home visual parity**

Use whichever path is available in the environment:

```bash
pnpm dev:mobile:web
```

Then inspect Home/Dashboard against:

- `Kaswise Design System/ui_kits/mobile/Screens.jsx`
- the visual companion reference created during brainstorming
- `docs/plan/HOME-DARK-LUXURY-PARITY-MATRIX.md`

Record results in `docs/plan/HOME-DARK-LUXURY-PARITY-QA.md` with this content:

```markdown
# Home Dark Luxury Parity QA

## Commands

- `pnpm --filter mobile test -- app/\(tabs\)/index.test.tsx --runInBand`: PASS
- `pnpm --filter mobile type-check`: PASS
- `pnpm --filter mobile test -- --runInBand`: PASS or documented below

## Visual Checklist

- [ ] Topbar matches reference order, sizing, and avatar treatment
- [ ] Hero card radius/padding/blooms match reference intent
- [ ] Stats row has 3 equal cards with correct labels and hierarchy
- [ ] Quick actions are Manual, AI Chat, Struk, Import in the correct order
- [ ] Green appears soft except primary CTA/action pills
- [ ] Budget card matches reference content and progress presentation
- [ ] Recent transactions card matches reference content and row rhythm
- [ ] Insight card matches reference structure and tone
- [ ] Press states are subtle and do not flash harsh neon green
- [ ] No slate/indigo color regression is visible

## Remaining Deviations

- None recorded.
```

- [ ] **Step 4: Update the parity matrix statuses**

In `docs/plan/HOME-DARK-LUXURY-PARITY-MATRIX.md`, add a `Status` column to each matrix row and mark each row as `Done`, `Done with documented deviation`, or `Blocked`.

- [ ] **Step 5: Commit QA closeout**

Run:

```bash
git add docs/plan/HOME-DARK-LUXURY-PARITY-MATRIX.md docs/plan/HOME-DARK-LUXURY-PARITY-QA.md
git commit -m "docs: close home dark luxury parity qa"
```

Expected: commit succeeds.

---

## Final Verification

Run before reporting completion:

```bash
git status --short
pnpm --filter mobile test -- app/\(tabs\)/index.test.tsx --runInBand
pnpm --filter mobile type-check
```

Expected:

- `git status --short` has no uncommitted implementation changes except intentional docs if still being edited.
- Home test passes.
- Mobile type-check passes.

If all pass, report:

- commits created
- visual deviations, if any
- screenshots/QA notes location
- whether broader mobile test suite passed or had documented unrelated failures.
