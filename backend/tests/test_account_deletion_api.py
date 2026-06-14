from app.core.auth import get_current_user
from app.api.v1 import me as me_api
from main import app

FAKE = {"user_id": "user-1", "email": "dania@kaswise.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def test_get_account_deletion_request_returns_request(client, monkeypatch):
    monkeypatch.setattr(
        me_api,
        "get_latest_request",
        lambda user_id: {
            "id": "req-1",
            "user_id": user_id,
            "email": "dania@kaswise.com",
            "status": "pending",
            "reason": "hapus akun",
            "details": None,
            "review_notes": None,
            "requested_at": "2026-06-14T12:00:00+00:00",
            "reviewed_at": None,
            "created_at": "2026-06-14T12:00:00+00:00",
            "updated_at": "2026-06-14T12:00:00+00:00",
        },
    )

    response = client.get("/api/v1/me/account-deletion-request")

    assert response.status_code == 200
    body = response.json()
    assert body["request"]["email"] == "dania@kaswise.com"
    assert body["request"]["status"] == "pending"


def test_post_account_deletion_request_creates_request(client, monkeypatch):
    monkeypatch.setattr(
        me_api,
        "create_request",
        lambda user_id, email, reason=None, details=None: (
            {
                "id": "req-2",
                "user_id": user_id,
                "email": email,
                "status": "pending",
                "reason": reason,
                "details": details,
                "review_notes": None,
                "requested_at": "2026-06-14T12:00:00+00:00",
                "reviewed_at": None,
                "created_at": "2026-06-14T12:00:00+00:00",
                "updated_at": "2026-06-14T12:00:00+00:00",
            },
            True,
        ),
    )

    response = client.post(
        "/api/v1/me/account-deletion-request",
        json={
            "confirm_email": "dania@kaswise.com",
            "reason": "Tidak lagi memakai aplikasi",
            "details": "Mohon hapus akun dan data aktif saya.",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["created"] is True
    assert body["request"]["email"] == "dania@kaswise.com"
    assert body["request"]["status"] == "pending"


def test_post_account_deletion_request_rejects_mismatched_email(client):
    response = client.post(
        "/api/v1/me/account-deletion-request",
        json={"confirm_email": "other@example.com"},
    )

    assert response.status_code == 400
    assert "tidak cocok" in response.json()["detail"].lower()
