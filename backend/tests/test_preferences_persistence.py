"""Preference persistence contract using the installed PostgREST SDK."""

import json
from unittest.mock import patch

import httpx
import pytest
from postgrest import SyncPostgrestClient

from app.core.auth import get_current_user
from app.services import notification_service as ns


@pytest.fixture
def preference_db():
    rows = {
        "test-user-123": {**ns.default_preferences("test-user-123"),
                          "timezone": "Asia/Makassar", "daily_reminder_time": "08:15"},
        "other-user": ns.default_preferences("other-user"),
    }
    requests = []

    def handle(request):
        requests.append(request)
        assert request.url.path == "/notification_preferences"
        if request.method == "GET":
            user_id = request.url.params["user_id"].removeprefix("eq.")
            return httpx.Response(200, json=[rows[user_id]] if user_id in rows else [])
        assert request.method == "POST"
        assert request.url.params["on_conflict"] == "user_id"
        assert "user_id" not in request.url.params
        assert "return=representation" in request.headers["prefer"]
        payload = json.loads(request.content)
        user_id = payload["user_id"]
        rows[user_id] = {**rows.get(user_id, ns.default_preferences(user_id)), **payload}
        return httpx.Response(201, json=[rows[user_id]])

    with httpx.Client(transport=httpx.MockTransport(handle)) as http_client:
        sdk = SyncPostgrestClient("https://preferences.invalid", http_client=http_client)
        with patch.object(ns, "_get_supabase_service_client", return_value=sdk):
            yield rows, requests


@pytest.mark.parametrize("field", [
    "enabled", "budget_alert_enabled", "weekly_summary_enabled", "ai_insight_enabled",
])
@pytest.mark.parametrize("value", [False, True])
def test_put_persists_toggle_and_preserves_other_preferences(client, preference_db, field, value):
    rows, requests = preference_db
    rows["test-user-123"][field] = not value
    before = dict(rows["test-user-123"])
    other_before = dict(rows["other-user"])
    client.app.dependency_overrides[get_current_user] = lambda: {"user_id": "test-user-123"}
    try:
        response = client.put("/api/v1/notifications/preferences", json={field: value, "user_id": "other-user"})
        assert response.status_code == 200
        assert response.json()[field] is value
        readback = client.get("/api/v1/notifications/preferences")
        assert readback.status_code == 200
        assert readback.json()[field] is value
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)
    assert rows["test-user-123"] == {**before, field: value}
    assert rows["other-user"] == other_before
    writes = [r for r in requests if r.method == "POST"]
    assert len(writes) == 1
    assert json.loads(writes[0].content) == {"user_id": "test-user-123", field: value}


@pytest.mark.parametrize("failure", ["missing", "database", "empty", "wrong_user", "unchanged"])
def test_failed_write_returns_safe_503_not_old_preferences(client, failure):
    def handle(request):
        if failure == "database":
            raise RuntimeError("secret-service-role-token")
        row = ns.default_preferences("test-user-123")
        if failure == "wrong_user":
            row.update(user_id="other-user", enabled=False)
        if failure == "empty":
            return httpx.Response(201, json=[])
        return httpx.Response(201, json=[row])

    with httpx.Client(transport=httpx.MockTransport(handle)) as http_client:
        sdk = SyncPostgrestClient("https://preferences.invalid", http_client=http_client)
        with patch.object(ns, "_get_supabase_service_client", return_value=None if failure == "missing" else sdk):
            client.app.dependency_overrides[get_current_user] = lambda: {"user_id": "test-user-123"}
            try:
                response = client.put("/api/v1/notifications/preferences", json={"enabled": False})
                assert response.status_code == 503
                assert response.json() == {"detail": "Notification preferences could not be saved. Please try again."}
                assert "secret-service-role-token" not in response.text
            finally:
                client.app.dependency_overrides.pop(get_current_user, None)


def test_successive_partial_updates_preserve_unspecified_fields(preference_db):
    rows, _ = preference_db
    before = dict(rows["test-user-123"])
    for field in ("enabled", "budget_alert_enabled", "weekly_summary_enabled", "ai_insight_enabled"):
        for value in (False, True):
            before[field] = value
            assert ns.update_preferences("test-user-123", {field: value, "user_id": "other-user"}) == before
            assert ns.get_preferences("test-user-123") == before
    assert rows["other-user"] == ns.default_preferences("other-user")
