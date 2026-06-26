"""Shared payment service types and constants."""
from typing import Any, TypedDict


class CheckoutResult(TypedDict, total=False):
    token: str | None
    redirect_url: str
    provider_order_id: str | None
    provider_transaction_id: str | None
    provider_status: str | None
    raw_payload: dict[str, Any]


class PaymentStatusResult(TypedDict, total=False):
    order_id: str
    status: str
    provider: str
    provider_status: str | None
    midtrans_status: str | None


PAYMENT_SELECT_FOR_USER = (
    "id,user_id,order_id,status,amount,provider,provider_order_id,"
    "provider_status,midtrans_status"
)
PAYMENT_SELECT_FOR_ACTIVATION = "id,user_id,plan,status,amount,provider,provider_order_id"
TERMINAL_PAYMENT_STATUSES = ("paid", "failed", "expired")
