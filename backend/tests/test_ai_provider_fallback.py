"""Uji pemilihan provider AI dan rantai cadangan (DeepSeek -> Anthropic -> lokal).

Latar: dulu hanya Anthropic; ketika kredit akun Anthropic habis, seluruh fitur
AI mati. Sekarang DeepSeek jadi provider utama dan Anthropic jadi cadangan,
sehingga satu akun bermasalah tidak mematikan pencatatan.
"""

import asyncio

import pytest

from app.core.config import settings
from app.services import ai_service


def _run(coro):
    return asyncio.run(coro)


def test_provider_prefers_deepseek_when_available(monkeypatch):
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "sk-test", raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant", raising=False)
    assert ai_service.active_ai_provider() == "deepseek"


def test_provider_uses_anthropic_when_only_that_key_exists(monkeypatch):
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", None, raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant", raising=False)
    assert ai_service.active_ai_provider() == "anthropic"


def test_falls_back_to_anthropic_when_deepseek_fails(monkeypatch):
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "sk-test", raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant", raising=False)

    async def boom(system_prompt, user_text):
        raise RuntimeError("deepseek sedang down")

    async def ok(system_prompt, user_text):
        return '{"transactions": [{"amount": 35000}]}'

    monkeypatch.setattr(ai_service, "_deepseek_extract_json", boom)
    monkeypatch.setattr(ai_service, "_anthropic_extract_json", ok)

    out = _run(ai_service.extract_transaction_from_text("beli kopi 35rb"))
    assert out["transactions"][0]["amount"] == 35000


def test_uses_local_parser_when_no_provider_configured(monkeypatch):
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", None, raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", None, raising=False)
    out = _run(ai_service.extract_transaction_from_text("beli kopi 35rb"))
    assert isinstance(out, dict)


def test_raises_when_every_provider_fails(monkeypatch):
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "sk-test", raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant", raising=False)

    async def boom(system_prompt, user_text):
        raise RuntimeError("down")

    monkeypatch.setattr(ai_service, "_deepseek_extract_json", boom)
    monkeypatch.setattr(ai_service, "_anthropic_extract_json", boom)

    with pytest.raises(RuntimeError):
        _run(ai_service.extract_transaction_from_text("apa saja"))


def test_deepseek_payload_disables_thinking_and_requests_json(monkeypatch):
    """Ekstraksi tidak perlu reasoning: matikan agar output singkat dan murah."""
    captured = {}

    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {"choices": [{"message": {"content": "{}"}}]}

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, url, headers=None, json=None):
            captured["url"] = url
            captured["payload"] = json
            return FakeResponse()

    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "sk-test", raising=False)
    monkeypatch.setattr(ai_service.httpx, "AsyncClient", FakeClient)

    _run(ai_service._deepseek_extract_json("sistem", "beli kopi 35rb"))

    assert captured["url"].endswith("/chat/completions")
    assert captured["payload"]["response_format"] == {"type": "json_object"}
    assert captured["payload"]["thinking"] == {"type": "disabled"}
    assert captured["payload"]["model"] == settings.DEEPSEEK_MODEL
