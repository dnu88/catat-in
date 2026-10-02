"""Static regression tests for the transaction-entry idempotency migration.

Follows the existing supabase/tests pattern: the SQL is validated as source text
against the whole migration set, so the contract cannot silently drift.

These tests prove SHAPE and DEPENDENCIES. They do not prove runtime atomicity —
that requires applying the migration to a real PostgreSQL/Supabase instance.
"""

from pathlib import Path
import re
import unittest

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"
SQL = "\n".join(path.read_text() for path in sorted(MIGRATIONS.glob("*.sql")))

MIGRATION_FILE = MIGRATIONS / "202610020001_transaction_entry_idempotency.sql"


def _entry_migration() -> str:
    if not MIGRATION_FILE.exists():
        raise AssertionError(f"missing migration: {MIGRATION_FILE.name}")
    return MIGRATION_FILE.read_text()


def _function_body(sql: str) -> str:
    match = re.search(
        r"create or replace function public\.create_transaction_entry_v2\(.*?\$\$\n(.*?)\n\$\$;",
        sql,
        re.S,
    )
    if match is None:
        raise AssertionError("create_transaction_entry_v2 not found")
    return match.group(1)


class TransactionEntryIdempotencyMigrationTest(unittest.TestCase):
    def setUp(self):
        self.sql = _entry_migration()

    # ── additive-only guarantee ──────────────────────────────────────────────
    def test_migration_is_additive_only(self):
        lowered = self.sql.lower()
        self.assertNotIn("drop table", lowered)
        self.assertNotIn("drop column", lowered)
        self.assertNotIn("alter column", lowered)
        # Never rewrites the tables that own balances or transactions.
        self.assertNotRegex(lowered, r"alter table public\.transactions\b")
        self.assertNotRegex(lowered, r"alter table public\.wallets\b")

    # ── dependencies really exist earlier in the migration set ───────────────
    def test_dependencies_exist_in_migration_set(self):
        self.assertIn("create table if not exists public.households (", SQL)
        self.assertIn("create or replace function public.can_write_household(", SQL)
        self.assertIn("create type transaction_type as enum", SQL)
        self.assertIn("alter type public.transaction_type add value if not exists 'transfer';", SQL)

    def test_columns_used_by_the_insert_exist(self):
        for column in (
            "target_wallet_id",
            "input_type",
            "raw_input",
            "review_required",
            "is_verified",
            "household_id",
            "created_by",
            "updated_by",
        ):
            self.assertIn(column, SQL, f"{column} must exist in the schema")
        self.assertIn("add column if not exists target_wallet_id uuid", SQL)

    # ── operation identity ──────────────────────────────────────────────────
    def test_operation_table_keys_personal_saves_too(self):
        # NULLS NOT DISTINCT is required: personal saves carry household_id = null
        # and a plain unique constraint would let two personal submits both win.
        self.assertRegex(
            self.sql,
            r"unique nulls not distinct \(user_id, household_id, request_id\)",
        )

    def test_operation_table_is_rls_protected_owner_only(self):
        self.assertIn(
            "alter table public.transaction_entry_operations enable row level security;",
            self.sql,
        )
        self.assertRegex(self.sql, r"for select using \(user_id = auth\.uid\(\)\)")
        self.assertRegex(self.sql, r"for insert with check \(user_id = auth\.uid\(\)\)")
        self.assertRegex(self.sql, r"for update using \(user_id = auth\.uid\(\)\)")

    # ── RPC security posture ────────────────────────────────────────────────
    def test_rpc_does_not_escalate_privileges(self):
        header = self.sql.split("as $$")[0].lower()
        self.assertIn("security invoker", header)
        self.assertNotIn("security definer", header)
        self.assertIn("set search_path = public", header)

    def test_rpc_derives_identity_server_side_only(self):
        body = _function_body(self.sql)
        self.assertIn("auth.uid()", body)
        # The caller must never be able to pass a user id.
        self.assertNotIn("p_user_id", self.sql)
        self.assertIn("ENTRY_AUTH_REQUIRED", body)

    def test_rpc_rejects_viewers(self):
        body = _function_body(self.sql)
        self.assertIn("public.can_write_household(", body)
        self.assertIn("ENTRY_PERMISSION_DENIED", body)

    def test_rpc_is_granted_to_authenticated_only(self):
        self.assertRegex(
            self.sql,
            r"revoke all on function public\.create_transaction_entry_v2\([^)]*\) from public, anon;",
        )
        self.assertRegex(
            self.sql,
            r"grant execute on function public\.create_transaction_entry_v2\([^)]*\) to authenticated;",
        )

    # ── idempotency contract ────────────────────────────────────────────────
    def test_replay_returns_recorded_rows_without_inserting(self):
        body = _function_body(self.sql)
        self.assertIn("ENTRY_REQUEST_CONFLICT", body)
        # Both the fast path and the unique-violation race path return the
        # previously recorded ids instead of inserting again.
        self.assertGreaterEqual(body.count("where t.id = any (v_operation.transaction_ids)"), 2)

    def test_same_request_id_with_new_fingerprint_is_rejected(self):
        body = _function_body(self.sql)
        self.assertGreaterEqual(body.count("v_operation.fingerprint is distinct from p_fingerprint"), 2)
        self.assertIn("errcode = '23505'", body)

    # ── atomicity ───────────────────────────────────────────────────────────
    def test_batch_insert_is_one_statement(self):
        body = _function_body(self.sql)
        # One INSERT ... SELECT over the jsonb array: any bad draft aborts the
        # whole statement, so no partial batch can be observed.
        self.assertIn("from jsonb_array_elements(p_drafts)", body)
        self.assertEqual(body.count("insert into public.transactions"), 1)
        self.assertGreaterEqual(body.count("jsonb_array_length(p_drafts)"), 1)

    def test_rpc_never_touches_wallet_balances(self):
        body = _function_body(self.sql)
        self.assertNotIn("update public.wallets", body)
        self.assertIn("sync_wallet_balance_from_transaction", self.sql)

    def test_context_type_is_validated(self):
        body = _function_body(self.sql)
        self.assertIn("not in ('personal', 'household')", body)


if __name__ == "__main__":
    unittest.main()
