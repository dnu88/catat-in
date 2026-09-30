"""Operator/admin account helpers."""

from app.core.config import settings


def _normalized_emails(values: list[str]) -> set[str]:
    return {str(email).strip().lower() for email in values if str(email).strip()}


def admin_emails() -> set[str]:
    """Return explicitly configured operator accounts.

    Product/payment allowlists are intentionally not reused here: bypassing AI
    quota and rate limits requires the dedicated ``ADMIN_EMAILS`` setting.
    """
    return _normalized_emails(settings.ADMIN_EMAILS)


def is_admin_email(email: str | None) -> bool:
    if not email:
        return False
    return email.strip().lower() in admin_emails()


def is_admin_user(current_user: dict | None) -> bool:
    if not current_user:
        return False
    return is_admin_email(current_user.get("email"))
