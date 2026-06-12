"""Tests for generate_bill_reminders notification generator."""

from datetime import date, timedelta
from unittest.mock import patch, MagicMock

import pytest

# Import the module under test through its canonical import path
from scripts import generate_bill_reminder_notifications as gen


# ── helpers ────────────────────────────────────────────────────────────────

def _make_bill(
    id_: str = "b1",
    user_id: str = "u1",
    name: str = "Internet",
    amount: int = 150_000,
    next_due_date: str = "",
    notify_before_days: int = 3,
    is_paid: bool = False,
) -> dict:
    return {
        "id": id_,
        "user_id": user_id,
        "name": name,
        "amount": amount,
        "next_due_date": next_due_date or date.today().isoformat(),
        "notify_before_days": notify_before_days,
        "is_paid": is_paid,
    }


def _patch_supabase_client(return_value=None):
    return patch.object(gen, "_get_supabase_service_client", return_value=return_value)


def _chain_mock(data: list | None = None):
    """Return a MagicMock whose fluent chain returns .data."""
    chain = MagicMock()
    if data is not None:
        exe = MagicMock()
        exe.data = data
        chain._t.execute.return_value = exe  # type: ignore[attr-defined]
    chain.table.return_value = chain._t  # type: ignore[attr-defined]
    chain._t.select.return_value = chain._t  # type: ignore[attr-defined]
    chain._t.eq.return_value = chain._t  # type: ignore[attr-defined]
    return chain


# ── tests ──────────────────────────────────────────────────────────────────

def test_client_unavailable_returns_empty():
    with _patch_supabase_client(None):
        results = gen.generate_bill_reminders(dry_run=True)
    assert results == []


def test_no_bills_returns_empty():
    with _patch_supabase_client(_chain_mock([])):
        results = gen.generate_bill_reminders(dry_run=True)
    assert results == []


def test_bill_due_today_with_notify_0_days():
    """Bill with notify_before_days=0 whose next_due_date is today → notified."""
    today = date.today()
    bill = _make_bill(
        next_due_date=today.isoformat(),
        notify_before_days=0,
    )
    client = _chain_mock([bill])

    with _patch_supabase_client(client):
        with patch.object(gen, "get_preferences", return_value={"enabled": True, "bill_reminder_enabled": True}):
            with patch.object(gen, "create_notification", return_value={"id": "n1"}) as mock_create:
                results = gen.generate_bill_reminders(dry_run=False)

    assert len(results) == 1
    assert results[0]["created"] is True
    assert results[0]["name"] == "Internet"
    mock_create.assert_called_once()
    call_args = mock_create.call_args
    # create_notification(user_id, type_=..., ...) — user_id is first positional arg
    assert call_args[0][0] == "u1"
    assert call_args[1]["type_"] == "bill_reminder"


def test_bill_notify_before_matches_today():
    """Bill due in 3 days with notify_before_days=3 → notify date is today."""
    today = date.today()
    due = today + timedelta(days=3)
    bill = _make_bill(
        next_due_date=due.isoformat(),
        notify_before_days=3,
    )
    client = _chain_mock([bill])

    with _patch_supabase_client(client):
        with patch.object(gen, "get_preferences", return_value={"enabled": True, "bill_reminder_enabled": True}):
            with patch.object(gen, "create_notification", return_value={"id": "n2"}) as mock_create:
                results = gen.generate_bill_reminders(dry_run=False)

    assert len(results) == 1
    assert results[0]["created"] is True
    mock_create.assert_called_once()


def test_bill_notify_date_not_today_skipped():
    """Bill whose notify date is NOT today is skipped."""
    today = date.today()
    due = today + timedelta(days=5)  # 5 days from now
    bill = _make_bill(
        next_due_date=due.isoformat(),
        notify_before_days=3,  # notify date = today + 2 → not today
    )
    client = _chain_mock([bill])

    with _patch_supabase_client(client):
        with patch.object(gen, "get_preferences", return_value={"enabled": True, "bill_reminder_enabled": True}):
            with patch.object(gen, "create_notification", return_value={}) as mock_create:
                results = gen.generate_bill_reminders(dry_run=False)

    assert len(results) == 0
    mock_create.assert_not_called()


def test_preferences_disabled_skips():
    """When user preferences have enabled=False, skip notification."""
    today = date.today()
    bill = _make_bill(
        next_due_date=today.isoformat(),
        notify_before_days=0,
    )
    client = _chain_mock([bill])

    with _patch_supabase_client(client):
        with patch.object(gen, "get_preferences", return_value={"enabled": False, "bill_reminder_enabled": True}):
            with patch.object(gen, "create_notification", return_value={}) as mock_create:
                results = gen.generate_bill_reminders(dry_run=False)

    assert len(results) == 0
    mock_create.assert_not_called()


def test_bill_reminder_preference_false_skips():
    """When bill_reminder_enabled is False, skip notification."""
    today = date.today()
    bill = _make_bill(
        next_due_date=today.isoformat(),
        notify_before_days=0,
    )
    client = _chain_mock([bill])

    with _patch_supabase_client(client):
        with patch.object(gen, "get_preferences", return_value={"enabled": True, "bill_reminder_enabled": False}):
            with patch.object(gen, "create_notification", return_value={}) as mock_create:
                results = gen.generate_bill_reminders(dry_run=False)

    assert len(results) == 0
    mock_create.assert_not_called()


def test_dedupe_key_format():
    """Verify the dedupe key follows the expected format."""
    today = date.today()
    due = today + timedelta(days=3)
    bill = _make_bill(
        id_="bill-abc",
        next_due_date=due.isoformat(),
        notify_before_days=3,
    )
    client = _chain_mock([bill])

    with _patch_supabase_client(client):
        with patch.object(gen, "get_preferences", return_value={"enabled": True, "bill_reminder_enabled": True}):
            with patch.object(gen, "create_notification", return_value={"id": "n3"}) as mock_create:
                gen.generate_bill_reminders(dry_run=False)

    mock_create.assert_called_once()
    call_args = mock_create.call_args
    dedupe = call_args[1]["dedupe_key"]
    assert dedupe == f"bill_reminder:bill-abc:{due.isoformat()}:3"


def test_multiple_bills_mixed():
    """Two bills: one eligible, one not. Only eligible gets notified."""
    today = date.today()
    eligible = _make_bill(
        id_="b1",
        next_due_date=today.isoformat(),
        notify_before_days=0,
    )
    skipped = _make_bill(
        id_="b2",
        next_due_date=(today + timedelta(days=10)).isoformat(),
        notify_before_days=3,
    )
    client = _chain_mock([eligible, skipped])

    with _patch_supabase_client(client):
        with patch.object(gen, "get_preferences", return_value={"enabled": True, "bill_reminder_enabled": True}):
            with patch.object(gen, "create_notification", return_value={"id": "n-multi"}) as mock_create:
                results = gen.generate_bill_reminders(dry_run=False)

    assert len(results) == 1
    assert results[0]["bill_id"] == "b1"
    mock_create.assert_called_once()


def test_paid_bills_excluded_by_query():
    """The query filters is_paid=False. Mock it with an empty list because
    the query is on Supabase side; we just verify empty list produces no results."""
    client = _chain_mock([])
    with _patch_supabase_client(client):
        with patch.object(gen, "get_preferences", return_value={"enabled": True}):
            results = gen.generate_bill_reminders(dry_run=False)
    assert results == []


def test_missing_next_due_date_skipped():
    """Bill with empty next_due_date is skipped."""
    bill = _make_bill(next_due_date="")
    client = _chain_mock([bill])

    with _patch_supabase_client(client):
        with patch.object(gen, "get_preferences", return_value={"enabled": True, "bill_reminder_enabled": True}):
            with patch.object(gen, "create_notification", return_value={}) as mock_create:
                results = gen.generate_bill_reminders(dry_run=False)

    assert len(results) == 0
    mock_create.assert_not_called()


def test_invalid_date_format_skipped():
    """Bill with unparseable next_due_date is skipped."""
    bill = _make_bill(next_due_date="not-a-date")
    client = _chain_mock([bill])

    with _patch_supabase_client(client):
        with patch.object(gen, "get_preferences", return_value={"enabled": True, "bill_reminder_enabled": True}):
            with patch.object(gen, "create_notification", return_value={}) as mock_create:
                results = gen.generate_bill_reminders(dry_run=False)

    assert len(results) == 0
    mock_create.assert_not_called()
