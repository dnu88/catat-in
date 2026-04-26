"""
Catat.in - AI Service
Wrapper untuk Anthropic Claude API:
1. Ekstraksi transaksi dari teks natural
2. Analisis struk
3. Financial insight
"""

import base64
import json
from functools import lru_cache

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

