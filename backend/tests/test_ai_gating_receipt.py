import io
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


def _state(is_premium, photo_count=0):
    return {"is_premium": is_premium, "period_ym": "2026-06",
            "chat_count": 0, "photo_count": photo_count,
            "chat_limit": 200 if is_premium else 25, "photo_limit": 100 if is_premium else 0}


def _file():
    return {"file": ("struk.jpg", io.BytesIO(b"\xff\xd8\xff\x00data"), "image/jpeg")}


def test_free_receipt_premium_only_402(client):
    with patch("app.api.v1.ai.load_state", return_value=_state(False)):
        r = client.post("/api/v1/ai/receipt", files=_file(),
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 402
    assert r.json()["detail"]["reason"] == "premium_only"


def test_premium_receipt_success_increments(client):
    result = {"total_amount": 50000, "readable": True, "confidence": 0.8, "items": []}
    with patch("app.api.v1.ai.load_state", return_value=_state(True, 0)), \
         patch("app.api.v1.ai.analyze_receipt_image", new=AsyncMock(return_value=result)), \
         patch("app.api.v1.ai.record_use") as rec:
        r = client.post("/api/v1/ai/receipt", files=_file(),
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    rec.assert_called_once_with("u1", "2026-06", "photo")


def test_premium_receipt_fairuse_429(client):
    with patch("app.api.v1.ai.load_state", return_value=_state(True, 100)):
        r = client.post("/api/v1/ai/receipt", files=_file(),
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 429
    assert r.json()["detail"]["reason"] == "fair_use"
