#!/usr/bin/env bash
# Apply the real Kaswise migrations, in order, to a DISPOSABLE local PostgreSQL
# that carries the Supabase stubs from 00_supabase_stubs.sql.
#
# Usage: SUPABASE_DB_URL=postgres://... bash 10_apply_migrations.sh
# Never point this at production: it replays every migration from scratch.
set -uo pipefail

PSQL_BIN="${PSQL_BIN:-psql}"
export PGPASSWORD="${PGPASSWORD:-postgres}"
DB_URL="${SUPABASE_DB_URL:?set SUPABASE_DB_URL}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$(cd "${HERE}/../../migrations" && pwd)"
STUBS="${HERE}/00_supabase_stubs.sql"

run_file() {
  local file="$1"
  "$PSQL_BIN" "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$file" >/tmp/kaswise-mig-out.txt 2>&1
}

echo "== applying Supabase stubs =="
if ! run_file "$STUBS"; then
  echo "STUBS_FAILED"
  cat /tmp/kaswise-mig-out.txt
  exit 1
fi
echo "stubs OK"

pass=0
fail=0
failed_list=""

for file in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
  name="$(basename "$file")"
  if run_file "$file"; then
    printf 'PASS  %s\n' "$name"
    pass=$((pass + 1))
  else
    printf 'FAIL  %s\n' "$name"
    sed -n '1,6p' /tmp/kaswise-mig-out.txt | sed 's/^/        /'
    fail=$((fail + 1))
    failed_list="${failed_list}${name} "
  fi
done

echo "----------------------------------------"
echo "applied=${pass} failed=${fail}"
if [ "$fail" -gt 0 ]; then
  echo "FAILED_FILES=${failed_list}"
  exit 2
fi
echo "ALL_MIGRATIONS_APPLIED"
