from unittest.mock import MagicMock, patch
from app.services import payment_service as ps


def test_make_order_id_unique_prefix():
    oid = ps.make_order_id("user-abcdefgh")
    assert oid.startswith("kw-")


def test_create_snap_transaction_passes_params():
    fake_snap = MagicMock()
    fake_snap.create_transaction.return_value = {"token": "tok-1", "redirect_url": "https://snap/tok-1"}
    with patch.object(ps, "_snap_client", return_value=fake_snap), \
         patch.object(ps.settings, "MIDTRANS_SERVER_KEY", "SK"):
        out = ps.create_snap_transaction(order_id="kw-x", amount=29000, plan="monthly",
                                         email="u@example.com")
    assert out["token"] == "tok-1"
    assert out["redirect_url"] == "https://snap/tok-1"
    arg = fake_snap.create_transaction.call_args[0][0]
    assert arg["transaction_details"]["order_id"] == "kw-x"
    assert arg["transaction_details"]["gross_amount"] == 29000
    assert set(arg["enabled_payments"]) >= {"qris", "gopay", "shopeepay"}
