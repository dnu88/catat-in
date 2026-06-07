"""Endpoint info akun: status plan & kuota AI."""
from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.core.entitlements import load_state

router = APIRouter()


@router.get("/entitlements")
async def get_entitlements(current_user=Depends(get_current_user)):
    st = load_state(current_user["user_id"])
    return {
        "plan": "premium" if st["is_premium"] else "free",
        "period_ym": st["period_ym"],
        "chat_used": st["chat_count"],
        "chat_limit": st["chat_limit"],
        "photo_used": st["photo_count"],
        "photo_limit": st["photo_limit"],
    }
