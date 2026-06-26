"""Compatibility facade for the provider-neutral payment internals."""
from datetime import datetime, timezone

from app.core.auth import _get_supabase_service_client
from app.core.config import settings
from app.services.payments import orchestrator, repository
from app.services.payments.providers import (
    MayarProvider,
    MidtransProvider,
    build_core_client,
    build_snap_client,
    map_status,
)

_DEFAULT_PROVIDER = "midtrans"
_SUPPORTED_PROVIDERS = {"midtrans", "mayar"}


class MayarAccessDeniedError(PermissionError):
    """Raised when a user is not allowed to use the limited Mayar checkout flow."""


def _core_client():
    return build_core_client()


def _snap_client():
    return build_snap_client()


def _midtrans_provider() -> MidtransProvider:
    return MidtransProvider(
        core_client_factory=_core_client,
        snap_client_factory=_snap_client,
        server_key_getter=lambda: settings.MIDTRANS_SERVER_KEY or "",
    )


def _mayar_provider() -> MayarProvider:
    return MayarProvider(
        api_key_getter=lambda: settings.MAYAR_API_KEY or "",
        base_url_getter=lambda: settings.MAYAR_BASE_URL or "",
        redirect_url_getter=lambda: settings.MAYAR_REDIRECT_URL or settings.MAYAR_CALLBACK_URL or "",
    )


def get_primary_payment_provider_name() -> str:
    configured = (settings.PAYMENT_PRIMARY_PROVIDER or _DEFAULT_PROVIDER).strip().lower()
    return configured if configured in _SUPPORTED_PROVIDERS else _DEFAULT_PROVIDER


def mayar_allowed_emails() -> set[str]:
    return {str(email).strip().lower() for email in settings.MAYAR_ALLOWED_EMAILS if str(email).strip()}


def is_mayar_checkout_allowed(email: str | None) -> bool:
    normalized_email = (email or "").strip().lower()
    return bool(normalized_email) and normalized_email in mayar_allowed_emails()


def resolve_checkout_provider_name(*, email: str | None, provider_name: str | None = None) -> str:
    resolved_provider_name = provider_name or get_primary_payment_provider_name()
    if resolved_provider_name == "mayar" and not is_mayar_checkout_allowed(email):
        raise MayarAccessDeniedError("Mayar checkout is not enabled for this account.")
    return resolved_provider_name


def _provider_for_name(provider_name: str):
    normalized = (provider_name or _DEFAULT_PROVIDER).strip().lower()
    if normalized == "mayar":
        return _mayar_provider()
    return _midtrans_provider()


def _should_activate_provider(provider_name: str) -> bool:
    normalized = (provider_name or "").strip().lower()
    if normalized == "mayar":
        return bool(settings.MAYAR_ACTIVATION_ENABLED)
    return True


def price_for(plan: str, tier: str) -> int:
    return orchestrator.price_for(plan, tier)


def tier_for_count(paid_user_count: int) -> str:
    return orchestrator.tier_for_count(paid_user_count)


def duration_days(plan: str) -> int:
    return orchestrator.duration_days(plan)


def verify_notification_signature(payload: dict) -> bool:
    return _midtrans_provider().verify_notification_signature(payload)


def fetch_and_sync_status(
    order_id: str,
    *,
    provider_name: str | None = None,
    provider_order_id: str | None = None,
) -> dict:
    resolved_provider_name = provider_name or _DEFAULT_PROVIDER
    provider = _provider_for_name(resolved_provider_name)
    return orchestrator.fetch_and_sync_status(
        order_id,
        provider=provider,
        provider_order_id=provider_order_id,
        repository_module=repository,
        client=_get_supabase_service_client(),
        now_func=_now,
        activate_paid_profile=_should_activate_provider(provider.name),
    )


def get_payment_for_user(order_id: str, user_id: str) -> dict | None:
    client = _get_supabase_service_client()
    if client is None:
        raise RuntimeError("Supabase service client tidak tersedia.")
    return repository.get_payment_for_user(order_id, user_id, client=client)


def make_order_id(user_id: str) -> str:
    return orchestrator.make_order_id(user_id)


def create_checkout(*, order_id: str, amount: int, plan: str, email: str, provider_name: str | None = None) -> dict:
    resolved_provider_name = resolve_checkout_provider_name(email=email, provider_name=provider_name)
    provider = _provider_for_name(resolved_provider_name)
    result = provider.create_checkout(order_id=order_id, amount=amount, plan=plan, email=email)
    return {"provider": provider.name, **result}


def create_snap_transaction(*, order_id: str, amount: int, plan: str, email: str) -> dict:
    return _midtrans_provider().create_checkout(order_id=order_id, amount=amount, plan=plan, email=email)


def _now():
    return datetime.now(timezone.utc)


def count_paid_users() -> int:
    client = _get_supabase_service_client()
    if client is None:
        return 0
    return repository.count_paid_users(client=client)


def activate_premium_from_notification(payload: dict) -> str:
    return orchestrator.activate_premium_from_notification(
        payload,
        provider=_midtrans_provider(),
        repository_module=repository,
        client=_get_supabase_service_client(),
        now_func=_now,
        activate_paid_profile=True,
    )


__all__ = [
    "_core_client",
    "_snap_client",
    "_now",
    "activate_premium_from_notification",
    "count_paid_users",
    "create_checkout",
    "create_snap_transaction",
    "duration_days",
    "fetch_and_sync_status",
    "get_payment_for_user",
    "get_primary_payment_provider_name",
    "is_mayar_checkout_allowed",
    "MayarAccessDeniedError",
    "make_order_id",
    "map_status",
    "price_for",
    "resolve_checkout_provider_name",
    "tier_for_count",
    "verify_notification_signature",
]
