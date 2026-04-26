"""
Catat.in — Budgets Router
CRUD anggaran bulanan per kategori, termasuk computed spent_amount.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from supabase import create_client

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.schema_compat import has_columns

router = APIRouter()

VALID_CATEGORIES = {
    "food", "transport", "shopping", "health",
    "entertainment", "education", "housing",
    "salary", "freelance", "investment", "other",
}


def _client():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _budget_supports(column: str) -> bool:
    return has_columns("budgets", column)


def _tx_supports(column: str) -> bool:
    return has_columns("transactions", column)


def _category_type_for(category: str) -> str:
    return "income" if category in {"salary", "freelance", "investment"} else "expense"


def _budget_period_column() -> str:
    return "period_start" if _budget_supports("period_start") else "start_date"


def _budget_category_column() -> str:
    return "category" if _budget_supports("category") else "category_id"


def _tx_type_column() -> str:
    return "type" if _tx_supports("type") else "transaction_type"


def _fetch_categories() -> dict[str, dict]:
    if not has_columns("categories", "id", "name"):
        return {}

    result = _client().table("categories").select("*").execute()
    return {row["id"]: row for row in result.data}


def _ensure_category(user_id: str, category: str) -> str:
    category_type = _category_type_for(category)
    existing = (
        _client()
        .table("categories")
        .select("id")
        .eq("name", category)
        .eq("type", category_type)
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]["id"]

    created = (
        _client()
        .table("categories")
        .insert({"user_id": user_id, "name": category, "type": category_type, "icon": None})
        .execute()
    )
    return created.data[0]["id"]


def _normalize_budget(row: dict, category_lookup: dict[str, dict]) -> dict:
    category_name = row.get("category")
    if not category_name and row.get("category_id"):
        category_name = category_lookup.get(row["category_id"], {}).get("name", "other")

    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "group_id": row.get("group_id"),
        "category": category_name or "other",
        "limit_amount": row["limit_amount"],
        "period": row.get("period", "monthly"),
        "period_start": row.get("period_start") or row.get("start_date"),
        "notify_at_percent": row.get("notify_at_percent", 80),
        "is_active": row.get("is_active", True),
        "created_at": row.get("created_at"),
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

def _compute_spent(user_id: str, category: str, period_start: str, period_end: str) -> float:
    result = (
        _client()
        .table("transactions")
        .select("amount")
        .eq("user_id", user_id)
        .eq("category", category)
        .eq(_tx_type_column(), "expense")
        .gte("date", period_start)
        .lt("date", period_end)
        .execute()
    )
    return sum(float(t["amount"]) for t in result.data)


def _next_period_start(period_start: str) -> str:
    """Hitung awal bulan berikutnya dari period_start."""
    d = date.fromisoformat(period_start)
    if d.month == 12:
        return date(d.year + 1, 1, 1).isoformat()
    return date(d.year, d.month + 1, 1).isoformat()


# ── ENDPOINTS ────────────────────────────────────────────────

@router.get("/")
async def list_budgets(
    period_start: Optional[str] = Query(None, description="Filter per bulan, format YYYY-MM-01"),
    current_user: dict = Depends(get_current_user),
):
    q = (
        _client()
        .table("budgets")
        .select("*")
        .eq("user_id", current_user["user_id"])
        .order("created_at")
    )
    if _budget_supports("is_active"):
        q = q.eq("is_active", True)
    if period_start:
        q = q.eq(_budget_period_column(), period_start)

    result = q.execute()
    category_lookup = _fetch_categories()
    budgets = [_normalize_budget(row, category_lookup) for row in result.data]

    # Compute spent_amount per budget
    for budget in budgets:
        period_end = _next_period_start(budget["period_start"])
        budget["spent_amount"] = _compute_spent(
            current_user["user_id"],
            budget["category"],
            budget["period_start"],
            period_end,
        )

    return {"data": budgets}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_budget(
    body: BudgetCreate,
    current_user: dict = Depends(get_current_user),
):

    # Cek jika budget dengan kategori & periode yang sama sudah ada
    existing = (
        _client()
        .table("budgets")
        .select("id")
        .eq("user_id", current_user["user_id"])
    )
    if _budget_supports("category"):
        existing = existing.eq("category", body.category)
    else:
        existing = existing.eq("category_id", _ensure_category(current_user["user_id"], body.category))
    existing = existing.eq(_budget_period_column(), body.period_start.isoformat())
    if _budget_supports("is_active"):
        existing = existing.eq("is_active", True)
    existing = existing.execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Budget untuk kategori '{body.category}' di periode ini sudah ada.",
        )

    data = {
        "user_id": current_user["user_id"],
        "limit_amount": body.limit_amount,
        "period": body.period,
        _budget_period_column(): body.period_start.isoformat(),
    }
    if _budget_supports("category"):
        data["category"] = body.category
    else:
        data["category_id"] = _ensure_category(current_user["user_id"], body.category)
    if _budget_supports("notify_at_percent"):
        data["notify_at_percent"] = body.notify_at_percent
    if _budget_supports("is_active"):
        data["is_active"] = True
    if body.group_id:
        if _budget_supports("group_id"):
            data["group_id"] = body.group_id

    result = _client().table("budgets").insert(data).execute()
    new_budget = _normalize_budget(result.data[0], _fetch_categories())

    # Hitung spent_amount awal
    period_end = _next_period_start(new_budget["period_start"])
    new_budget["spent_amount"] = _compute_spent(
        current_user["user_id"], new_budget["category"],
        new_budget["period_start"], period_end,
    )

    return {"data": new_budget}


@router.patch("/{budget_id}")
async def update_budget(
    budget_id: str,
    body: BudgetUpdate,
    current_user: dict = Depends(get_current_user),
):
    existing = (
        _client()
        .table("budgets")
        .select("id")
        .eq("id", budget_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget tidak ditemukan")

    updates = body.model_dump(exclude_none=True)
    mapped_updates = {}
    for key, value in updates.items():
        if key in {"notify_at_percent", "is_active"} and not _budget_supports(key):
            continue
        mapped_updates[key] = value

    result = _client().table("budgets").update(mapped_updates).eq("id", budget_id).execute()
    return {"data": _normalize_budget(result.data[0], _fetch_categories())}


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: str,
    current_user: dict = Depends(get_current_user),
):
    existing = (
        _client()
        .table("budgets")
        .select("id")
        .eq("id", budget_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget tidak ditemukan")

    if _budget_supports("is_active"):
        _client().table("budgets").update({"is_active": False}).eq("id", budget_id).execute()
    else:
        _client().table("budgets").delete().eq("id", budget_id).execute()
