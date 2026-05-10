"""
Tests for AI endpoints.
"""
import pytest
from unittest.mock import AsyncMock, patch
from main import app
from app.core.auth import get_current_user
from app.core.rate_limit import rate_limit_ai


FAKE_USER = {"user_id": "test-user-123", "email": "test@example.com"}


def override_auth():
    return FAKE_USER


def override_rate_limit():
    return FAKE_USER


class TestAIChatAuth:
    """Auth-required behavior for /api/v1/ai/chat."""

    def test_chat_requires_auth(self, client):
        """Request without auth header must return 401."""
        response = client.post("/api/v1/ai/chat", json={"text": "beli kopi 15000"})
        assert response.status_code == 401

    def test_chat_with_invalid_token_returns_401(self, client):
        """Malformed / non-JWT token must return 401."""
        response = client.post(
            "/api/v1/ai/chat",
            json={"text": "beli kopi 15000"},
            headers={"Authorization": "Bearer not-a-jwt"},
        )
        assert response.status_code == 401


class TestAIChatWithAuth:
    """Behavior with authenticated request (mocked auth + mocked AI service)."""

    def setup_method(self):
        app.dependency_overrides[get_current_user] = override_auth
        app.dependency_overrides[rate_limit_ai] = override_rate_limit

    def teardown_method(self):
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(rate_limit_ai, None)

    def test_chat_short_text_returns_422(self, client):
        """Text under 2 chars should return 422."""
        response = client.post(
            "/api/v1/ai/chat",
            json={"text": "x"},
            headers={"Authorization": "Bearer fake-token"},
        )
        assert response.status_code == 422

    def test_chat_missing_body_returns_422(self, client):
        """Missing required text field should return 422."""
        response = client.post(
            "/api/v1/ai/chat",
            json={},
            headers={"Authorization": "Bearer fake-token"},
        )
        assert response.status_code == 422

    def test_chat_valid_text_calls_service(self, client):
        """Valid request with mocked AI service returns 200."""
        mock_result = {
            "transactions": [
                {
                    "type": "expense",
                    "amount": 15000,
                    "merchant": "warung kopi",
                    "kategori": "Food",
                    "confidence": 0.9,
                }
            ]
        }
        with patch(
            "app.api.v1.ai.extract_transaction_from_text",
            new=AsyncMock(return_value=mock_result),
        ):
            response = client.post(
                "/api/v1/ai/chat",
                json={"text": "beli kopi 15000"},
                headers={"Authorization": "Bearer fake-token"},
            )
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert data["transactions"][0]["amount"] == 15000

    def test_chat_ai_service_error_returns_502(self, client):
        """RuntimeError from AI service should surface as 502."""
        with patch(
            "app.api.v1.ai.extract_transaction_from_text",
            new=AsyncMock(side_effect=RuntimeError("AI key not configured")),
        ):
            response = client.post(
                "/api/v1/ai/chat",
                json={"text": "beli kopi 15000"},
                headers={"Authorization": "Bearer fake-token"},
            )
        assert response.status_code == 502
