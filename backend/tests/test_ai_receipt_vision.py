"""Uji jalur pembaca gambar/struk (DeepSeek utama -> Gemini -> Claude).

Latar: setelah provider teks pindah ke DeepSeek, jalur struk sempat terikat
Gemini lalu Claude — dan keduanya kehabisan kredit, sehingga fitur scan struk
mati di produksi. Probe 2026-10-10 membuktikan asumsi lama ("DeepSeek tidak
menerima gambar") keliru: deepseek-flash membaca dua struk berbeda dengan benar.
Urutan provider sekarang mengikuti VISION_PROVIDER_ORDER, dan satu akun
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
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", None, raising=False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None, raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", None, raising=False)
    monkeypatch.setattr(
        settings, "VISION_PROVIDER_ORDER", "deepseek,gemini,anthropic", raising=False
    )


def test_prefers_deepseek_when_its_key_exists(monkeypatch):
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "ds-key", raising=False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key", raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant", raising=False)
    assert ai_service.active_vision_provider() == "deepseek"
    assert ai_service.vision_provider_order() == ["deepseek", "gemini", "anthropic"]


def test_order_follows_the_configured_vision_provider_order(monkeypatch):
    """Kalau kredit berpindah akun, cukup ubah env — tanpa deploy ulang."""
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "ds-key", raising=False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key", raising=False)
    monkeypatch.setattr(settings, "VISION_PROVIDER_ORDER", "gemini,deepseek", raising=False)
    assert ai_service.vision_provider_order() == ["gemini", "deepseek"]
    assert ai_service.active_vision_provider() == "gemini"


def test_unknown_or_unkeyed_providers_are_skipped(monkeypatch):
    """Salah tulis nama provider tidak boleh mematikan scan struk."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key", raising=False)
    monkeypatch.setattr(
        settings, "VISION_PROVIDER_ORDER", "openai, deepseek, gemini, gemini", raising=False
    )
    assert ai_service.vision_provider_order() == ["gemini"]


def test_deepseek_payload_carries_the_image_and_a_generous_token_budget(monkeypatch):
    """deepseek-flash model reasoning: anggaran token harus lega, bukan 1024."""
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

    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "ds-key", raising=False)
    monkeypatch.setattr(ai_service.httpx, "AsyncClient", FakeClient)

    out = _run(ai_service.analyze_receipt_image(b"fake-bytes", "image/jpeg"))

    assert out["total_amount"] == 125000
    assert captured["url"].endswith("/chat/completions")
    assert captured["headers"]["Authorization"] == "Bearer ds-key"
    assert captured["payload"]["model"] == settings.DEEPSEEK_MODEL
    assert captured["payload"]["max_tokens"] >= 2000

    parts = captured["payload"]["messages"][1]["content"]
    image_part = next(part for part in parts if part["type"] == "image_url")
    assert image_part["image_url"]["url"].startswith("data:image/jpeg;base64,")


def test_empty_deepseek_answer_falls_through_to_the_next_provider(monkeypatch):
    """HTTP 200 dengan content kosong (reasoning menghabiskan token) bukan hasil valid."""
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "ds-key", raising=False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key", raising=False)

    async def empty(image_b64, media_type):
        raise RuntimeError("DeepSeek mengembalikan jawaban kosong")

    async def ok(image_b64, media_type):
        return RECEIPT_JSON

    monkeypatch.setattr(ai_service, "_deepseek_receipt_json", empty)
    monkeypatch.setattr(ai_service, "_gemini_receipt_json", ok)

    out = _run(ai_service.analyze_receipt_image(b"fake-bytes", "image/jpeg"))
    assert out["total_amount"] == 125000


def test_deepseek_receipt_json_rejects_empty_content(monkeypatch):
    """Tanpa provider lain, jawaban kosong = error yang jelas, bukan 'tidak terbaca'."""
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "ds-key", raising=False)

    class FakeResponse:
        status_code = 200
        text = ""

        @staticmethod
        def json():
            return {
                "choices": [
                    {"message": {"content": "", "reasoning_content": "thinking..."}}
                ]
            }

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, url, headers=None, json=None):
            return FakeResponse()

    monkeypatch.setattr(ai_service.httpx, "AsyncClient", FakeClient)

    async def boom(image_b64, media_type):
        raise RuntimeError("jangan sampai dipanggil")

    monkeypatch.setattr(ai_service, "_gemini_receipt_json", boom)
    monkeypatch.setattr(ai_service, "_anthropic_receipt_json", boom)

    with pytest.raises(RuntimeError) as excinfo:
        _run(ai_service.analyze_receipt_image(b"fake-bytes", "image/jpeg"))
    assert "kosong" in str(excinfo.value)


def test_deepseek_error_status_is_reported(monkeypatch):
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "ds-key", raising=False)

    class FakeResponse:
        status_code = 402
        text = '{"error":{"message":"Insufficient Balance"}}'

        @staticmethod
        def json():
            return {}

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, url, headers=None, json=None):
            return FakeResponse()

    monkeypatch.setattr(ai_service.httpx, "AsyncClient", FakeClient)

    with pytest.raises(RuntimeError) as excinfo:
        _run(ai_service._deepseek_receipt_json("b64", "image/jpeg"))
    assert "DeepSeek error 402" in str(excinfo.value)


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
