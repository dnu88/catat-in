"""Endpoint info akun: status plan, kuota AI, dan request penghapusan akun."""
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.core.entitlements import load_state
from app.models.account_deletion import (
    AccountDeletionRequestCreate,
    AccountDeletionRequestEnvelope,
    AccountDeletionRequestSubmitResponse,
)
from app.services.account_deletion_service import create_request, get_latest_request

router = APIRouter()


@router.get("/entitlements")
async def get_entitlements(current_user=Depends(get_current_user)):
    st = load_state(current_user["user_id"])
    return {
        "plan": "premium" if st["is_premium"] else "free",
        "plan_expires_at": st.get("plan_expires_at"),
        "period_ym": st["period_ym"],
        "chat_used": st["chat_count"],
        "chat_limit": st["chat_limit"],
        "photo_used": st["photo_count"],
        "photo_limit": st["photo_limit"],
    }


@router.get("/account-deletion-request", response_model=AccountDeletionRequestEnvelope)
async def get_account_deletion_request(current_user=Depends(get_current_user)):
    request = get_latest_request(current_user["user_id"])
    return {"request": request}


@router.post(
    "/account-deletion-request",
    response_model=AccountDeletionRequestSubmitResponse,
    status_code=status.HTTP_201_CREATED,
)
async def post_account_deletion_request(
    body: AccountDeletionRequestCreate,
    current_user=Depends(get_current_user),
):
    email = (current_user.get("email") or "").strip()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email akun tidak ditemukan. Silakan login ulang lalu coba lagi.",
        )

    if body.confirm_email and body.confirm_email.strip().lower() != email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email konfirmasi tidak cocok dengan email akun aktif.",
        )

    try:
        request, created = create_request(
            user_id=current_user["user_id"],
            email=email,
            reason=body.reason,
            details=body.details,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Layanan penghapusan akun belum tersedia. Coba lagi beberapa saat lagi.",
        ) from exc

    if not created:
        return AccountDeletionRequestSubmitResponse(request=request, created=False)

    return AccountDeletionRequestSubmitResponse(request=request, created=True)
