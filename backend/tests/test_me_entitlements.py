from unittest.mock import patch
from main import app
from app.core.auth import get_current_user

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def test_entitlements_returns_plan_and_quota(client):
    st = {"is_premium": False, "period_ym": "2026-06", "chat_count": 3, "photo_count": 0,
          "chat_limit": 25, "photo_limit": 0}
    with patch("app.api.v1.me.load_state", return_value=st):
        r = client.get("/api/v1/me/entitlements", headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    data = r.json()
    assert data["plan"] == "free"
    assert data["chat_used"] == 3 and data["chat_limit"] == 25
    assert data["photo_limit"] == 0


def test_entitlements_premium_plan(client):
    st = {"is_premium": True, "period_ym": "2026-06", "chat_count": 5, "photo_count": 2,
          "chat_limit": 200, "photo_limit": 100}
    with patch("app.api.v1.me.load_state", return_value=st):
        r = client.get("/api/v1/me/entitlements", headers={"Authorization": "Bearer x"})
    assert r.json()["plan"] == "premium"
    assert r.json()["photo_used"] == 2 and r.json()["photo_limit"] == 100


def test_entitlements_requires_auth(client):
    app.dependency_overrides.pop(get_current_user, None)
    r = client.get("/api/v1/me/entitlements")
    assert r.status_code == 401
    app.dependency_overrides[get_current_user] = lambda: FAKE
