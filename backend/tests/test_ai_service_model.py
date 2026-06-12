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
    assert captured["max_tokens"] == 2048
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


def test_local_text_extraction_splits_multiple_transactions():
    result = ai_service._extract_transaction_locally("beli kopi 25rb, sarapan 15rb, parkir 5rb")

    assert result["unclear"]
    transactions = result["transactions"]
    assert [tx["amount"] for tx in transactions] == [25000, 15000, 5000]
    assert [tx["category"] for tx in transactions] == ["food", "food", "transport"]
    assert transactions[0]["note"] == "beli kopi"
    assert transactions[1]["note"] == "sarapan"
    assert transactions[2]["note"] == "parkir"


def test_local_text_extraction_keeps_single_transaction_behavior():
    result = ai_service._extract_transaction_locally("beli kopi 25rb")

    assert len(result["transactions"]) == 1
    assert result["transactions"][0]["amount"] == 25000
    assert result["transactions"][0]["category"] == "food"
