"""
Catat.in - AI Router
Endpoints untuk fitur AI: chat input, OCR struk, insights.
"""

import base64

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.auth import get_current_user, require_premium
from app.core.config import settings
from app.core.entitlements import load_state, record_use, evaluate
from app.core.rate_limit import rate_limit_ai
from app.services.ai_service import (
    analyze_receipt_image,
    extract_transaction_from_text,
    generate_financial_insight,
)
from app.services.ai_insight_data import build_ai_insight_context
from app.services.notification_service import create_notification


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

    state = load_state(current_user["user_id"])
    decision = evaluate(is_premium=state["is_premium"], kind="chat",
                        chat_count=state["chat_count"], photo_count=state["photo_count"])
    if not decision.allowed:
        raise HTTPException(
            status_code=decision.status_code,
            detail={"reason": decision.reason, "feature": "chat",
                    "limit": state["chat_limit"], "used": state["chat_count"]},
        )

    try:
        result = await extract_transaction_from_text(body.text)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    record_use(current_user["user_id"], state["period_ym"], "chat")
    return result


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

    state = load_state(current_user["user_id"])
    decision = evaluate(is_premium=state["is_premium"], kind="photo",
                        chat_count=state["chat_count"], photo_count=state["photo_count"])
    if not decision.allowed:
        raise HTTPException(
            status_code=decision.status_code,
            detail={"reason": decision.reason, "feature": "photo",
                    "limit": state["photo_limit"], "used": state["photo_count"]},
        )

    try:
        result = await analyze_receipt_image(image_data, file.content_type)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    record_use(current_user["user_id"], state["period_ym"], "photo")
    return result


@router.post("/insight", dependencies=[Depends(rate_limit_ai), Depends(require_premium)])
async def get_financial_insight(
    body: InsightRequest, current_user=Depends(get_current_user)
):
    context = build_ai_insight_context(current_user["user_id"], body.period)

    try:
        insight = await generate_financial_insight(context, body.period)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
        ) from exc

    # Fire-and-forget: create AI Insight ready notification.
    # Failure must not break the insight response.
    try:
        create_notification(
            current_user["user_id"],
            "ai_insight_ready",
            "Insight AI siap dibaca",
            "Ringkasan AI untuk periode ini sudah siap.",
            data={
                "period": body.period,
                "target_path": "/(tabs)/reports",
            },
            dedupe_key=f"ai_insight_ready:{current_user['user_id']}:{body.period}:{insight.get('generated_at', '')[:10]}",
        )
    except Exception:
        pass

    return insight


@router.post("/process", dependencies=[Depends(rate_limit_ai)])
async def legacy_process(
    body: LegacyProcessRequest, current_user=Depends(get_current_user)
):
    input_type = (body.input_type or "").strip().lower()

    if input_type == "text":
        state = load_state(current_user["user_id"])
        decision = evaluate(is_premium=state["is_premium"], kind="chat",
                            chat_count=state["chat_count"], photo_count=state["photo_count"])
        if not decision.allowed:
            raise HTTPException(
                status_code=decision.status_code,
                detail={"reason": decision.reason, "feature": "chat",
                        "limit": state["chat_limit"], "used": state["chat_count"]},
            )

        try:
            extracted = await extract_transaction_from_text(body.data or "")
        except RuntimeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)
            ) from exc
        tx_list = extracted.get("transactions") or []
        top_tx = tx_list[0] if tx_list else {}
        confidence = float(top_tx.get("confidence") or 0.0)

        record_use(current_user["user_id"], state["period_ym"], "chat")

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
        state = load_state(current_user["user_id"])
        decision = evaluate(is_premium=state["is_premium"], kind="photo",
                            chat_count=state["chat_count"], photo_count=state["photo_count"])
        if not decision.allowed:
            raise HTTPException(
                status_code=decision.status_code,
                detail={"reason": decision.reason, "feature": "photo",
                        "limit": state["photo_limit"], "used": state["photo_count"]},
            )

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

        record_use(current_user["user_id"], state["period_ym"], "photo")

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
