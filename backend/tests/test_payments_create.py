from unittest.mock import patch
from main import app
from app.core.auth import get_current_user

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def test_create_payment_returns_snap_token(client):
    with patch("app.api.v1.payments.count_paid_users", return_value=0), \
         patch("app.api.v1.payments.create_snap_transaction",
               return_value={"token": "tok-1", "redirect_url": "https://snap/tok-1"}), \
         patch("app.api.v1.payments._insert_pending_payment") as ins:
        r = client.post("/api/v1/payments/create", json={"plan": "monthly"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    data = r.json()
    assert data["snap_token"] == "tok-1"
    assert data["amount"] == 29000 and data["price_tier"] == "promo"
    assert data["redirect_url"] == "https://snap/tok-1"
    ins.assert_called_once()


def test_create_payment_invalid_plan_422(client):
    r = client.post("/api/v1/payments/create", json={"plan": "weekly"},
                    headers={"Authorization": "Bearer x"})
    assert r.status_code == 422


def test_create_payment_db_unavailable_503_no_snap(client):
    """Jika service client None, gagal 503 SEBELUM Snap dibuat (jangan charged tanpa row)."""
    with patch("app.api.v1.payments.count_paid_users", return_value=0), \
         patch("app.api.v1.payments._get_supabase_service_client", return_value=None), \
         patch("app.api.v1.payments.create_snap_transaction") as snap:
        r = client.post("/api/v1/payments/create", json={"plan": "monthly"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 503
    snap.assert_not_called()
