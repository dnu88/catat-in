"""Disiplin kategori pada analisis struk (OCR).

Jalur /api/v1/ai/receipt: mobile bisa mengirim field multipart `categories`
(JSON array [{name, type}]) sebagai daftar kategori milik user. Backend
menyisipkan daftar itu ke prompt OCR/struk dan memvalidasi output model di
kode — kategori di luar daftar (case-insensitive + alias id/en yang dikenal)
menjadi "other" dengan `category_suggestion` berisi jawaban asli model, baik
di level total maupun per item. Tanpa `categories`, perilaku lama utuh
(respons dan prompt byte-equivalent, tanpa validasi tambahan).
"""

import asyncio
import json
from unittest.mock import AsyncMock, patch

import pytest

from app.core.config import settings
from app.services import ai_service
from main import app

FAKE_USER = {"user_id": "test-user-123", "email": "test@example.com"}

USER_CATEGORIES = [
    {"name": "Makan & Minum", "type": "expense"},
    {"name": "Transportasi", "type": "expense"},
    {"name": "Belanja Bulanan", "type": "expense"},
    {"name": "Kesehatan", "type": "expense"},
    {"name": "Lainnya", "type": "expense"},
]

RECEIPT_IMAGE_BYTES = b"fake-png-bytes"


def _run(coro):
    return asyncio.run(coro)


def _patch_deepseek_receipt(monkeypatch, payload: str) -> dict:
    """Solo-provider DeepSeek vision dengan jawaban JSON yang dikendalikan test."""
    captured = {}

    async def fake_receipt(image_b64, media_type, prompt):
        captured["image_b64"] = image_b64
        captured["media_type"] = media_type
        captured["prompt"] = prompt
        return payload

    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "sk-test", raising=False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None, raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", None, raising=False)
    monkeypatch.setattr(ai_service, "_deepseek_receipt_json", fake_receipt)
    return captured


def _model_receipt(**overrides) -> dict:
    base = {
        "total_amount": 35000,
        "merchant": "Indomaret",
        "date": "2026-11-28",
        "category": "Belanja Bulanan",
        "items": [
            {"name": "Kopi", "qty": 2, "price": 15000, "category": "Makan & Minum"},
            {"name": "Paracetamol", "qty": 1, "price": 5000, "category": "Kesehatan"},
        ],
        "confidence": 0.9,
        "readable": True,
    }
    base.update(overrides)
    return base


class TestReceiptWithoutCategories:
    """Tanpa `categories`: perilaku lama utuh, respons tidak berubah."""

    def test_response_is_unchanged_and_has_no_validation(self, monkeypatch):
        model_output = _model_receipt(
            category="Nonton Bioskop Premium",
            items=[
                {"name": "Kopi", "qty": 2, "price": 15000, "category": "Makan & Minum"},
                {"name": "Tiket", "qty": 1, "price": 20000, "category": "Hiburan"},
            ],
        )
        _patch_deepseek_receipt(monkeypatch, json.dumps(model_output))

        out = _run(
            ai_service.analyze_receipt_image(RECEIPT_IMAGE_BYTES, "image/png")
        )

        assert out == model_output
        assert "category_suggestion" not in out
        for item in out["items"]:
            assert "category_suggestion" not in item

    def test_prompt_is_untouched(self, monkeypatch):
        captured = _patch_deepseek_receipt(
            monkeypatch,
            json.dumps(_model_receipt(category="Makan & Minum")),
        )

        _run(ai_service.analyze_receipt_image(RECEIPT_IMAGE_BYTES, "image/png"))

        assert captured["prompt"] == ai_service.RECEIPT_ANALYSIS_PROMPT


class TestReceiptPromptWithCategories:
    """`categories` dikirim: prompt struk berisi daftar user + aturan ketat."""

    def test_prompt_lists_user_categories_with_type(self, monkeypatch):
        captured = _patch_deepseek_receipt(
            monkeypatch,
            json.dumps(_model_receipt()),
        )

        _run(
            ai_service.analyze_receipt_image(
                RECEIPT_IMAGE_BYTES, "image/png", categories=USER_CATEGORIES
            )
        )

        prompt = captured["prompt"]
        for name in ("Makan & Minum", "Transportasi", "Belanja Bulanan", "Lainnya"):
            assert name in prompt
        assert "expense" in prompt
        assert "JANGAN" in prompt or "jangan" in prompt
        assert '"other"' in prompt


class TestReceiptValidation:
    """Output model divalidasi ke daftar user di kode (bukan cuma prompt)."""

    def test_unknown_category_becomes_other_with_suggestion(self, monkeypatch):
        _patch_deepseek_receipt(
            monkeypatch,
            json.dumps(
                _model_receipt(
                    category="Belanja Skripsi",
                    items=[
                        {
                            "name": "Buku",
                            "qty": 1,
                            "price": 5000,
                            "category": "Buku & Alat Tulis",
                        },
                    ],
                )
            ),
        )

        out = _run(
            ai_service.analyze_receipt_image(
                RECEIPT_IMAGE_BYTES, "image/png", categories=USER_CATEGORIES
            )
        )

        assert out["category"] == "other"
        assert out["category_suggestion"] == "Belanja Skripsi"
        item = out["items"][0]
        assert item["category"] == "other"
        assert item["category_suggestion"] == "Buku & Alat Tulis"

    def test_alias_english_answer_maps_to_user_category(self, monkeypatch):
        _patch_deepseek_receipt(
            monkeypatch,
            json.dumps(
                _model_receipt(
                    category="Groceries",
                    items=[
                        {
                            "name": "Kopi",
                            "qty": 2,
                            "price": 15000,
                            "category": "Food & Beverage",
                        },
                    ],
                )
            ),
        )

        out = _run(
            ai_service.analyze_receipt_image(
                RECEIPT_IMAGE_BYTES, "image/png", categories=USER_CATEGORIES
            )
        )

        assert out["category"] == "Belanja Bulanan"
        assert out["category_suggestion"] is None
        assert out["items"][0]["category"] == "Makan & Minum"
        assert out["items"][0]["category_suggestion"] is None

    def test_case_and_whitespace_variants_use_exact_user_name(self, monkeypatch):
        _patch_deepseek_receipt(
            monkeypatch,
            json.dumps(
                _model_receipt(
                    category="  belanja bulanan ",
                    items=[
                        {
                            "name": "Kopi",
                            "qty": 2,
                            "price": 15000,
                            "category": "MAKAN & MINUM",
                        },
                    ],
                )
            ),
        )

        out = _run(
            ai_service.analyze_receipt_image(
                RECEIPT_IMAGE_BYTES, "image/png", categories=USER_CATEGORIES
            )
        )

        assert out["category"] == "Belanja Bulanan"
        assert out["category_suggestion"] is None
        assert out["items"][0]["category"] == "Makan & Minum"
        assert out["items"][0]["category_suggestion"] is None

    def test_other_answer_is_kept_without_suggestion(self, monkeypatch):
        _patch_deepseek_receipt(
            monkeypatch,
            json.dumps(
                _model_receipt(
                    category="other",
                    items=[
                        {
                            "name": "Tisu",
                            "qty": 1,
                            "price": 5000,
                            "category": "Other expenses",
                        },
                    ],
                )
            ),
        )

        out = _run(
            ai_service.analyze_receipt_image(
                RECEIPT_IMAGE_BYTES, "image/png", categories=USER_CATEGORIES
            )
        )

        assert out["category"] == "other"
        assert out["category_suggestion"] is None
        # "Other expenses" adalah alias dari kategori user "Lainnya".
        assert out["items"][0]["category"] == "Lainnya"
        assert out["items"][0]["category_suggestion"] is None

    def test_items_without_category_are_left_untouched(self, monkeypatch):
        _patch_deepseek_receipt(
            monkeypatch,
            json.dumps(
                _model_receipt(
                    category="Belanja Bulanan",
                    items=[
                        {"name": "Kopi", "qty": 2, "price": 15000},
                        {"name": "Roti", "qty": 1, "price": 5000, "category": None},
                    ],
                )
            ),
        )

        out = _run(
            ai_service.analyze_receipt_image(
                RECEIPT_IMAGE_BYTES, "image/png", categories=USER_CATEGORIES
            )
        )

        assert out["items"][0] == {"name": "Kopi", "qty": 2, "price": 15000}
        assert out["items"][1]["category"] is None
        assert "category_suggestion" not in out["items"][0]
        assert "category_suggestion" not in out["items"][1]


class TestReceiptEndpointPassesCategories:
    """Endpoint /api/v1/ai/receipt meneruskan field multipart `categories`."""

    @pytest.fixture(autouse=True)
    def isolate_quota_storage(self):
        # Photo quota hanya untuk premium (lihat evaluate kind="photo").
        state = {
            "is_premium": True,
            "period_ym": "2026-11",
            "chat_count": 0,
            "photo_count": 0,
            "chat_limit": 25,
            "photo_limit": 5,
        }
        with (
            patch("app.api.v1.ai.load_state", return_value=state),
            patch("app.api.v1.ai.record_use"),
        ):
            yield

    def setup_method(self):
        from app.core.auth import get_current_user
        from app.core.rate_limit import rate_limit_ai

        app.dependency_overrides[get_current_user] = lambda: FAKE_USER
        app.dependency_overrides[rate_limit_ai] = lambda: FAKE_USER

    def teardown_method(self):
        from app.core.auth import get_current_user
        from app.core.rate_limit import rate_limit_ai

        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(rate_limit_ai, None)

    def _post_receipt(self, client, categories: str | None):
        data = {"categories": categories} if categories is not None else {}
        with patch(
            "app.api.v1.ai.analyze_receipt_image", new=AsyncMock(
                return_value={"category": "other"}
            )
        ) as service:
            response = client.post(
                "/api/v1/ai/receipt",
                files={"file": ("receipt.png", RECEIPT_IMAGE_BYTES, "image/png")},
                data=data,
                headers={"Authorization": "Bearer fake-token"},
            )
        return response, service

    def test_categories_forwarded_to_service(self, client):
        response, service = self._post_receipt(
            client, json.dumps(USER_CATEGORIES)
        )
        assert response.status_code == 200
        assert service.call_args.kwargs.get("categories") == USER_CATEGORIES

    def test_without_categories_service_called_without_them(self, client):
        response, service = self._post_receipt(client, None)
        assert response.status_code == 200
        assert service.call_args.kwargs.get("categories") is None

    def test_malformed_categories_json_is_ignored(self, client):
        response, service = self._post_receipt(client, "{bukan json")
        assert response.status_code == 200
        assert service.call_args.kwargs.get("categories") is None
