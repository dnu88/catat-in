"""Unit tests for the Mayar webhook facade (reconcile_mayar_notification)."""
from unittest.mock import MagicMock, patch

import pytest

from app.services import payment_service as ps


def _payload(product_id="688b6a9f"):
    return {
        "event": "payment.received",
        "data": {
            "id": "43b2f0ce-03f2-4f59-a341-299ea3ef19b6",
            "transactionId": "43b2f0ce-03f2-4f59-a341-299ea3ef19b6",
            "productId": product_id,
            "paymentLinkId": product_id,
            "status": "SUCCESS",
            "transactionStatus": "paid",
            "merchantId": "merchant-abc",
            "amount": 29000,
        },
    }


def test_reconcile_mayar_notification_maps_via_provider_order_id_then_syncs():
    with patch.object(ps, "_get_supabase_service_client", return_value=object()) as sc, \
         patch.object(ps.repository, "find_payment_by_provider_order_id", return_value={
             "order_id": "kw-x", "provider_order_id": "inv-1", "status": "pending",
         }) as find, \
         patch.object(ps, "fetch_and_sync_status", return_value={
             "order_id": "kw-x", "status": "paid", "provider": "mayar",
         }) as sync:
        result = ps.reconcile_mayar_notification(_payload())

    assert result == {"order_id": "kw-x", "status": "paid", "provider": "mayar"}
    sc.assert_called_once()
    # candidates passed to the lookup must include the Mayar payment-link id
    candidates = find.call_args.args[0]
    assert "688b6a9f" in candidates
    assert "43b2f0ce-03f2-4f59-a341-299ea3ef19b6" in candidates
    sync.assert_called_once_with("kw-x", provider_name="mayar", provider_order_id="inv-1")


def test_reconcile_mayar_notification_falls_back_to_order_id_when_provider_order_id_missing():
    with patch.object(ps, "_get_supabase_service_client", return_value=object()), \
         patch.object(ps.repository, "find_payment_by_provider_order_id", return_value={
             "order_id": "kw-x", "provider_order_id": None, "status": "pending",
         }) as find, \
         patch.object(ps, "fetch_and_sync_status", return_value={
             "order_id": "kw-x", "status": "pending", "provider": "mayar",
         }) as sync:
        result = ps.reconcile_mayar_notification(_payload())

    assert result["status"] == "pending"
    # provider_order_id falls back to our order_id
    sync.assert_called_once_with("kw-x", provider_name="mayar", provider_order_id="kw-x")
    find.assert_called_once()


def test_reconcile_mayar_notification_ignored_when_unmatched():
    with patch.object(ps, "_get_supabase_service_client", return_value=object()), \
         patch.object(ps.repository, "find_payment_by_provider_order_id", return_value=None) as find, \
         patch.object(ps, "fetch_and_sync_status") as sync:
        result = ps.reconcile_mayar_notification(_payload(product_id="unknown"))

    assert result == {"status": "ignored", "reason": "unmatched", "provider": "mayar"}
    find.assert_called_once()
    sync.assert_not_called()


def test_reconcile_mayar_notification_raises_when_supabase_unavailable():
    with patch.object(ps, "_get_supabase_service_client", return_value=None), \
         patch.object(ps.repository, "find_payment_by_provider_order_id") as find:
        with pytest.raises(RuntimeError):
            ps.reconcile_mayar_notification(_payload())
    find.assert_not_called()


def test_reconcile_mayar_notification_respects_activation_gate_via_fetch_and_sync_status():
    """The facade never activates directly; it delegates to fetch_and_sync_status,
    which applies _should_activate_provider('mayar') == MAYAR_ACTIVATION_ENABLED."""
    with patch.object(ps, "_get_supabase_service_client", return_value=object()), \
         patch.object(ps.repository, "find_payment_by_provider_order_id", return_value={
             "order_id": "kw-x", "provider_order_id": "inv-1", "status": "pending",
         }), \
         patch.object(ps, "fetch_and_sync_status", return_value={
             "order_id": "kw-x", "status": "pending", "provider": "mayar",
         }) as sync:
        ps.reconcile_mayar_notification(_payload())
    sync.assert_called_once()


def _pending_invoice_response():
    """Mayar GET /invoice/{id} re-fetch returning a still-pending invoice."""
    pending_invoice = {
        "statusCode": 200,
        "data": {
            "id": "inv-1",
            "amount": 29000,
            "status": "PENDING",
            "transactionStatus": "created",
            "extraData": {"orderId": "kw-x"},
        },
    }
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = pending_invoice
    return resp


def test_reconcile_trust_model_payload_paid_but_mayar_says_pending_no_activation():
    """End-to-end (real orchestrator path): a webhook that CLAIMS ``paid`` must
    NOT grant premium when Mayar's authenticated re-fetch returns ``pending``.
    This guards the ADR-0003 invariant: the webhook payload is only a trigger;
    the authoritative status is the Mayar Invoice API response.
    """
    webhook_payload = _payload(product_id="inv-1")
    # Force the webhook payload to claim paid (it does, transactionStatus="paid").

    with patch.object(ps, "_get_supabase_service_client", return_value=MagicMock()), \
         patch.object(ps.settings, "MAYAR_ACTIVATION_ENABLED", True), \
         patch.object(ps.settings, "MAYAR_API_KEY", "mayar-key"), \
         patch.object(ps.settings, "MAYAR_BASE_URL", "https://api.mayar.id/hl/v1"), \
         patch.object(ps.settings, "MAYAR_MERCHANT_ID", None), \
         patch.object(ps.repository, "find_payment_by_provider_order_id", return_value={
             "id": "p1", "order_id": "kw-x", "provider_order_id": "inv-1",
             "user_id": "u1", "plan": "monthly", "status": "pending", "amount": 29000,
         }), \
         patch.object(ps.repository, "get_payment_by_order_id", return_value={
             "id": "p1", "order_id": "kw-x", "provider_order_id": "inv-1",
             "user_id": "u1", "plan": "monthly", "status": "pending", "amount": 29000,
         }), \
         patch.object(ps.repository, "update_payment") as update_payment, \
         patch.object(ps.repository, "update_profile") as update_profile, \
         patch(
             "app.services.payments.providers.mayar.httpx.request",
             return_value=_pending_invoice_response(),
         ) as http_request:
        result = ps.reconcile_mayar_notification(webhook_payload)

    # Mayar re-fetch said pending -> paid webhook claim ignored, no premium grant.
    assert result["status"] == "pending"
    # The authoritative Mayar Invoice API was actually called (re-fetch happened).
    http_request.assert_called_once()
    assert http_request.call_args.args[0] == "GET"
    assert http_request.call_args.args[1].endswith("/invoice/inv-1")
    update_profile.assert_not_called()
    # payment row updated to reflect the real (pending) status, not the webhook claim.
    assert update_payment.call_args.args[1]["status"] == "pending"


def test_reconcile_trust_model_payload_paid_and_mayar_says_paid_activates():
    """Symmetric positive case: when both webhook and Mayar re-fetch confirm paid,
    premium is granted (with MAYAR_ACTIVATION_ENABLED=true). Proves the re-fetch
    path can still activate when authoritative status agrees.
    """
    paid_invoice = {
        "statusCode": 200,
        "data": {
            "id": "inv-1", "amount": 29000, "status": "SUCCESS",
            "transactionStatus": "paid", "extraData": {"orderId": "kw-x"},
        },
    }
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = paid_invoice

    with patch.object(ps, "_get_supabase_service_client", return_value=MagicMock()), \
         patch.object(ps.settings, "MAYAR_ACTIVATION_ENABLED", True), \
         patch.object(ps.settings, "MAYAR_API_KEY", "mayar-key"), \
         patch.object(ps.settings, "MAYAR_BASE_URL", "https://api.mayar.id/hl/v1"), \
         patch.object(ps.settings, "MAYAR_MERCHANT_ID", None), \
         patch.object(ps.repository, "find_payment_by_provider_order_id", return_value={
             "id": "p1", "order_id": "kw-x", "provider_order_id": "inv-1",
             "user_id": "u1", "plan": "monthly", "status": "pending", "amount": 29000,
         }), \
         patch.object(ps.repository, "get_payment_by_order_id", return_value={
             "id": "p1", "order_id": "kw-x", "provider_order_id": "inv-1",
             "user_id": "u1", "plan": "monthly", "status": "pending", "amount": 29000,
         }), \
         patch.object(ps.repository, "update_payment") as update_payment, \
         patch.object(ps.repository, "update_profile") as update_profile, \
         patch(
             "app.services.payments.providers.mayar.httpx.request",
             return_value=resp,
         ) as http_request:
        result = ps.reconcile_mayar_notification(_payload(product_id="inv-1"))

    assert result["status"] == "paid"
    http_request.assert_called_once()
    update_profile.assert_called_once()
    # plan_type premium + plan_expires_at set
    profile_update = update_profile.call_args.args[1]
    assert profile_update["plan_type"] == "premium"
    assert "plan_expires_at" in profile_update
    assert update_payment.call_args.args[1]["status"] == "paid"
    assert "paid_at" in update_payment.call_args.args[1]
