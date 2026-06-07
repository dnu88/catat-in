from unittest.mock import AsyncMock, patch
from main import app
from app.core.auth import get_current_user
from app.core.rate_limit import rate_limit_ai

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE
    app.dependency_overrides[rate_limit_ai] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def _state(is_premium=False, chat_count=0):
    return {"is_premium": is_premium, "period_ym": "2026-06",
            "chat_count": chat_count, "photo_count": 0,
            "chat_limit": 200 if is_premium else 25, "photo_limit": 100 if is_premium else 0}


def test_free_chat_quota_exhausted_returns_402(client):
    with patch("app.api.v1.ai.load_state", return_value=_state(False, 25)):
        r = client.post("/api/v1/ai/chat", json={"text": "beli kopi 15rb"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 402
    assert r.json()["detail"]["reason"] == "quota_exhausted"


def test_chat_success_increments(client):
    result = {"transactions": [{"amount": 15000, "confidence": 0.9}], "unclear": None}
    with patch("app.api.v1.ai.load_state", return_value=_state(False, 0)), \
         patch("app.api.v1.ai.extract_transaction_from_text", new=AsyncMock(return_value=result)), \
         patch("app.api.v1.ai.record_use") as rec:
        r = client.post("/api/v1/ai/chat", json={"text": "beli kopi 15rb"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    rec.assert_called_once_with("u1", "2026-06", "chat")


def test_chat_empty_extraction_no_increment(client):
    result = {"transactions": [], "unclear": "tidak jelas"}
    with patch("app.api.v1.ai.load_state", return_value=_state(False, 0)), \
         patch("app.api.v1.ai.extract_transaction_from_text", new=AsyncMock(return_value=result)), \
         patch("app.api.v1.ai.record_use") as rec:
        r = client.post("/api/v1/ai/chat", json={"text": "halo"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    rec.assert_not_called()
