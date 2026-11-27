"""Unit tests untuk type guard normalisasi kategori (Danu 28 Nov, review).

Fungsi murni — tanpa DB: resolve_target_for_type / resolve_ambiguous_fallback /
category_matches_type.
"""

from scripts.normalize_legacy_categories import (
    LEGACY_TO_CANONICAL,
    category_matches_type,
    resolve_ambiguous_fallback,
    resolve_target_for_type,
)


def make_cats(*rows):
    return [
        {"id": f"id-{i}", "name": name, "type": t}
        for i, (name, t) in enumerate(rows)
    ]


class TestCategoryMatchesType:
    def test_expense_ke_expense(self):
        cats = make_cats(("Other expenses", "expense"))
        assert category_matches_type(cats[0], "expense") is True

    def test_expense_kategori_untuk_income_ditolak(self):
        cats = make_cats(("Other expenses", "expense"))
        assert category_matches_type(cats[0], "income") is False

    def test_kategori_tanpa_type_dianggap_cocok(self):
        cats = make_cats(("Legacy", None))
        assert category_matches_type(cats[0], "income") is True


class TestResolveTargetForType:
    def test_freelance_income_ke_kategori_income(self):
        cats = make_cats(("Freelance", "income"), ("Food & Beverage", "expense"))
        target, kind = resolve_target_for_type(cats, "Freelance", "income")
        assert kind == "exact"
        assert target is not None and target["type"] == "income"

    def test_income_ke_kategori_expense_ditolak_type_mismatch(self):
        # Bug lama: freelance → Other expenses (expense) untuk transaksi income.
        cats = make_cats(("Other expenses", "expense"))
        target, kind = resolve_target_for_type(cats, "Other expenses", "income")
        assert target is None
        assert kind == "type-mismatch"

    def test_expense_ke_kategori_income_ditolak(self):
        cats = make_cats(("Salary", "income"))
        target, kind = resolve_target_for_type(cats, "Salary", "expense")
        assert target is None
        assert kind == "type-mismatch"

    def test_mapping_danu_freelance_dan_pendidikan(self):
        assert LEGACY_TO_CANONICAL["freelance"] == "Freelance"
        assert LEGACY_TO_CANONICAL["Pendidikan"] == "Education"
        cats = make_cats(("Education", "expense"))
        target, kind = resolve_target_for_type(cats, "Education", "expense")
        assert target is not None


class TestResolveAmbiguousFallback:
    def test_ambigu_expense_ke_other_expenses_user(self):
        cats = make_cats(("Other expenses", "expense"))
        target, kind = resolve_ambiguous_fallback(cats, "expense")
        assert target is not None and target["name"] == "Other expenses"

    def test_ambigu_income_ke_income_fallback_user(self):
        # Kontrak Danu: fallback income = Lainnya/Other income milik user,
        # se-tipe income — bukan kategori income arbitrer seperti Bonus.
        cats = make_cats(("Bonus", "income"), ("Lainnya", "income"), ("Other expenses", "expense"))
        target, kind = resolve_ambiguous_fallback(cats, "income")
        assert target is not None and target["type"] == "income"
        assert target["name"] == "Lainnya"

    def test_ambigu_income_kategori_income_lain_tidak_jadi_fallback(self):
        cats = make_cats(("Bonus", "income"), ("Salary", "income"))
        target, kind = resolve_ambiguous_fallback(cats, "income")
        assert target is None
        assert kind == "no-income-fallback"

    def test_ambigu_income_tanpa_fallback_none_bukan_expense(self):
        # Wajib: tanpa kategori income → None (teks dibiarkan + dilaporkan),
        # BUKAN jatuh ke Other expenses (expense).
        cats = make_cats(("Other expenses", "expense"))
        target, kind = resolve_ambiguous_fallback(cats, "income")
        assert target is None
        assert kind == "no-income-fallback"

    def test_ambigu_expense_tanpa_other_none(self):
        cats = make_cats(("Salary", "income"))
        target, kind = resolve_ambiguous_fallback(cats, "expense")
        assert target is None
        assert kind == "no-expense-fallback"
