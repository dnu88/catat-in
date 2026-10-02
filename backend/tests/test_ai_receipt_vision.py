"""Uji jalur pembaca gambar/struk (Gemini utama -> Claude cadangan).

Latar: setelah provider teks pindah ke DeepSeek, jalur struk tetap terikat
Claude yang kreditnya habis, sehingga fitur scan struk mati di produksi.
DeepSeek tidak menerima gambar, jadi jalur struk sekarang memakai Gemini
(endpoint kompatibel-OpenAI) dengan Claude sebagai cadangan — dan satu akun
bermasalah tidak boleh mematikan scan struk.
"""

import asyncio

import pytest

from app.core.config import settings
from app.services import ai_service

RECEIPT_JSON = (
    '{"total_amount": 125000, "merchant": "RM Sederhana", "date": "2026-10-02", '
    '"category": "food", "items": [{"name": "Kopi", "price": 50000}], '
    '"confidence": 0.92, "readable": true}'
)


def _run(coro):
    return asyncio.run(coro)


@pytest.fixture(autouse=True)
def _quiet_keys(monkeypatch):
    """Setiap test mulai dari tanpa kunci sama sekali."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None, raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", None, raising=False)


def test_prefers_gemini_when_its_key_exists(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key", raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant", raising=False)
    assert ai_service.active_vision_provider() == "gemini"


def test_falls_back_to_anthropic_when_gemini_key_missing(monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant", raising=False)
    assert ai_service.active_vision_provider() == "anthropic"


def test_without_any_provider_the_receipt_is_simply_unreadable():
    out = _run(ai_service.analyze_receipt_image(b"fake-bytes", "image/jpeg"))
    assert out["readable"] is False
    assert out["total_amount"] is None
    assert out["items"] == []


def test_gemini_payload_carries_the_image_as_a_data_uri(monkeypatch):
    captured = {}

    class FakeResponse:
        status_code = 200
        text = ""

        @staticmethod
        def json():
            return {"choices": [{"message": {"content": RECEIPT_JSON}}]}

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, url, headers=None, json=None):
            captured["url"] = url
            captured["headers"] = headers
            captured["payload"] = json
            return FakeResponse()

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key", raising=False)
    monkeypatch.setattr(ai_service.httpx, "AsyncClient", FakeClient)

    out = _run(ai_service.analyze_receipt_image(b"fake-bytes", "image/jpeg"))

    assert out["total_amount"] == 125000
    assert out["merchant"] == "RM Sederhana"
    assert captured["url"].endswith("/chat/completions")
    assert captured["headers"]["Authorization"] == "Bearer gemini-key"
    assert captured["payload"]["model"] == settings.GEMINI_MODEL

    parts = captured["payload"]["messages"][1]["content"]
    image_part = next(part for part in parts if part["type"] == "image_url")
    assert image_part["image_url"]["url"].startswith("data:image/jpeg;base64,")
    system_prompt = captured["payload"]["messages"][0]["content"]
    assert "JSON" in system_prompt


def test_falls_back_to_claude_when_gemini_fails(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key", raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant", raising=False)

    async def boom(image_b64, media_type):
        raise RuntimeError("gemini 429 kuota habis")

    async def ok(image_b64, media_type):
        return RECEIPT_JSON

    monkeypatch.setattr(ai_service, "_gemini_receipt_json", boom)
    monkeypatch.setattr(ai_service, "_anthropic_receipt_json", ok)

    out = _run(ai_service.analyze_receipt_image(b"fake-bytes", "image/jpeg"))
    assert out["total_amount"] == 125000


def test_raises_when_every_vision_provider_fails(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key", raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant", raising=False)

    async def boom(image_b64, media_type):
        raise RuntimeError("down")

    monkeypatch.setattr(ai_service, "_gemini_receipt_json", boom)
    monkeypatch.setattr(ai_service, "_anthropic_receipt_json", boom)

    with pytest.raises(RuntimeError):
        _run(ai_service.analyze_receipt_image(b"fake-bytes", "image/jpeg"))


def test_malformed_json_answers_are_reported_as_unreadable(monkeypatch):
    """Provider menjawab tapi bukan JSON: jangan 500, cukup "tidak terbaca"."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key", raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant", raising=False)

    async def prose(image_b64, media_type):
        return "Maaf, gambar ini terlalu buram untuk dibaca."

    monkeypatch.setattr(ai_service, "_gemini_receipt_json", prose)
    monkeypatch.setattr(ai_service, "_anthropic_receipt_json", prose)

    out = _run(ai_service.analyze_receipt_image(b"fake-bytes", "image/jpeg"))
    assert out["readable"] is False
    assert out["confidence"] == 0.0


def test_code_fenced_json_is_accepted(monkeypatch):
    """Model kadang membungkus JSON dengan ```json — harus tetap terbaca."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key", raising=False)

    async def fenced(image_b64, media_type):
        return f"```json\n{RECEIPT_JSON}\n```"

    monkeypatch.setattr(ai_service, "_gemini_receipt_json", fenced)

    out = _run(ai_service.analyze_receipt_image(b"fake-bytes", "image/jpeg"))
    assert out["total_amount"] == 125000


def test_retired_model_falls_through_to_the_fallback_model(monkeypatch):
    """Pelajaran produksi: gemini-2.5-flash dipensiunkan untuk kunci baru.

    404 "no longer available" harus beralih ke model cadangan, bukan mematikan
    fitur scan struk.
    """
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key", raising=False)
    monkeypatch.setattr(settings, "GEMINI_MODEL", "gemini-2.5-flash", raising=False)
    monkeypatch.setattr(
        settings, "GEMINI_FALLBACK_MODEL", "gemini-flash-latest", raising=False
    )

    tried: list[str] = []

    async def chat_once(model, image_b64, media_type):
        tried.append(model)
        if model == "gemini-2.5-flash":
            raise ai_service._GeminiModelUnavailable(
                "This model is no longer available to new users"
            )
        return RECEIPT_JSON

    monkeypatch.setattr(ai_service, "_gemini_chat_once", chat_once)

    out = _run(ai_service.analyze_receipt_image(b"fake-bytes", "image/jpeg"))

    assert ai_service.gemini_models_to_try() == [
        "gemini-2.5-flash",
        "gemini-flash-latest",
    ]
    assert tried == ["gemini-2.5-flash", "gemini-flash-latest"]
    assert out["total_amount"] == 125000


def test_all_gemini_models_retired_raises_for_the_next_provider(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key", raising=False)

    async def chat_once(model, image_b64, media_type):
        raise ai_service._GeminiModelUnavailable("no longer available")

    monkeypatch.setattr(ai_service, "_gemini_chat_once", chat_once)

    with pytest.raises(RuntimeError):
        _run(ai_service.analyze_receipt_image(b"fake-bytes", "image/jpeg"))
