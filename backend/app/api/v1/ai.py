"""
Catat.in - AI Router
Endpoints untuk fitur AI: chat input, OCR struk, insights.
"""

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
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post("/receipt", dependencies=[Depends(rate_limit_ai)])
async def analyze_receipt(file: UploadFile = File(...), current_user=Depends(get_current_user)):
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
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post("/insight", dependencies=[Depends(require_premium)])
async def get_financial_insight(body: InsightRequest, current_user=Depends(get_current_user)):
    user_financial_data = {
        "user_id": current_user["user_id"],
        "period": body.period,
    }

    try:
        insight = await generate_financial_insight(user_financial_data, body.period)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return {"insight": insight}
