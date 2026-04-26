"""
Catat.in — Transactions Router
CRUD lengkap untuk transaksi keuangan pribadi dan grup.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date as Date
from supabase import create_client
from postgrest.exceptions import APIError

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


def _tx_supports(column: str) -> bool:
    return has_columns("transactions", column)


def _wallet_supports(column: str) -> bool:
    return has_columns("wallets", column)


def _tx_type_column() -> str:
    return "type" if _tx_supports("type") else "transaction_type"


def _tx_note_column() -> str:
    return "note" if _tx_supports("note") else "description"


def _tx_wallet_column() -> str:
    return "wallet_id" if _tx_supports("wallet_id") else "payment_method"


def _db_amount(value: float) -> float | int:
    amount = float(value)
    if amount.is_integer():
        return int(amount)
    return amount


def _normalize_transaction(row: dict) -> dict:
    return {
        "id": row["id"],
        "wallet_id": row.get("wallet_id") or row.get("payment_method") or "",
        "user_id": row["user_id"],
        "type": row.get("type") or row.get("transaction_type") or "expense",
        "amount": row["amount"],
        "category": row.get("category", "other"),
        "note": row.get("note") or row.get("description"),
        "merchant": row.get("merchant"),
        "date": row["date"],
        "receipt_url": row.get("receipt_url"),
        "is_shared": row.get("is_shared", False),
        "visibility": row.get("visibility", "private"),
        "group_id": row.get("group_id"),
        "on_behalf_of": row.get("on_behalf_of"),
        "created_by": row.get("created_by", row["user_id"]),
        "is_disputed": row.get("is_disputed", False),
        "dispute_resolved_at": row.get("dispute_resolved_at"),
        "ai_extracted": row.get("ai_extracted", False),
        "ai_confidence": row.get("ai_confidence"),
        "created_at": row.get("created_at"),
    }


def _handle_schema_mismatch(exc: Exception) -> None:
    text = str(exc).lower()
    if isinstance(exc, APIError) or "record \"new\" has no field" in text or "column" in text:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Fitur transaksi belum aktif karena schema/trigger database belum sinkron. "
                "Jalankan migration `backend/supabase/migrations/003_fix_schema.sql` "
                "di Supabase SQL Editor lalu coba lagi."
            ),
        )


# ── SCHEMAS ──────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    wallet_id: str
    type: str = Field(..., pattern="^(income|expense)$")
    amount: float = Field(..., gt=0)
    category: str
    note: Optional[str] = None
    merchant: Optional[str] = Field(None, max_length=100)
    date: Date = Field(default_factory=Date.today)
    is_shared: bool = False
    on_behalf_of: Optional[str] = None
    ai_extracted: bool = False
    ai_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)


class TransactionUpdate(BaseModel):
    type: Optional[str] = Field(None, pattern="^(income|expense)$")
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    note: Optional[str] = None
    merchant: Optional[str] = None
    date: Optional[Date] = None


# ── HELPERS ───────────────────────────────────────────────────

def _adjust_wallet_balance(wallet_id: str, tx_type: str, amount: float, reverse: bool = False):
    wallet = _client().table("wallets").select("balance").eq("id", wallet_id).single().execute()
    if not wallet.data:
        return
    current = float(wallet.data["balance"])
    delta = amount if tx_type == "income" else -amount
    if reverse:
        delta = -delta
    _client().table("wallets").update({"balance": current + delta}).eq("id", wallet_id).execute()


# ── ENDPOINTS ────────────────────────────────────────────────

@router.get("/")
async def list_transactions(
    type: Optional[str] = Query(None, pattern="^(income|expense)$"),
    category: Optional[str] = Query(None),
    wallet_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    q = (
        _client()
        .table("transactions")
        .select("*", count="exact")
        .eq("user_id", current_user["user_id"])
        .order("date", desc=True)
        .order("created_at", desc=True)
    )
    if type:
        q = q.eq(_tx_type_column(), type)
    if category:
        q = q.eq("category", category)
    if wallet_id:
        q = q.eq(_tx_wallet_column(), wallet_id)
    if date_from:
        q = q.gte("date", date_from)
    if date_to:
        q = q.lte("date", date_to)

    offset = (page - 1) * per_page
    result = q.range(offset, offset + per_page - 1).execute()

    return {
        "data": [_normalize_transaction(row) for row in result.data],
        "total": result.count or 0,
        "page": page,
        "per_page": per_page,
        "has_more": (offset + per_page) < (result.count or 0),
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: TransactionCreate,
    current_user: dict = Depends(get_current_user),
):

    wallet = (
        _client()
        .table("wallets")
        .select("id,balance")
        .eq("id", body.wallet_id)
        .eq("user_id", current_user["user_id"])
    )
    if _wallet_supports("is_active"):
        wallet = wallet.eq("is_active", True)
    wallet = wallet.single().execute()
    if not wallet.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet tidak ditemukan")

    tx_data = {
        "user_id": current_user["user_id"],
        "amount": _db_amount(body.amount),
        "category": body.category,
        "date": body.date.isoformat(),
    }
    tx_data[_tx_type_column()] = body.type
    tx_data[_tx_wallet_column()] = body.wallet_id
    tx_data[_tx_note_column()] = body.note
    if _tx_supports("transaction_type"):
        tx_data["transaction_type"] = body.type
    if _tx_supports("payment_method"):
        tx_data["payment_method"] = body.wallet_id
    if _tx_supports("description"):
        tx_data["description"] = body.note or body.merchant or ""
    if _tx_supports("created_by"):
        tx_data["created_by"] = current_user["user_id"]
    if _tx_supports("merchant"):
        tx_data["merchant"] = body.merchant
    elif body.merchant and not body.note:
        tx_data[_tx_note_column()] = body.merchant
    if _tx_supports("is_shared"):
        tx_data["is_shared"] = body.is_shared
    if _tx_supports("visibility"):
        tx_data["visibility"] = "group" if body.is_shared else "private"
    if _tx_supports("is_disputed"):
        tx_data["is_disputed"] = False
    if _tx_supports("ai_extracted"):
        tx_data["ai_extracted"] = body.ai_extracted
    if _tx_supports("ai_confidence"):
        tx_data["ai_confidence"] = body.ai_confidence
    if body.on_behalf_of:
        if _tx_supports("on_behalf_of"):
            tx_data["on_behalf_of"] = body.on_behalf_of

    try:
        result = _client().table("transactions").insert(tx_data).execute()
    except Exception as exc:
        _handle_schema_mismatch(exc)
        raise

    # Update wallet balance
    try:
        _adjust_wallet_balance(body.wallet_id, body.type, body.amount)
    except Exception:
        pass

    return {"data": _normalize_transaction(result.data[0])}


@router.get("/{transaction_id}")
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
):
    result = (
        _client()
        .table("transactions")
        .select("*")
        .eq("id", transaction_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaksi tidak ditemukan")
    return {"data": _normalize_transaction(result.data)}


@router.patch("/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    body: TransactionUpdate,
    current_user: dict = Depends(get_current_user),
):
    existing = (
        _client()
        .table("transactions")
        .select("*")
        .eq("id", transaction_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaksi tidak ditemukan")

    updates = body.model_dump(exclude_none=True)
    if "date" in updates:
        updates["date"] = updates["date"].isoformat()

    mapped_updates = {}
    for key, value in updates.items():
        if key == "type":
            mapped_updates[_tx_type_column()] = value
            if _tx_supports("transaction_type"):
                mapped_updates["transaction_type"] = value
        elif key == "note":
            mapped_updates[_tx_note_column()] = value
            if _tx_supports("description"):
                mapped_updates["description"] = value or ""
        elif key == "merchant":
            if _tx_supports("merchant"):
                mapped_updates["merchant"] = value
            elif value and "note" not in updates:
                mapped_updates[_tx_note_column()] = value
            if _tx_supports("description") and "note" not in updates and value:
                mapped_updates["description"] = value
        else:
            mapped_updates[key] = _db_amount(value) if key == "amount" else value

    old = existing.data
    normalized_old = _normalize_transaction(old)
    # Revert old balance effect, apply new effect
    _adjust_wallet_balance(normalized_old["wallet_id"], normalized_old["type"], float(normalized_old["amount"]), reverse=True)
    new_type = updates.get("type", normalized_old["type"])
    new_amount = float(updates.get("amount", normalized_old["amount"]))
    _adjust_wallet_balance(normalized_old["wallet_id"], new_type, new_amount)

    try:
        result = (
            _client()
            .table("transactions")
            .update(mapped_updates)
            .eq("id", transaction_id)
            .execute()
        )
    except Exception as exc:
        _handle_schema_mismatch(exc)
        raise
    return {"data": _normalize_transaction(result.data[0])}


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
):
    existing = (
        _client()
        .table("transactions")
        .select("*")
        .eq("id", transaction_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaksi tidak ditemukan")

    old = _normalize_transaction(existing.data)
    _adjust_wallet_balance(old["wallet_id"], old["type"], float(old["amount"]), reverse=True)
    try:
        _client().table("transactions").delete().eq("id", transaction_id).execute()
    except Exception as exc:
        _handle_schema_mismatch(exc)
        raise
