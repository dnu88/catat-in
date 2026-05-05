from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
import uuid

from app.core.auth import get_current_user
from app.core.firebase import get_firestore_client

router = APIRouter()

def _db():
    return get_firestore_client()

def _budgets_col(uid: str):
    return _db().collection("users").document(uid).collection("budgets")

def _tx_col(uid: str):
    return _db().collection("users").document(uid).collection("transactions")

def _normalize_budget(doc_id: str, data: dict) -> dict:
    return {
        "id": doc_id,
        "user_id": data.get("user_id"),
        "group_id": data.get("group_id"),
        "category": data.get("category", "other"),
        "limit_amount": data["limit_amount"],
        "period": data.get("period", "monthly"),
        "period_start": data.get("period_start"),
        "notify_at_percent": data.get("notify_at_percent", 80),
        "is_active": data.get("is_active", True),
        "created_at": data.get("created_at"),
    }

# ── SCHEMAS ──────────────────────────────────────────────────

class BudgetCreate(BaseModel):
    category: str
    limit_amount: float = Field(..., gt=0)
    period: str = Field("monthly", pattern="^monthly$")
    period_start: date
    notify_at_percent: int = Field(80, ge=1, le=100)
    group_id: Optional[str] = None

class BudgetUpdate(BaseModel):
    limit_amount: Optional[float] = Field(None, gt=0)
    notify_at_percent: Optional[int] = Field(None, ge=1, le=100)
    is_active: Optional[bool] = None

# ── HELPERS ───────────────────────────────────────────────────

def _compute_spent(uid: str, category: str, period_start: str, period_end: str) -> float:
    # Query transactions from Firestore
    # To be safe and avoid composite index requirements for now, 
    # we filter by date range and then check category in memory.
    docs = _tx_col(uid).where("date", ">=", period_start).where("date", "<", period_end).stream()
    
    total = 0.0
    for doc in docs:
        data = doc.to_dict()
        tx_cat = data.get("category", "other")
        # Match either the internal name or the label (for legacy/inconsistent data)
        if tx_cat == category or tx_cat.lower() == category.lower():
            tx_type = data.get("type") or data.get("transaction_type") or "expense"
            if tx_type == "expense":
                total += float(data.get("amount", 0))
    return round(total, 2)

def _next_period_start(period_start_iso: str) -> str:
    d = date.fromisoformat(period_start_iso)
    if d.month == 12:
        return date(d.year + 1, 1, 1).isoformat()
    return date(d.year, d.month + 1, 1).isoformat()

# ── ENDPOINTS ────────────────────────────────────────────────

@router.get("/")
async def list_budgets(
    period_start: Optional[str] = Query(None, description="Filter per bulan, format YYYY-MM-01"),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    query = _budgets_col(uid).where("is_active", "==", True)
    
    if period_start:
        query = query.where("period_start", "==", period_start)
    
    docs = query.stream()
    budgets = [_normalize_budget(doc.id, doc.to_dict()) for doc in docs]

    # Compute spent_amount per budget
    for budget in budgets:
        p_start = budget["period_start"]
        p_end = _next_period_start(p_start)
        budget["spent_amount"] = _compute_spent(uid, budget["category"], p_start, p_end)
        budget["remaining_amount"] = max(0, budget["limit_amount"] - budget["spent_amount"])

    return {"data": budgets}

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_budget(
    body: BudgetCreate,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    p_start_iso = body.period_start.isoformat()

    # Check existing
    existing = _budgets_col(uid).where("category", "==", body.category).where("period_start", "==", p_start_iso).where("is_active", "==", True).limit(1).get()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Budget untuk kategori '{body.category}' di periode ini sudah ada.",
        )

    doc_id = str(uuid.uuid4())
    data = {
        "user_id": uid,
        "category": body.category,
        "limit_amount": body.limit_amount,
        "period": body.period,
        "period_start": p_start_iso,
        "notify_at_percent": body.notify_at_percent,
        "is_active": True,
        "group_id": body.group_id,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    _budgets_col(uid).document(doc_id).set(data)
    
    # Compute spent
    p_end = _next_period_start(p_start_iso)
    spent = _compute_spent(uid, body.category, p_start_iso, p_end)
    
    res = _normalize_budget(doc_id, data)
    res["spent_amount"] = spent
    res["remaining_amount"] = max(0, body.limit_amount - spent)
    
    return {"data": res}

@router.patch("/{budget_id}")
async def update_budget(
    budget_id: str,
    body: BudgetUpdate,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    ref = _budgets_col(uid).document(budget_id)
    doc = ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget tidak ditemukan")

    updates = body.model_dump(exclude_none=True)
    if updates:
        ref.update(updates)
    
    updated_data = ref.get().to_dict()
    res = _normalize_budget(budget_id, updated_data)
    
    p_start = res["period_start"]
    p_end = _next_period_start(p_start)
    res["spent_amount"] = _compute_spent(uid, res["category"], p_start, p_end)
    res["remaining_amount"] = max(0, res["limit_amount"] - res["spent_amount"])
    
    return {"data": res}

@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: str,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    ref = _budgets_col(uid).document(budget_id)
    if not ref.get().exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget tidak ditemukan")
    
    # Soft delete
    ref.update({"is_active": False})
