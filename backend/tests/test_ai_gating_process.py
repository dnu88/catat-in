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


def _state(is_premium=False, chat_count=0, photo_count=0):
    return {"is_premium": is_premium, "period_ym": "2026-06",
            "chat_count": chat_count, "photo_count": photo_count,
            "chat_limit": 200 if is_premium else 25, "photo_limit": 100 if is_premium else 0}


def test_process_text_quota_exhausted_402(client):
    with patch("app.api.v1.ai.load_state", return_value=_state(False, 25)):
        r = client.post("/api/v1/ai/process", json={"input_type": "text", "data": "beli kopi 15rb"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 402
    assert r.json()["detail"]["reason"] == "quota_exhausted"


def test_process_text_success_increments_chat(client):
    result = {"transactions": [{"amount": 15000, "confidence": 0.9}], "unclear": None}
    with patch("app.api.v1.ai.load_state", return_value=_state(False, 0)), \
         patch("app.api.v1.ai.extract_transaction_from_text", new=AsyncMock(return_value=result)), \
         patch("app.api.v1.ai.record_use") as rec:
        r = client.post("/api/v1/ai/process", json={"input_type": "text", "data": "beli kopi 15rb"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    rec.assert_called_once_with("u1", "2026-06", "chat")


def test_process_image_free_premium_only_402(client):
    with patch("app.api.v1.ai.load_state", return_value=_state(False)):
        r = client.post("/api/v1/ai/process",
                        json={"input_type": "image", "data": "data:image/png;base64,iVBORw0KGgo="},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 402
    assert r.json()["detail"]["reason"] == "premium_only"


def test_process_image_premium_success_increments_photo(client):
    analyzed = {"total_amount": 50000, "readable": True, "confidence": 0.8, "items": []}
    with patch("app.api.v1.ai.load_state", return_value=_state(True, 0, 0)), \
         patch("app.api.v1.ai.analyze_receipt_image", new=AsyncMock(return_value=analyzed)), \
         patch("app.api.v1.ai.record_use") as rec:
        r = client.post("/api/v1/ai/process",
                        json={"input_type": "image", "data": "data:image/png;base64,iVBORw0KGgo="},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    rec.assert_called_once_with("u1", "2026-06", "photo")
