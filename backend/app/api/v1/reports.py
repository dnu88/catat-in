"""
Catat.in — Reports Router
Laporan ringkasan keuangan bulanan dan tren pengeluaran.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import date
from supabase import create_client

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.schema_compat import has_columns

router = APIRouter()


def _client():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _tx_supports(column: str) -> bool:
    return has_columns("transactions", column)


def _tx_type_column() -> str:
    return "type" if _tx_supports("type") else "transaction_type"


def _tx_wallet_column() -> str:
    return "wallet_id" if _tx_supports("wallet_id") else "payment_method"


def _normalize_transaction(row: dict) -> dict:
    return {
        "id": row["id"],
        "type": row.get("type") or row.get("transaction_type") or "expense",
        "amount": row["amount"],
        "merchant": row.get("merchant"),
        "note": row.get("note") or row.get("description"),
        "date": row["date"],
        "category": row.get("category", "other"),
        "wallet_id": row.get("wallet_id") or row.get("payment_method"),
    }


def _period_bounds(year: int, month: int) -> tuple[str, str]:
    """Kembalikan (period_start, period_end) sebagai ISO date string."""
    start = f"{year:04d}-{month:02d}-01"
    if month == 12:
        end = f"{year + 1:04d}-01-01"
    else:
        end = f"{year:04d}-{month + 1:02d}-01"
    return start, end


# ── ENDPOINTS ────────────────────────────────────────────────

@router.get("/summary")
async def monthly_summary(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    wallet_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Ringkasan pemasukan & pengeluaran bulan tertentu, breakdown per kategori."""
    period_start, period_end = _period_bounds(year, month)

    q = (
        _client()
        .table("transactions")
        .select("*")
        .eq("user_id", current_user["user_id"])
        .gte("date", period_start)
        .lt("date", period_end)
    )
    if wallet_id:
        q = q.eq(_tx_wallet_column(), wallet_id)

    result = q.execute()
    transactions = [_normalize_transaction(row) for row in result.data]

    total_income = sum(float(t["amount"]) for t in transactions if t["type"] == "income")
    total_expense = sum(float(t["amount"]) for t in transactions if t["type"] == "expense")

    # Breakdown pengeluaran per kategori
    by_category: dict[str, float] = {}
    for t in transactions:
        if t["type"] == "expense":
            cat = t["category"]
            by_category[cat] = by_category.get(cat, 0) + float(t["amount"])

    category_breakdown = [
        {
            "category": cat,
            "amount": amt,
            "percentage": round((amt / total_expense * 100) if total_expense else 0, 1),
        }
        for cat, amt in sorted(by_category.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "period": {"year": year, "month": month, "start": period_start, "end": period_end},
        "total_income": total_income,
        "total_expense": total_expense,
        "net": total_income - total_expense,
        "transaction_count": len(transactions),
        "expense_by_category": category_breakdown,
    }


@router.get("/trends")
async def spending_trends(
    months: int = Query(6, ge=1, le=12),
    current_user: dict = Depends(get_current_user),
):
    """Tren pemasukan & pengeluaran N bulan terakhir."""
    today = date.today()
    data = []

    for i in range(months - 1, -1, -1):
        # Mundur i bulan dari bulan ini
        month = today.month - i
        year = today.year
        while month <= 0:
            month += 12
            year -= 1

        period_start, period_end = _period_bounds(year, month)

        result = (
            _client()
            .table("transactions")
            .select("*")
            .eq("user_id", current_user["user_id"])
            .gte("date", period_start)
            .lt("date", period_end)
            .execute()
        )

        items = [_normalize_transaction(row) for row in result.data]
        income = sum(float(t["amount"]) for t in items if t["type"] == "income")
        expense = sum(float(t["amount"]) for t in items if t["type"] == "expense")

        data.append({
            "year": year,
            "month": month,
            "income": income,
            "expense": expense,
            "net": income - expense,
        })

    return {"data": data}


@router.get("/category-detail")
async def category_detail(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    category: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """Detail transaksi per kategori dalam satu bulan."""
    period_start, period_end = _period_bounds(year, month)

    result = (
        _client()
        .table("transactions")
        .select("*")
        .eq("user_id", current_user["user_id"])
        .eq("category", category)
        .gte("date", period_start)
        .lt("date", period_end)
        .order("date", desc=True)
        .execute()
    )

    transactions = [_normalize_transaction(row) for row in result.data]
    total = sum(float(t["amount"]) for t in transactions)

    return {
        "category": category,
        "period": {"year": year, "month": month},
        "total": total,
        "transaction_count": len(transactions),
        "transactions": transactions,
    }
