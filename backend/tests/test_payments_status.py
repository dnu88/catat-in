from unittest.mock import patch
from main import app
from app.core.auth import get_current_user

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def test_status_syncs_from_midtrans_for_owned_order(client):
    with patch(
        "app.api.v1.payments.get_payment_for_user",
        return_value={
            "order_id": "kw-x",
            "user_id": "u1",
            "status": "pending",
            "amount": 29000,
            "provider": "midtrans",
            "provider_order_id": "kw-x",
        },
    ), patch(
        "app.api.v1.payments.fetch_and_sync_status",
        return_value={"order_id": "kw-x", "status": "paid", "provider": "midtrans"},
    ) as fetch_status:
        r = client.get("/api/v1/payments/kw-x/status", headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    assert r.json()["status"] == "paid"
    fetch_status.assert_called_once_with("kw-x", provider_name="midtrans", provider_order_id="kw-x")


def test_status_syncs_from_mayar_for_owned_order(client):
    with patch(
        "app.api.v1.payments.get_payment_for_user",
        return_value={
            "order_id": "kw-mayar",
            "user_id": "u1",
            "status": "pending",
            "amount": 29000,
            "provider": "mayar",
            "provider_order_id": "inv-1",
        },
    ), patch(
        "app.api.v1.payments.fetch_and_sync_status",
        return_value={
            "order_id": "kw-mayar",
            "status": "pending",
            "provider": "mayar",
            "provider_status": "PENDING",
        },
    ) as fetch_status:
        r = client.get("/api/v1/payments/kw-mayar/status", headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    assert r.json()["provider"] == "mayar"
    fetch_status.assert_called_once_with("kw-mayar", provider_name="mayar", provider_order_id="inv-1")


def test_status_hides_other_users_order(client):
    with patch("app.api.v1.payments.get_payment_for_user", return_value=None), \
         patch("app.api.v1.payments.fetch_and_sync_status") as fetch_status:
        r = client.get("/api/v1/payments/kw-other/status", headers={"Authorization": "Bearer x"})
    assert r.status_code == 404
    fetch_status.assert_not_called()
