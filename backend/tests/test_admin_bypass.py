from unittest.mock import AsyncMock, patch

import pytest

from app.core import admin
from app.core.rate_limit import rate_limit_ai


def test_admin_email_matching_is_trimmed_and_case_insensitive(monkeypatch):
    monkeypatch.setattr(admin.settings, "ADMIN_EMAILS", [" Admin@Example.com "])

    assert admin.is_admin_email("admin@example.com") is True
    assert admin.is_admin_user({"email": "ADMIN@example.com"}) is True
    assert admin.is_admin_user({"email": "member@example.com"}) is False


def test_payment_allowlist_does_not_grant_admin_access(monkeypatch):
    monkeypatch.setattr(admin.settings, "ADMIN_EMAILS", [])
    monkeypatch.setattr(admin.settings, "MAYAR_ALLOWED_EMAILS", ["buyer@example.com"])

    assert admin.is_admin_email("buyer@example.com") is False


@pytest.mark.asyncio
async def test_admin_bypasses_ai_request_limiter():
    current_user = {"user_id": "admin-1", "email": "admin@example.com"}
    with patch("app.core.rate_limit.is_admin_user", return_value=True), patch(
        "app.core.rate_limit._rate_limit_user", new=AsyncMock()
    ) as limiter:
        result = await rate_limit_ai(current_user)

    assert result is current_user
    limiter.assert_not_awaited()
