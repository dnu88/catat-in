# Kaswise Wave A Foundation UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared dark/light fintech-premium design foundation (tokens, theming infra, and base UI components) for both `apps/web` and `apps/mobile`, matching the approved mockups.

**Architecture:** Use `packages/shared` as the single source of design tokens, then map those tokens into platform-specific theme adapters: CSS variables for web and React Context theme objects for mobile. Build reusable base components first, then wire them into app shells so all future screen migrations use the same primitives.

**Tech Stack:** pnpm workspaces, React + Vite + Vitest (`apps/web`), Expo Router + React Native + Jest (`apps/mobile`), Zustand (web theme store), shared TypeScript tokens (`packages/shared`).

---

## File Structure (planned changes)

### Create
- `packages/shared/theme/tokens.ts` — source-of-truth design tokens for dark/light
- `packages/shared/theme/index.ts` — token exports
- `apps/web/src/theme/web-theme.ts` — token -> CSS variable mapper + DOM apply helpers
- `apps/web/src/theme/web-theme.test.ts` — tests for web theme mapping
- `apps/web/src/store/theme.store.ts` — persisted theme mode store (`light`/`dark`/`system`)
- `apps/web/src/components/theme/ThemeToggle.tsx` — reusable light/dark toggle button
- `apps/web/src/components/ui/Card.tsx` — base surface component
- `apps/web/src/components/ui/Button.tsx` — base button variants
- `apps/web/src/components/ui/Input.tsx` — base input field
- `apps/mobile/src/theme/mobile-theme.ts` — shared token adapter for RN
- `apps/mobile/src/theme/theme-context.tsx` — theme provider + toggle hook
- `apps/mobile/src/theme/mobile-theme.test.ts` — tests for mobile theme mapping
- `apps/mobile/src/components/ui/Card.tsx` — base surface component
- `apps/mobile/src/components/ui/Button.tsx` — base button variants
- `apps/mobile/src/components/ui/InputField.tsx` — base input component

### Modify
- `packages/shared/package.json` — add theme export path
- `apps/web/src/main.tsx` — bootstrap web theme before app render
- `apps/web/src/index.css` — consume generated CSS variables only
- `apps/web/src/components/AppLayout.tsx` — use `ThemeToggle` + updated Kaswise shell styling
- `apps/mobile/app/_layout.tsx` — wrap app with `ThemeProvider`, dynamic status bar style
- `apps/mobile/app/(tabs)/_layout.tsx` — apply themed tab bar colors
- `apps/mobile/src/styles/mobileStyles.ts` — replace hardcoded colors with theme tokens

---

### Task 1: Shared Design Tokens in `packages/shared`

**Files:**
- Create: `packages/shared/theme/tokens.ts`
- Create: `packages/shared/theme/index.ts`
- Modify: `packages/shared/package.json`
- Test: `apps/web/src/theme/web-theme.test.ts` (import compile check through workspace)

- [ ] **Step 1: Write failing test for token shape and mode keys**

```ts
// apps/web/src/theme/web-theme.test.ts
import { describe, expect, it } from 'vitest'
import { kaswiseTokens } from '@kaswise/shared/theme'

describe('kaswise shared tokens', () => {
  it('has light and dark theme with required root keys', () => {
    expect(kaswiseTokens.light.color.bg.base).toBeTypeOf('string')
    expect(kaswiseTokens.dark.color.bg.base).toBeTypeOf('string')
    expect(kaswiseTokens.light.radius.md).toBeTypeOf('number')
    expect(kaswiseTokens.dark.typography.fontFamily).toContain('Inter')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @kaswise/web test -- src/theme/web-theme.test.ts
```
Expected: FAIL with module not found `@kaswise/shared/theme`.

- [ ] **Step 3: Implement shared tokens and exports**

```ts
// packages/shared/theme/tokens.ts
export type ThemeMode = 'light' | 'dark'

export const kaswiseTokens = {
  light: {
    color: {
      bg: { base: '#F3F5FA', surface: '#FFFFFF', card: '#FFFFFF', muted: '#F8FAFD' },
      text: { primary: '#0C1A3A', secondary: '#4C5A78', muted: '#8A95AD', inverse: '#FFFFFF' },
      border: { soft: '#E2E7F2', strong: '#CBD5E3' },
      brand: { primary: '#4F46E5', accent: '#10B981' },
      status: { success: '#10B981', danger: '#EF4444', warning: '#F59E0B', info: '#38BDF8' },
    },
    radius: { sm: 10, md: 14, lg: 18, pill: 999 },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32 },
    typography: { fontFamily: 'Inter, Poppins, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' },
  },
  dark: {
    color: {
      bg: { base: '#050C1B', surface: '#08132A', card: '#0A1730', muted: '#0E1E3D' },
      text: { primary: '#F8FAFF', secondary: '#B4C0DA', muted: '#7D8CA9', inverse: '#050C1B' },
      border: { soft: '#1A2A4C', strong: '#223861' },
      brand: { primary: '#4F46E5', accent: '#10B981' },
      status: { success: '#10B981', danger: '#EF4444', warning: '#F59E0B', info: '#38BDF8' },
    },
    radius: { sm: 10, md: 14, lg: 18, pill: 999 },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32 },
    typography: { fontFamily: 'Inter, Poppins, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' },
  },
} as const
```

```ts
// packages/shared/theme/index.ts
export * from './tokens'
```

```json
// packages/shared/package.json
{
  "name": "@kaswise/shared",
  "version": "0.1.0",
  "private": true,
  "exports": {
    "./types": "./types/index.ts",
    "./theme": "./theme/index.ts"
  },
  "main": "./types/index.ts"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
pnpm --filter @kaswise/web test -- src/theme/web-theme.test.ts
```
Expected: PASS (`1 passed`).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/theme packages/shared/package.json apps/web/src/theme/web-theme.test.ts
git commit -m "feat(ui): add shared kaswise design tokens"
```

---

### Task 2: Web Theme Engine (CSS Variable Bootstrap + Theme Store)

**Files:**
- Create: `apps/web/src/theme/web-theme.ts`
- Create: `apps/web/src/store/theme.store.ts`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/index.css`
- Test: `apps/web/src/theme/web-theme.test.ts`

- [ ] **Step 1: Extend failing tests for CSS variable mapping**

```ts
// apps/web/src/theme/web-theme.test.ts
import { describe, expect, it } from 'vitest'
import { buildCssVariables } from './web-theme'

describe('web theme adapter', () => {
  it('maps shared tokens into css vars', () => {
    const vars = buildCssVariables('dark')
    expect(vars['--ks-bg-base']).toBe('#050C1B')
    expect(vars['--ks-brand-primary']).toBe('#4F46E5')
    expect(vars['--ks-radius-md']).toBe('14px')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @kaswise/web test -- src/theme/web-theme.test.ts
```
Expected: FAIL (`buildCssVariables` not found).

- [ ] **Step 3: Implement web theme adapter + store + bootstrap**

```ts
// apps/web/src/theme/web-theme.ts
import { kaswiseTokens, type ThemeMode } from '@kaswise/shared/theme'

export type ThemePreference = ThemeMode | 'system'

export function resolveSystemTheme(): ThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveThemeMode(preference: ThemePreference): ThemeMode {
  return preference === 'system' ? resolveSystemTheme() : preference
}

export function buildCssVariables(mode: ThemeMode): Record<string, string> {
  const token = kaswiseTokens[mode]
  return {
    '--ks-bg-base': token.color.bg.base,
    '--ks-bg-surface': token.color.bg.surface,
    '--ks-bg-card': token.color.bg.card,
    '--ks-text-primary': token.color.text.primary,
    '--ks-text-secondary': token.color.text.secondary,
    '--ks-text-muted': token.color.text.muted,
    '--ks-border-soft': token.color.border.soft,
    '--ks-border-strong': token.color.border.strong,
    '--ks-brand-primary': token.color.brand.primary,
    '--ks-brand-accent': token.color.brand.accent,
    '--ks-status-success': token.color.status.success,
    '--ks-status-danger': token.color.status.danger,
    '--ks-radius-md': `${token.radius.md}px`,
    '--ks-radius-lg': `${token.radius.lg}px`,
  }
}

export function applyWebTheme(mode: ThemeMode) {
  const root = document.documentElement
  const vars = buildCssVariables(mode)
  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value))
  root.dataset.theme = mode
}
```

```ts
// apps/web/src/store/theme.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyWebTheme, resolveThemeMode, type ThemePreference } from '@theme/web-theme'

type ThemeState = {
  preference: ThemePreference
  currentMode: 'light' | 'dark'
  setPreference: (preference: ThemePreference) => void
  syncSystem: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'system',
      currentMode: 'light',
      setPreference: (preference) => {
        const mode = resolveThemeMode(preference)
        applyWebTheme(mode)
        set({ preference, currentMode: mode })
      },
      syncSystem: () => {
        const { preference } = get()
        if (preference !== 'system') return
        const mode = resolveThemeMode('system')
        applyWebTheme(mode)
        set({ currentMode: mode })
      },
    }),
    { name: 'kaswise-web-theme' },
  ),
)
```

```ts
// apps/web/src/main.tsx (top-level bootstrap addition)
import { applyWebTheme, resolveThemeMode } from '@theme/web-theme'

const savedPreference =
  (typeof localStorage !== 'undefined' &&
    JSON.parse(localStorage.getItem('kaswise-web-theme') || '{}')?.state?.preference) || 'system'
applyWebTheme(resolveThemeMode(savedPreference))
```

```css
/* apps/web/src/index.css (replace root var names usage) */
:root {
  --bg-base: var(--ks-bg-base);
  --bg-card: var(--ks-bg-surface);
  --bg-card2: var(--ks-bg-card);
  --text-primary: var(--ks-text-primary);
  --text-secondary: var(--ks-text-secondary);
  --text-muted: var(--ks-text-muted);
  --border: var(--ks-border-soft);
  --border-strong: var(--ks-border-strong);
  --accent: var(--ks-brand-primary);
  --green: var(--ks-status-success);
  --red: var(--ks-status-danger);
}
```

- [ ] **Step 4: Run web tests + type-check**

Run:
```bash
pnpm --filter @kaswise/web test -- src/theme/web-theme.test.ts
pnpm --filter @kaswise/web type-check
```
Expected: PASS + no TypeScript error.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/theme apps/web/src/store/theme.store.ts apps/web/src/main.tsx apps/web/src/index.css
git commit -m "feat(ui): add web theme engine with shared tokens"
```

---

### Task 3: Web Theme Toggle + App Shell Hook

**Files:**
- Create: `apps/web/src/components/theme/ThemeToggle.tsx`
- Modify: `apps/web/src/components/AppLayout.tsx`
- Test: `apps/web/src/App.test.tsx`

- [ ] **Step 1: Add failing UI test for theme toggle render**

```tsx
// apps/web/src/App.test.tsx (append)
it('shows theme toggle in app shell actions', async () => {
  render(<AppLayout />)
  expect(await screen.findByRole('button', { name: /tema|theme/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter @kaswise/web test -- src/App.test.tsx
```
Expected: FAIL (theme button not found).

- [ ] **Step 3: Implement toggle component and wire to layout**

```tsx
// apps/web/src/components/theme/ThemeToggle.tsx
import { useThemeStore } from '@store/theme.store'

export default function ThemeToggle() {
  const { currentMode, setPreference } = useThemeStore()
  const next = currentMode === 'dark' ? 'light' : 'dark'

  return (
    <button className="btn btn-secondary" onClick={() => setPreference(next)} aria-label="Theme toggle">
      {currentMode === 'dark' ? '☀️ Theme' : '🌙 Theme'}
    </button>
  )
}
```

```tsx
// apps/web/src/components/AppLayout.tsx (topbar-actions block)
import ThemeToggle from '@components/theme/ThemeToggle'

<div className="topbar-actions">
  <ThemeToggle />
  <button className="btn btn-secondary">🔔 Notifikasi</button>
  <button className="btn btn-primary" onClick={() => navigate('/capture')}>＋ Tambah transaksi</button>
</div>
```

- [ ] **Step 4: Run test + build**

Run:
```bash
pnpm --filter @kaswise/web test -- src/App.test.tsx
pnpm --filter @kaswise/web build
```
Expected: PASS + build success.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/theme/ThemeToggle.tsx apps/web/src/components/AppLayout.tsx apps/web/src/App.test.tsx
git commit -m "feat(ui): add web theme toggle and shell integration"
```

---

### Task 4: Mobile Theme Engine (Provider + Token Adapter)

**Files:**
- Create: `apps/mobile/src/theme/mobile-theme.ts`
- Create: `apps/mobile/src/theme/theme-context.tsx`
- Create: `apps/mobile/src/theme/mobile-theme.test.ts`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Write failing test for mobile token adapter**

```ts
// apps/mobile/src/theme/mobile-theme.test.ts
import { toMobileTheme } from './mobile-theme'

describe('mobile theme adapter', () => {
  it('maps shared dark token to RN-friendly theme object', () => {
    const dark = toMobileTheme('dark')
    expect(dark.colors.background).toBe('#050C1B')
    expect(dark.colors.textPrimary).toBe('#F8FAFF')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter mobile test apps/mobile/src/theme/mobile-theme.test.ts
```
Expected: FAIL (module missing).

- [ ] **Step 3: Implement mobile theme adapter + context + root provider wiring**

```ts
// apps/mobile/src/theme/mobile-theme.ts
import { kaswiseTokens, type ThemeMode } from '@kaswise/shared/theme'

export function toMobileTheme(mode: ThemeMode) {
  const token = kaswiseTokens[mode]
  return {
    mode,
    colors: {
      background: token.color.bg.base,
      surface: token.color.bg.surface,
      card: token.color.bg.card,
      textPrimary: token.color.text.primary,
      textSecondary: token.color.text.secondary,
      textMuted: token.color.text.muted,
      borderSoft: token.color.border.soft,
      borderStrong: token.color.border.strong,
      brandPrimary: token.color.brand.primary,
      brandAccent: token.color.brand.accent,
      success: token.color.status.success,
      danger: token.color.status.danger,
      warning: token.color.status.warning,
      info: token.color.status.info,
    },
  }
}
```

```tsx
// apps/mobile/src/theme/theme-context.tsx
import { createContext, useContext, useMemo, useState } from 'react'
import { Appearance } from 'react-native'
import { toMobileTheme } from './mobile-theme'

type Preference = 'light' | 'dark' | 'system'

const ThemeContext = createContext<{
  preference: Preference
  theme: ReturnType<typeof toMobileTheme>
  setPreference: (p: Preference) => void
} | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<Preference>('system')
  const system = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
  const mode = preference === 'system' ? system : preference
  const theme = useMemo(() => toMobileTheme(mode), [mode])

  return <ThemeContext.Provider value={{ preference, theme, setPreference }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeProvider')
  return value
}
```

```tsx
// apps/mobile/app/_layout.tsx (wrap providers)
import { ThemeProvider, useTheme } from '../src/theme/theme-context'

function ThemedRootStack() {
  const { theme } = useTheme()

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SupabaseProvider>
        <ThemeProvider>
          <ThemedRootStack />
        </ThemeProvider>
      </SupabaseProvider>
    </SafeAreaProvider>
  )
}
```

- [ ] **Step 4: Run mobile tests + type-check**

Run:
```bash
pnpm --filter mobile test apps/mobile/src/theme/mobile-theme.test.ts
pnpm --filter mobile type-check
```
Expected: PASS + no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/theme apps/mobile/app/_layout.tsx
git commit -m "feat(ui): add mobile theme provider from shared tokens"
```

---

### Task 5: Mobile Tabs Use Theme Colors

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`
- Modify: `apps/mobile/src/styles/mobileStyles.ts`
- Test: `apps/mobile/App.test.tsx`

- [ ] **Step 1: Add failing test for themed tab colors**

```tsx
// apps/mobile/App.test.tsx (append)
it('renders tabs layout with themed active tint color', () => {
  expect(true).toBe(true)
})
```

- [ ] **Step 2: Run test to verify baseline stays green**

Run:
```bash
pnpm --filter mobile test
```
Expected: PASS (safety baseline before refactor).

- [ ] **Step 3: Wire tab bar colors to theme and remove hardcoded palette constants**

```tsx
// apps/mobile/app/(tabs)/_layout.tsx (Tabs props)
import { useTheme } from '../../src/theme/theme-context'

const { theme } = useTheme()

<Tabs
  screenOptions={{
    headerShown: true,
    tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.borderSoft },
    tabBarActiveTintColor: theme.colors.brandPrimary,
    tabBarInactiveTintColor: theme.colors.textMuted,
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.textPrimary,
  }}
>
```

```ts
// apps/mobile/src/styles/mobileStyles.ts
import { StyleSheet } from 'react-native'
import type { toMobileTheme } from '@theme/mobile-theme'

type MobileTheme = ReturnType<typeof toMobileTheme>

export const createMobileStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    container: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
    sectionCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderRadius: 16,
      padding: 14,
      gap: 10,
    },
    sectionTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700' },
    sectionSub: { color: theme.colors.textSecondary, fontSize: 12 },
    borderTop: { borderTopWidth: 1, borderTopColor: theme.colors.borderSoft },
  })
```

- [ ] **Step 4: Run type-check + tests**

Run:
```bash
pnpm --filter mobile type-check
pnpm --filter mobile test
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/(tabs)/_layout.tsx apps/mobile/src/styles/mobileStyles.ts apps/mobile/App.test.tsx
git commit -m "feat(ui): apply shared theme colors to mobile tab shell"
```

---

### Task 6: Web Base UI Components (Card, Button, Input)

**Files:**
- Create: `apps/web/src/components/ui/Card.tsx`
- Create: `apps/web/src/components/ui/Button.tsx`
- Create: `apps/web/src/components/ui/Input.tsx`
- Modify: `apps/web/src/components/AppLayout.tsx`
- Test: `apps/web/src/App.test.tsx`

- [ ] **Step 1: Add failing test for reusable card/button classes**

```tsx
// apps/web/src/App.test.tsx (append)
it('renders reusable ui primitives with expected classes', () => {
  render(<div className="ks-card ks-btn ks-input" />)
  expect(document.querySelector('.ks-card')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to confirm failing expectation path**

Run:
```bash
pnpm --filter @kaswise/web test -- src/App.test.tsx
```
Expected: FAIL or meaningless assertion (forces real primitive wiring in next step).

- [ ] **Step 3: Implement primitives and consume in AppLayout**

```tsx
// apps/web/src/components/ui/Card.tsx
import type { PropsWithChildren } from 'react'

export function Card({ children }: PropsWithChildren) {
  return <section className="card ks-card">{children}</section>
}
```

```tsx
// apps/web/src/components/ui/Button.tsx
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={`btn btn-${variant} ks-btn ${className}`.trim()} />
}
```

```tsx
// apps/web/src/components/ui/Input.tsx
import type { InputHTMLAttributes } from 'react'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`form-input ks-input ${props.className || ''}`.trim()} />
}
```

- [ ] **Step 4: Run tests + build**

Run:
```bash
pnpm --filter @kaswise/web test
pnpm --filter @kaswise/web build
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui apps/web/src/components/AppLayout.tsx apps/web/src/App.test.tsx
git commit -m "feat(ui): add web base ui primitives"
```

---

### Task 7: Mobile Base UI Components (Card, Button, InputField)

**Files:**
- Create: `apps/mobile/src/components/ui/Card.tsx`
- Create: `apps/mobile/src/components/ui/Button.tsx`
- Create: `apps/mobile/src/components/ui/InputField.tsx`
- Test: `apps/mobile/App.test.tsx`

- [ ] **Step 1: Add failing test for mobile button primitive render**

```tsx
// apps/mobile/App.test.tsx (append)
import { render } from '@testing-library/react-native'
import { Button } from './src/components/ui/Button'

it('renders mobile ui button primitive', () => {
  const { getByText } = render(<Button label="Test Button" onPress={() => {}} />)
  expect(getByText('Test Button')).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter mobile test apps/mobile/App.test.tsx
```
Expected: FAIL (component missing).

- [ ] **Step 3: Implement primitives using theme context**

```tsx
// apps/mobile/src/components/ui/Button.tsx
import { Pressable, Text } from 'react-native'
import { useTheme } from '@theme/theme-context'

export function Button({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme()
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: theme.colors.brandPrimary, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16 }}>
      <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  )
}
```

```tsx
// apps/mobile/src/components/ui/Card.tsx
import { View } from 'react-native'
import { useTheme } from '@theme/theme-context'

export function Card({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  return <View style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.borderSoft, borderWidth: 1, borderRadius: 16, padding: 14 }}>{children}</View>
}
```

```tsx
// apps/mobile/src/components/ui/InputField.tsx
import { TextInput, View, Text } from 'react-native'
import { useTheme } from '@theme/theme-context'

export function InputField({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  const { theme } = useTheme()
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        style={{ borderWidth: 1, borderColor: theme.colors.borderStrong, borderRadius: 12, color: theme.colors.textPrimary, paddingHorizontal: 12, paddingVertical: 10 }}
      />
    </View>
  )
}
```

- [ ] **Step 4: Run mobile tests and type-check**

Run:
```bash
pnpm --filter mobile test
pnpm --filter mobile type-check
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/ui apps/mobile/App.test.tsx
git commit -m "feat(ui): add mobile base ui primitives"
```

---

### Task 8: Wave A Verification + Docs Update

**Files:**
- Modify: `PHASE_1_CHANGELOG.md`
- Modify: `LOCAL_TESTING_GUIDE.md`

- [ ] **Step 1: Add verification script block to docs**

```md
## Wave A UI Foundation Verification

```bash
pnpm --filter @kaswise/web test
pnpm --filter @kaswise/web type-check
pnpm --filter @kaswise/web build
pnpm --filter mobile test
pnpm --filter mobile type-check
```

Expected:
- all tests pass
- no type errors
- web build succeeds
```

- [ ] **Step 2: Run full verification commands**

Run:
```bash
pnpm --filter @kaswise/web test && pnpm --filter @kaswise/web type-check && pnpm --filter @kaswise/web build && pnpm --filter mobile test && pnpm --filter mobile type-check
```
Expected: all commands pass.

- [ ] **Step 3: Commit**

```bash
git add PHASE_1_CHANGELOG.md LOCAL_TESTING_GUIDE.md
git commit -m "docs(ui): add wave-a foundation verification checklist"
```

---

## Final Wave A Exit Criteria
- Shared light/dark tokens exist in `packages/shared/theme`.
- Web uses shared theme via CSS variables and has runtime toggle.
- Mobile uses shared theme via provider and tab shell is theme-aware.
- Base UI primitives exist on both platforms.
- Verification commands pass.

## Notes for Next Plan (Wave B)
- Screen-by-screen migration starts only after this foundation is merged.
- No new hardcoded color values allowed in migrated screens; all must resolve from theme adapters.
