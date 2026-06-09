"""Tests for ai_insight_data — compact financial context builder for AI insight."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from app.services import ai_insight_data as aid


def _resp(data):
    """Fake Supabase client execute() response with .data"""
    return SimpleNamespace(data=data)


def _fake_now():
    """Fixed UTC now: 2026-06-15T12:00:00Z"""
    return datetime(2026, 6, 15, 12, 0, 0, tzinfo=timezone.utc)


# ── Helper to build mock transaction rows ──────────────────────────────
def _tx_row(
    tipe="expense",
    nominal=50000,
    kategori="Food & Drinks",
    merchant="Warung Nasi",
    tanggal="2026-06-10",
):
    return {
        "id": "fake-id",
        "user_id": "u1",
        "nominal": nominal,
        "type": tipe,
        "kategori": kategori,
        "merchant": merchant,
        "tanggal": tanggal,
        "catatan": "very secret note that must NOT leak",
        "receipt_url": None,
    }


# ── Tests ──────────────────────────────────────────────────────────────


def test_empty_transactions_returns_zeros():
    """No transactions in period → zeros, empty lists, null previous_period."""
    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = _resp([])

    with patch.object(aid, "_get_supabase_service_client", return_value=client), \
         patch.object(aid, "_now", return_value=_fake_now()):
        result = aid.build_ai_insight_context("u1")

    assert result["period_start"] == "2026-06-01"
    assert result["period_end"] == "2026-06-30"
    assert result["transaction_count"] == 0
    assert result["income_total"] == 0.0
    assert result["expense_total"] == 0.0
    assert result["net_total"] == 0.0
    assert result["top_categories"] == []
    assert result["top_merchants"] == []
    assert result["other_category_percent"] == 0.0
    assert result["previous_period"] is None


def test_mixed_transactions_aggregates_correctly():
    """Income + expense transactions aggregate totals and top categories."""
    rows = [
        _tx_row("income", 100000, "Salary", "CompanyX", "2026-06-01"),
        _tx_row("income", 50000, "Freelance", None, "2026-06-05"),
        _tx_row("expense", 20000, "Food & Drinks", "Warung Nasi", "2026-06-03"),
        _tx_row("expense", 15000, "Food & Drinks", "Warung Sate", "2026-06-04"),
        _tx_row("expense", 10000, "Transport", "Gojek", "2026-06-06"),
        _tx_row("expense", 5000, "Transport", "Gojek", "2026-06-07"),
    ]

    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = _resp(rows)

    with patch.object(aid, "_get_supabase_service_client", return_value=client), \
         patch.object(aid, "_now", return_value=_fake_now()):
        result = aid.build_ai_insight_context("u1")

    assert result["transaction_count"] == 6
    assert result["income_total"] == 150000.0
    assert result["expense_total"] == 50000.0
    assert result["net_total"] == 100000.0

    # Top categories by expense amount
    assert result["top_categories"][0]["category"] == "Food & Drinks"
    assert result["top_categories"][0]["amount"] == 35000.0
    assert result["top_categories"][0]["percent"] == 70.0  # 35000/50000

    assert result["top_categories"][1]["category"] == "Transport"
    assert result["top_categories"][1]["amount"] == 15000.0
    assert result["top_categories"][1]["percent"] == 30.0

    # Top merchants (Warung Nasi: 20000, Warung Sate: 15000, Gojek: 15000)
    # Python stable sort keeps insertion order for ties
    assert result["top_merchants"][0]["merchant"] == "Warung Nasi"
    assert result["top_merchants"][0]["amount"] == 20000.0
    assert result["top_merchants"][1]["merchant"] == "Warung Sate"
    assert result["top_merchants"][1]["amount"] == 15000.0
    assert result["top_merchants"][2]["merchant"] == "Gojek"
    assert result["top_merchants"][2]["amount"] == 15000.0


def test_catatan_never_leaks():
    """Even if we somehow have catatan in the result, it must NOT appear."""
    rows = [
        _tx_row("expense", 10000, "Food", "Warung", "2026-06-10"),
    ]

    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = _resp(rows)

    with patch.object(aid, "_get_supabase_service_client", return_value=client), \
         patch.object(aid, "_now", return_value=_fake_now()):
        result = aid.build_ai_insight_context("u1")

    # Flatten all string values, check none contain "secret" from catatan
    def all_strings(d):
        for v in d.values():
            if isinstance(v, str):
                yield v
            elif isinstance(v, list):
                for item in v:
                    if isinstance(item, dict):
                        yield from all_strings(item)
                    elif isinstance(item, str):
                        yield item
            elif isinstance(v, dict):
                yield from all_strings(v)

    for s in all_strings(result):
        assert "secret" not in s.lower(), f"Catatan leaked: {s}"


def test_null_merchants_filtered_out():
    """Empty or null merchants are excluded from top_merchants."""
    rows = [
        _tx_row("expense", 10000, "Food", None, "2026-06-01"),
        _tx_row("expense", 20000, "Food", "", "2026-06-02"),
        _tx_row("expense", 30000, "Food", "Warung", "2026-06-03"),
    ]

    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = _resp(rows)

    with patch.object(aid, "_get_supabase_service_client", return_value=client), \
         patch.object(aid, "_now", return_value=_fake_now()):
        result = aid.build_ai_insight_context("u1")

    assert len(result["top_merchants"]) == 1
    assert result["top_merchants"][0]["merchant"] == "Warung"
    assert result["top_merchants"][0]["amount"] == 30000.0


def test_top_categories_capped_at_8():
    """If >8 categories, only top 8 returned; other_category_percent computed."""
    rows = []
    for i in range(10):
        rows.append(_tx_row("expense", 10000, f"Cat-{i}", f"Merch-{i}", "2026-06-01"))

    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = _resp(rows)

    with patch.object(aid, "_get_supabase_service_client", return_value=client), \
         patch.object(aid, "_now", return_value=_fake_now()):
        result = aid.build_ai_insight_context("u1")

    assert len(result["top_categories"]) == 8
    # All have same amount, so other_category_percent should be 20% (2 out of 10)
    assert result["other_category_percent"] == 20.0


def test_top_merchants_capped_at_8():
    """If >8 merchants, only top 8 returned."""
    rows = []
    for i in range(12):
        rows.append(_tx_row("expense", 10000, "Food", f"Merch-{i}", "2026-06-01"))

    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = _resp(rows)

    with patch.object(aid, "_get_supabase_service_client", return_value=client), \
         patch.object(aid, "_now", return_value=_fake_now()):
        result = aid.build_ai_insight_context("u1")

    assert len(result["top_merchants"]) == 8


def test_previous_period_when_transactions_exist():
    """If previous month has transactions, include previous_period data."""
    # Current month rows
    current_rows = [
        _tx_row("expense", 10000, "Food", "Warung", "2026-06-10"),
    ]
    # Previous month rows (May)
    prev_rows = [
        _tx_row("expense", 8000, "Food", "Warung", "2026-05-15"),
        _tx_row("income", 50000, "Salary", "CompanyX", "2026-05-01"),
        _tx_row("expense", 12000, "Transport", "Gojek", "2026-05-20"),
    ]

    client = MagicMock()

    # First call: current period
    current_query = client.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value
    current_query.execute.return_value = _resp(current_rows)

    # Second call: previous period (we need to mock the second call separately)
    # Instead, capture all execute calls and return appropriate data
    call_count = [0]

    def side_effect():
        call_count[0] += 1
        if call_count[0] == 1:
            return _resp(current_rows)
        else:
            return _resp(prev_rows)

    # We need to mock so that the second table(...) chain returns prev_rows
    # Let's use a simpler approach: mock the query chain to track which call
    client.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.side_effect = side_effect

    with patch.object(aid, "_get_supabase_service_client", return_value=client), \
         patch.object(aid, "_now", return_value=_fake_now()):
        result = aid.build_ai_insight_context("u1")

    # Current period
    assert result["transaction_count"] == 1
    assert result["expense_total"] == 10000.0
    assert result["income_total"] == 0.0
    assert result["net_total"] == -10000.0

    # Previous period
    assert result["previous_period"] is not None
    pp = result["previous_period"]
    assert pp["transaction_count"] == 3
    assert pp["income_total"] == 50000.0
    assert pp["expense_total"] == 20000.0
    assert pp["net_total"] == 30000.0


def test_previous_period_null_when_no_prev_transactions():
    """If previous month has no transactions, previous_period is None."""
    rows = [
        _tx_row("expense", 10000, "Food", "Warung", "2026-06-10"),
    ]

    client = MagicMock()

    call_count = [0]

    def side_effect():
        call_count[0] += 1
        if call_count[0] == 1:
            return _resp(rows)
        else:
            return _resp([])  # No previous data

    client.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.side_effect = side_effect

    with patch.object(aid, "_get_supabase_service_client", return_value=client), \
         patch.object(aid, "_now", return_value=_fake_now()):
        result = aid.build_ai_insight_context("u1")

    assert result["transaction_count"] == 1
    assert result["previous_period"] is None


def test_no_supabase_client_returns_none():
    """When Supabase client is unavailable, return None gracefully."""
    with patch.object(aid, "_get_supabase_service_client", return_value=None):
        result = aid.build_ai_insight_context("u1")
    assert result is None


def test_unknown_period_falls_back_to_monthly():
    """Period='yearly' or other unknown values fall back to monthly."""
    rows = [
        _tx_row("expense", 10000, "Food", "Warung", "2026-06-10"),
    ]

    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = _resp(rows)

    with patch.object(aid, "_get_supabase_service_client", return_value=client), \
         patch.object(aid, "_now", return_value=_fake_now()):
        result = aid.build_ai_insight_context("u1", period="yearly")

    assert result is not None
    assert result["period_start"] == "2026-06-01"  # Falls back to monthly
    assert result["period_end"] == "2026-06-30"


def test_all_income_no_expense():
    """Only income transactions — expense_total=0, top_categories empty."""
    rows = [
        _tx_row("income", 100000, "Salary", "CompanyX", "2026-06-01"),
        _tx_row("income", 20000, "Bonus", None, "2026-06-10"),
    ]

    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = _resp(rows)

    with patch.object(aid, "_get_supabase_service_client", return_value=client), \
         patch.object(aid, "_now", return_value=_fake_now()):
        result = aid.build_ai_insight_context("u1")

    assert result["transaction_count"] == 2
    assert result["income_total"] == 120000.0
    assert result["expense_total"] == 0.0
    assert result["net_total"] == 120000.0
    assert result["top_categories"] == []
    assert result["top_merchants"] == []
    assert result["other_category_percent"] == 0.0


def test_income_transactions_excluded_from_category_percent():
    """Income categories should NOT appear in top_categories or affect percentages."""
    rows = [
        _tx_row("income", 100000, "Salary", "CompanyX", "2026-06-01"),
        _tx_row("expense", 50000, "Food", "Warung", "2026-06-10"),
    ]

    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = _resp(rows)

    with patch.object(aid, "_get_supabase_service_client", return_value=client), \
         patch.object(aid, "_now", return_value=_fake_now()):
        result = aid.build_ai_insight_context("u1")

    assert len(result["top_categories"]) == 1
    assert result["top_categories"][0]["category"] == "Food"
    assert result["top_categories"][0]["percent"] == 100.0
    assert result["other_category_percent"] == 0.0


def test_period_boundaries_month_start_end():
    """Verify period_start is first day, period_end is last day of month."""
    # Test different months
    test_cases = [
        (datetime(2026, 1, 15, tzinfo=timezone.utc), "2026-01-01", "2026-01-31"),
        (datetime(2026, 2, 15, tzinfo=timezone.utc), "2026-02-01", "2026-02-28"),  # 2026 not leap
        (datetime(2026, 4, 15, tzinfo=timezone.utc), "2026-04-01", "2026-04-30"),
        (datetime(2026, 12, 15, tzinfo=timezone.utc), "2026-12-01", "2026-12-31"),
    ]

    for now, expected_start, expected_end in test_cases:
        client = MagicMock()
        client.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value = _resp([])

        with patch.object(aid, "_get_supabase_service_client", return_value=client), \
             patch.object(aid, "_now", return_value=now):
            result = aid.build_ai_insight_context("u1")

        assert result["period_start"] == expected_start, f"Failed for {now}"
        assert result["period_end"] == expected_end, f"Failed for {now}"
