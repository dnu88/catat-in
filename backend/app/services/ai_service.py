"""
Catat.in - AI Service
Wrapper untuk Anthropic Claude API:
1. Ekstraksi transaksi dari teks natural
2. Analisis struk
3. Financial insight
"""

import base64
import json
import re
from functools import lru_cache
from datetime import datetime, timedelta

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
            model=settings.ANTHROPIC_MODEL,
            max_tokens=500,
            system=TRANSACTION_EXTRACT_PROMPT,
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


async def analyze_receipt_image(image_data: bytes, media_type: str = "image/jpeg") -> dict:
    if not settings.ANTHROPIC_API_KEY:
        return {
            "total_amount": None,
            "merchant": None,
            "date": datetime.utcnow().date().isoformat(),
            "category": "other",
            "items": [],
            "confidence": 0.2,
            "readable": False,
        }

    try:
        image_b64 = base64.standard_b64encode(image_data).decode("utf-8")
        client = _get_async_anthropic_client()
        response = await client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=800,
            system=RECEIPT_ANALYSIS_PROMPT,
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


async def generate_financial_insight(user_data: dict, period: str = "monthly") -> str:
    if not settings.ANTHROPIC_API_KEY:
        return (
            "Insight AI premium belum aktif karena ANTHROPIC_API_KEY belum diisi. "
            "Sementara ini gunakan laporan dashboard untuk memantau income/expense."
        )

    prompt = f"""Kamu adalah financial advisor AI untuk aplikasi Catat.in.
Berikan analisis singkat dan actionable (max 3 poin) berdasarkan data keuangan berikut dalam Bahasa Indonesia.
Gunakan bahasa yang ramah, bukan menghakimi.

Data keuangan {period}:
{json.dumps(user_data, ensure_ascii=False, indent=2)}

Format response: plain text, paragraf pendek, tidak perlu JSON."""

    client = _get_async_anthropic_client()
    response = await client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )

    return response.content[0].text.strip()


def _extract_transaction_locally(user_text: str) -> dict:
    text = (user_text or "").strip().lower()
    amount = _extract_amount(text)
    tx_type = _infer_type(text)
    category = _infer_category(text, tx_type)
    wallet_hint = _extract_wallet_hint(text)
    merchant = _extract_merchant(text)
    date_hint = _extract_relative_date(text)

    if amount <= 0:
        return {
            "transactions": [],
            "unclear": "Nominal belum terbaca. Coba tulis seperti 45rb, 120000, atau 1.5jt.",
        }

    confidence = 0.62
    if wallet_hint:
        confidence += 0.14
    if merchant:
        confidence += 0.08
    if category != "other":
        confidence += 0.1
    confidence = min(confidence, 0.94)

    return {
        "transactions": [
            {
                "type": tx_type,
                "amount": amount,
                "category": category,
                "merchant": merchant,
                "note": None,
                "wallet_hint": wallet_hint,
                "date": date_hint,
                "confidence": confidence,
            }
        ],
        "unclear": None if wallet_hint else "Wallet belum terbaca otomatis. Pilih wallet saat review.",
    }


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
    income_keywords = ["gaji", "bonus", "masuk", "pemasukan", "dibayar", "refund", "transfer masuk"]
    return "income" if any(keyword in text for keyword in income_keywords) else "expense"


def _infer_category(text: str, tx_type: str) -> str:
    if tx_type == "income":
        if "gaji" in text:
            return "salary"
        if "freelance" in text or "proyek" in text:
            return "freelance"
        if "investasi" in text or "dividen" in text:
            return "investment"
        return "other"

    if any(word in text for word in ["makan", "kopi", "warteg", "resto"]):
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
    match = re.search(r"(?:di|ke)\s+([a-z0-9\s._-]+?)(?:\s+(?:pakai|lewat|via|dengan)\s+|$)", text)
    if not match:
        return None
    merchant = match.group(1).strip()
    return merchant or None


def _extract_relative_date(text: str) -> str:
    if "kemarin" in text:
        return "yesterday"
    if "hari ini" in text:
        return "today"
    date_match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", text)
    if date_match:
        return date_match.group(1)
    if "besok" in text:
        return (datetime.utcnow().date() + timedelta(days=1)).isoformat()
    return "today"
