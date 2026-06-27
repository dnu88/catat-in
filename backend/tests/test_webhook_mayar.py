"""Tests for the Mayar webhook endpoint (unsigned, re-fetch-from-API model)."""
from unittest.mock import patch

from app.core.config import settings
from app.services.payments.providers.mayar import MayarApiError
from main import app  # noqa: F401  (ensures app import for TestClient)


def _payload(webhook_id="43b2f0ce", product_id="688b6a9f"):
    return {
        "event": "payment.received",
        "data": {
            "id": webhook_id,
            "transactionId": webhook_id,
            "productId": product_id,
            "paymentLinkId": product_id,
            "status": "SUCCESS",
            "transactionStatus": "paid",
            "merchantId": "merchant-abc",
            "amount": 29000,
            "customerEmail": "user@example.com",
        },
    }


def test_mayar_webhook_disabled_returns_404(client):
    with patch.object(settings, "MAYAR_WEBHOOKS_ENABLED", False):
        r = client.post("/api/v1/webhooks/mayar", json=_payload())
    assert r.status_code == 404


def test_mayar_webhook_rejects_foreign_merchant_id_403(client):
    with patch.object(settings, "MAYAR_WEBHOOKS_ENABLED", True), \
         patch.object(settings, "MAYAR_MERCHANT_ID", "merchant-abc"), \
         patch("app.api.v1.webhooks.verify_mayar_notification_signature", return_value=False):
        r = client.post("/api/v1/webhooks/mayar", json=_payload())
    assert r.status_code == 403
    assert "merchant" in r.json()["detail"].lower()


def test_mayar_webhook_passes_when_merchant_id_unconfigured(client):
    """No soft-auth configured -> re-fetch-from-API trust model applies."""
    with patch.object(settings, "MAYAR_WEBHOOKS_ENABLED", True), \
         patch.object(settings, "MAYAR_MERCHANT_ID", None), \
         patch("app.api.v1.webhooks.reconcile_mayar_notification", return_value={"status": "paid", "provider": "mayar"}) as rec:
        r = client.post("/api/v1/webhooks/mayar", json=_payload())
    assert r.status_code == 200
    assert r.json()["status"] == "paid"
    rec.assert_called_once()


def test_mayar_webhook_ignored_for_unmatched_order(client):
    with patch.object(settings, "MAYAR_WEBHOOKS_ENABLED", True), \
         patch.object(settings, "MAYAR_MERCHANT_ID", "merchant-abc"), \
         patch("app.api.v1.webhooks.verify_mayar_notification_signature", return_value=True), \
         patch("app.api.v1.webhooks.reconcile_mayar_notification", return_value={"status": "ignored", "reason": "unmatched", "provider": "mayar"}) as rec:
        r = client.post("/api/v1/webhooks/mayar", json=_payload(webhook_id="unknown-id"))
    assert r.status_code == 200
    assert r.json()["status"] == "ignored"
    rec.assert_called_once()


def test_mayar_webhook_reconcile_503_when_supabase_unavailable(client):
    with patch.object(settings, "MAYAR_WEBHOOKS_ENABLED", True), \
         patch.object(settings, "MAYAR_MERCHANT_ID", None), \
         patch("app.api.v1.webhooks.reconcile_mayar_notification", side_effect=RuntimeError("Supabase service client tidak tersedia.")):
        r = client.post("/api/v1/webhooks/mayar", json=_payload())
    assert r.status_code == 503


def test_mayar_webhook_reconcile_502_on_upstream_failure(client):
    with patch.object(settings, "MAYAR_WEBHOOKS_ENABLED", True), \
         patch.object(settings, "MAYAR_MERCHANT_ID", None), \
         patch("app.api.v1.webhooks.reconcile_mayar_notification", side_effect=MayarApiError("Mayar API error: boom")):
        r = client.post("/api/v1/webhooks/mayar", json=_payload())
    assert r.status_code == 502


def test_mayar_webhook_bad_json_400(client):
    with patch.object(settings, "MAYAR_WEBHOOKS_ENABLED", True):
        r = client.post("/api/v1/webhooks/mayar", content="not-json", headers={"content-type": "application/json"})
    assert r.status_code == 400


def test_mayar_webhook_non_object_payload_400(client):
    with patch.object(settings, "MAYAR_WEBHOOKS_ENABLED", True):
        r = client.post("/api/v1/webhooks/mayar", json=[1, 2, 3])
    assert r.status_code == 400
