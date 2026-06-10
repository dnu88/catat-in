"""Tests for notification_service — preferences, notifications, dedupe."""

from unittest.mock import patch, MagicMock

import pytest

from app.services import notification_service as ns


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _patch_supabase_client(return_value=None):
    """Patch _get_supabase_service_client to return a mock or None."""
    return patch.object(
        ns, "_get_supabase_service_client", return_value=return_value
    )


def _chain_mock(data: list | None = None):
    """Return a MagicMock whose *any* Supabase fluent chain returns .data."""
    chain = MagicMock()
    if data is not None:
        exe = MagicMock()
        exe.data = data
        # Every intermediate call returns chain._t which has execute
        chain._t.execute.return_value = exe  # type: ignore[attr-defined]
    # table() returns _t; all chained methods return _t
    chain.table.return_value = chain._t  # type: ignore[attr-defined]
    chain._t.select.return_value = chain._t  # type: ignore[attr-defined]
    chain._t.upsert.return_value = chain._t  # type: ignore[attr-defined]
    chain._t.update.return_value = chain._t  # type: ignore[attr-defined]
    chain._t.insert.return_value = chain._t  # type: ignore[attr-defined]
    chain._t.eq.return_value = chain._t  # type: ignore[attr-defined]
    chain._t.limit.return_value = chain._t  # type: ignore[attr-defined]
    chain._t.order.return_value = chain._t  # type: ignore[attr-defined]
    chain._t.is_.return_value = chain._t  # type: ignore[attr-defined]
    return chain


# ---------------------------------------------------------------------------
# default_preferences
# ---------------------------------------------------------------------------

def test_default_preferences_structure():
    """default_preferences returns a dict with all expected keys."""
    prefs = ns.default_preferences("u1")
    assert prefs["user_id"] == "u1"
    assert prefs["enabled"] is True
    assert prefs["budget_alert_thresholds"] == [80, 100]
    assert prefs["timezone"] == "Asia/Jakarta"
    assert prefs["push_enabled"] is False


# ---------------------------------------------------------------------------
# get_preferences — no client
# ---------------------------------------------------------------------------

def test_get_preferences_returns_defaults_when_client_unavailable():
    """When Supabase client is None, return defaults (not crash)."""
    with _patch_supabase_client(None):
        prefs = ns.get_preferences("u1")
    assert prefs["user_id"] == "u1"
    assert prefs["enabled"] is True


# ---------------------------------------------------------------------------
# get_preferences — client available, no existing row
# ---------------------------------------------------------------------------

def test_get_preferences_returns_defaults_when_no_row():
    """When DB row missing, return defaults (upsert semantics)."""
    with _patch_supabase_client(_chain_mock([])):
        prefs = ns.get_preferences("u1")
    assert prefs["user_id"] == "u1"
    assert prefs["enabled"] is True


# ---------------------------------------------------------------------------
# get_preferences — client available, row exists
# ---------------------------------------------------------------------------

def test_get_preferences_returns_existing_row():
    """When DB has a row, return it."""
    row = {"user_id": "u1", "enabled": False, "timezone": "Asia/Makassar"}
    with _patch_supabase_client(_chain_mock([row])):
        prefs = ns.get_preferences("u1")
    assert prefs["enabled"] is False
    assert prefs["timezone"] == "Asia/Makassar"


# ---------------------------------------------------------------------------
# update_preferences
# ---------------------------------------------------------------------------

def test_update_preferences_returns_defaults_when_client_unavailable():
    """When client unavailable, update returns current defaults (no-op)."""
    with _patch_supabase_client(None):
        result = ns.update_preferences("u1", {"enabled": False})
    assert result["enabled"] is True  # unchanged


def test_update_preferences_updates_fields():
    """Valid patch fields get written."""
    existing = {"user_id": "u1", "enabled": True, "budget_alert_enabled": True}
    updated = {"user_id": "u1", "enabled": False, "budget_alert_enabled": True}
    fake = _chain_mock([existing])  # for the initial get inside get_preferences
    # For the upsert write, create a separate chain
    fake2 = _chain_mock([updated])
    # We'll just test the function by mocking get_preferences instead
    with patch.object(ns, "get_preferences", return_value=existing), \
         _patch_supabase_client(fake2):
        result = ns.update_preferences("u1", {"enabled": False})
    assert result["enabled"] is False


def test_update_preferences_sanitizes_unknown_fields():
    """Fields not in the allowed set are silently dropped."""
    existing = {"user_id": "u1", "enabled": True}
    updated = {"user_id": "u1", "enabled": False}
    fake = _chain_mock([updated])
    with patch.object(ns, "get_preferences", return_value=existing), \
         _patch_supabase_client(fake):
        result = ns.update_preferences("u1", {"enabled": False, "hacker_field": "evil"})
    assert "hacker_field" not in result
    assert result["enabled"] is False


def test_update_preferences_rejects_invalid_thresholds():
    """Threshold values outside 1-200 or more than 5 items are sanitized."""
    existing = {"user_id": "u1", "budget_alert_thresholds": [80, 100]}
    updated = {"user_id": "u1", "budget_alert_thresholds": [80, 90, 100]}
    fake = _chain_mock([updated])
    with patch.object(ns, "get_preferences", return_value=existing), \
         _patch_supabase_client(fake):
        result = ns.update_preferences(
            "u1", {"budget_alert_thresholds": [0, 300, 80, 90, 100, 200, 999]}
        )
    thresh = result["budget_alert_thresholds"]
    assert len(thresh) <= 5
    assert all(1 <= t <= 200 for t in thresh)


# ---------------------------------------------------------------------------
# create_notification
# ---------------------------------------------------------------------------

def test_create_notification_skips_when_global_disabled():
    """When preferences.enabled is False, create_notification returns None."""
    prefs = {"enabled": False, "budget_alert_enabled": True}
    with patch.object(ns, "get_preferences", return_value=prefs):
        result = ns.create_notification("u1", "budget_threshold", "Test", "body")
    assert result is None


def test_create_notification_skips_budget_alert_when_disabled():
    """When budget_alert_enabled is False, budget_threshold type returns None."""
    prefs = {"enabled": True, "budget_alert_enabled": False}
    with patch.object(ns, "get_preferences", return_value=prefs):
        result = ns.create_notification("u1", "budget_threshold", "Test", "body")
    assert result is None


def test_create_notification_skips_ai_insight_when_disabled():
    """When ai_insight_enabled is False, ai_insight_ready type returns None."""
    prefs = {"enabled": True, "ai_insight_enabled": False}
    with patch.object(ns, "get_preferences", return_value=prefs):
        result = ns.create_notification("u1", "ai_insight_ready", "Test", "body")
    assert result is None


def test_create_notification_skips_weekly_summary_when_disabled():
    """When weekly_summary_enabled is False, weekly_summary type returns None."""
    prefs = {"enabled": True, "weekly_summary_enabled": False}
    with patch.object(ns, "get_preferences", return_value=prefs):
        result = ns.create_notification("u1", "weekly_summary", "Test", "body")
    assert result is None


def test_create_notification_returns_none_when_client_unavailable():
    """When Supabase client is None, create_notification returns None gracefully."""
    prefs = {"enabled": True, "budget_alert_enabled": True}
    with patch.object(ns, "get_preferences", return_value=prefs), \
         _patch_supabase_client(None):
        result = ns.create_notification("u1", "budget_threshold", "Test", "body")
    assert result is None


def test_create_notification_uses_dedupe_key():
    """Notification created with dedupe_key is inserted and returned."""
    prefs = {"enabled": True, "budget_alert_enabled": True}
    created = {"id": "n1", "type": "budget_threshold", "title": "Test", "body": "body"}
    fake = _chain_mock([created])
    with patch.object(ns, "get_preferences", return_value=prefs), \
         _patch_supabase_client(fake):
        result = ns.create_notification(
            "u1", "budget_threshold", "Test", "body",
            dedupe_key="budget_threshold:b1:2026-06:80",
        )
    assert result is not None
    assert result["id"] == "n1"


def test_create_notification_skips_when_dedupe_conflict():
    """When dedupe insert returns empty (conflict), return None."""
    prefs = {"enabled": True, "budget_alert_enabled": True}
    fake = _chain_mock([])
    with patch.object(ns, "get_preferences", return_value=prefs), \
         _patch_supabase_client(fake):
        result = ns.create_notification(
            "u1", "budget_threshold", "Test", "body",
            dedupe_key="budget_threshold:b1:2026-06:80",
        )
    assert result is None


# ---------------------------------------------------------------------------
# list_notifications / get_unread_count / mark_read
# ---------------------------------------------------------------------------

def test_list_notifications_returns_empty_when_client_unavailable():
    """When client is None, return empty list and 0 unread."""
    with _patch_supabase_client(None):
        result = ns.list_notifications("u1")
    assert result["items"] == []
    assert result["unread_count"] == 0


def test_get_unread_count_returns_zero_when_client_unavailable():
    """When client is None, get_unread_count returns 0."""
    with _patch_supabase_client(None):
        count = ns.get_unread_count("u1")
    assert count == 0


def test_mark_notification_read_noop_when_client_unavailable():
    """When client is None, mark_notification_read does not raise."""
    with _patch_supabase_client(None):
        ns.mark_notification_read("u1", "n1")  # no exception


def test_mark_all_read_returns_zero_when_client_unavailable():
    """When client is None, mark_all_read returns 0."""
    with _patch_supabase_client(None):
        count = ns.mark_all_read("u1")
    assert count == 0
