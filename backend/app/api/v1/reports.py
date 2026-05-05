"""
Catat.in — Reports Router
Laporan ringkasan keuangan bulanan dan tren pengeluaran.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import date, datetime
from app.core.firebase import get_firestore_client
from app.core.auth import get_current_user

router = APIRouter()


def _db():
    return get_firestore_client()


def _tx_col(uid: str):
    return _db().collection("users").document(uid).collection("transactions")


def _normalize_transaction(doc_id: str, data: dict) -> dict:
    return {
        "id": doc_id,
        "type": data.get("type") or data.get("transaction_type") or "expense",
        "amount": data["amount"],
        "merchant": data.get("merchant"),
        "note": data.get("note") or data.get("description"),
        "date": data["date"],
        "category": data.get("category", "other"),
        "wallet_id": data.get("wallet_id") or data.get("payment_method"),
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
    uid = current_user["user_id"]
    period_start, period_end = _period_bounds(year, month)

    query = _tx_col(uid).where("date", ">=", period_start).where("date", "<", period_end)
    
    if wallet_id:
        # Note: In Firestore, this might require a composite index. 
        # For now, filtering in memory to ensure it works without manual index setup.
        pass

    docs = query.stream()
    transactions = [_normalize_transaction(d.id, d.to_dict()) for d in docs]
    
    if wallet_id:
        transactions = [t for t in transactions if t["wallet_id"] == wallet_id]

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
    uid = current_user["user_id"]
    today = date.today()
    data = []

    # Get all transactions for the relevant period to avoid multiple queries
    start_year = today.year
    start_month = today.month - (months - 1)
    while start_month <= 0:
        start_month += 12
        start_year -= 1
    
    global_start, _ = _period_bounds(start_year, start_month)
    all_docs = _tx_col(uid).where("date", ">=", global_start).stream()
    all_transactions = [_normalize_transaction(d.id, d.to_dict()) for d in all_docs]

    for i in range(months - 1, -1, -1):
        month = today.month - i
        year = today.year
        while month <= 0:
            month += 12
            year -= 1

        period_start, period_end = _period_bounds(year, month)
        
        items = [t for t in all_transactions if period_start <= t["date"] < period_end]
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
    uid = current_user["user_id"]
    period_start, period_end = _period_bounds(year, month)

    docs = _tx_col(uid).where("category", "==", category).where("date", ">=", period_start).where("date", "<", period_end).stream()
    
    transactions = [_normalize_transaction(d.id, d.to_dict()) for d in docs]
    # Sort descending by date
    transactions.sort(key=lambda x: x["date"], reverse=True)
    
    total = sum(float(t["amount"]) for t in transactions)

    return {
        "category": category,
        "period": {"year": year, "month": month},
        "total": total,
        "transaction_count": len(transactions),
        "transactions": transactions,
    }

