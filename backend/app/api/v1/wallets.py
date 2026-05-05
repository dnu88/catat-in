from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime, timezone

from app.core.auth import get_current_user
from app.core.firebase import get_firestore_client

router = APIRouter()


def _db(uid: str):
    return get_firestore_client().collection("users").document(uid).collection("wallets")


def _normalize_wallet(doc_id: str, data: dict) -> dict:
    return {
        "id": doc_id,
        "user_id": data.get("user_id", ""),
        "name": data.get("name", ""),
        "type": data.get("type", "bank"),
        "balance": data.get("balance", 0),
        "currency": data.get("currency", "IDR"),
        "bank_name": data.get("bank_name"),
        "account_number": data.get("account_number"),
        "is_shared": data.get("is_shared", False),
        "group_id": data.get("group_id"),
        "is_active": data.get("is_active", True),
        "created_at": data.get("created_at"),
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
    uid = current_user["user_id"]
    docs = _db(uid).order_by("created_at").stream()
    wallets = [
        _normalize_wallet(d.id, d.to_dict())
        for d in docs
        if d.to_dict().get("is_active", True)
    ]
    return {"data": wallets}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_wallet(body: WalletCreate, current_user: dict = Depends(get_current_user)):
    uid = current_user["user_id"]
    wallet_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "user_id": uid,
        "name": body.name,
        "type": body.type,
        "balance": body.balance,
        "currency": body.currency or "IDR",
        "bank_name": body.bank_name,
        "account_number": body.account_number,
        "is_shared": False,
        "is_active": True,
        "created_at": now,
    }
    _db(uid).document(wallet_id).set(payload)
    return {"data": _normalize_wallet(wallet_id, payload)}


@router.patch("/{wallet_id}")
async def update_wallet(
    wallet_id: str,
    body: WalletUpdate,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    ref = _db(uid).document(wallet_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet tidak ditemukan")

    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    ref.update(updates)
    data = {**snap.to_dict(), **updates}
    return {"data": _normalize_wallet(wallet_id, data)}


@router.delete("/{wallet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wallet(wallet_id: str, current_user: dict = Depends(get_current_user)):
    uid = current_user["user_id"]
    ref = _db(uid).document(wallet_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet tidak ditemukan")

    tx_col = get_firestore_client().collection("users").document(uid).collection("transactions")
    tx_docs = tx_col.where("wallet_id", "==", wallet_id).limit(1).stream()
    if any(True for _ in tx_docs):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Wallet tidak dapat dihapus karena masih memiliki transaksi. Nonaktifkan jika tidak ingin digunakan.",
        )

    ref.update({"is_active": False})
