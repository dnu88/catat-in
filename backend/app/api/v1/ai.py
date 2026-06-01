"""
Catat.in - AI Router
Endpoints untuk fitur AI: chat input, OCR struk, insights.
"""

import base64

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.auth import get_current_user, require_premium
from app.core.config import settings
from app.core.rate_limit import rate_limit_ai
from app.services.ai_service import (
    analyze_receipt_image,
    extract_transaction_from_text,
    generate_financial_insight,
)


router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


class ChatInputRequest(BaseModel):
    text: str
    conversation_history: list[dict] = []


class InsightRequest(BaseModel):
    period: str = "monthly"


class LegacyProcessRequest(BaseModel):
    input_type: str
    data: str


@router.post("/chat", dependencies=[Depends(rate_limit_ai)])
async def chat_input(body: ChatInputRequest, current_user=Depends(get_current_user)):
    if not body.text or len(body.text.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Teks terlalu pendek. Ceritakan transaksimu lebih lengkap.",
        )

    if len(body.text) > 500:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Teks terlalu panjang. Maksimal 500 karakter per pesan.",
        )

    try:
        return await extract_transaction_from_text(body.text)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        ) from exc


@router.post("/receipt", dependencies=[Depends(rate_limit_ai)])
async def analyze_receipt(
    file: UploadFile = File(...), current_user=Depends(get_current_user)
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Format file tidak didukung. Gunakan JPG, PNG, atau PDF.",
        )

    image_data = await file.read()
    if len(image_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Ukuran file terlalu besar. Maksimal {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    try:
        return await analyze_receipt_image(image_data, file.content_type)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        ) from exc


@router.post("/insight", dependencies=[Depends(rate_limit_ai), Depends(require_premium)])
async def get_financial_insight(
    body: InsightRequest, current_user=Depends(get_current_user)
):
    user_financial_data = {
        "user_id": current_user["user_id"],
        "period": body.period,
    }

    try:
        insight = await generate_financial_insight(user_financial_data, body.period)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        ) from exc

    return {"insight": insight}


@router.post("/process", dependencies=[Depends(rate_limit_ai)])
async def legacy_process(
    body: LegacyProcessRequest, current_user=Depends(get_current_user)
):
    input_type = (body.input_type or "").strip().lower()

    if input_type == "text":
        try:
            extracted = await extract_transaction_from_text(body.data or "")
        except RuntimeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
            ) from exc
        tx_list = extracted.get("transactions") or []
        top_tx = tx_list[0] if tx_list else {}
        confidence = float(top_tx.get("confidence") or 0.0)

        if confidence >= 0.8:
            return {
                "transaction": {
                    "amount": top_tx.get("amount", 0),
                    "merchant": top_tx.get("merchant"),
                    "date": top_tx.get("date"),
                    "category": top_tx.get("category", "other"),
                    "confidence": confidence,
                },
                "auto_saved": True,
            }

        return {
            "extracted_fields": {
                "amount": top_tx.get("amount", 0),
                "merchant": top_tx.get("merchant"),
                "date": top_tx.get("date"),
                "category": top_tx.get("category", "other"),
            },
            "confidence": confidence,
            "auto_saved": False,
            "review_required": True,
        }

    if input_type == "image":
        payload = body.data or ""
        if "," in payload:
            payload = payload.split(",", 1)[1]
        try:
            image_bytes = base64.b64decode(payload, validate=False)
        except Exception:
            image_bytes = b""

        try:
            analyzed = await analyze_receipt_image(image_bytes, "image/png")
        except RuntimeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
            ) from exc
        confidence = float(analyzed.get("confidence") or 0.0)

        return {
            "transaction": {
                "amount": analyzed.get("total_amount", 0),
                "merchant": analyzed.get("merchant"),
                "date": analyzed.get("date"),
                "category": analyzed.get("category", "other"),
                "confidence": confidence,
            },
            "auto_saved": confidence >= 0.8,
        }

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="input_type harus 'text' atau 'image'",
    )
