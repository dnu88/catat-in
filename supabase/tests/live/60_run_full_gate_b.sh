#!/usr/bin/env bash
# FULL Gate B: rebuild the disposable database, align it to the production shape
# taken from the live export, then run BOTH assertion suites.
#
#   20_assert_transaction_entry_v2.sql  -> atomicity + idempotency + rollback
#   40_assert_rls.sql                   -> RLS enforcement as `authenticated`
set -uo pipefail

export PGPASSWORD=postgres
BASE="postgres://postgres:postgres@127.0.0.1:55432"
DB="kaswise_gateb"
REPO="/home/Danu88/apps/kaswise/supabase"
LIVE="$REPO/tests/live"
OUT=/tmp/kw-full.log

psql "$BASE/postgres" -q -c "drop database if exists $DB;" >/dev/null 2>&1
psql "$BASE/postgres" -q -c "create database $DB;" >/dev/null 2>&1
URL="$BASE/$DB"
run() { psql "$URL" -v ON_ERROR_STOP=1 -q -f "$1" >"$OUT" 2>&1; }

echo "== 1. stubs =="
run "$LIVE/00_supabase_stubs.sql" || { echo STUBS_FAILED; tail -5 "$OUT"; exit 1; }
echo ok

echo "== 2. date-lineage migrations =="
applied=0
for f in $(ls "$REPO"/migrations/2026*.sql | sort); do
  run "$f" && applied=$((applied+1)) || true
done
echo "applied=$applied (transfer migration deferred, needs the enum)"

echo "== 3. enum + transfer + idempotency migration =="
psql "$URL" -q -c "do \$\$ begin if not exists (select 1 from pg_type where typname='transaction_type') then create type public.transaction_type as enum ('income','expense'); end if; end \$\$;" >/dev/null 2>&1
run "$REPO/migrations/202606270001_transfer_transaction_type.sql" || { echo TRANSFER_FAILED; tail -3 "$OUT"; exit 1; }
run "$REPO/migrations/202610020001_transaction_entry_idempotency.sql" || { echo ENTRY_MIGRATION_FAILED; tail -3 "$OUT"; exit 1; }
echo ok

echo "== 4. align to PRODUCTION shape (from live export) =="
run "$LIVE/06_production_shape.sql" || { echo SHAPE_FAILED; tail -5 "$OUT"; exit 1; }
psql "$URL" -tAc "select 'transactions.type is now: ' || data_type || ' / ' || udt_name from information_schema.columns where table_name = 'transactions' and column_name = 'type';"

echo "== 5. supabase default grants =="
run "$LIVE/05_supabase_default_grants.sql" || { echo GRANTS_FAILED; tail -3 "$OUT"; exit 1; }
echo ok

echo
echo "===== SUITE A: atomicity / idempotency / rollback ====="
psql "$URL" -q -f "$LIVE/20_assert_transaction_entry_v2.sql" 2>&1 | grep -E "PASS|FAIL|ERROR" | sed 's/^psql[^N]*NOTICE:  //'

echo
echo "===== SUITE B: RLS as authenticated ====="
psql "$URL" -q -f "$LIVE/40_assert_rls.sql" 2>&1 | grep -E "PASS|FAIL|ERROR" | sed 's/^psql[^N]*NOTICE:  //'
