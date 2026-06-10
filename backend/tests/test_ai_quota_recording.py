from unittest.mock import AsyncMock, patch

from main import app
from app.core.auth import get_current_user
from app.core.rate_limit import rate_limit_ai


FAKE_USER = {"user_id": "quota-user-123", "email": "quota@example.com"}


def override_auth():
    return FAKE_USER


def override_rate_limit():
    return FAKE_USER


def _state(chat_count=0, photo_count=0, is_premium=False):
    return {
        "is_premium": is_premium,
        "period_ym": "2026-06",
        "chat_count": chat_count,
        "photo_count": photo_count,
        "chat_limit": 25,
        "photo_limit": 0 if not is_premium else 50,
    }


class TestAiQuotaRecording:
    def setup_method(self):
        app.dependency_overrides[get_current_user] = override_auth
        app.dependency_overrides[rate_limit_ai] = override_rate_limit

    def teardown_method(self):
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(rate_limit_ai, None)

    def test_chat_records_usage_even_when_ai_returns_no_transactions(self, client):
        with patch("app.api.v1.ai.load_state", return_value=_state()), patch(
            "app.api.v1.ai.extract_transaction_from_text",
            new=AsyncMock(return_value={"transactions": []}),
        ), patch("app.api.v1.ai.record_use") as record_use:
            response = client.post(
                "/api/v1/ai/chat",
                json={"text": "ini catatan transaksi kurang jelas"},
            )

        assert response.status_code == 200
        record_use.assert_called_once_with("quota-user-123", "2026-06", "chat")

    def test_chat_does_not_record_usage_when_quota_blocked(self, client):
        with patch("app.api.v1.ai.load_state", return_value=_state(chat_count=25)), patch(
            "app.api.v1.ai.extract_transaction_from_text",
            new=AsyncMock(return_value={"transactions": []}),
        ), patch("app.api.v1.ai.record_use") as record_use:
            response = client.post(
                "/api/v1/ai/chat",
                json={"text": "beli kopi 35000"},
            )

        assert response.status_code == 402
        record_use.assert_not_called()

    def test_receipt_records_photo_usage_even_when_amount_not_detected(self, client):
        with patch("app.api.v1.ai.load_state", return_value=_state(is_premium=True)), patch(
            "app.api.v1.ai.analyze_receipt_image",
            new=AsyncMock(return_value={"readable": False, "total_amount": None}),
        ), patch("app.api.v1.ai.record_use") as record_use:
            response = client.post(
                "/api/v1/ai/receipt",
                files={"file": ("receipt.png", b"fake-image", "image/png")},
            )

        assert response.status_code == 200
        record_use.assert_called_once_with("quota-user-123", "2026-06", "photo")
