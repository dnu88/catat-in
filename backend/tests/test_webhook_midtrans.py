from unittest.mock import patch
from main import app  # noqa


def test_webhook_bad_signature_403(client):
    with patch("app.api.v1.webhooks.verify_notification_signature", return_value=False):
        r = client.post("/api/v1/webhooks/midtrans", json={"order_id": "kw-x"})
    assert r.status_code == 403


def test_webhook_valid_activates(client):
    payload = {"order_id": "kw-x", "transaction_status": "settlement",
               "fraud_status": "accept", "status_code": "200", "gross_amount": "29000.00",
               "signature_key": "ok"}
    with patch("app.api.v1.webhooks.verify_notification_signature", return_value=True), \
         patch("app.api.v1.webhooks.activate_premium_from_notification",
               return_value="paid") as act:
        r = client.post("/api/v1/webhooks/midtrans", json=payload)
    assert r.status_code == 200
    assert r.json()["status"] == "paid"
    act.assert_called_once()
