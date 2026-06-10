"""Tests for notification API endpoints — auth, CRUD, read/unread."""

import pytest
from unittest.mock import patch, MagicMock

from fastapi import status
from main import app
from app.core.auth import get_current_user

FAKE_USER = {"user_id": "test-user-123", "email": "test@example.com"}


def override_auth():
    return FAKE_USER


# ── Mock helpers ──────────────────────────────────────────────────────────

def _setup_auth_overrides():
    """Install auth override and clean up after test."""
    app.dependency_overrides[get_current_user] = override_auth
    yield
    app.dependency_overrides.pop(get_current_user, None)


# ── Auth gate ─────────────────────────────────────────────────────────────

def test_preferences_requires_auth(client):
    """Unauthenticated GET /preferences must return 401."""
    resp = client.get("/api/v1/notifications/preferences")
    assert resp.status_code == 401


def test_notifications_requires_auth(client):
    """Unauthenticated GET /notifications must return 401."""
    resp = client.get("/api/v1/notifications")
    assert resp.status_code == 401


def test_unread_count_requires_auth(client):
    """Unauthenticated GET /unread-count must return 401."""
    resp = client.get("/api/v1/notifications/unread-count")
    assert resp.status_code == 401


# ── Preferences read ──────────────────────────────────────────────────────

def test_authenticated_get_preferences_returns_defaults(client):
    """Authenticated GET returns default preferences dict."""
    defaults = {
        "user_id": "test-user-123",
        "enabled": True,
        "budget_alert_enabled": True,
        "budget_alert_thresholds": [80, 100],
        "weekly_summary_enabled": True,
        "ai_insight_enabled": True,
        "timezone": "Asia/Jakarta",
    }
    with patch(
        "app.api.v1.notifications.get_preferences", return_value=defaults
    ):
        client.app.dependency_overrides[get_current_user] = override_auth
        resp = client.get("/api/v1/notifications/preferences")
        client.app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 200
    data = resp.json()
    assert data["enabled"] is True
    assert data["budget_alert_thresholds"] == [80, 100]


# ── Preferences update ────────────────────────────────────────────────────

def test_authenticated_put_preferences_updates_field(client):
    """Authenticated PUT updates fields in preferences."""
    updated = {
        "user_id": "test-user-123",
        "enabled": False,
        "budget_alert_enabled": True,
    }
    with patch(
        "app.api.v1.notifications.update_preferences", return_value=updated
    ):
        client.app.dependency_overrides[get_current_user] = override_auth
        resp = client.put(
            "/api/v1/notifications/preferences",
            json={"enabled": False},
        )
        client.app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 200
    assert resp.json()["enabled"] is False


# ── Notification list ─────────────────────────────────────────────────────

def test_authenticated_list_notifications(client):
    """Authenticated GET /notifications returns items and unread_count."""
    mock_resp = {
        "items": [
            {
                "id": "n1",
                "type": "budget_threshold",
                "title": "Budget Makan",
                "body": "Hampir habis",
                "data": {},
                "read_at": None,
                "created_at": "2026-06-10T00:00:00Z",
            }
        ],
        "unread_count": 1,
    }
    with patch(
        "app.api.v1.notifications.list_notifications", return_value=mock_resp
    ):
        client.app.dependency_overrides[get_current_user] = override_auth
        resp = client.get("/api/v1/notifications")
        client.app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["unread_count"] == 1


# ── Unread count ──────────────────────────────────────────────────────────

def test_authenticated_unread_count(client):
    """Authenticated GET /unread-count returns count."""
    with patch(
        "app.api.v1.notifications.get_unread_count", return_value=3
    ):
        client.app.dependency_overrides[get_current_user] = override_auth
        resp = client.get("/api/v1/notifications/unread-count")
        client.app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 200
    assert resp.json()["unread_count"] == 3


# ── Mark read ─────────────────────────────────────────────────────────────

def test_authenticated_mark_notification_read(client):
    """Authenticated PATCH /{id}/read returns 204."""
    with patch(
        "app.api.v1.notifications.mark_notification_read"
    ) as mock_fn:
        client.app.dependency_overrides[get_current_user] = override_auth
        resp = client.patch("/api/v1/notifications/n1/read")
        client.app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 204
    mock_fn.assert_called_once_with("test-user-123", "n1")


# ── Mark all read ─────────────────────────────────────────────────────────

def test_authenticated_mark_all_read(client):
    """Authenticated PATCH /read-all returns 204."""
    with patch(
        "app.api.v1.notifications.mark_all_read", return_value=5
    ) as mock_fn:
        client.app.dependency_overrides[get_current_user] = override_auth
        resp = client.patch("/api/v1/notifications/read-all")
        client.app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 204
    mock_fn.assert_called_once_with("test-user-123")



# ── Update preferences validation ─────────────────────────────────────────

def test_put_preferences_ignores_unknown_body_fields(client):
    """PUT silently ignores fields not in the update model."""
    updated = {"user_id": "test-user-123", "enabled": False}
    with patch(
        "app.api.v1.notifications.update_preferences", return_value=updated
    ) as mock_update:
        client.app.dependency_overrides[get_current_user] = override_auth
        resp = client.put(
            "/api/v1/notifications/preferences",
            json={"enabled": False, "fake_field": "should_be_ignored"},
        )
        client.app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 200
    args, _ = mock_update.call_args
    assert "fake_field" not in args[1]
