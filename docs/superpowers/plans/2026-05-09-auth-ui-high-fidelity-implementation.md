# Auth UI High-Fidelity (Web Legacy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Login/Register/Forgot/Reset pages to a shared high-fidelity auth layout that matches approved mockup direction and stays theme-aware.

**Architecture:** Build a reusable `AuthShell` + centralized `auth-shell.css`, then migrate each auth page to use shared structure while preserving existing auth logic and route behavior. Validate with test-first updates to public route assertions and full web test/build checks.

**Tech Stack:** React 18, TypeScript, Vite, CSS, Vitest, Playwright

---

### Task 1: Add/adjust tests first for shared auth UI contract

**Files:**
- Modify: `apps/web/tests/e2e/public-routes.spec.ts`
- Modify: `apps/web/src/App.test.tsx`

- [ ] **Step 1: Update public route expectations to stable text shared by new shell**

```ts
// keep route coverage, update heading assertions if wording changes
await expect(page.getByRole("heading", { name: /masuk|sign in/i })).toBeVisible()
await expect(page.getByRole("heading", { name: /buat akun|create/i })).toBeVisible()
await expect(page.getByRole("heading", { name: /lupa password|forgot password/i })).toBeVisible()
await expect(page.getByRole("heading", { name: /atur password baru|set new password/i })).toBeVisible()
```

- [ ] **Step 2: Add unit-level smoke render for AuthShell hooks/classes**

```tsx
import { render, screen } from '@testing-library/react'
// render one auth page and assert brand + form region text visible
```

- [ ] **Step 3: Run tests to verify baseline behavior (expected failures allowed before implementation changes)**

Run: `pnpm --filter web test -- App.test.tsx`

### Task 2: Create shared auth shell component and stylesheet

**Files:**
- Create: `apps/web/src/components/auth/AuthShell.tsx`
- Create: `apps/web/src/components/auth/auth-shell.css`

- [ ] **Step 1: Create `AuthShell.tsx` with slots for brand/form/success panels**

```tsx
import type { ReactNode } from 'react'
import './auth-shell.css'

type AuthShellProps = {
  brandTitle: string
  brandTagline: ReactNode
  features?: string[]
  children: ReactNode
}

export default function AuthShell({ brandTitle, brandTagline, features = [], children }: AuthShellProps) {
  return (
    <div className="auth-shell">
      <aside className="auth-shell__brand">...</aside>
      <main className="auth-shell__panel">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Implement high-fidelity responsive CSS in `auth-shell.css`**

```css
.auth-shell { min-height: 100vh; display: grid; grid-template-columns: 1.05fr 1fr; }
.auth-shell__brand { background: var(--g-card); position: relative; overflow: hidden; }
.auth-shell__panel { background: var(--bg-base); display:flex; align-items:center; justify-content:center; }
@media (max-width: 920px) { .auth-shell { grid-template-columns: 1fr; } }
```

- [ ] **Step 3: Wire form primitives classes (`auth-card`, `auth-alert`, `auth-divider`, etc.)**

### Task 3: Migrate Login page to shared shell

**Files:**
- Modify: `apps/web/src/pages/LoginPage.tsx`

- [ ] **Step 1: Replace inline `<style>` block and old layout wrappers with `AuthShell` structure**
- [ ] **Step 2: Keep current auth logic (`signInWithEmail`, `signInWithGoogle`, error mapping) unchanged**
- [ ] **Step 3: Keep selectors used by tests (`.login-error`) by mapping to new alert class if needed**
- [ ] **Step 4: Run route smoke test**

Run: `pnpm --filter web test:e2e --grep "public routes"`

### Task 4: Migrate Register page to shared shell

**Files:**
- Modify: `apps/web/src/pages/RegisterPage.tsx`

- [ ] **Step 1: Move success and form states into shared `AuthShell`**
- [ ] **Step 2: Remove duplicated `registerStyles` constant**
- [ ] **Step 3: Preserve register logic (`createUserWithEmailAndPassword`, profile sync) exactly**
- [ ] **Step 4: Run unit tests**

Run: `pnpm --filter web test`

### Task 5: Migrate Forgot + Reset pages to shared shell

**Files:**
- Modify: `apps/web/src/pages/ForgotPasswordPage.tsx`
- Modify: `apps/web/src/pages/ResetPasswordPage.tsx`

- [ ] **Step 1: Replace `simple-auth-*` inline styles with shared classes**
- [ ] **Step 2: Preserve reset-link validity fallback message behavior**
- [ ] **Step 3: Keep bilingual labels and existing submit actions unchanged**
- [ ] **Step 4: Run public routes e2e smoke**

Run: `pnpm --filter web test:e2e --grep "public routes"`

### Task 6: Final verification and cleanup

**Files:**
- Modify (if needed): `apps/web/src/pages/*.tsx`

- [ ] **Step 1: Ensure no large inline auth style blocks remain**
- [ ] **Step 2: Run full validation commands**

```bash
pnpm --filter web test
pnpm --filter web test:e2e --grep "public routes"
pnpm --filter web build
```

- [ ] **Step 3: Commit implementation**

```bash
git add apps/web/src/components/auth apps/web/src/pages apps/web/tests/e2e/public-routes.spec.ts apps/web/src/App.test.tsx
git commit -m "feat(web): refactor auth pages to shared high-fidelity shell"
```

## Spec coverage checklist

- Shared auth layout/styles: covered (Task 2)
- Login/Register/Forgot/Reset migration: covered (Tasks 3–5)
- Responsive + theme-aware: covered (Task 2 CSS constraints)
- No auth logic change: enforced in Tasks 3–5
- Verification desktop/mobile/light/dark baseline: covered by Task 6 + manual check
