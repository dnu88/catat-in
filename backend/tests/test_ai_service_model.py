import json
from unittest.mock import AsyncMock, patch
import pytest
from app.services import ai_service


def _fake_response(text):
    class _Block: pass
    b = _Block(); b.text = text
    class _Resp: pass
    r = _Resp(); r.content = [b]
    return r


@pytest.mark.asyncio
async def test_chat_uses_haiku_and_cache():
    captured = {}
    fake_client = AsyncMock()
    async def _create(**kwargs):
        captured.update(kwargs)
        return _fake_response(json.dumps({"transactions": [], "unclear": None}))
    fake_client.messages.create = _create
    with patch.object(ai_service, "_get_async_anthropic_client", return_value=fake_client), \
         patch.object(ai_service.settings, "ANTHROPIC_API_KEY", "sk-test"):
        await ai_service.extract_transaction_from_text("beli kopi 15rb")
    assert captured["model"] == "claude-haiku-4-5"
    assert isinstance(captured["system"], list)
    assert captured["system"][0]["cache_control"] == {"type": "ephemeral"}


@pytest.mark.asyncio
async def test_receipt_uses_haiku_and_cache():
    captured = {}
    fake_client = AsyncMock()
    async def _create(**kwargs):
        captured.update(kwargs)
        return _fake_response(json.dumps({"readable": True, "total_amount": 1000,
                                          "category": "other", "items": [], "confidence": 0.9}))
    fake_client.messages.create = _create
    with patch.object(ai_service, "_get_async_anthropic_client", return_value=fake_client), \
         patch.object(ai_service.settings, "ANTHROPIC_API_KEY", "sk-test"):
        await ai_service.analyze_receipt_image(b"\xff\xd8imgdata", "image/jpeg")
    assert captured["model"] == "claude-haiku-4-5"
    assert captured["system"][0]["cache_control"] == {"type": "ephemeral"}
