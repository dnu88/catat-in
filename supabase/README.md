# Kaswise Supabase Setup

## Overview
This directory contains the Supabase schema, migrations, and configuration for Kaswise v1.0 (mobile-first Expo + Supabase Cloud).

## Migration Files
1. `202605060001_kaswise_base_schema.sql` — Core tables, indexes, triggers, RLS policies
2. `202605060002_storage_buckets.sql` — Storage buckets for receipts and voice inputs

## Schema Summary
- **profiles** — Extends auth.users with plan info
- **wallets** — User wallets (cash, bank, ewallet, investment)
- **transactions** — Core transaction table with async AI status (`processing`/`done`/`error`)
- **categories** — Custom categories per user
- **budgets** — Monthly/weekly budgets per category
- **bill_reminders** — Recurring bill reminders
- **groups** & **group_members** — Group finance collaboration
- **monthly_summaries** — Cached monthly reports
- **usage_counters** — Free tier usage tracking (AI text, voice, import)

## Storage Buckets
- `receipts` — Private per-user receipt uploads (JPG/PNG/WEBP/PDF)
- `voice-inputs` — Private per-user voice recordings (auto-delete after processing)

## RLS (Row Level Security)
All tables have RLS enabled with policies ensuring users can only access their own data. Group tables allow access based on membership.

## Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note the project URL and anon key from Settings → API

### 2. Configure Environment
Add to `.env` or `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Apply Migrations
#### Option A: Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

#### Option B: SQL Editor
Copy the contents of both migration files into the Supabase SQL Editor and run.

### 4. Enable Auth Providers
In Supabase Dashboard → Authentication → Providers:
- Enable "Email"
- Enable "Google OAuth" (configure OAuth credentials)

### 5. Verify Setup
1. Check tables exist in Table Editor
2. Verify RLS is enabled (green shield icon)
3. Test auth flow in mobile app

## Local Development
```bash
# Start local Supabase
supabase start

# Apply migrations locally
supabase db reset

# Stop local Supabase
supabase stop
```

## Edge Functions (Phase 1 — AI Core)

Edge Functions are implemented in `supabase/functions/`:

### `process-text` — AI text extraction
- **Input**: `{ transaction_id, raw_text, user_id }`
- **Flow**: Claude Haiku extraction → confidence scoring → auto-save jika ≥0.85
- **Output**: `{ status, confidence, review_required, fields }`

### `process-image` — OCR receipt processing
- **Input**: `{ transaction_id, image_url, user_id, is_physical_receipt? }`
- **Flow**: Claude Haiku vision extraction → confidence scoring → auto-save jika ≥0.85
- **Output**: `{ status, confidence, review_required, fields }`

### `process-voice` — Voice transcription + extraction
- **Input**: `{ transaction_id, audio_path, user_id }`
- **Flow**: Whisper transcribe → Claude Haiku extraction → auto-delete audio file
- **Output**: `{ status, confidence, review_required, fields }`

### `check-usage` — Premium gate enforcement (Future)
- **Input**: `{ user_id, feature }`
- **Flow**: Check usage counters → enforce free tier limits
- **Output**: `{ allowed, remaining, limit }`

### Environment Variables Required
```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Deployment
```bash
# Deploy all functions
supabase functions deploy process-text
supabase functions deploy process-image
supabase functions deploy process-voice

# Set environment variables
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
```