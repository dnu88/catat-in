from unittest.mock import patch
from main import app
from app.core.auth import get_current_user

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def test_status_syncs_from_midtrans_for_owned_order(client):
    with patch("app.api.v1.payments.get_payment_for_user",
               return_value={"order_id": "kw-x", "user_id": "u1", "status": "pending", "amount": 29000}), \
         patch("app.api.v1.payments.fetch_and_sync_status",
               return_value={"order_id": "kw-x", "status": "paid"}):
        r = client.get("/api/v1/payments/kw-x/status", headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    assert r.json()["status"] == "paid"


def test_status_hides_other_users_order(client):
    with patch("app.api.v1.payments.get_payment_for_user", return_value=None), \
         patch("app.api.v1.payments.fetch_and_sync_status") as fetch_status:
        r = client.get("/api/v1/payments/kw-other/status", headers={"Authorization": "Bearer x"})
    assert r.status_code == 404
    fetch_status.assert_not_called()
