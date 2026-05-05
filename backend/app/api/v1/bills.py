from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from calendar import monthrange
import uuid

from app.core.auth import get_current_user
from app.core.firebase import get_firestore_client

router = APIRouter()


def _db():
    return get_firestore_client()


def _bills_col(uid: str):
    return _db().collection("users").document(uid).collection("bill_reminders")


def _normalize_bill(doc_id: str, data: dict) -> dict:
    return {
        "id": doc_id,
        "user_id": data.get("user_id"),
        "name": data.get("name"),
        "amount": data.get("amount"),
        "due_day": data.get("due_day"),
        "recurrence": data.get("recurrence"),
        "icon": data.get("icon"),
        "next_due_date": data.get("next_due_date"),
        "is_active": data.get("is_active", True),
        "is_paid": data.get("is_paid", False),
        "notify_before_days": data.get("notify_before_days", [3, 1]),
        "payment_history": data.get("payment_history", []),
        "auto_record_wallet": data.get("auto_record_wallet"),
        "created_at": data.get("created_at"),
    }


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
    uid = current_user["user_id"]
    docs = _bills_col(uid).where("is_active", "==", True).stream()
    
    bills = [_normalize_bill(doc.id, doc.to_dict()) for doc in docs]
    # Sort by next_due_date
    bills.sort(key=lambda x: x["next_due_date"])
    
    return {"data": bills}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_bill(
    body: BillCreate,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    doc_id = str(uuid.uuid4())
    data = {
        "user_id": uid,
        "name": body.name,
        "amount": body.amount,
        "due_day": body.due_day,
        "recurrence": body.recurrence,
        "icon": body.icon,
        "notify_before_days": body.notify_before_days,
        "next_due_date": _compute_next_due(body.due_day, body.recurrence),
        "is_active": True,
        "is_paid": False,
        "payment_history": [],
        "auto_record_wallet": body.auto_record_wallet,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    _bills_col(uid).document(doc_id).set(data)
    return {"data": _normalize_bill(doc_id, data)}


@router.patch("/{bill_id}")
async def update_bill(
    bill_id: str,
    body: BillUpdate,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    ref = _bills_col(uid).document(bill_id)
    doc = ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tagihan tidak ditemukan")

    existing_data = doc.to_dict()
    updates = body.model_dump(exclude_none=True)

    if "due_day" in updates:
        recurrence = existing_data["recurrence"]
        updates["next_due_date"] = _compute_next_due(updates["due_day"], recurrence)

    ref.update(updates)
    updated_data = ref.get().to_dict()
    return {"data": _normalize_bill(bill_id, updated_data)}


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bill(
    bill_id: str,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    ref = _bills_col(uid).document(bill_id)
    if not ref.get().exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tagihan tidak ditemukan")

    # Soft delete
    ref.update({"is_active": False})


@router.post("/{bill_id}/pay")
async def pay_bill(
    bill_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Tandai tagihan sebagai lunas dan hitung next_due_date berikutnya."""
    uid = current_user["user_id"]
    ref = _bills_col(uid).document(bill_id)
    doc = ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tagihan tidak ditemukan")

    bill = doc.to_dict()
    paid_date = date.today()
    next_due = _compute_next_due(bill["due_day"], bill["recurrence"], after=paid_date)

    is_one_time = bill["recurrence"] == "once"
    paid_at = datetime.utcnow().isoformat()
    
    payment_history = list(bill.get("payment_history") or [])
    payment_history.append({
        "paid_at": paid_at,
        "amount": float(bill["amount"]),
        "next_due_date_before_payment": bill["next_due_date"],
    })

    updates = {
        "is_paid": is_one_time,
        "is_active": not is_one_time,
        "paid_at": paid_at,
        "next_due_date": next_due,
        "payment_history": payment_history,
    }
    
    ref.update(updates)
    updated_data = ref.get().to_dict()
    
    message = (
        "Tagihan sekali jalan berhasil ditandai lunas"
        if is_one_time
        else "Tagihan berhasil dibayar dan dijadwalkan ulang untuk periode berikutnya"
    )
    return {"data": _normalize_bill(bill_id, updated_data), "message": message}

