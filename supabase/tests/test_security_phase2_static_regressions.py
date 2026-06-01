from pathlib import Path
import re
import unittest

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"
ALL_SQL = "\n".join(path.read_text() for path in sorted(MIGRATIONS.glob("*.sql")))
SECURITY_PHASE1_SQL = (MIGRATIONS / "202605310001_security_hardening_phase1.sql").read_text()
ALLOCATION_UNIQUE_SQL = (MIGRATIONS / "202605310002_repair_transaction_envelope_allocations_unique.sql").read_text()
SECURITY_PHASE2_SQL = (MIGRATIONS / "202606010001_security_hardening_phase2.sql").read_text()


def normalized(sql: str) -> str:
    return re.sub(r"\s+", " ", sql.lower()).strip()


NORMALIZED_ALL = normalized(ALL_SQL)
NORMALIZED_SECURITY_PHASE1 = normalized(SECURITY_PHASE1_SQL)
NORMALIZED_ALLOCATION_UNIQUE = normalized(ALLOCATION_UNIQUE_SQL)
NORMALIZED_SECURITY_PHASE2 = normalized(SECURITY_PHASE2_SQL)


class SecurityPhase2StaticRegressionTest(unittest.TestCase):
    def test_high_risk_tables_have_rls_enabled_in_migrations(self):
        tables = [
            "profiles",
            "wallets",
            "transactions",
            "categories",
            "budgets",
            "bill_reminders",
            "budget_envelopes",
            "transaction_envelope_allocations",
            "households",
            "household_members",
        ]

        for table in tables:
            with self.subTest(table=table):
                self.assertIn(
                    f"alter table public.{table} enable row level security",
                    NORMALIZED_ALL,
                )

    def test_financial_tables_have_personal_or_household_policy_sets(self):
        tables = [
            "transactions",
            "wallets",
            "budgets",
            "bill_reminders",
            "budget_envelopes",
            "transaction_envelope_allocations",
        ]
        operations = ["select", "insert", "update", "delete"]

        for table in tables:
            for operation in operations:
                with self.subTest(table=table, operation=operation):
                    self.assertIn(
                        f'{table}_{operation}_personal_or_household',
                        NORMALIZED_ALL,
                    )

    def test_profile_billing_fields_are_server_managed(self):
        self.assertIn("prevent_profile_server_managed_field_change", NORMALIZED_SECURITY_PHASE1)
        self.assertIn("new.plan_type is distinct from old.plan_type", NORMALIZED_SECURITY_PHASE1)
        self.assertIn("new.plan_expires_at is distinct from old.plan_expires_at", NORMALIZED_SECURITY_PHASE1)
        self.assertIn("raise exception 'profile billing fields are server-managed'", NORMALIZED_SECURITY_PHASE1)
        self.assertIn("before update on public.profiles", NORMALIZED_SECURITY_PHASE1)

    def test_profile_billing_trigger_allows_service_role_and_blocks_client_insert_escalation(self):
        self.assertIn("coalesce(auth.role(), '') = 'service_role'", NORMALIZED_SECURITY_PHASE2)
        self.assertIn("before insert or update on public.profiles", NORMALIZED_SECURITY_PHASE2)
        self.assertIn("new.plan_type <> 'free'", NORMALIZED_SECURITY_PHASE2)
        self.assertIn("new.plan_expires_at is not null", NORMALIZED_SECURITY_PHASE2)

    def test_wallet_balance_and_transaction_wallet_scope_are_guarded(self):
        self.assertIn("prevent_wallet_balance_direct_change", NORMALIZED_SECURITY_PHASE2)
        self.assertIn("wallet balance is transaction-managed", NORMALIZED_SECURITY_PHASE2)
        self.assertIn("kaswise.wallet_balance_trigger", NORMALIZED_SECURITY_PHASE2)
        self.assertIn("prevent_transaction_wallet_scope_mismatch", NORMALIZED_SECURITY_PHASE2)
        self.assertIn("wallet_matches_transaction_scope", NORMALIZED_SECURITY_PHASE2)

    def test_import_hash_uniqueness_and_avatar_policy_repair_are_present(self):
        self.assertIn("alter table public.transactions add column if not exists import_hash", NORMALIZED_SECURITY_PHASE2)
        self.assertIn("transactions_import_hash_wallet_uidx", NORMALIZED_SECURITY_PHASE2)
        self.assertIn('drop policy if exists "avatars_select_public"', NORMALIZED_SECURITY_PHASE2)
        self.assertIn('create policy "avatars_insert_own"', NORMALIZED_SECURITY_PHASE2)

    def test_usage_counters_only_keep_user_read_policy_for_clients(self):
        self.assertIn('drop policy if exists "usage_counters_insert_own"', NORMALIZED_SECURITY_PHASE1)
        self.assertIn('drop policy if exists "usage_counters_update_own"', NORMALIZED_SECURITY_PHASE1)
        self.assertIn('drop policy if exists "usage_counters_delete_own"', NORMALIZED_SECURITY_PHASE1)
        self.assertIn('create policy "usage_counters_select_own"', NORMALIZED_SECURITY_PHASE1)
        self.assertIn("for select using (auth.uid() = user_id)", NORMALIZED_SECURITY_PHASE1)

    def test_transaction_allocation_uniqueness_is_idempotently_repaired(self):
        self.assertIn("delete from public.transaction_envelope_allocations a", NORMALIZED_ALLOCATION_UNIQUE)
        self.assertIn("using public.transaction_envelope_allocations b", NORMALIZED_ALLOCATION_UNIQUE)
        self.assertIn("a.transaction_id = b.transaction_id", NORMALIZED_ALLOCATION_UNIQUE)
        self.assertIn("a.envelope_id = b.envelope_id", NORMALIZED_ALLOCATION_UNIQUE)
        self.assertIn("create unique index if not exists transaction_envelope_allocations_tx_env_uidx", NORMALIZED_ALLOCATION_UNIQUE)
        self.assertIn("on public.transaction_envelope_allocations(transaction_id, envelope_id)", NORMALIZED_ALLOCATION_UNIQUE)

    def test_household_allocation_writes_do_not_use_broad_member_permission(self):
        allocation_policy_names = [
            "transaction_envelope_allocations_insert_personal_or_household",
            "transaction_envelope_allocations_update_personal_or_household",
            "transaction_envelope_allocations_delete_personal_or_household",
        ]

        for policy_name in allocation_policy_names:
            with self.subTest(policy=policy_name):
                match = re.search(
                    rf'create policy "{re.escape(policy_name)}" on public\.transaction_envelope_allocations\n(.*?);\n',
                    ALL_SQL,
                    re.S,
                )
                self.assertIsNotNone(match, f"Policy {policy_name} not found")
                body = normalized(match.group(1))
                self.assertNotIn("can_write_household", body)
                if "insert" in policy_name or "delete" in policy_name:
                    self.assertNotIn("is_household_member", body)


if __name__ == "__main__":
    unittest.main()
