"""
Tests for AI insight structured response (Task 3).
"""
import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.services import ai_service


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fake_anthropic_response(text: str):
    """Build a minimal fake anthropic messages.create response object."""
    class _Block:
        pass
    b = _Block()
    b.text = text

    class _Resp:
        pass
    r = _Resp()
    r.content = [b]
    return r


# ---------------------------------------------------------------------------
# normalize_insight_response
# ---------------------------------------------------------------------------

class TestNormalizeInsightResponse:
    """normalize_insight_response must always return a safe, well-shaped dict."""

    def test_valid_full_input_passes_through(self):
        """All required keys present → returned unchanged (arrays respected)."""
        raw = {
            "period": "monthly",
            "generated_at": "2026-06-09T10:00:00+00:00",
            "summary": "Keuanganmu sehat bulan ini.",
            "highlights": ["Pengeluaran makanan naik", "Pemasukan stabil"],
            "recommendations": ["Kurangi jajan", "Tambahkan tabungan"],
            "risk_flags": ["Pengeluaran > pemasukan"],
            "data_quality": {
                "transaction_count": 42,
                "has_previous_period": True,
                "other_category_percent": 15.5,
            },
        }
        result = ai_service.normalize_insight_response(raw, {})
        assert result["period"] == "monthly"
        assert result["summary"] == "Keuanganmu sehat bulan ini."
        assert len(result["highlights"]) == 2
        assert len(result["recommendations"]) == 2
        assert len(result["risk_flags"]) == 1
        assert result["data_quality"]["transaction_count"] == 42

    def test_missing_keys_get_safe_defaults(self):
        """Completely empty input returns all required keys with safe defaults."""
        result = ai_service.normalize_insight_response({}, {})
        assert result["period"] == "monthly"
        assert isinstance(result["generated_at"], str)
        assert result["summary"] == ""
        assert result["highlights"] == []
        assert result["recommendations"] == []
        assert result["risk_flags"] == []
        assert result["data_quality"] == {
            "transaction_count": 0,
            "has_previous_period": False,
            "other_category_percent": None,
        }

    def test_partial_input_merges_with_defaults(self):
        """Some keys present, some missing → defaults filled for missing keys."""
        raw = {"summary": "Ok saja", "highlights": ["Satu"]}
        context = {"period": "weekly"}
        result = ai_service.normalize_insight_response(raw, context)
        assert result["period"] == "weekly"
        assert result["summary"] == "Ok saja"
        assert result["highlights"] == ["Satu"]
        assert result["recommendations"] == []   # default
        assert result["data_quality"]["transaction_count"] == 0

    def test_arrays_capped(self):
        """highlights max 3, recommendations max 2, risk_flags max 2."""
        raw = {
            "summary": "test",
            "highlights": ["a", "b", "c", "d", "e"],
            "recommendations": ["1", "2", "3"],
            "risk_flags": ["x", "y", "z"],
        }
        result = ai_service.normalize_insight_response(raw, {})
        assert len(result["highlights"]) == 3
        assert len(result["recommendations"]) == 2
        assert len(result["risk_flags"]) == 2

    def test_empty_strings_stripped_from_arrays(self):
        """Empty strings inside arrays are removed."""
        raw = {
            "summary": "test",
            "highlights": ["", "valid", "  ", None, "also valid"],
            "recommendations": ["", ""],
            "risk_flags": ["", "flag1"],
        }
        result = ai_service.normalize_insight_response(raw, {})
        assert result["highlights"] == ["valid", "also valid"]
        assert result["recommendations"] == []
        assert result["risk_flags"] == ["flag1"]

    def test_html_script_tags_stripped(self):
        """String sanitization removes HTML tags and script content."""
        raw = {
            "summary": "<p>Hello <script>alert('xss')</script>world</p>",
            "highlights": ["<b>Good</b>", "<img src=x onerror=alert(1)>bad"],
        }
        result = ai_service.normalize_insight_response(raw, {})
        assert "<script>" not in result["summary"]
        assert "</script>" not in result["summary"]
        assert "<p>" not in result["summary"]
        assert "Hello" in result["summary"]
        assert "world" in result["summary"]
        assert "<b>" not in result["highlights"][0]
        assert "<img" not in result["highlights"][1]

    def test_string_length_capped(self):
        """Summary max 500 chars, individual items max 200 chars."""
        long_text = "A" * 600
        raw = {
            "summary": long_text,
            "highlights": ["B" * 300, "short"],
        }
        result = ai_service.normalize_insight_response(raw, {})
        assert len(result["summary"]) <= 500
        assert len(result["highlights"][0]) <= 200
        assert result["highlights"][1] == "short"

    def test_non_list_arrays_converted(self):
        """If highlights/recommendations/risk_flags are not lists, use empty list."""
        raw = {
            "summary": "test",
            "highlights": "not a list",
            "recommendations": 123,
            "risk_flags": None,
        }
        result = ai_service.normalize_insight_response(raw, {})
        assert result["highlights"] == []
        assert result["recommendations"] == []
        assert result["risk_flags"] == []

    def test_context_overrides_period_when_available(self):
        """Context dict can supply period and transaction metadata."""
        raw = {"summary": "ok"}
        context = {
            "period": "yearly",
            "transaction_count": 150,
            "has_previous_period": True,
            "other_category_percent": 8.2,
        }
        result = ai_service.normalize_insight_response(raw, context)
        assert result["period"] == "yearly"
        assert result["data_quality"]["transaction_count"] == 150
        assert result["data_quality"]["has_previous_period"] is True
        assert result["data_quality"]["other_category_percent"] == 8.2

    def test_context_period_falls_back_to_raw(self):
        """Context period wins; if missing, raw period wins; otherwise default 'monthly'."""
        raw = {"period": "daily"}
        result = ai_service.normalize_insight_response(raw, {})
        assert result["period"] == "daily"


# ---------------------------------------------------------------------------
# generate_financial_insight — API-key-missing fallback
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_insight_no_api_key_returns_graceful_dict():
    """When ANTHROPIC_API_KEY is not set, return graceful dict (not old string)."""
    with patch.object(ai_service.settings, "ANTHROPIC_API_KEY", None):
        result = await ai_service.generate_financial_insight(
            user_data={
                "transaction_count": 8,
                "income_total": 5_000_000,
                "expense_total": 1_250_000,
                "net_total": 3_750_000,
                "top_categories": [{"category": "Makan", "amount": 600_000, "percent": 48.0}],
            },
            period="monthly",
        )
    assert isinstance(result, dict)
    assert result["period"] == "monthly"
    assert "8 transaksi" in result["summary"]
    assert result["highlights"]
    assert result["recommendations"]
    assert result["risk_flags"] == []
    assert "generated_at" in result
    assert "data_quality" in result


# ---------------------------------------------------------------------------
# generate_financial_insight — Claude prompt format
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_insight_prompt_includes_json_instruction():
    """The prompt sent to Claude must demand JSON-only output."""
    captured_prompt = {}

    fake_client = AsyncMock()

    async def _create(**kwargs):
        captured_prompt.update(kwargs)
        valid_json = json.dumps({
            "summary": "Keuangan stabil.",
            "highlights": ["Pengeluaran terkendali"],
            "recommendations": ["Lanjutkan budgeting"],
            "risk_flags": [],
        })
        return _fake_anthropic_response(valid_json)

    fake_client.messages.create = _create

    with patch.object(ai_service, "_get_async_anthropic_client", return_value=fake_client), \
         patch.object(ai_service.settings, "ANTHROPIC_API_KEY", "sk-test"):
        await ai_service.generate_financial_insight(
            user_data={"total_income": 5_000_000}, period="monthly"
        )

    prompt_text = captured_prompt["messages"][0]["content"]
    assert "JSON" in prompt_text
    # Prompt must insist on JSON-only output (case-insensitive checks)
    prompt_lower = prompt_text.lower()
    assert "hanya" in prompt_lower
    assert "json" in prompt_lower
    assert "tidak boleh ada teks lain" in prompt_lower
    assert "Bahasa Indonesia" in prompt_text
    # Should include the user_data in the prompt
    assert "5000000" in prompt_text or "5_000_000" in prompt_text


# ---------------------------------------------------------------------------
# generate_financial_insight — successful Claude response
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_insight_successful_claude_response():
    """Mocked Claude returns valid JSON → normalize and return dict."""
    valid_json = json.dumps({
        "summary": "Keuangan Anda baik bulan ini.",
        "highlights": ["Pemasukan naik 10%", "Pengeluaran makanan turun"],
        "recommendations": ["Alokasikan 10% untuk investasi", "Buat dana darurat"],
        "risk_flags": ["Pengeluaran hiburan > 30% pendapatan"],
    })

    fake_client = AsyncMock()
    fake_client.messages.create = AsyncMock(
        return_value=_fake_anthropic_response(valid_json)
    )

    with patch.object(ai_service, "_get_async_anthropic_client", return_value=fake_client), \
         patch.object(ai_service.settings, "ANTHROPIC_API_KEY", "sk-test"):
        result = await ai_service.generate_financial_insight(
            user_data={"total_income": 5_000_000}, period="monthly"
        )

    assert isinstance(result, dict)
    assert result["period"] == "monthly"
    assert result["summary"] == "Keuangan Anda baik bulan ini."
    assert len(result["highlights"]) == 2
    assert len(result["recommendations"]) == 2
    assert len(result["risk_flags"]) == 1
    assert "generated_at" in result
    assert "data_quality" in result


# ---------------------------------------------------------------------------
# generate_financial_insight — Claude returns code-fenced JSON
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_insight_handles_code_fenced_json():
    """Claude wraps JSON in ```json ... ``` → still parsed correctly."""
    raw_output = '```json\n{"summary": "Test ok.", "highlights": ["Item 1"], "recommendations": [], "risk_flags": []}\n```'

    fake_client = AsyncMock()
    fake_client.messages.create = AsyncMock(
        return_value=_fake_anthropic_response(raw_output)
    )

    with patch.object(ai_service, "_get_async_anthropic_client", return_value=fake_client), \
         patch.object(ai_service.settings, "ANTHROPIC_API_KEY", "sk-test"):
        result = await ai_service.generate_financial_insight(
            user_data={}, period="monthly"
        )

    assert result["summary"] == "Test ok."
    assert result["highlights"] == ["Item 1"]


# ---------------------------------------------------------------------------
# generate_financial_insight — Claude API error
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_insight_claude_api_error_returns_error_dict():
    """When Claude API raises, return local fallback dict instead of crashing."""
    fake_client = AsyncMock()
    fake_client.messages.create = AsyncMock(
        side_effect=Exception("Service unavailable")
    )

    with patch.object(ai_service, "_get_async_anthropic_client", return_value=fake_client), \
         patch.object(ai_service.settings, "ANTHROPIC_API_KEY", "sk-test"):
        result = await ai_service.generate_financial_insight(
            user_data={"transaction_count": 3, "expense_total": 90_000}, period="monthly"
        )

    assert isinstance(result, dict)
    assert "error" in result["summary"].lower() or "gagal" in result["summary"].lower()
    assert result["highlights"]
    assert result["recommendations"]
    assert result["risk_flags"]
    assert "data_quality" in result


# ---------------------------------------------------------------------------
# generate_financial_insight — Claude returns invalid JSON
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_insight_invalid_json_returns_error_dict():
    """When Claude returns unparseable text, return error dict."""
    fake_client = AsyncMock()
    fake_client.messages.create = AsyncMock(
        return_value=_fake_anthropic_response("Maaf, saya tidak bisa memberikan analisis saat ini.")
    )

    with patch.object(ai_service, "_get_async_anthropic_client", return_value=fake_client), \
         patch.object(ai_service.settings, "ANTHROPIC_API_KEY", "sk-test"):
        result = await ai_service.generate_financial_insight(
            user_data={}, period="monthly"
        )

    assert isinstance(result, dict)
    assert "data_quality" in result


# ---------------------------------------------------------------------------
# Integration: data_quality from context
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_insight_data_quality_from_context():
    """data_quality is populated from context, not from raw response."""
    valid_json = json.dumps({
        "summary": "OK",
        "highlights": ["Test"],
        "recommendations": [],
        "risk_flags": [],
    })

    fake_client = AsyncMock()
    fake_client.messages.create = AsyncMock(
        return_value=_fake_anthropic_response(valid_json)
    )

    context = {
        "transaction_count": 87,
        "has_previous_period": True,
        "other_category_percent": 12.3,
        "period": "monthly",
    }

    with patch.object(ai_service, "_get_async_anthropic_client", return_value=fake_client), \
         patch.object(ai_service.settings, "ANTHROPIC_API_KEY", "sk-test"):
        result = await ai_service.generate_financial_insight(
            user_data=context, period="monthly"
        )

    assert result["data_quality"]["transaction_count"] == 87
    assert result["data_quality"]["has_previous_period"] is True
    assert result["data_quality"]["other_category_percent"] == 12.3


# ---------------------------------------------------------------------------
# normalize_insight_response — generated_at always ISO
# ---------------------------------------------------------------------------

def test_generated_at_is_iso_timestamp():
    """generated_at must be an ISO-format timestamp string."""
    result = ai_service.normalize_insight_response({"summary": "test"}, {})
    ts = result["generated_at"]
    # Should parse as ISO datetime
    try:
        parsed = datetime.fromisoformat(ts)
    except (ValueError, TypeError):
        pytest.fail(f"generated_at is not a valid ISO timestamp: {ts!r}")
    # Should have timezone info (UTC)
    assert parsed.tzinfo is not None
