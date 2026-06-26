from unittest.mock import MagicMock, patch
from main import app
from app.core.auth import get_current_user

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def test_create_payment_returns_snap_token(client):
    with patch("app.api.v1.payments.count_paid_users", return_value=0), \
         patch("app.api.v1.payments.get_primary_payment_provider_name", return_value="midtrans"), \
         patch(
             "app.api.v1.payments.create_checkout",
             return_value={"provider": "midtrans", "token": "tok-1", "redirect_url": "https://snap/tok-1"},
         ), \
         patch("app.api.v1.payments._insert_pending_payment") as ins, \
         patch("app.api.v1.payments._persist_checkout_reference") as persist:
        r = client.post("/api/v1/payments/create", json={"plan": "monthly"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    data = r.json()
    assert data["snap_token"] == "tok-1"
    assert data["amount"] == 29000 and data["price_tier"] == "promo"
    assert data["redirect_url"] == "https://snap/tok-1"
    assert data["provider"] == "midtrans"
    ins.assert_called_once_with("u1", data["order_id"], "monthly", 29000, "promo", "midtrans")
    persist.assert_called_once()


def test_create_payment_with_mayar_returns_provider_neutral_fields(client):
    with patch("app.api.v1.payments.count_paid_users", return_value=0), \
         patch("app.api.v1.payments.get_primary_payment_provider_name", return_value="mayar"), \
         patch("app.api.v1.payments.resolve_checkout_provider_name", return_value="mayar"), \
         patch(
             "app.api.v1.payments.create_checkout",
             return_value={
                 "provider": "mayar",
                 "redirect_url": "https://mayar.test/invoices/inv-1",
                 "provider_order_id": "inv-1",
                 "provider_status": "PENDING",
             },
         ), \
         patch("app.api.v1.payments._insert_pending_payment") as ins, \
         patch("app.api.v1.payments._persist_checkout_reference") as persist:
        r = client.post("/api/v1/payments/create", json={"plan": "monthly"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    data = r.json()
    assert data["provider"] == "mayar"
    assert data["redirect_url"] == "https://mayar.test/invoices/inv-1"
    assert "snap_token" not in data
    ins.assert_called_once_with("u1", data["order_id"], "monthly", 29000, "promo", "mayar")
    persist.assert_called_once_with(
        data["order_id"],
        {
            "provider": "mayar",
            "redirect_url": "https://mayar.test/invoices/inv-1",
            "provider_order_id": "inv-1",
            "provider_status": "PENDING",
        },
    )


def test_create_payment_blocks_non_allowlisted_mayar_account(client):
    from app.services.payment_service import MayarAccessDeniedError

    with patch("app.api.v1.payments.count_paid_users", return_value=0), \
         patch("app.api.v1.payments.get_primary_payment_provider_name", return_value="mayar"), \
         patch(
             "app.api.v1.payments.resolve_checkout_provider_name",
             side_effect=MayarAccessDeniedError("blocked"),
         ), \
         patch("app.api.v1.payments._insert_pending_payment") as ins, \
         patch("app.api.v1.payments.create_checkout") as checkout:
        r = client.post("/api/v1/payments/create", json={"plan": "monthly"},
                        headers={"Authorization": "Bearer x"})

    assert r.status_code == 403
    assert r.json()["detail"] == "Metode pembayaran ini belum tersedia untuk akun Anda."
    ins.assert_not_called()
    checkout.assert_not_called()


def test_create_payment_invalid_plan_422(client):
    r = client.post("/api/v1/payments/create", json={"plan": "weekly"},
                    headers={"Authorization": "Bearer x"})
    assert r.status_code == 422


def test_create_payment_db_unavailable_503_no_checkout(client):
    with patch("app.api.v1.payments.count_paid_users", return_value=0), \
         patch("app.api.v1.payments.get_primary_payment_provider_name", return_value="midtrans"), \
         patch("app.api.v1.payments._get_supabase_service_client", return_value=None), \
         patch("app.api.v1.payments.create_checkout") as checkout:
        r = client.post("/api/v1/payments/create", json={"plan": "monthly"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 503
    checkout.assert_not_called()


def test_insert_pending_payment_sets_provider_defaults():
    from app.api.v1.payments import _insert_pending_payment

    client = MagicMock()
    with patch("app.api.v1.payments._get_supabase_service_client", return_value=client):
        _insert_pending_payment("u1", "kw-x", "monthly", 29000, "promo", "midtrans")

    payload = client.table.return_value.insert.call_args.args[0]
    assert payload["provider"] == "midtrans"
    assert payload["provider_order_id"] == "kw-x"


def test_persist_checkout_reference_updates_provider_fields():
    from app.api.v1.payments import _persist_checkout_reference

    client = MagicMock()
    with patch("app.api.v1.payments._get_supabase_service_client", return_value=client):
        _persist_checkout_reference(
            "kw-x",
            {
                "provider_order_id": "inv-1",
                "provider_transaction_id": "trx-1",
                "provider_status": "PENDING",
            },
        )

    payload = client.table.return_value.update.call_args.args[0]
    assert payload["provider_order_id"] == "inv-1"
    assert payload["provider_transaction_id"] == "trx-1"
    assert payload["provider_status"] == "PENDING"
