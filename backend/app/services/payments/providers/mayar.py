"""Mayar invoice provider skeleton."""
from typing import Any, Callable

import httpx

from app.core.config import settings
from app.services.payments.models import CheckoutResult

from .base import PaymentProvider

RequestFunc = Callable[..., Any]


class MayarProvider(PaymentProvider):
    name = "mayar"

    def __init__(
        self,
        *,
        api_key_getter=None,
        base_url_getter=None,
        redirect_url_getter=None,
        callback_url_getter=None,
        request_func: RequestFunc | None = None,
    ):
        self._api_key_getter = api_key_getter or (lambda: settings.MAYAR_API_KEY or "")
        self._base_url_getter = base_url_getter or (lambda: settings.MAYAR_BASE_URL or "")
        self._redirect_url_getter = redirect_url_getter or callback_url_getter or (
            lambda: settings.MAYAR_REDIRECT_URL or settings.MAYAR_CALLBACK_URL or ""
        )
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
                    raise RuntimeError(f"Mayar API error: {detail}") from exc
                raise
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError("Unexpected Mayar response payload.")
        # Surface Mayar-level errors even on HTTP 200.
        if data.get("statusCode") and data.get("statusCode") not in (200, 201):
            detail = data.get("messages") or data.get("error") or data.get("errors")
            raise RuntimeError(f"Mayar API error: {detail or 'unknown'}")
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
        return False

    def map_internal_status(self, payload: dict) -> str:
        provider_status = (self._provider_status(payload) or "").strip().lower()
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
        data = payload.get("data") or {}
        return data.get("amount") or payload.get("amount")

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
