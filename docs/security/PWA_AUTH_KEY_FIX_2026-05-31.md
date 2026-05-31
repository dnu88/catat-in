# PWA Auth Key Fix

Date: 2026-05-31
Scope: Kaswise live PWA login failure after Supabase service/API key rotation.

## Problem

Manual QA found browser login was failing for both:

```text
Google OAuth
email/password
```

Root cause:

```text
The live PWA was still using the legacy JWT-style Supabase anon key.
Supabase returned: legacy API keys are disabled.
```

## Fix

Updated mobile/PWA public Supabase key source to the current publishable key:

```text
apps/mobile/app.json
apps/mobile/.env  (local ignored deploy input)
```

Updated deploy script:

```text
apps/mobile/scripts/deploy-pwa.mjs
```

Deploy script now:

1. Prefers app config/public env over stale `.env` values.
2. Always regenerates the runtime config injection block instead of reusing the previous deployed `index.html` block.

This prevents old public auth keys from being preserved across future PWA deploys.

## Validation

Validation performed:

```text
mobile type-check ✅
export:pwa ✅
deploy:pwa ✅
```

Live PWA auth probe:

```text
Live injected key prefix: sb_publishable_ ✅
Password auth endpoint with fake credentials returns invalid_credentials ✅
No longer returns legacy API keys are disabled ✅
Google OAuth authorize endpoint returns 302 to Google ✅
```

Latest deployed bundle:

```text
entry-0a40b5fa6185957c22dc73104724327d.js
```

## User QA Recommendation

Ask user to hard refresh or clear PWA/browser cache, then retry:

```text
https://kaswise.com/?v=auth-key-fix
```

For installed PWA/Add to Home Screen, close the PWA fully and reopen. If still stale, remove and reinstall the PWA shortcut.
