from unittest.mock import MagicMock

from app.services.payments.providers.mayar import MayarProvider


class _Response:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def test_mayar_create_checkout_uses_invoice_create_contract():
    request = MagicMock(
        return_value=_Response(
            {
                "statusCode": 200,
                "messages": "success",
                "data": {
                    "id": "inv-123",
                    "transactionId": "trx-123",
                    "link": "https://merchant.myr.id/invoices/abc",
                    "extraData": {"orderId": "kw-x", "plan": "monthly"},
                },
            }
        )
    )
    provider = MayarProvider(
        api_key_getter=lambda: "mayar-key",
        base_url_getter=lambda: "https://api.mayar.id/hl/v1",
        redirect_url_getter=lambda: "https://kaswise.com/upgrade",
        request_func=request,
    )

    result = provider.create_checkout(order_id="kw-x", amount=29000, plan="monthly", email="user@example.com")

    assert result["redirect_url"] == "https://merchant.myr.id/invoices/abc"
    assert result["provider_order_id"] == "inv-123"
    assert result["provider_transaction_id"] == "trx-123"
    kwargs = request.call_args.kwargs
    assert request.call_args.args == ("POST", "https://api.mayar.id/hl/v1/invoice/create")
    assert kwargs["headers"]["Authorization"] == "Bearer mayar-key"
    assert kwargs["json"]["redirectUrl"] == "https://kaswise.com/upgrade"
    assert kwargs["json"]["extraData"]["orderId"] == "kw-x"
    assert kwargs["json"]["items"][0]["rate"] == 29000
    assert kwargs["json"]["mobile"] == "000000000000"


def test_mayar_create_checkout_falls_back_to_legacy_callback_getter():
    request = MagicMock(
        return_value=_Response(
            {
                "statusCode": 200,
                "messages": "success",
                "data": {"id": "inv-legacy", "link": "https://merchant.myr.id/invoices/legacy"},
            }
        )
    )
    provider = MayarProvider(
        api_key_getter=lambda: "mayar-key",
        base_url_getter=lambda: "https://api.mayar.id/hl/v1",
        callback_url_getter=lambda: "https://kaswise.com/upgrade",
        request_func=request,
    )

    result = provider.create_checkout(order_id="kw-legacy", amount=29000, plan="monthly", email="user@example.com")

    assert result["redirect_url"] == "https://merchant.myr.id/invoices/legacy"
    assert request.call_args.kwargs["json"]["redirectUrl"] == "https://kaswise.com/upgrade"


def test_mayar_fetch_status_uses_invoice_detail_contract():
    request = MagicMock(
        return_value=_Response(
            {
                "statusCode": 200,
                "data": {
                    "id": "inv-123",
                    "amount": 29000,
                    "status": "PAID",
                    "extraData": {"orderId": "kw-x"},
                },
            }
        )
    )
    provider = MayarProvider(
        api_key_getter=lambda: "mayar-key",
        base_url_getter=lambda: "https://api.mayar.id/hl/v1",
        callback_url_getter=lambda: "https://kaswise.com/callback",
        request_func=request,
    )

    payload = provider.fetch_status("inv-123")

    assert request.call_args.args == ("GET", "https://api.mayar.id/hl/v1/invoice/inv-123")
    assert provider.extract_order_id(payload) == "kw-x"
    assert provider.extract_gross_amount(payload) == 29000
    # transactionStatus absent -> falls back to data.status "PAID" -> paid
    assert provider.map_internal_status(payload) == "paid"
    assert provider.build_status_response(payload) == {"provider": "mayar", "provider_status": "PAID"}


def test_mayar_signature_verification_fails_closed_without_merchant_id():
    provider = MayarProvider(
        api_key_getter=lambda: "mayar-key",
        base_url_getter=lambda: "https://api.mayar.id/hl/v1",
        callback_url_getter=lambda: "https://kaswise.com/callback",
        merchant_id_getter=lambda: "",
    )

    assert provider.verify_notification_signature({"data": {"merchantId": "m-1"}}) is False


def test_mayar_signature_verification_matches_configured_merchant_id():
    provider = MayarProvider(
        api_key_getter=lambda: "mayar-key",
        base_url_getter=lambda: "https://api.mayar.id/hl/v1",
        callback_url_getter=lambda: "https://kaswise.com/callback",
        merchant_id_getter=lambda: "merchant-abc",
    )

    payload = {"data": {"merchantId": "merchant-abc", "status": "SUCCESS"}}
    assert provider.verify_notification_signature(payload) is True


def test_mayar_signature_verification_rejects_foreign_merchant_id():
    provider = MayarProvider(
        api_key_getter=lambda: "mayar-key",
        base_url_getter=lambda: "https://api.mayar.id/hl/v1",
        callback_url_getter=lambda: "https://kaswise.com/callback",
        merchant_id_getter=lambda: "merchant-abc",
    )

    payload = {"data": {"merchantId": "someone-else"}}
    assert provider.verify_notification_signature(payload) is False


def test_mayar_extract_provider_order_ids_from_webhook_payload():
    """Real Mayar webhook payload shape (from docs webhook/history sample)."""
    provider = MayarProvider(
        api_key_getter=lambda: "mayar-key",
        base_url_getter=lambda: "https://api.mayar.id/hl/v1",
        callback_url_getter=lambda: "https://kaswise.com/callback",
    )
    payload = {
        "event": "payment.received",
        "data": {
            "id": "43b2f0ce-03f2-4f59-a341-299ea3ef19b6",
            "transactionId": "43b2f0ce-03f2-4f59-a341-299ea3ef19b6",
            "productId": "688b6a9f-2893-4b8a-a637-a008d91d0cfc",
            "paymentLinkId": "688b6a9f-2893-4b8a-a637-a008d91d0cfc",
            "status": "SUCCESS",
            "transactionStatus": "paid",
            "amount": 0,
        },
    }

    ids = provider.extract_provider_order_ids(payload)
    assert ids == [
        "688b6a9f-2893-4b8a-a637-a008d91d0cfc",
        "688b6a9f-2893-4b8a-a637-a008d91d0cfc",
        "43b2f0ce-03f2-4f59-a341-299ea3ef19b6",
        "43b2f0ce-03f2-4f59-a341-299ea3ef19b6",
    ]


def test_mayar_map_internal_status_prefers_transaction_status():
    provider = MayarProvider(
        api_key_getter=lambda: "mayar-key",
        base_url_getter=lambda: "https://api.mayar.id/hl/v1",
        callback_url_getter=lambda: "https://kaswise.com/callback",
    )
    # "payment.received" real payload: status SUCCESS, transactionStatus paid
    paid = {"data": {"status": "SUCCESS", "transactionStatus": "paid"}}
    assert provider.map_internal_status(paid) == "paid"
    # reminder payload: status SUCCESS but transactionStatus created -> pending
    created = {"data": {"status": "SUCCESS", "transactionStatus": "created"}}
    assert provider.map_internal_status(created) == "pending"


def test_mayar_extract_gross_amount_uses_nett_amount_when_amount_zero():
    provider = MayarProvider(
        api_key_getter=lambda: "mayar-key",
        base_url_getter=lambda: "https://api.mayar.id/hl/v1",
        callback_url_getter=lambda: "https://kaswise.com/callback",
    )
    payload = {"data": {"amount": 0, "nettAmount": 1000}}
    assert provider.extract_gross_amount(payload) == 1000


def test_mayar_extract_gross_amount_none_when_all_zero():
    provider = MayarProvider(
        api_key_getter=lambda: "mayar-key",
        base_url_getter=lambda: "https://api.mayar.id/hl/v1",
        callback_url_getter=lambda: "https://kaswise.com/callback",
    )
    assert provider.extract_gross_amount({"data": {"amount": 0}}) is None


def test_mayar_request_surfaces_error_from_response_body():
    """Mayar-level errors (non-200 statusCode) should raise RuntimeError with detail."""
    request = MagicMock(
        return_value=_Response(
            {
                "statusCode": 422,
                "messages": "mobile is required",
                "data": {},
            }
        )
    )
    provider = MayarProvider(
        api_key_getter=lambda: "mayar-key",
        base_url_getter=lambda: "https://api.mayar.id/hl/v1",
        redirect_url_getter=lambda: "https://kaswise.com/upgrade",
        request_func=request,
    )

    try:
        provider.create_checkout(order_id="kw-x", amount=29000, plan="monthly", email="user@example.com")
        assert False, "Expected RuntimeError"
    except RuntimeError as exc:
        assert "mobile is required" in str(exc)


def test_mayar_request_surfaces_http_error_with_body():
    """HTTP errors with a parseable body should include the Mayar error detail."""
    from httpx import HTTPStatusError

    class HttpErrorResponse:
        def raise_for_status(self):
            raise HTTPStatusError(
                "422 Unprocessable Entity", request=MagicMock(), response=MagicMock()
            )

        def json(self):
            return {"statusCode": 422, "messages": "mobile is required"}

    request = MagicMock(return_value=HttpErrorResponse())
    provider = MayarProvider(
        api_key_getter=lambda: "mayar-key",
        base_url_getter=lambda: "https://api.mayar.id/hl/v1",
        redirect_url_getter=lambda: "https://kaswise.com/upgrade",
        request_func=request,
    )

    try:
        provider.create_checkout(order_id="kw-x", amount=29000, plan="monthly", email="user@example.com")
        assert False, "Expected RuntimeError"
    except RuntimeError as exc:
        assert "mobile is required" in str(exc)
