"""Disiplin kategori pada ekstraksi chat AI.

Latar: model bebas mengarang kategori di luar daftar kategori user (21 nilai
aneh di akun Danu). Sekarang klien bisa mengirim daftar kategori user, prompt
diberi daftar + instruksi ketat, dan output model divalidasi di kode:
kategori di luar daftar -> "other" + category_suggestion berisi nama asli
model; kategori valid -> nama persis dari daftar user. Tanpa `categories`,
perilaku lama harus utuh (respons byte-equivalent, tanpa validasi tambahan).
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
    {"name": "Gaji", "type": "income"},
    {"name": "Olahraga", "type": "expense"},
    {"name": "Lainnya", "type": "expense"},
]


def _run(coro):
    return asyncio.run(coro)


def _patch_deepseek_with_payload(monkeypatch, payload: str) -> dict:
    """Solo-provider DeepSeek dengan jawaban JSON yang dikendalikan test."""
    captured = {}

    async def fake_extract(system_prompt, user_text):
        captured["system_prompt"] = system_prompt
        captured["user_text"] = user_text
        return payload

    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "sk-test", raising=False)
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", None, raising=False)
    monkeypatch.setattr(settings, "ZAI_OCR_API_KEY", None, raising=False)
    monkeypatch.setattr(ai_service, "_deepseek_extract_json", fake_extract)
    return captured


class TestChatExtractWithoutCategories:
    """Tanpa `categories`: perilaku lama utuh, respons tidak berubah."""

    def test_response_is_unchanged_and_has_no_validation(self, monkeypatch):
        model_output = json.dumps(
            {
                "transactions": [
                    {
                        "type": "expense",
                        "amount": 25000,
                        "category": "Nonton Bioskop",
                        "merchant": "XXI",
                        "note": None,
                        "wallet_hint": None,
                        "date": "today",
                        "confidence": 0.9,
                    },
                    {
                        "type": "income",
                        "amount": 5000000,
                        "category": "Food & Beverage",
                        "merchant": None,
                        "note": None,
                        "wallet_hint": None,
                        "date": None,
                        "confidence": 0.8,
                    },
                ],
                "unclear": None,
            }
        )
        _patch_deepseek_with_payload(monkeypatch, model_output)

        out = _run(ai_service.extract_transaction_from_text("nonton 25rb"))

        assert out == json.loads(model_output)
        for tx in out["transactions"]:
            assert "category_suggestion" not in tx

    def test_prompt_is_untouched(self, monkeypatch):
        _patch_deepseek_with_payload(
            monkeypatch,
            json.dumps({"transactions": [], "unclear": None}),
        )
        captured = _patch_deepseek_with_payload(
            monkeypatch, json.dumps({"transactions": [], "unclear": None})
        )

        _run(ai_service.extract_transaction_from_text("beli kopi 15rb"))

        assert captured["system_prompt"] == ai_service.TRANSACTION_EXTRACT_PROMPT


class TestChatExtractPromptWithCategories:
    """`categories` dikirim: prompt berisi daftar user + aturan ketat."""

    def test_prompt_lists_user_categories_with_type(self, monkeypatch):
        captured = _patch_deepseek_with_payload(
            monkeypatch, json.dumps({"transactions": [], "unclear": None})
        )

        _run(
            ai_service.extract_transaction_from_text(
                "beli kopi 15rb", categories=USER_CATEGORIES
            )
        )

        prompt = captured["system_prompt"]
        for name in ("Makan & Minum", "Transportasi", "Gaji", "Lainnya"):
            assert name in prompt
        assert "income" in prompt
        # Hanya memilih dari daftar, tidak pernah membuat kategori baru.
        assert "JANGAN" in prompt or "jangan" in prompt
        assert '"other"' in prompt

    def test_prompt_contains_id_en_mapping_for_user_list(self, monkeypatch):
        captured = _patch_deepseek_with_payload(
            monkeypatch, json.dumps({"transactions": [], "unclear": None})
        )

        _run(
            ai_service.extract_transaction_from_text(
                "beli kopi 15rb", categories=USER_CATEGORIES
            )
        )

        prompt = captured["system_prompt"]
        assert "Food & Beverage → Makan & Minum" in prompt
        assert "Salary → Gaji" in prompt
        assert "Transport → Transportasi" in prompt
        assert "Sport → Olahraga" in prompt
        assert "Other expenses → Lainnya" in prompt


class TestChatExtractValidation:
    """Output model divalidasi ke daftar user di kode (bukan cuma prompt)."""

    def test_unknown_category_becomes_other_with_suggestion(self, monkeypatch):
        _patch_deepseek_with_payload(
            monkeypatch,
            json.dumps(
                {
                    "transactions": [
                        {
                            "type": "expense",
                            "amount": 25000,
                            "category": "Nonton Bioskop Premium",
                            "merchant": "XXI",
                            "note": None,
                            "wallet_hint": None,
                            "date": "today",
                            "confidence": 0.9,
                        }
                    ],
                    "unclear": None,
                }
            ),
        )

        out = _run(
            ai_service.extract_transaction_from_text(
                "nonton bioskop 25rb", categories=USER_CATEGORIES
            )
        )

        tx = out["transactions"][0]
        assert tx["category"] == "other"
        assert tx["category_suggestion"] == "Nonton Bioskop Premium"

    def test_alias_english_answer_maps_to_user_category(self, monkeypatch):
        _patch_deepseek_with_payload(
            monkeypatch,
            json.dumps(
                {
                    "transactions": [
                        {"type": "expense", "amount": 35000, "category": "Food & Beverage"},
                        {"type": "income", "amount": 5000000, "category": "Salary"},
                    ],
                    "unclear": None,
                }
            ),
        )

        out = _run(
            ai_service.extract_transaction_from_text(
                "makan 35rb, gaji masuk", categories=USER_CATEGORIES
            )
        )

        assert out["transactions"][0]["category"] == "Makan & Minum"
        assert out["transactions"][0]["category_suggestion"] is None
        assert out["transactions"][1]["category"] == "Gaji"
        assert out["transactions"][1]["category_suggestion"] is None

    def test_case_and_whitespace_variants_use_exact_user_name(self, monkeypatch):
        _patch_deepseek_with_payload(
            monkeypatch,
            json.dumps(
                {
                    "transactions": [
                        {"type": "expense", "amount": 15000, "category": "  makan & minum "},
                        {"type": "expense", "amount": 12000, "category": "TRANSPORTASI"},
                    ],
                    "unclear": None,
                }
            ),
        )

        out = _run(
            ai_service.extract_transaction_from_text(
                "kopi 15rb, bensin 12rb", categories=USER_CATEGORIES
            )
        )

        assert out["transactions"][0]["category"] == "Makan & Minum"
        assert out["transactions"][0]["category_suggestion"] is None
        assert out["transactions"][1]["category"] == "Transportasi"
        assert out["transactions"][1]["category_suggestion"] is None

    def test_other_answer_is_kept_without_suggestion(self, monkeypatch):
        _patch_deepseek_with_payload(
            monkeypatch,
            json.dumps(
                {
                    "transactions": [
                        {"type": "expense", "amount": 10000, "category": "other"},
                        {"type": "expense", "amount": 20000, "category": "Other expenses"},
                    ],
                    "unclear": None,
                }
            ),
        )

        out = _run(
            ai_service.extract_transaction_from_text(
                "beli sesuatu", categories=USER_CATEGORIES
            )
        )

        # "other" selalu boleh (daftar user + Other).
        assert out["transactions"][0]["category"] == "other"
        assert out["transactions"][0]["category_suggestion"] is None
        # "Other expenses" adalah alias dari kategori user "Lainnya".
        assert out["transactions"][1]["category"] == "Lainnya"
        assert out["transactions"][1]["category_suggestion"] is None

    def test_empty_transactions_payload_passes_through(self, monkeypatch):
        _patch_deepseek_with_payload(
            monkeypatch,
            json.dumps({"transactions": [], "unclear": "Teks tidak jelas."}),
        )

        out = _run(
            ai_service.extract_transaction_from_text(
                "halo", categories=USER_CATEGORIES
            )
        )

        assert out == {"transactions": [], "unclear": "Teks tidak jelas."}


class TestChatEndpointPassesCategories:
    """Endpoint /api/v1/ai/chat meneruskan `categories` ke service."""

    @pytest.fixture(autouse=True)
    def isolate_quota_storage(self):
        state = {
            "is_premium": False,
            "period_ym": "2026-11",
            "chat_count": 0,
            "photo_count": 0,
            "chat_limit": 25,
            "photo_limit": 0,
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

    def test_categories_forwarded_to_service(self, client):
        service = AsyncMock(return_value={"transactions": [], "unclear": None})
        with patch(
            "app.api.v1.ai.extract_transaction_from_text", new=service
        ):
            response = client.post(
                "/api/v1/ai/chat",
                json={
                    "text": "beli kopi 15000",
                    "categories": USER_CATEGORIES,
                },
                headers={"Authorization": "Bearer fake-token"},
            )
        assert response.status_code == 200
        assert service.call_args.kwargs.get("categories") == USER_CATEGORIES

    def test_without_categories_service_called_without_them(self, client):
        service = AsyncMock(return_value={"transactions": [], "unclear": None})
        with patch(
            "app.api.v1.ai.extract_transaction_from_text", new=service
        ):
            response = client.post(
                "/api/v1/ai/chat",
                json={"text": "beli kopi 15000"},
                headers={"Authorization": "Bearer fake-token"},
            )
        assert response.status_code == 200
        assert service.call_args.kwargs.get("categories") is None
