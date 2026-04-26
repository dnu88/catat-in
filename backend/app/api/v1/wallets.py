from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from app.core.database import get_supabase
from app.core.auth import get_current_user
from app.core.config import settings
from app.core.schema_compat import has_columns

router = APIRouter()


def _client():
    return get_supabase()


def _wallet_supports(column: str) -> bool:
    return has_columns("wallets", column)


def _tx_supports(column: str) -> bool:
    return has_columns("transactions", column)


def _tx_wallet_column() -> str:
    return "wallet_id" if _tx_supports("wallet_id") else "payment_method"


def _normalize_wallet(row: dict) -> dict:
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "name": row["name"],
        "type": row.get("type", "bank"),
        "balance": row.get("balance", 0),
        "currency": row.get("currency", "IDR"),
        "bank_name": row.get("bank_name"),
        "account_number": row.get("account_number"),
        "is_shared": row.get("is_shared", False),
        "group_id": row.get("group_id"),
        "is_active": row.get("is_active", True),
        "created_at": row.get("created_at"),
    }


# ── SCHEMAS ──────────────────────────────────────────────────

class WalletCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    type: str = Field(..., pattern="^(bank|ewallet|cash|investment)$")
    balance: float = Field(0, ge=0)
    currency: str = Field("IDR", min_length=3, max_length=10)
    bank_name: Optional[str] = Field(None, max_length=50)
    account_number: Optional[str] = Field(None, max_length=30)


class WalletUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=60)
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    balance: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=10)
    is_active: Optional[bool] = None


# ── ENDPOINTS ────────────────────────────────────────────────

@router.get("/")
async def list_wallets(current_user: dict = Depends(get_current_user)):
    query = (
        _client()
        .table("wallets")
        .select("*")
        .eq("user_id", current_user["user_id"])
        .order("created_at")
    )
    if _wallet_supports("is_active"):
        query = query.eq("is_active", True)

    result = query.execute()
    return {"data": [_normalize_wallet(row) for row in result.data]}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_wallet(body: WalletCreate, current_user: dict = Depends(get_current_user)):
    payload = {
        "user_id": current_user["user_id"],
        "name": body.name,
        "type": body.type,
        "balance": body.balance,
    }
    if _wallet_supports("currency"):
        payload["currency"] = body.currency or "IDR"
    if _wallet_supports("bank_name"):
        payload["bank_name"] = body.bank_name
    if _wallet_supports("account_number"):
        payload["account_number"] = body.account_number
    if _wallet_supports("is_shared"):
        payload["is_shared"] = False
    if _wallet_supports("is_active"):
        payload["is_active"] = True

    result = (
        _client()
        .table("wallets")
        .insert(payload)
        .execute()
    )
    return {"data": _normalize_wallet(result.data[0])}


@router.patch("/{wallet_id}")
async def update_wallet(
    wallet_id: str,
    body: WalletUpdate,
    current_user: dict = Depends(get_current_user),
):
    existing = (
        _client()
        .table("wallets")
        .select("id")
        .eq("id", wallet_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet tidak ditemukan")

    updates = body.model_dump(exclude_none=True)
    result = (
        _client()
        .table("wallets")
        .update(updates)
        .eq("id", wallet_id)
        .execute()
    )
    return {"data": _normalize_wallet(result.data[0])}


@router.delete("/{wallet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wallet(wallet_id: str, current_user: dict = Depends(get_current_user)):
    existing = (
        _client()
        .table("wallets")
        .select("id")
        .eq("id", wallet_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet tidak ditemukan")

    linked_transactions = (
        _client()
        .table("transactions")
        .select("id", count="exact")
        .eq(_tx_wallet_column(), wallet_id)
        .limit(1)
        .execute()
    )
    if (linked_transactions.count or 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Wallet tidak dapat dihapus karena masih memiliki transaksi. Nonaktifkan jika tidak ingin digunakan.",
        )

    if _wallet_supports("is_active"):
        _client().table("wallets").update({"is_active": False}).eq("id", wallet_id).execute()
    else:
        _client().table("wallets").delete().eq("id", wallet_id).execute()
