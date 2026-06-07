"""Webhook handler (Midtrans payment notification)."""
from fastapi import APIRouter, Request, HTTPException, status

from app.services.payment_service import (
    verify_notification_signature, activate_premium_from_notification,
)

router = APIRouter()


@router.post("/midtrans")
async def midtrans_notification(request: Request):
    payload = await request.json()
    if not verify_notification_signature(payload):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="signature invalid")
    internal_status = activate_premium_from_notification(payload)
    return {"status": internal_status}
