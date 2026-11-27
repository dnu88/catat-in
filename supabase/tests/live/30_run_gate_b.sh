#!/usr/bin/env bash
# Gate B live-ish check on a DISPOSABLE local PostgreSQL.
#
# Reconstructs a production-shaped schema, then runs the runtime assertions for
# create_transaction_entry_v2.
#
# IMPORTANT: the Kaswise migration history is NOT replayable from scratch — the
# numeric lineage (001/003/005) and the date-prefixed lineage conflict, so a
# naive "apply everything in order" produces a schema that does not match
# production. This script therefore applies the date-prefixed lineage (which
# carries nominal/kategori/tanggal/catatan + households + can_write_household)
# plus the transaction_type enum that production inherited from the numeric
# lineage, then the transfer migration. It is a reconstruction, NOT a dump of
# the real database. A faithful Gate B still requires a staging dump.
set -uo pipefail

export PGPASSWORD=postgres
BASE="postgres://postgres:postgres@127.0.0.1:55432"
DB="kaswise_gateb"
REPO="/home/Danu88/apps/kaswise/supabase"

psql "$BASE/postgres" -q -c "drop database if exists $DB;" >/dev/null 2>&1
psql "$BASE/postgres" -q -c "create database $DB;" >/dev/null 2>&1
URL="$BASE/$DB"

run() { psql "$URL" -v ON_ERROR_STOP=1 -q -f "$1" >/tmp/kw-out.txt 2>&1; }

echo "== 1. Supabase stubs =="
run "$REPO/tests/live/00_supabase_stubs.sql" || { echo STUBS_FAILED; tail -5 /tmp/kw-out.txt; exit 1; }
echo "ok"

echo "== 2. date-prefixed migrations =="
pass=0; fail=0
for f in $(ls "$REPO"/migrations/2026*.sql | sort); do
  if run "$f"; then pass=$((pass+1)); else
    fail=$((fail+1))
    printf 'FAIL %s\n' "$(basename "$f")"
    grep -E "ERROR:" /tmp/kw-out.txt | head -1 | sed 's/^/       /'
  fi
done
echo "applied=$pass failed=$fail"

echo "== 3. enum inherited from the numeric lineage (production shape) =="
psql "$URL" -q -c "do \$\$ begin if not exists (select 1 from pg_type where typname='transaction_type') then create type public.transaction_type as enum ('income','expense'); end if; end \$\$;" >/dev/null 2>&1
echo "ok"

echo "== 4. re-apply transfer migration (needs the enum) =="
run "$REPO/migrations/202606270001_transfer_transaction_type.sql" \
  && echo "ok" || { echo "TRANSFER_MIGRATION_FAILED"; tail -5 /tmp/kw-out.txt; }

echo "== 5. re-apply the new idempotency migration =="
run "$REPO/migrations/202610020001_transaction_entry_idempotency.sql" \
  && echo "ok" || { echo "ENTRY_MIGRATION_FAILED"; tail -5 /tmp/kw-out.txt; exit 1; }

echo "== schema shape =="
psql "$URL" -tAc "select 'type_col=' || data_type || ' udt=' || udt_name from information_schema.columns where table_schema='public' and table_name='transactions' and column_name='type';"
psql "$URL" -tAc "select 'target_wallet_id=' || exists(select 1 from information_schema.columns where table_schema='public' and table_name='transactions' and column_name='target_wallet_id');"
psql "$URL" -tAc "select 'balance_trigger=' || exists(select 1 from pg_trigger where tgname='sync_wallet_balance_from_transaction');"

echo "== 6. runtime assertions =="
if psql "$URL" -q -f "$REPO/tests/live/20_assert_transaction_entry_v2.sql" 2>&1 | grep -E "PASS|FAIL|ERROR|ASSERT"; then
  echo "ASSERTIONS_RAN"
else
  echo "ASSERTIONS_SCRIPT_FAILED"
  exit 2
fi
