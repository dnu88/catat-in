"""GLM (Z.ai) sebagai provider teks dan syarat input JPEG untuk OCR.

Latar 2026-11-26: kredit DeepSeek/Gemini/Anthropic habis bersamaan sehingga
pencatatan teks dan struk mati total, padahal kunci Z.ai sudah aktif. Dua bug
ditemukan saat investigasi:

1. `layout_parsing` Z.ai menolak PNG (HTTP 400 kode 1214) walau dokumentasinya
   menyebut PNG didukung, jadi jalur GLM OCR selalu gagal untuk struk PNG.
2. GLM tidak pernah dipakai untuk ekstraksi teks, hanya untuk gambar.
"""

import asyncio
import base64
import io

from PIL import Image

from app.core.config import settings
from app.services import ai_service
from app.services import glm_receipt


def _png_b64() -> str:
    buf = io.BytesIO()
    Image.new("RGB", (24, 16), "white").save(buf, "PNG")
    return base64.standard_b64encode(buf.getvalue()).decode()


def test_glm_input_converts_png_to_jpeg():
    """Z.ai menolak image/png; semua gambar harus dikirim sebagai JPEG."""
    data, media_type = glm_receipt._as_zai_input(_png_b64(), "image/png")

    assert media_type == "image/jpeg"
    # JPEG magic bytes: FF D8 FF
    assert base64.b64decode(data)[:3] == b"\xff\xd8\xff"


def test_glm_input_keeps_pdf_untouched():
    payload = base64.standard_b64encode(b"%PDF-1.4 contoh").decode()
    data, media_type = glm_receipt._as_zai_input(payload, "application/pdf")

    assert media_type == "application/pdf"
    assert data == payload


def test_text_extraction_falls_back_to_glm(monkeypatch):
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "sk-test", raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-ant", raising=False)
    monkeypatch.setattr(settings, "ZAI_OCR_API_KEY", "zai-test", raising=False)

    async def deepseek_down(system_prompt, user_text):
        raise RuntimeError("402 Insufficient Balance")

    async def glm_ok(system_prompt, user_text):
        return '{"transactions": [{"type": "expense", "amount": 3047500}]}'

    monkeypatch.setattr(ai_service, "_deepseek_extract_json", deepseek_down)
    monkeypatch.setattr(ai_service, "_glm_extract_json", glm_ok)

    out = asyncio.run(
        ai_service.extract_transaction_from_text("bayar kartu kredit 3047500")
    )

    assert out["transactions"][0]["amount"] == 3047500


def test_glm_provider_is_skipped_without_key(monkeypatch):
    monkeypatch.setattr(settings, "ZAI_OCR_API_KEY", None, raising=False)
    called = {"glm": False}

    async def glm_should_not_run(system_prompt, user_text):
        called["glm"] = True
        return "{}"

    monkeypatch.setattr(ai_service, "_glm_extract_json", glm_should_not_run)
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "sk-test", raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", None, raising=False)

    async def ok(system_prompt, user_text):
        return '{"transactions": [{"type": "expense", "amount": 1000}]}'

    monkeypatch.setattr(ai_service, "_deepseek_extract_json", ok)

    out = asyncio.run(ai_service.extract_transaction_from_text("kopi 1000"))

    assert called["glm"] is False
    assert out["transactions"][0]["amount"] == 1000
