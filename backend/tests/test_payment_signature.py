import hashlib
from unittest.mock import patch
from app.services import payment_service as ps


def _sig(order_id, status_code, gross, server_key):
    return hashlib.sha512(f"{order_id}{status_code}{gross}{server_key}".encode()).hexdigest()


def test_verify_signature_ok():
    with patch.object(ps.settings, "MIDTRANS_SERVER_KEY", "SK-test"):
        payload = {"order_id": "kw-1", "status_code": "200", "gross_amount": "29000.00",
                   "signature_key": _sig("kw-1", "200", "29000.00", "SK-test")}
        assert ps.verify_notification_signature(payload) is True


def test_verify_signature_bad():
    with patch.object(ps.settings, "MIDTRANS_SERVER_KEY", "SK-test"):
        payload = {"order_id": "kw-1", "status_code": "200", "gross_amount": "29000.00",
                   "signature_key": "deadbeef"}
        assert ps.verify_notification_signature(payload) is False


def test_map_status():
    assert ps.map_status("settlement", "accept") == "paid"
    assert ps.map_status("capture", "accept") == "paid"
    assert ps.map_status("capture", "challenge") == "pending"
    assert ps.map_status("pending", None) == "pending"
    assert ps.map_status("deny", None) == "failed"
    assert ps.map_status("cancel", None) == "failed"
    assert ps.map_status("expire", None) == "expired"
