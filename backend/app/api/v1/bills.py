"""
Catat.in — Bill Reminders Router
CRUD tagihan berulang (listrik, langganan, cicilan, dll).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from calendar import monthrange
from supabase import create_client

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.schema_compat import has_columns, require_tables

router = APIRouter()


def _client():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _bill_supports(column: str) -> bool:
    return has_columns("bill_reminders", column)


# ── HELPERS ───────────────────────────────────────────────────

def _clamp_day(day: int, year: int, month: int) -> int:
    return min(day, monthrange(year, month)[1])


def _compute_next_due(due_day: int, recurrence: str, after: date | None = None) -> str:
    """Hitung next_due_date berdasarkan due_day dan recurrence."""
    today = after or date.today()

    if recurrence == "once":
        day = _clamp_day(due_day, today.year, today.month)
        d = today.replace(day=day)
        if d <= today:
            # Geser ke bulan depan
            if today.month == 12:
                d = date(today.year + 1, 1, _clamp_day(due_day, today.year + 1, 1))
            else:
                nm = today.month + 1
                d = date(today.year, nm, _clamp_day(due_day, today.year, nm))
        return d.isoformat()

    elif recurrence == "monthly":
        day = _clamp_day(due_day, today.year, today.month)
        d = today.replace(day=day)
        if d <= today:
            if today.month == 12:
                d = date(today.year + 1, 1, _clamp_day(due_day, today.year + 1, 1))
            else:
                nm = today.month + 1
                d = date(today.year, nm, _clamp_day(due_day, today.year, nm))
        return d.isoformat()

    elif recurrence == "yearly":
        day = _clamp_day(due_day, today.year, today.month)
        d = today.replace(day=day)
        if d <= today:
            d = date(today.year + 1, today.month, _clamp_day(due_day, today.year + 1, today.month))
        return d.isoformat()

    return today.isoformat()


# ── SCHEMAS ──────────────────────────────────────────────────

class BillCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0)
    due_day: int = Field(..., ge=1, le=31)
    recurrence: str = Field("monthly", pattern="^(once|monthly|yearly)$")
    icon: str = Field("📄", max_length=10)
    notify_before_days: list[int] = [3, 1]
    auto_record_wallet: Optional[str] = None


class BillUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    due_day: Optional[int] = Field(None, ge=1, le=31)
    icon: Optional[str] = Field(None, max_length=10)
    is_active: Optional[bool] = None
    notify_before_days: Optional[list[int]] = None


# ── ENDPOINTS ────────────────────────────────────────────────

@router.get("/")
async def list_bills(current_user: dict = Depends(get_current_user)):
    require_tables("bill_reminders")
    result = (
        _client()
        .table("bill_reminders")
        .select("*")
        .eq("user_id", current_user["user_id"])
        .eq("is_active", True)
        .order("next_due_date")
        .execute()
    )
    return {"data": result.data}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_bill(
    body: BillCreate,
    current_user: dict = Depends(get_current_user),
):
    require_tables("bill_reminders")
    data: dict = {
        "user_id": current_user["user_id"],
        "name": body.name,
        "amount": body.amount,
        "due_day": body.due_day,
        "recurrence": body.recurrence,
        "icon": body.icon,
        "notify_before_days": body.notify_before_days,
        "next_due_date": _compute_next_due(body.due_day, body.recurrence),
        "is_active": True,
        "is_paid": False,
    }
    if _bill_supports("payment_history"):
        data["payment_history"] = []
    if body.auto_record_wallet:
        data["auto_record_wallet"] = body.auto_record_wallet

    result = _client().table("bill_reminders").insert(data).execute()
    return {"data": result.data[0]}


@router.patch("/{bill_id}")
async def update_bill(
    bill_id: str,
    body: BillUpdate,
    current_user: dict = Depends(get_current_user),
):
    require_tables("bill_reminders")
    existing = (
        _client()
        .table("bill_reminders")
        .select("*")
        .eq("id", bill_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tagihan tidak ditemukan")

    updates = body.model_dump(exclude_none=True)

    # Recompute next_due_date jika due_day berubah
    if "due_day" in updates:
        recurrence = existing.data["recurrence"]
        updates["next_due_date"] = _compute_next_due(updates["due_day"], recurrence)

    result = _client().table("bill_reminders").update(updates).eq("id", bill_id).execute()
    return {"data": result.data[0]}


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bill(
    bill_id: str,
    current_user: dict = Depends(get_current_user),
):
    require_tables("bill_reminders")
    existing = (
        _client()
        .table("bill_reminders")
        .select("id")
        .eq("id", bill_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tagihan tidak ditemukan")

    _client().table("bill_reminders").update({"is_active": False}).eq("id", bill_id).execute()


@router.post("/{bill_id}/pay")
async def pay_bill(
    bill_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Tandai tagihan sebagai lunas dan hitung next_due_date berikutnya."""
    require_tables("bill_reminders")
    existing = (
        _client()
        .table("bill_reminders")
        .select("*")
        .eq("id", bill_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tagihan tidak ditemukan")

    bill = existing.data
    paid_date = date.today()
    # Hitung jadwal berikutnya setelah tanggal bayar
    next_due = _compute_next_due(bill["due_day"], bill["recurrence"], after=paid_date)

    is_one_time = bill["recurrence"] == "once"
    paid_at = datetime.utcnow().isoformat()
    updates = {
        "is_paid": is_one_time,
        "is_active": not is_one_time,
        "paid_at": paid_at,
        "next_due_date": next_due,
    }
    if _bill_supports("payment_history"):
        payment_history = list(bill.get("payment_history") or [])
        payment_history.append(
            {
                "paid_at": paid_at,
                "amount": float(bill["amount"]),
                "next_due_date_before_payment": bill["next_due_date"],
            }
        )
        updates["payment_history"] = payment_history
    result = _client().table("bill_reminders").update(updates).eq("id", bill_id).execute()
    message = (
        "Tagihan sekali jalan berhasil ditandai lunas"
        if is_one_time
        else "Tagihan berhasil dibayar dan dijadwalkan ulang untuk periode berikutnya"
    )
    return {"data": result.data[0], "message": message}
