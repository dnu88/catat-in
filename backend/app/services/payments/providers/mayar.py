"""Mayar invoice provider.

Mayar.id does NOT sign webhook payloads. There is no signature header or
token documented (verified against the ``webhook/history`` API response, which
contains no signature field). Authenticity therefore cannot be proven from the
webhook body alone. See ADR-0003 and ``webhooks.py`` for the security model:
the webhook is treated only as a *trigger*; the authoritative payment state is
re-fetched from Mayar's authenticated Invoice API before any premium
activation. ``verify_notification_signature`` below implements an optional
soft ``merchantId`` check (fail-closed when ``MAYAR_MERCHANT_ID`` is unset) so a
cross-merchant forged payload is rejected before it triggers an API call.
"""
from typing import Any, Callable

import httpx

from app.core.config import settings
from app.services.payments.models import CheckoutResult

from .base import PaymentProvider

RequestFunc = Callable[..., Any]


class MayarApiError(RuntimeError):
    """Raised when the Mayar API returns an upstream error.

    Subclasses ``RuntimeError`` so existing ``except RuntimeError`` call sites
    still catch it, but lets the webhook handler route upstream Mayar failures
    to 502 Bad Gateway while keeping our-own-infra (Supabase) RuntimeErrors at
    503 Service Unavailable. Misconfiguration (missing API key / base URL) stays
    a plain ``RuntimeError`` (503) since it is our side, not Mayar's.
    """


class MayarProvider(PaymentProvider):
    name = "mayar"

    def __init__(
        self,
        *,
        api_key_getter=None,
        base_url_getter=None,
        redirect_url_getter=None,
        callback_url_getter=None,
        merchant_id_getter=None,
        request_func: RequestFunc | None = None,
    ):
        self._api_key_getter = api_key_getter or (lambda: settings.MAYAR_API_KEY or "")
        self._base_url_getter = base_url_getter or (lambda: settings.MAYAR_BASE_URL or "")
        self._redirect_url_getter = redirect_url_getter or callback_url_getter or (
            lambda: settings.MAYAR_REDIRECT_URL or settings.MAYAR_CALLBACK_URL or ""
        )
        self._merchant_id_getter = merchant_id_getter or (lambda: settings.MAYAR_MERCHANT_ID or "")
        self._request_func = request_func or httpx.request

    def _api_key(self) -> str:
        api_key = (self._api_key_getter() or "").strip()
        if not api_key:
            raise RuntimeError("MAYAR_API_KEY belum dikonfigurasi.")
        return api_key

    def _base_url(self) -> str:
        base_url = (self._base_url_getter() or "").strip().rstrip("/")
        if not base_url:
            raise RuntimeError("MAYAR_BASE_URL belum dikonfigurasi.")
        return base_url

    def _redirect_url(self) -> str:
        redirect_url = (self._redirect_url_getter() or "").strip()
        if not redirect_url:
            raise RuntimeError("MAYAR_REDIRECT_URL belum dikonfigurasi (fallback: MAYAR_CALLBACK_URL).")
        return redirect_url

    def _request(self, method: str, path: str, *, json: dict | None = None) -> dict:
        response = self._request_func(
            method,
            f"{self._base_url()}{path}",
            headers={"Authorization": f"Bearer {self._api_key()}"},
            json=json,
            timeout=20.0,
        )
        if hasattr(response, "raise_for_status"):
            try:
                response.raise_for_status()
            except Exception as exc:
                # Extract Mayar error detail from response body when available.
                detail = None
                try:
                    body = response.json()
                    detail = body.get("messages") or body.get("error") or body.get("errors")
                except Exception:
                    pass
                if detail:
                    raise MayarApiError(f"Mayar API error: {detail}") from exc
                raise
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError("Unexpected Mayar response payload.")
        # Surface Mayar-level errors even on HTTP 200.
        if data.get("statusCode") and data.get("statusCode") not in (200, 201):
            detail = data.get("messages") or data.get("error") or data.get("errors")
            raise MayarApiError(f"Mayar API error: {detail or 'unknown'}")
        return data

    def create_checkout(self, *, order_id: str, amount: int, plan: str, email: str) -> CheckoutResult:
        description = f"Kaswise Premium ({plan})"
        payload = {
            "name": (email.split("@", 1)[0] or "Kaswise User").replace(".", " ").strip() or "Kaswise User",
            "email": email,
            "mobile": "000000000000",
            "redirectUrl": self._redirect_url(),
            "description": description,
            "items": [{"quantity": 1, "rate": amount, "description": description}],
            "extraData": {"orderId": order_id, "plan": plan},
        }
        result = self._request("POST", "/invoice/create", json=payload)
        data = result.get("data") or {}
        redirect_url = data.get("link") or data.get("paymentUrl") or data.get("payment_url")
        if not redirect_url:
            raise ValueError("Mayar invoice response missing payment URL.")
        return {
            "redirect_url": redirect_url,
            "provider_order_id": data.get("id") or data.get("paymentLinkId") or data.get("payment_link_id"),
            "provider_transaction_id": data.get("transactionId") or data.get("transaction_id"),
            "provider_status": self._provider_status(result),
            "raw_payload": result,
        }

    def fetch_status(self, order_id: str) -> dict:
        return self._request("GET", f"/invoice/{order_id}")

    def verify_notification_signature(self, payload: dict) -> bool:
        """Soft authenticity check (Mayar has no cryptographic webhook signature).

        Returns ``True`` only when ``MAYAR_MERCHANT_ID`` is configured AND the
        payload's ``data.merchantId`` matches it. Returns ``False`` (fail-closed)
        when the merchant id is unconfigured or the payload does not match — so a
        forged request never triggers a downstream Mayar API re-fetch. This is a
        soft check, not signature verification; the authoritative state is still
        re-fetched from Mayar's authenticated API in the webhook handler.
        """
        configured = (self._merchant_id_getter() or "").strip()
        if not configured:
            return False
        data = payload.get("data") or {}
        candidate = str(data.get("merchantId") or "").strip()
        if not candidate:
            return False
        return hmac_safe_eq(candidate, configured)

    def extract_provider_order_ids(self, payload: dict) -> list[str]:
        """Candidate Mayar invoice/link ids carried by a webhook payload.

        The webhook body does not echo our ``extraData.orderId`` back, so we map
        the notification to our ``payments`` row by matching ``provider_order_id``
        (the Mayar invoice/payment-link id we persist at checkout) against these
        candidates. ``data.productId``/``data.paymentLinkId`` are the payment-link
        ids; ``data.id``/``data.transactionId`` are transaction ids — all are
        tried so the lookup is resilient to which field Mayar populates.
        """
        data = payload.get("data") or {}
        raw = [
            data.get("productId"),
            data.get("paymentLinkId"),
            data.get("id"),
            data.get("transactionId"),
        ]
        return [str(v).strip() for v in raw if str(v or "").strip()]

    def map_internal_status(self, payload: dict) -> str:
        data = payload.get("data") or {}
        # Prefer transactionStatus ("paid"/"created"/...) which is the canonical
        # Mayar lifecycle field; fall back to data.status ("SUCCESS"/"PENDING").
        status = (data.get("transactionStatus") or self._provider_status(payload) or "")
        provider_status = str(status).strip().lower()
        if provider_status in {"paid", "success", "completed", "settlement"}:
            return "paid"
        if provider_status in {"expired", "expire"}:
            return "expired"
        if provider_status in {"failed", "failure", "cancelled", "canceled"}:
            return "failed"
        return "pending"

    def extract_order_id(self, payload: dict) -> str:
        extra_data = self._extra_data(payload)
        return (
            extra_data.get("orderId")
            or extra_data.get("order_id")
            or payload.get("order_id")
            or ""
        )

    def extract_gross_amount(self, payload: dict):
        """Best-effort gross amount for the orchestrator's nominal check.

        The ``payload`` here is the re-fetched Mayar Invoice detail (the trusted
        source), not the unsigned webhook body. Mayar may report ``amount`` as 0
        even on paid transactions when fees are borne by the customer, with the
        real value in ``nettAmount``. We return the first truthy candidate; if
        none is truthy we return ``None`` so the orchestrator skips the nominal
        comparison (rather than rejecting a real payment because amount == 0).

        Threat model: returning ``None`` makes the nominal guard fail-open
        (skipped). This is acceptable because we control invoice creation —
        ``create_checkout`` always sets ``items[].rate`` to our server-side price
        (29_000+), so a Mayar invoice with a genuinely zero amount cannot exist
        in our flow unless WE created it with rate 0, which we never do. The
        skip only ever triggers for the re-fetched invoice detail, not the
        webhook body, so a forged webhook cannot craft a zero-amount bypass.
        """
        data = payload.get("data") or {}
        for key in ("amount", "nettAmount", "grossAmount"):
            value = data.get(key)
            if value is not None and str(value).strip() not in ("", "0", "0.0", "0.00"):
                try:
                    if float(value) > 0:
                        return value
                except (TypeError, ValueError):
                    return value
        return None

    def build_payment_update(self, payload: dict, *, new_status: str) -> dict:
        data = payload.get("data") or {}
        return {
            "provider": self.name,
            "provider_order_id": data.get("id") or data.get("paymentLinkId") or data.get("payment_link_id"),
            "provider_transaction_id": data.get("transactionId") or data.get("transaction_id"),
            "provider_status": self._provider_status(payload),
            "status": new_status,
            "raw_payload": payload,
        }

    def build_status_response(self, payload: dict) -> dict:
        return {"provider": self.name, "provider_status": self._provider_status(payload)}

    @staticmethod
    def _extra_data(payload: dict) -> dict:
        data = payload.get("data") or {}
        extra_data = data.get("extraData") or data.get("extra_data") or payload.get("extraData")
        return extra_data if isinstance(extra_data, dict) else {}

    @staticmethod
    def _provider_status(payload: dict) -> str | None:
        data = payload.get("data") or {}
        status = data.get("status") or payload.get("status") or payload.get("messages")
        return str(status) if status is not None else None


def hmac_safe_eq(a: str, b: str) -> bool:
    import hmac
    return hmac.compare_digest(a.encode(), b.encode())
