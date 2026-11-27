#!/usr/bin/env bash
# Rebuild the disposable Gate B database, then run the RLS assertions as the
# real `authenticated` role.
set -uo pipefail

export PGPASSWORD=postgres
BASE="postgres://postgres:postgres@127.0.0.1:55432"
DB="kaswise_gateb"
REPO="/home/Danu88/apps/kaswise/supabase"
LIVE="$REPO/tests/live"

psql "$BASE/postgres" -q -c "drop database if exists $DB;" >/dev/null 2>&1
psql "$BASE/postgres" -q -c "create database $DB;" >/dev/null 2>&1
URL="$BASE/$DB"

run() { psql "$URL" -v ON_ERROR_STOP=1 -q -f "$1" >/tmp/kw-out.txt 2>&1; }

echo "== stubs =="
run "$LIVE/00_supabase_stubs.sql" || { echo STUBS_FAILED; tail -5 /tmp/kw-out.txt; exit 1; }
echo ok

echo "== migrations (date-prefixed lineage) =="
pass=0; fail=0
for f in $(ls "$REPO"/migrations/2026*.sql | sort); do
  if run "$f"; then pass=$((pass+1)); else
    fail=$((fail+1))
    printf '  warn-fail %s\n' "$(basename "$f")"   # 202606270001 needs the enum; re-applied below
  fi
done
echo "applied=$pass pre-enum-failures=$fail"

psql "$URL" -q -c "do \$\$ begin if not exists (select 1 from pg_type where typname='transaction_type') then create type public.transaction_type as enum ('income','expense'); end if; end \$\$;" >/dev/null 2>&1
run "$REPO/migrations/202606270001_transfer_transaction_type.sql" || { echo TRANSFER_FAILED; tail -5 /tmp/kw-out.txt; exit 1; }
run "$REPO/migrations/202610020001_transaction_entry_idempotency.sql" || { echo ENTRY_MIGRATION_FAILED; tail -5 /tmp/kw-out.txt; exit 1; }
echo "enum + transfer + idempotency migration ok"

echo "== supabase default grants =="
run "$LIVE/05_supabase_default_grants.sql" || { echo GRANTS_FAILED; tail -5 /tmp/kw-out.txt; exit 1; }
echo ok

echo "== RLS assertions (role: authenticated) =="
if psql "$URL" -q -f "$LIVE/40_assert_rls.sql" 2>&1 | grep -E "PASS|FAIL|ERROR|ASSERT"; then
  echo "RLS_ASSERTIONS_RAN"
else
  echo "RLS_ASSERTIONS_SCRIPT_FAILED"
  exit 2
fi
