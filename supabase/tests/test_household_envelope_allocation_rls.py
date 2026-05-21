from pathlib import Path
import re
import unittest

MIGRATION = Path(__file__).resolve().parents[1] / "migrations" / "202605210001_household_finance_context.sql"
SQL = MIGRATION.read_text()


def policy_body(policy_name: str) -> str:
    match = re.search(
        rf'create policy "{re.escape(policy_name)}" on public\.transaction_envelope_allocations\n(.*?);\n',
        SQL,
        re.S,
    )
    if not match:
        raise AssertionError(f"Policy {policy_name} not found")
    return match.group(1)


HOUSEHOLD_EDIT_AUTH = """(
              public.can_admin_household(t.household_id)
              or (t.created_by = auth.uid() and public.household_role(t.household_id) = 'member')
            )"""


class HouseholdEnvelopeAllocationRlsTest(unittest.TestCase):
    def test_household_allocation_insert_mirrors_transaction_edit_authorization(self):
        body = policy_body("transaction_envelope_allocations_insert_personal_or_household")
        self.assertIn(HOUSEHOLD_EDIT_AUTH, body)
        self.assertNotIn("public.can_write_household(t.household_id)", body)

    def test_household_allocation_update_using_and_check_mirror_transaction_edit_authorization(self):
        body = policy_body("transaction_envelope_allocations_update_personal_or_household")
        self.assertEqual(body.count(HOUSEHOLD_EDIT_AUTH), 2)
        self.assertNotIn("public.is_household_member(t.household_id)", body)
        self.assertNotIn("public.can_write_household(t.household_id)", body)

    def test_household_allocation_delete_mirrors_transaction_edit_authorization(self):
        body = policy_body("transaction_envelope_allocations_delete_personal_or_household")
        self.assertIn(HOUSEHOLD_EDIT_AUTH, body)
        self.assertNotIn("public.can_write_household(t.household_id)", body)


if __name__ == "__main__":
    unittest.main()
