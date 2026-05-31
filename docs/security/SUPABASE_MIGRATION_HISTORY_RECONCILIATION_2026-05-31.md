# Supabase Migration History Reconciliation

Date: 2026-05-31
Repo: `/home/Danu88/catat-in`
Linked project ref: `xqvtsgfakuehjwdmenuw`

## Goal

Reconcile the linked live Supabase migration history so future migration commands do not attempt to re-run old local migrations or ignore legacy remote migrations.

Before reconciliation, `supabase migration list --linked` showed:

```text
Remote-only legacy migrations: 001..008
Local-only timestamp migrations: 202605060001..202605300001
Already matched: 202605310001
```

This meant `supabase db push` was unsafe because it could attempt to apply old local migrations to an already-evolved live database.

## Actions Performed

### 1. Fetched legacy remote migration files

Legacy migrations from the live migration history were fetched and added to the repo:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_missing_tables.sql
supabase/migrations/003_fix_schema.sql
supabase/migrations/004_repair_auth_cloud.sql
supabase/migrations/005_custom_categories.sql
supabase/migrations/006_prd_phase1_alignment.sql
supabase/migrations/007_categories_schema_backfill.sql
supabase/migrations/008_fix_group_members_rls_recursion.sql
```

These files represent the legacy migration history that already existed in the live Supabase project.

### 2. Marked existing timestamp migrations as applied

The following local timestamp migrations were repaired as `applied` in the linked live migration history:

```text
202605060001
202605060002
202605130001
202605200001
202605210001
202605210002
202605260001
202605260002
202605270001
202605280001
202605290001
202605290002
202605290003
202605300001
```

Command used:

```bash
supabase migration repair --linked --status applied \
  202605060001 202605060002 202605130001 202605200001 \
  202605210001 202605210002 202605260001 202605260002 \
  202605270001 202605280001 202605290001 202605290002 \
  202605290003 202605300001
```

Important: this repair updates migration history only. It does not execute SQL. This was intentional because the live database had already evolved through a mix of legacy migrations, manual/live-applied migrations, and recent security hardening.

### 3. Verified migration list is aligned

After reconciliation, `supabase migration list --linked` showed all local and remote migration versions aligned:

```text
001          | 001
002          | 002
003          | 003
004          | 004
005          | 005
006          | 006
007          | 007
008          | 008
202605060001 | 202605060001
202605060002 | 202605060002
202605130001 | 202605130001
202605200001 | 202605200001
202605210001 | 202605210001
202605210002 | 202605210002
202605260001 | 202605260001
202605260002 | 202605260002
202605270001 | 202605270001
202605280001 | 202605280001
202605290001 | 202605290001
202605290002 | 202605290002
202605290003 | 202605290003
202605300001 | 202605300001
202605310001 | 202605310001
```

### 4. Verified future push safety with dry-run

Command:

```bash
supabase db push --linked --dry-run
```

Result:

```text
Remote database is up to date.
```

## Current Migration Status

As of this reconciliation, the repo and linked live Supabase migration history are aligned.

Future new migration files should appear as local-only until applied normally.

## Important Caveat

Some timestamp migrations were marked as applied for history reconciliation/baselining purposes. They should not be interpreted as proof that every object from each timestamp migration exactly exists in the live DB.

Example observed during security migration apply:

```text
public.usage_counters table is absent on live DB
```

Therefore, for sensitive schema assumptions, verify live schema directly instead of relying only on old migration file contents.

## Recommended Future Practice

1. For every new schema change, create a timestamped migration.
2. Apply through Supabase CLI or a documented SQL execution path.
3. Immediately verify with:
   ```bash
   supabase migration list --linked
   supabase db push --linked --dry-run
   ```
4. Avoid manual schema edits in Studio unless also captured in a migration.
5. Do not run `supabase db push --include-all` unless explicitly intended and reviewed.
