from pathlib import Path
import re
import unittest

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"
SQL = "\n".join(path.read_text() for path in sorted(MIGRATIONS.glob("*.sql")))


class WalletBalanceTriggerMigrationTest(unittest.TestCase):
    def test_wallet_balance_trigger_exists_for_transaction_mutations(self):
        self.assertIn("create or replace function public.sync_wallet_balance_from_transaction()", SQL)
        self.assertRegex(SQL, r"drop trigger if exists sync_wallet_balance_from_transaction on public\.transactions;")
        self.assertRegex(
            SQL,
            r"create trigger sync_wallet_balance_from_transaction\s+after insert or update or delete on public\.transactions\s+for each row execute function public\.sync_wallet_balance_from_transaction\(\);",
        )

    def test_wallet_balance_sync_is_atomic_and_handles_all_mutation_types(self):
        function_match = re.search(
            r"create or replace function public\.sync_wallet_balance_from_transaction\(\).*?\$\$\n(.*?)\n\$\$;",
            SQL,
            re.S,
        )
        if function_match is None:
            raise AssertionError("sync_wallet_balance_from_transaction function not found")
        body = function_match.group(1)

        self.assertIn("security definer", function_match.group(0).lower())
        self.assertIn("if tg_op = 'INSERT'", body)
        self.assertIn("elsif tg_op = 'UPDATE'", body)
        self.assertIn("elsif tg_op = 'DELETE'", body)
        self.assertIn("old.wallet_id is distinct from new.wallet_id", body)
        self.assertRegex(body, r"update public\.wallets\s+set balance = balance \+ delta_amount")
        self.assertNotRegex(body, r"select .*balance.*from public\.wallets")

    def test_wallet_balance_trigger_constrains_wallet_updates_to_transaction_scope(self):
        function_match = re.search(
            r"create or replace function public\.sync_wallet_balance_from_transaction\(\).*?\$\$\n(.*?)\n\$\$;",
            SQL,
            re.S,
        )
        if function_match is None:
            raise AssertionError("sync_wallet_balance_from_transaction function not found")
        body = function_match.group(1)

        self.assertIn("wallet_matches_transaction_scope", SQL)
        self.assertGreaterEqual(body.count("public.wallet_matches_transaction_scope"), 2)
        self.assertRegex(body, r"where id = old\.wallet_id\s+and public\.wallet_matches_transaction_scope\(old\.wallet_id, old\.user_id, old\.household_id\)")
        self.assertRegex(body, r"where id = target_wallet_id\s+and public\.wallet_matches_transaction_scope\(target_wallet_id, target_user_id, target_household_id\)")
        self.assertIn("target_user_id := new.user_id", body)
        self.assertIn("target_household_id := new.household_id", body)
        self.assertIn("target_user_id := old.user_id", body)
        self.assertIn("target_household_id := old.household_id", body)

    def test_wallet_balance_scope_helper_requires_personal_or_household_match(self):
        helper_match = re.search(
            r"create or replace function public\.wallet_matches_transaction_scope\(.*?\).*?\$\$\n(.*?)\n\$\$;",
            SQL,
            re.S,
        )
        if helper_match is None:
            raise AssertionError("wallet_matches_transaction_scope helper not found")
        helper = helper_match.group(1)

        self.assertIn("target_household_id is null", helper)
        self.assertIn("w.household_id is null", helper)
        self.assertIn("w.user_id = target_user_id", helper)
        self.assertIn("target_household_id is not null", helper)
        self.assertIn("w.household_id = target_household_id", helper)
        self.assertNotIn("auth.uid()", helper)

    def test_wallet_balance_trigger_uses_base_transaction_schema_columns(self):
        function_match = re.search(
            r"create or replace function public\.sync_wallet_balance_from_transaction\(\).*?\$\$\n(.*?)\n\$\$;",
            SQL,
            re.S,
        )
        if function_match is None:
            raise AssertionError("sync_wallet_balance_from_transaction function not found")
        body = function_match.group(1)

        self.assertIn("new.type", body)
        self.assertIn("old.type", body)
        self.assertIn("new.nominal", body)
        self.assertIn("old.nominal", body)
        self.assertNotIn("transaction_type", body)
        self.assertNotIn("new.amount", body)
        self.assertNotIn("old.amount", body)
        self.assertNotIn(".amount", body)


if __name__ == "__main__":
    unittest.main()
