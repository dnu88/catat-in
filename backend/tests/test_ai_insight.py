"""
Tests for AI Insight premium guard.

Verifies that:
- Free (non-premium) users cannot access POST /api/v1/ai/insight
- Premium users can access the endpoint
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException, status
from main import app
from app.core.auth import get_current_user, require_premium
from app.core.rate_limit import rate_limit_ai


FAKE_USER = {"user_id": "test-user-123", "email": "test@example.com"}


def override_auth():
    return FAKE_USER


def override_rate_limit():
    return FAKE_USER


def override_require_premium_free():
    """Simulate a free user — require_premium raises 403."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Fitur ini memerlukan akun Premium aktif.",
    )


def override_require_premium_pass():
    """Simulate a premium user — require_premium passes through."""
    return FAKE_USER


class TestAIInsightAuthRequired:
    """Auth-required behavior for /api/v1/ai/insight."""

    def test_insight_requires_auth(self, client):
        """Request without auth token must return 401."""
        response = client.post(
            "/api/v1/ai/insight",
            json={"period": "monthly"},
        )
        assert response.status_code == 401


class TestAIInsightPremiumGuard:
    """Premium guard behaviour for /api/v1/ai/insight (authenticated)."""

    def setup_method(self):
        app.dependency_overrides[get_current_user] = override_auth
        app.dependency_overrides[rate_limit_ai] = override_rate_limit

    def teardown_method(self):
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(rate_limit_ai, None)
        app.dependency_overrides.pop(require_premium, None)

    def test_free_user_blocked_from_insight(self, client):
        """Non-premium user receives 403 Forbidden from /api/v1/ai/insight."""
        app.dependency_overrides[require_premium] = override_require_premium_free

        response = client.post(
            "/api/v1/ai/insight",
            json={"period": "monthly"},
        )
        assert response.status_code == 403

    def test_premium_user_can_access_insight(self, client):
        """Premium user receives 200 OK from /api/v1/ai/insight."""
        app.dependency_overrides[require_premium] = override_require_premium_pass

        mock_insight = "Pengeluaran Anda bulan ini naik 15% dibandingkan bulan lalu."
        with patch(
            "app.api.v1.ai.generate_financial_insight",
            new=AsyncMock(return_value=mock_insight),
        ):
            response = client.post(
                "/api/v1/ai/insight",
                json={"period": "monthly"},
            )

        assert response.status_code == 200
        data = response.json()
        assert "insight" in data
        assert data["insight"] == mock_insight
