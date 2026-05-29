# Kaswise Go Live PWA Test System

Playwright smoke tests for the live Expo PWA served at `https://kaswise.com`.

## What it validates

- Live app loads and runtime Supabase env is injected.
- Dedicated test user can login/logout.
- Wallet creation works.
- Budget wallet creation works.
- Manual expense appears in Transactions and Reports.
- Swipe Edit action remains available.
- Capture text flow saves a transaction.
- Expense transactions create budget-envelope allocations in Supabase.
- Manual transaction success dialogs are accepted only when they match the expected save confirmation.
- Known unauthenticated Supabase auth-session console noise is ignored, while transaction/API errors still fail the smoke.

## Required secrets

Copy `.env.golive.example` to `.env.golive` in `apps/mobile` or set these in CI:

```bash
KASWISE_GOLIVE_BASE_URL=https://kaswise.com
KASWISE_GOLIVE_EMAIL=kaswise-golive-smoke@example.com
KASWISE_GOLIVE_PASSWORD=replace-with-strong-password
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key
```

The service-role key is used only in Node Playwright setup to create/confirm the test user and clean that user's rows. It is never exposed to browser code.

## Run

Install the Chromium browser once on a new machine:

```bash
corepack pnpm --filter mobile test:golive:install
```

Then run the smoke tests:

```bash
corepack pnpm --filter mobile test:golive
corepack pnpm --filter mobile test:golive:headed
corepack pnpm --filter mobile test:golive:debug
```

Root shortcut:

```bash
corepack pnpm test:golive:pwa
```

## Safety guard

By default the setup refuses to clean data unless `KASWISE_GOLIVE_EMAIL` contains one of:
`golive`, `go-live`, `smoke`, `e2e`, `qa`, or `test`.

Only override with `KASWISE_GOLIVE_ALLOW_UNSAFE_EMAIL=true` for a dedicated disposable account.
