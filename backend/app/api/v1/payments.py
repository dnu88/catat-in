"""Payment checkout and status endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from app.core.auth import get_current_user, _get_supabase_service_client
from app.core.rate_limit import rate_limit_payment_status
from app.services.payment_service import (
    MayarAccessDeniedError,
    count_paid_users,
    create_checkout,
    fetch_and_sync_status,
    get_payment_for_user,
    get_primary_payment_provider_name,
    make_order_id,
    price_for,
    resolve_checkout_provider_name,
    tier_for_count,
)
from app.services.payments import repository as payment_repository

router = APIRouter()


class CreatePaymentRequest(BaseModel):
    plan: str

    @field_validator("plan")
    @classmethod
    def _valid(cls, v):
        if v not in ("monthly", "yearly"):
            raise ValueError("plan harus 'monthly' atau 'yearly'")
        return v


def _insert_pending_payment(user_id, order_id, plan, amount, tier, provider):
    client = _get_supabase_service_client()
    if client is None:
        # Jangan pernah memberi checkout URL tanpa baris payments tercatat —
        # kalau tidak, user bisa terlanjur bayar tapi tak teraktivasi.
        raise RuntimeError("Supabase service client tidak tersedia — pembayaran tak bisa dicatat.")
    payment_repository.insert_pending_payment(
        user_id=user_id,
        order_id=order_id,
        plan=plan,
        amount=amount,
        price_tier=tier,
        provider=provider,
        provider_order_id=order_id,
        client=client,
    )


def _persist_checkout_reference(order_id: str, checkout: dict):
    update = {
        key: checkout[key]
        for key in ("provider_order_id", "provider_transaction_id", "provider_status", "raw_payload")
        if checkout.get(key) is not None
    }
    if not update:
        return
    client = _get_supabase_service_client()
    if client is None:
        raise RuntimeError("Supabase service client tidak tersedia — referensi pembayaran tak bisa dicatat.")
    payment_repository.update_payment(order_id, update, client=client)


@router.post("/create")
async def create_payment(body: CreatePaymentRequest, current_user=Depends(get_current_user)):
    tier = tier_for_count(count_paid_users())
    amount = price_for(body.plan, tier)
    order_id = make_order_id(current_user["user_id"])
    email = current_user.get("email", "")
    try:
        provider_name = resolve_checkout_provider_name(
            email=email,
            provider_name=get_primary_payment_provider_name(),
        )
    except MayarAccessDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Metode pembayaran ini belum tersedia untuk akun Anda.",
        ) from exc
    try:
        _insert_pending_payment(current_user["user_id"], order_id, body.plan, amount, tier, provider_name)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Layanan pembayaran sedang tidak tersedia. Coba lagi.",
        ) from exc
    try:
        checkout = create_checkout(
            order_id=order_id,
            amount=amount,
            plan=body.plan,
            email=email,
            provider_name=provider_name,
        )
        _persist_checkout_reference(order_id, checkout)
    except MayarAccessDeniedError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Metode pembayaran ini belum tersedia untuk akun Anda.",
        ) from exc
    except Exception as exc:
        # Surface upstream error detail without leaking secrets.
        inner = str(exc)
        if inner and "api key" not in inner.lower() and "api_key" not in inner.lower() and "key=" not in inner.lower():
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gagal membuat transaksi pembayaran. {inner}",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gagal membuat transaksi pembayaran.",
        ) from exc

    response = {
        "order_id": order_id,
        "provider": checkout.get("provider", provider_name),
        "amount": amount,
        "price_tier": tier,
        "plan": body.plan,
        "redirect_url": checkout["redirect_url"],
    }
    if checkout.get("token") is not None:
        response["snap_token"] = checkout["token"]
    return response


@router.get("/pricing")
async def pricing(current_user=Depends(get_current_user)):
    tier = tier_for_count(count_paid_users())
    return {
        "tier": tier,
        "monthly": price_for("monthly", tier),
        "yearly": price_for("yearly", tier),
    }


@router.get("/{order_id}/status", dependencies=[Depends(rate_limit_payment_status)])
async def payment_status(order_id: str, current_user=Depends(get_current_user)):
    try:
        payment = get_payment_for_user(order_id, current_user["user_id"])
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Layanan pembayaran sedang tidak tersedia.",
        ) from exc
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pembayaran tidak ditemukan.")
    try:
        return fetch_and_sync_status(
            order_id,
            provider_name=payment.get("provider"),
            provider_order_id=payment.get("provider_order_id"),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gagal cek status pembayaran.",
        ) from exc
