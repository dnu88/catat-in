"""Midtrans provider adapter."""
import hashlib
import hmac

import midtransclient

from app.core.config import settings
from app.services.payments.models import CheckoutResult

from .base import PaymentProvider


def map_status(transaction_status: str, fraud_status: str | None) -> str:
    if transaction_status in ("settlement",) or (
        transaction_status == "capture" and fraud_status == "accept"
    ):
        return "paid"
    if transaction_status == "capture":
        return "pending"
    if transaction_status == "pending":
        return "pending"
    if transaction_status in ("deny", "cancel"):
        return "failed"
    if transaction_status in ("expire", "failure"):
        return "expired"
    return "pending"


def build_core_client():
    return midtransclient.CoreApi(
        is_production=bool(settings.MIDTRANS_IS_PRODUCTION),
        server_key=settings.MIDTRANS_SERVER_KEY or "",
        client_key=settings.MIDTRANS_CLIENT_KEY or "",
    )


def build_snap_client():
    return midtransclient.Snap(
        is_production=bool(settings.MIDTRANS_IS_PRODUCTION),
        server_key=settings.MIDTRANS_SERVER_KEY or "",
        client_key=settings.MIDTRANS_CLIENT_KEY or "",
    )


class MidtransProvider(PaymentProvider):
    name = "midtrans"

    def __init__(
        self,
        *,
        core_client_factory=build_core_client,
        snap_client_factory=build_snap_client,
        server_key_getter=None,
    ):
        self._core_client_factory = core_client_factory
        self._snap_client_factory = snap_client_factory
        self._server_key_getter = server_key_getter or (lambda: settings.MIDTRANS_SERVER_KEY or "")

    def create_checkout(self, *, order_id: str, amount: int, plan: str, email: str) -> CheckoutResult:
        snap = self._snap_client_factory()
        param = {
            "transaction_details": {"order_id": order_id, "gross_amount": amount},
            "enabled_payments": ["qris", "gopay", "shopeepay"],
            "item_details": [{
                "id": f"premium-{plan}",
                "price": amount,
                "quantity": 1,
                "name": f"Kaswise Premium ({plan})",
            }],
            "customer_details": {"email": email},
        }
        res = snap.create_transaction(param)
        return {"token": res["token"], "redirect_url": res["redirect_url"]}

    def fetch_status(self, order_id: str) -> dict:
        return self._core_client_factory().transactions.status(order_id)

    def verify_notification_signature(self, payload: dict) -> bool:
        raw = (
            f"{payload.get('order_id', '')}{payload.get('status_code', '')}"
            f"{payload.get('gross_amount', '')}{self._server_key_getter() or ''}"
        )
        expected = hashlib.sha512(raw.encode()).hexdigest()
        return hmac.compare_digest(expected, payload.get("signature_key", ""))

    def map_internal_status(self, payload: dict) -> str:
        return map_status(payload.get("transaction_status", ""), payload.get("fraud_status"))

    def extract_order_id(self, payload: dict) -> str:
        return payload.get("order_id", "")

    def extract_gross_amount(self, payload: dict):
        return payload.get("gross_amount")

    def build_payment_update(self, payload: dict, *, new_status: str) -> dict:
        return {
            "provider": self.name,
            "provider_order_id": payload.get("order_id"),
            "provider_transaction_id": payload.get("transaction_id"),
            "provider_status": payload.get("transaction_status"),
            "midtrans_status": payload.get("transaction_status"),
            "status": new_status,
            "method": payload.get("payment_type"),
            "raw_payload": payload,
        }

    def build_status_response(self, payload: dict) -> dict:
        return {
            "provider": self.name,
            "provider_status": payload.get("transaction_status"),
            "midtrans_status": payload.get("transaction_status"),
        }
