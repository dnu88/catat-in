"""
Catat.in - AI Service
Wrapper untuk Anthropic Claude API:
1. Ekstraksi transaksi dari teks natural
2. Analisis struk
3. Financial insight
"""

import base64
import html
import json
import re
from functools import lru_cache
from datetime import datetime, timedelta, timezone

import anthropic

from app.core.config import settings


TRANSACTION_EXTRACT_PROMPT = """Kamu adalah asisten pencatatan keuangan untuk aplikasi Catat.in.
Tugasmu: ekstrak informasi transaksi dari teks Bahasa Indonesia yang diberikan pengguna.

KATEGORI YANG TERSEDIA:
food, transport, shopping, health, entertainment, education, housing, salary, freelance, investment, other

OUTPUT: Selalu response dengan JSON valid saja, tanpa teks lain. Format:
{
  "transactions": [
    {
      "type": "income" | "expense",
      "amount": number,
      "category": string,
      "merchant": string | null,
      "note": string | null,
      "wallet_hint": string | null,
      "date": "today" | "yesterday" | "YYYY-MM-DD" | null,
      "confidence": number
    }
  ],
  "unclear": string | null
}

ATURAN:
- Satu pesan bisa mengandung beberapa transaksi sekaligus
- "rb" atau "ribu" = ribuan
- "jt" atau "juta" = jutaan
- Jika amount tidak disebutkan, set confidence = 0 dan amount = 0
- Jika tipe tidak jelas, anggap "expense"
- Jika pengguna menyebut tanggal, isi date sesuai tanggal tersebut dalam format YYYY-MM-DD.
- Pahami tanggal natural Indonesia seperti "1 Juni 2026", "01/06/2026", "tgl 2/6", "kemarin", dan "hari ini".
- Jika tahun tidak disebut, gunakan tahun berjalan.
- Jangan masukkan teks tanggal atau nominal ke note; note berisi deskripsi bersih transaksi.
- merchant: nama toko/tempat jika ada, null jika tidak ada
- wallet_hint: nama wallet/bank/e-wallet jika disebut pengguna, null jika tidak disebut
"""

RECEIPT_ANALYSIS_PROMPT = """Kamu adalah asisten pencatatan keuangan untuk Catat.in.
Tugasmu: analisis gambar struk/nota belanja dan ekstrak informasi transaksi.

OUTPUT: Selalu response dengan JSON valid saja. Format:
{
  "total_amount": number | null,
  "merchant": string | null,
  "date": "YYYY-MM-DD" | null,
  "category": string,
  "items": [
    {"name": string, "qty": number, "price": number}
  ],
  "confidence": number,
  "readable": boolean
}

Jika struk tidak jelas/buram, set readable = false dan confidence rendah.
"""


@lru_cache
def _get_async_anthropic_client() -> anthropic.AsyncAnthropic:
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY belum dikonfigurasi di server.")
    return anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


def ensure_ai_configured():
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("Fitur AI belum dikonfigurasi di server.")


def _strip_json_code_block(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    return cleaned.strip()


async def extract_transaction_from_text(user_text: str) -> dict:
    if not settings.ANTHROPIC_API_KEY:
        return _extract_transaction_locally(user_text)

    try:
        client = _get_async_anthropic_client()
        response = await client.messages.create(
            model=settings.ANTHROPIC_MODEL_EXTRACT,
            max_tokens=2048,
            system=[
                {
                    "type": "text",
                    "text": TRANSACTION_EXTRACT_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_text}],
        )

        raw = _strip_json_code_block(response.content[0].text)
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "transactions": [],
            "unclear": "Maaf, saya tidak bisa memproses input ini. Coba lebih spesifik.",
        }
    except anthropic.APIError as exc:
        raise RuntimeError(f"Claude API error: {exc}") from exc


async def analyze_receipt_image(
    image_data: bytes, media_type: str = "image/jpeg"
) -> dict:
    if not settings.ANTHROPIC_API_KEY:
        return {
            "total_amount": None,
            "merchant": None,
            "date": datetime.now(timezone.utc).date().isoformat(),
            "category": "other",
            "items": [],
            "confidence": 0.2,
            "readable": False,
        }

    try:
        image_b64 = base64.standard_b64encode(image_data).decode("utf-8")
        client = _get_async_anthropic_client()
        response = await client.messages.create(
            model=settings.ANTHROPIC_MODEL_EXTRACT,
            max_tokens=800,
            system=[
                {
                    "type": "text",
                    "text": RECEIPT_ANALYSIS_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": "Tolong analisis struk belanja ini dan ekstrak informasi transaksinya.",
                        },
                    ],
                }
            ],
        )

        raw = _strip_json_code_block(response.content[0].text)
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "total_amount": None,
            "merchant": None,
            "date": None,
            "category": "other",
            "items": [],
            "confidence": 0.0,
            "readable": False,
        }
    except anthropic.APIError as exc:
        raise RuntimeError(f"Claude API error: {exc}") from exc


async def generate_financial_insight(user_data: dict, period: str = "monthly") -> dict:
    """Generate a structured financial insight dict from Claude.

    Always returns a dict with all required keys. If the API key is missing or
    Claude fails, a graceful fallback dict is returned — never raises.
    """
    user_data = user_data or {}
    context = {
        "period": period,
        "transaction_count": user_data.get("transaction_count", 0),
        "has_previous_period": user_data.get("has_previous_period", False),
        "other_category_percent": user_data.get("other_category_percent"),
    }

    if not settings.ANTHROPIC_API_KEY:
        return normalize_insight_response(
            _build_local_insight_payload(user_data, period), context
        )

    prompt = f"""Kamu adalah financial advisor AI untuk aplikasi Catat.in.
Tugasmu: analisis data keuangan pengguna dan berikan insight yang actionable.

ATURAN PENTING:
- Response HARUS berupa JSON valid SAJA. Tidak boleh ada teks di luar JSON.
- Jangan gunakan markdown, code fence, atau penjelasan apapun di luar JSON.
- Gunakan Bahasa Indonesia yang ramah, tidak menghakimi.
- Jangan mengarang angka di luar data yang diberikan.
- Jangan memberikan saran investasi, pajak, atau hukum.
- Berikan rekomendasi yang actionable (bisa langsung dilakukan pengguna).
- Jika data kurang, akui keterbatasan data — jangan mengada-ada.

FORMAT JSON yang harus dikembalikan:
{{
  "summary": "ringkasan analisis keuangan",
  "highlights": ["poin penting 1", "poin penting 2"],
  "recommendations": ["saran 1", "saran 2"],
  "risk_flags": ["flag risiko 1"]
}}

{period_keterangan(period)}:
{json.dumps(user_data, ensure_ascii=False, indent=2)}

INGAT: HANYA kembalikan JSON. Tidak boleh ada teks lain."""

    try:
        client = _get_async_anthropic_client()
        response = await client.messages.create(
            model=settings.ANTHROPIC_MODEL_INSIGHT,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.content[0].text.strip()
        cleaned = _strip_json_code_block(raw_text)
        parsed = json.loads(cleaned)
        return normalize_insight_response(parsed, context)

    except (json.JSONDecodeError, anthropic.APIError, Exception):
        import logging

        logging.getLogger("app.services.ai_service").exception(
            "generate_financial_insight failed for period=%s", period
        )
        error_msg = (
            "Maaf, insight AI gagal diproses. "
            "Silakan coba lagi nanti atau gunakan laporan dashboard."
        )
        fallback = _build_local_insight_payload(user_data, period)
        fallback["summary"] = (
            f"{error_msg} Berikut ringkasan lokal dari data yang tersedia."
        )
        return normalize_insight_response(fallback, context)


def period_keterangan(period: str) -> str:
    """Human-readable period label in Bahasa Indonesia."""
    labels = {
        "monthly": "Data keuangan bulan ini",
        "weekly": "Data keuangan minggu ini",
        "yearly": "Data keuangan tahun ini",
        "daily": "Data keuangan hari ini",
    }
    return labels.get(period, f"Data keuangan ({period})")


def normalize_insight_response(raw: dict, context: dict) -> dict:
    """Ensure the insight response dict is safe, well-shaped, and complete.

    Returns a dict with all required keys. Missing keys are filled with safe
    defaults. Arrays are capped, strings are sanitized, and HTML/script tags
    are stripped.
    """
    now = datetime.now(tz=timezone.utc).isoformat()

    # --- period: context > raw > default -----------------------------------
    period = context.get("period") or raw.get("period") or "monthly"

    # --- summary -----------------------------------------------------------
    summary = _sanitize_string(raw.get("summary") or "", max_len=500)

    # --- highlights (max 3) ------------------------------------------------
    highlights = _clean_array(raw.get("highlights"), max_items=3, max_item_len=200)

    # --- recommendations (max 2) -------------------------------------------
    recommendations = _clean_array(
        raw.get("recommendations"), max_items=2, max_item_len=200
    )

    # --- risk_flags (max 2) ------------------------------------------------
    risk_flags = _clean_array(raw.get("risk_flags"), max_items=2, max_item_len=200)

    # --- data_quality ------------------------------------------------------
    raw_dq = (
        raw.get("data_quality") if isinstance(raw.get("data_quality"), dict) else {}
    )
    data_quality = {
        "transaction_count": int(
            context.get("transaction_count") or raw_dq.get("transaction_count") or 0
        ),
        "has_previous_period": bool(
            context.get("has_previous_period")
            or raw_dq.get("has_previous_period")
            or False
        ),
        "other_category_percent": _safe_float(
            context.get("other_category_percent")
            if context.get("other_category_percent") is not None
            else raw_dq.get("other_category_percent")
        ),
    }

    return {
        "period": period,
        "generated_at": now,
        "summary": summary,
        "highlights": highlights,
        "recommendations": recommendations,
        "risk_flags": risk_flags,
        "data_quality": data_quality,
    }


# ---------------------------------------------------------------------------
# Internal helpers for normalize_insight_response
# ---------------------------------------------------------------------------


def _sanitize_string(value: str, max_len: int = 500) -> str:
    """Strip HTML tags, unescape HTML entities, and cap length."""
    if not isinstance(value, str):
        value = str(value) if value else ""
    # Remove HTML tags
    cleaned = re.sub(r"<[^>]*>", "", value)
    # Unescape HTML entities (e.g., &amp; → &)
    cleaned = html.unescape(cleaned)
    # Collapse whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if len(cleaned) > max_len:
        cleaned = cleaned[:max_len].rsplit(" ", 1)[0]
    return cleaned


def _clean_array(value, max_items: int, max_item_len: int) -> list[str]:
    """Normalize a list of strings: ensure list, strip empties, cap items, sanitize."""
    if not isinstance(value, list):
        return []
    result: list[str] = []
    for item in value:
        if not isinstance(item, str):
            continue
        cleaned = _sanitize_string(item, max_len=max_item_len)
        if cleaned:
            result.append(cleaned)
        if len(result) >= max_items:
            break
    return result


def _safe_float(value) -> float | None:
    """Convert to float if possible, else None."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _build_local_insight_payload(user_data: dict, period: str) -> dict:
    """Build deterministic insight from aggregate context.

    Used when Claude is unavailable or returns an unusable response, so Premium
    users still see useful information instead of an empty card.
    """
    transaction_count = int(user_data.get("transaction_count") or 0)
    income_total = _safe_float(user_data.get("income_total")) or 0.0
    expense_total = _safe_float(user_data.get("expense_total")) or 0.0
    net_total = _safe_float(user_data.get("net_total"))
    if net_total is None:
        net_total = income_total - expense_total
    top_categories = user_data.get("top_categories")
    if not isinstance(top_categories, list):
        top_categories = []
    previous_period = user_data.get("previous_period")
    if not isinstance(previous_period, dict):
        previous_period = None
    other_category_percent = _safe_float(user_data.get("other_category_percent")) or 0.0

    if transaction_count == 0:
        return {
            "period": period,
            "summary": "Belum ada transaksi pada periode ini, jadi Insight AI belum bisa membaca pola pengeluaran.",
            "highlights": [
                "Transaksi periode ini masih kosong.",
                "Insight akan muncul lebih akurat setelah ada pemasukan dan pengeluaran yang tercatat.",
            ],
            "recommendations": [
                "Catat minimal beberapa transaksi rutin seperti makan, transport, tagihan, dan pemasukan.",
                "Gunakan kategori yang konsisten agar AI bisa menemukan pola bulan ini.",
            ],
            "risk_flags": [],
        }

    top_category = top_categories[0] if top_categories else None
    top_category_name = (
        top_category.get("category") if isinstance(top_category, dict) else None
    )
    top_category_percent = (
        _safe_float(top_category.get("percent"))
        if isinstance(top_category, dict)
        else None
    )

    summary = (
        f"Periode ini mencatat {transaction_count} transaksi dengan cashflow bersih {_format_rupiah(net_total)}. "
        f"Total pemasukan {_format_rupiah(income_total)} dan pengeluaran {_format_rupiah(expense_total)}."
    )

    highlights = [f"Total pengeluaran periode ini {_format_rupiah(expense_total)}."]
    if income_total > 0:
        highlights.append(
            f"Total pemasukan periode ini {_format_rupiah(income_total)}."
        )
    if top_category_name and top_category_percent is not None:
        highlights.append(
            f"Kategori terbesar adalah {top_category_name}, sekitar {top_category_percent:.1f}% dari pengeluaran."
        )
    if previous_period:
        prev_expense = _safe_float(previous_period.get("expense_total")) or 0.0
        if prev_expense > 0:
            change = ((expense_total - prev_expense) / prev_expense) * 100
            arah = "naik" if change >= 0 else "turun"
            highlights.append(
                f"Pengeluaran {arah} {abs(change):.1f}% dibanding periode sebelumnya."
            )

    recommendations = []
    if top_category_name:
        recommendations.append(
            f"Cek ulang pengeluaran {top_category_name} dan tetapkan batas mingguan agar tetap terkendali."
        )
    recommendations.append(
        "Rapikan kategori Lainnya atau transaksi tanpa merchant supaya laporan berikutnya lebih detail."
    )
    if net_total < 0:
        recommendations.append(
            "Prioritaskan pengeluaran wajib dan tunda belanja non-esensial sampai cashflow kembali positif."
        )
    else:
        recommendations.append(
            "Sisihkan sebagian surplus ke tabungan atau budget wallet sebelum dipakai untuk belanja variabel."
        )

    risk_flags = []
    if net_total < 0:
        risk_flags.append(
            "Cashflow periode ini negatif; pengeluaran lebih besar dari pemasukan."
        )
    if other_category_percent >= 10:
        risk_flags.append(
            f"Kategori di luar top kategori masih {other_category_percent:.1f}%, laporan bisa kurang tajam."
        )

    return {
        "period": period,
        "summary": summary,
        "highlights": highlights[:3],
        "recommendations": recommendations[:2],
        "risk_flags": risk_flags[:2],
    }


def _format_rupiah(value: float) -> str:
    amount = int(round(value))
    return f"Rp {amount:,}".replace(",", ".")


def _extract_transaction_locally(user_text: str) -> dict:
    text = (user_text or "").strip().lower()
    segments = _split_text_around_amounts(text)

    transactions = []
    for segment in segments:
        segment_without_date = _remove_date_mentions(segment)
        amount = _extract_amount(segment_without_date)
        if amount <= 0:
            continue
        tx_type = _infer_type(segment)
        category = _infer_category(segment, tx_type)
        wallet_hint = _extract_wallet_hint(segment) or _extract_wallet_hint(text)
        merchant = _extract_merchant(segment)
        date_hint = _extract_relative_date(segment, fallback_text=text)

        confidence = 0.62
        if wallet_hint:
            confidence += 0.14
        if merchant:
            confidence += 0.08
        if category != "other":
            confidence += 0.1
        confidence = min(confidence, 0.94)

        note = re.sub(r"\s+", " ", _strip_amounts(segment_without_date)).strip() or None
        transactions.append(
            {
                "type": tx_type,
                "amount": amount,
                "category": category,
                "merchant": merchant,
                "note": note,
                "wallet_hint": wallet_hint,
                "date": date_hint,
                "confidence": confidence,
            }
        )

    if not transactions:
        return {
            "transactions": [],
            "unclear": "Nominal belum terbaca. Coba tulis seperti 45rb, 120000, atau 1.5jt.",
        }

    has_wallet_hint = any(tx.get("wallet_hint") for tx in transactions)
    return {
        "transactions": transactions,
        "unclear": None
        if has_wallet_hint
        else "Wallet belum terbaca otomatis. Pilih wallet saat review.",
    }


def _amount_matches(text: str) -> list[re.Match[str]]:
    spans = _date_spans(text)
    matches = list(
        re.finditer(
            r"(?:rp\s*)?\d+(?:[.,]\d+)?\s*(?:rb|ribu|jt|juta|k|m)\b|rp\s*[\d.,]+|\b\d[\d.]{3,}\b|\b\d{4,}\b",
            text,
        )
    )
    return [
        match
        for match in matches
        if not any(match.start() < end and match.end() > start for start, end in spans)
    ]


def _split_text_around_amounts(text: str) -> list[str]:
    matches = _amount_matches(text)
    if len(matches) < 2:
        return [text]

    segments: list[str] = []
    for index, match in enumerate(matches):
        start = 0 if index == 0 else matches[index - 1].end()
        end = len(text) if index == len(matches) - 1 else match.end()
        segment = re.sub(
            r"^\s*(?:dan|lalu|terus|kemudian|,|;|\+)\s*",
            "",
            text[start:end],
            flags=re.IGNORECASE,
        ).strip()
        if segment:
            segments.append(segment)
    return segments or [text]


def _strip_amounts(text: str) -> str:
    return re.sub(
        r"(?:rp\s*)?\d+(?:[.,]\d+)?\s*(?:rb|ribu|jt|juta|k|m)\b|rp\s*[\d.,]+|\b\d[\d.]{3,}\b|\b\d{4,}\b",
        " ",
        text,
        flags=re.IGNORECASE,
    ).strip(" ,.;:-")


MONTH_ALIASES: dict[str, int] = {
    "januari": 1,
    "jan": 1,
    "februari": 2,
    "feb": 2,
    "maret": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "mei": 5,
    "may": 5,
    "juni": 6,
    "jun": 6,
    "juli": 7,
    "jul": 7,
    "agustus": 8,
    "agu": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "oktober": 10,
    "okt": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "desember": 12,
    "des": 12,
    "dec": 12,
}


def _safe_iso_date(year: int, month: int, day: int) -> str | None:
    try:
        return datetime(year, month, day).date().isoformat()
    except ValueError:
        return None


def _parse_year(value: str | None, fallback_year: int) -> int:
    if not value:
        return fallback_year
    return 2000 + int(value) if len(value) == 2 else int(value)


def _find_date_span(
    text: str, fallback_year: int | None = None
) -> tuple[str, int, int] | None:
    year = fallback_year or datetime.now(timezone.utc).date().year
    month_names = "|".join(MONTH_ALIASES)
    named_match = re.search(
        rf"\b(?:tanggal|tgl|pada)?\s*(\d{{1,2}})\s+({month_names})\s*(\d{{2,4}})?\b",
        text,
        flags=re.IGNORECASE,
    )
    if named_match:
        parsed = _safe_iso_date(
            _parse_year(named_match.group(3), year),
            MONTH_ALIASES[named_match.group(2).lower()],
            int(named_match.group(1)),
        )
        if parsed:
            return parsed, named_match.start(), named_match.end()

    numeric_full_match = re.search(
        r"\b(?:tanggal|tgl|pada)?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b",
        text,
        flags=re.IGNORECASE,
    )
    numeric_short_match = re.search(
        r"\b(?:tanggal|tgl|pada)\s*(\d{1,2})[/-](\d{1,2})\b", text, flags=re.IGNORECASE
    )
    numeric_match = numeric_full_match or numeric_short_match
    if numeric_match:
        parsed = _safe_iso_date(
            _parse_year(
                numeric_match.group(3) if len(numeric_match.groups()) >= 3 else None,
                year,
            ),
            int(numeric_match.group(2)),
            int(numeric_match.group(1)),
        )
        if parsed:
            return parsed, numeric_match.start(), numeric_match.end()

    iso_match = re.search(r"\b(20\d{2})-(\d{2})-(\d{2})\b", text)
    if iso_match:
        parsed = _safe_iso_date(
            int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3))
        )
        if parsed:
            return parsed, iso_match.start(), iso_match.end()

    return None


def _date_spans(text: str) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    offset = 0
    remaining = text
    while remaining:
        found = _find_date_span(remaining)
        if not found:
            break
        _, start, end = found
        spans.append((offset + start, offset + end))
        offset += end
        remaining = remaining[end:]
    return spans


def _remove_date_mentions(text: str) -> str:
    current = text
    while True:
        found = _find_date_span(current)
        if not found:
            break
        _, start, end = found
        current = f"{current[:start]} {current[end:]}"
    return re.sub(r"\s+", " ", current).strip(" ,.;:-")


def _extract_amount(text: str) -> float:
    matches = list(re.finditer(r"(\d+(?:[.,]\d+)?)\s*(rb|ribu|jt|juta|k|m)?", text))
    if not matches:
        return 0.0

    values: list[float] = []
    for match in matches:
        raw = (match.group(1) or "").replace(".", "").replace(",", ".")
        suffix = (match.group(2) or "").lower()
        try:
            base = float(raw)
        except ValueError:
            continue
        if suffix in {"rb", "ribu", "k"}:
            base *= 1_000
        elif suffix in {"jt", "juta", "m"}:
            base *= 1_000_000
        values.append(base)

    return float(round(max(values) if values else 0.0))


def _infer_type(text: str) -> str:
    income_keywords = [
        "gaji",
        "bonus",
        "masuk",
        "pemasukan",
        "dibayar",
        "refund",
        "transfer masuk",
    ]
    return (
        "income" if any(keyword in text for keyword in income_keywords) else "expense"
    )


def _infer_category(text: str, tx_type: str) -> str:
    if tx_type == "income":
        if "gaji" in text:
            return "salary"
        if "freelance" in text or "proyek" in text:
            return "freelance"
        if "investasi" in text or "dividen" in text:
            return "investment"
        return "other"

    if any(word in text for word in ["makan", "sarapan", "kopi", "warteg", "resto"]):
        return "food"
    if any(word in text for word in ["bensin", "transport", "parkir", "tol"]):
        return "transport"
    if any(word in text for word in ["belanja", "supermarket", "minimarket"]):
        return "shopping"
    if any(word in text for word in ["obat", "dokter", "klinik"]):
        return "health"
    if any(word in text for word in ["bioskop", "hiburan", "netflix", "game"]):
        return "entertainment"
    if any(word in text for word in ["kursus", "buku", "sekolah"]):
        return "education"
    if any(word in text for word in ["listrik", "internet", "air", "kontrakan"]):
        return "housing"
    return "other"


def _extract_wallet_hint(text: str) -> str | None:
    match = re.search(r"(?:pakai|lewat|via|dengan)\s+([a-z0-9\s._-]+)", text)
    if not match:
        return None
    return match.group(1).strip() or None


def _extract_merchant(text: str) -> str | None:
    match = re.search(
        r"(?:di|ke)\s+([a-z0-9\s._-]+?)(?:\s+(?:pakai|lewat|via|dengan)\s+|$)", text
    )
    if not match:
        return None
    merchant = match.group(1).strip()
    return merchant or None


def _extract_relative_date(text: str, fallback_text: str | None = None) -> str:
    today = datetime.now(timezone.utc).date()
    found = _find_date_span(text, today.year)
    if found:
        return found[0]

    if "kemarin" in text:
        return (today - timedelta(days=1)).isoformat()
    if "besok" in text:
        return (today + timedelta(days=1)).isoformat()
    if "hari ini" in text:
        return today.isoformat()

    if fallback_text and fallback_text != text:
        fallback_date = _extract_relative_date(fallback_text)
        if fallback_date != today.isoformat():
            return fallback_date
    return today.isoformat()
