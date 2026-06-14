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
    st = {"is_premium": True, "plan_expires_at": "2027-01-01T00:00:00+00:00",
          "period_ym": "2026-06", "chat_count": 5, "photo_count": 2,
          "chat_limit": 200, "photo_limit": 100}
    with patch("app.api.v1.me.load_state", return_value=st):
        r = client.get("/api/v1/me/entitlements", headers={"Authorization": "Bearer x"})
    assert r.json()["plan"] == "premium"
    assert r.json()["photo_used"] == 2 and r.json()["photo_limit"] == 100
    assert r.json()["plan_expires_at"] == "2027-01-01T00:00:00+00:00"


def test_get_account_deletion_request_returns_latest(client):
    payload = {
        "id": "req-1",
        "user_id": "u1",
        "email": "u1@example.com",
        "status": "pending",
        "reason": "Tidak lagi memakai aplikasi",
        "details": None,
        "review_notes": None,
        "requested_at": "2026-06-14T10:00:00+00:00",
        "reviewed_at": None,
        "created_at": "2026-06-14T10:00:00+00:00",
        "updated_at": "2026-06-14T10:00:00+00:00",
    }
    with patch("app.api.v1.me.get_latest_request", return_value=payload):
        r = client.get("/api/v1/me/account-deletion-request", headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    assert r.json()["request"]["status"] == "pending"
    assert r.json()["request"]["email"] == "u1@example.com"


def test_post_account_deletion_request_creates_request(client):
    payload = {
        "id": "req-2",
        "user_id": "u1",
        "email": "u1@example.com",
        "status": "pending",
        "reason": "Pindah aplikasi",
        "details": "Mohon hapus akun dan data aktif saya.",
        "review_notes": None,
        "requested_at": "2026-06-14T11:00:00+00:00",
        "reviewed_at": None,
        "created_at": "2026-06-14T11:00:00+00:00",
        "updated_at": "2026-06-14T11:00:00+00:00",
    }
    with patch("app.api.v1.me.create_request", return_value=(payload, True)) as create_mock:
        r = client.post(
            "/api/v1/me/account-deletion-request",
            json={
                "confirm_email": "u1@example.com",
                "reason": "Pindah aplikasi",
                "details": "Mohon hapus akun dan data aktif saya.",
            },
            headers={"Authorization": "Bearer x"},
        )
    assert r.status_code == 201
    assert r.json()["created"] is True
    create_mock.assert_called_once()


def test_post_account_deletion_request_rejects_email_mismatch(client):
    r = client.post(
        "/api/v1/me/account-deletion-request",
        json={"confirm_email": "wrong@example.com"},
        headers={"Authorization": "Bearer x"},
    )
    assert r.status_code == 400
    assert "tidak cocok" in r.json()["detail"]


def test_entitlements_requires_auth(client):
    app.dependency_overrides.pop(get_current_user, None)
    r = client.get("/api/v1/me/entitlements")
    assert r.status_code == 401
    app.dependency_overrides[get_current_user] = lambda: FAKE
