"""Endpoint pembayaran Midtrans Snap."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from app.core.auth import get_current_user, _get_supabase_service_client
from app.services.payment_service import (
    price_for, tier_for_count, count_paid_users, make_order_id,
    create_snap_transaction,
)

router = APIRouter()


class CreatePaymentRequest(BaseModel):
    plan: str

    @field_validator("plan")
    @classmethod
    def _valid(cls, v):
        if v not in ("monthly", "yearly"):
            raise ValueError("plan harus 'monthly' atau 'yearly'")
        return v


def _insert_pending_payment(user_id, order_id, plan, amount, tier):
    client = _get_supabase_service_client()
    if client is None:
        return
    client.table("payments").insert({
        "user_id": user_id, "order_id": order_id, "plan": plan,
        "amount": amount, "price_tier": tier, "status": "pending",
    }).execute()


@router.post("/create")
async def create_payment(body: CreatePaymentRequest, current_user=Depends(get_current_user)):
    tier = tier_for_count(count_paid_users())
    amount = price_for(body.plan, tier)
    order_id = make_order_id(current_user["user_id"])
    try:
        snap = create_snap_transaction(order_id=order_id, amount=amount,
                                       plan=body.plan, email=current_user.get("email", ""))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Gagal membuat transaksi pembayaran.") from exc
    _insert_pending_payment(current_user["user_id"], order_id, body.plan, amount, tier)
    return {"order_id": order_id, "amount": amount, "price_tier": tier,
            "plan": body.plan, "snap_token": snap["token"],
            "redirect_url": snap["redirect_url"]}
