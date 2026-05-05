"""
Catat.in — Transactions Router
CRUD lengkap untuk transaksi keuangan pribadi (Firestore).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date as Date, datetime, timezone, timedelta
import uuid

from app.core.auth import get_current_user
from app.core.firebase import get_firestore_client

router = APIRouter()

VALID_CATEGORIES = {
    "food", "transport", "shopping", "health",
    "entertainment", "education", "housing",
    "salary", "freelance", "investment", "other",
}


def _tx_col(uid: str):
    return get_firestore_client().collection("users").document(uid).collection("transactions")


def _wallet_ref(uid: str, wallet_id: str):
    return get_firestore_client().collection("users").document(uid).collection("wallets").document(wallet_id)


def _normalize_transaction(doc_id: str, data: dict) -> dict:
    return {
        "id": doc_id,
        "wallet_id": data.get("wallet_id", ""),
        "user_id": data.get("user_id", ""),
        "type": data.get("type", "expense"),
        "amount": data.get("amount", 0),
        "category": data.get("category", "other"),
        "note": data.get("note"),
        "merchant": data.get("merchant"),
        "date": data.get("date"),
        "receipt_url": data.get("receipt_url"),
        "is_shared": data.get("is_shared", False),
        "visibility": data.get("visibility", "private"),
        "group_id": data.get("group_id"),
        "on_behalf_of": data.get("on_behalf_of"),
        "created_by": data.get("created_by", data.get("user_id", "")),
        "is_disputed": data.get("is_disputed", False),
        "dispute_resolved_at": data.get("dispute_resolved_at"),
        "ai_extracted": data.get("ai_extracted", False),
        "ai_confidence": data.get("ai_confidence"),
        "created_at": data.get("created_at"),
    }


def _adjust_wallet_balance(uid: str, wallet_id: str, tx_type: str, amount: float, reverse: bool = False):
    ref = _wallet_ref(uid, wallet_id)
    snap = ref.get()
    if not snap.exists:
        return
    current = float(snap.to_dict().get("balance", 0))
    delta = amount if tx_type == "income" else -amount
    if reverse:
        delta = -delta
    ref.update({"balance": current + delta})


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
    uid = current_user["user_id"]
    query = _tx_col(uid).order_by("date", direction="DESCENDING")

    docs = list(query.stream())
    transactions = [_normalize_transaction(d.id, d.to_dict()) for d in docs]

    # Apply filters in memory (Firestore compound queries need composite indexes)
    if type:
        transactions = [t for t in transactions if t["type"] == type]
    if category:
        transactions = [t for t in transactions if t["category"] == category]
    if wallet_id:
        transactions = [t for t in transactions if t["wallet_id"] == wallet_id]
    if date_from:
        transactions = [t for t in transactions if (t["date"] or "") >= date_from]
    if date_to:
        transactions = [t for t in transactions if (t["date"] or "") <= date_to]

    total = len(transactions)
    offset = (page - 1) * per_page
    paginated = transactions[offset: offset + per_page]

    return {
        "data": paginated,
        "total": total,
        "page": page,
        "per_page": per_page,
        "has_more": (offset + per_page) < total,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: TransactionCreate,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]

    wallet_snap = _wallet_ref(uid, body.wallet_id).get()
    if not wallet_snap.exists or not wallet_snap.to_dict().get("is_active", True):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet tidak ditemukan")

    tx_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    tx_data = {
        "user_id": uid,
        "wallet_id": body.wallet_id,
        "type": body.type,
        "amount": body.amount,
        "category": body.category,
        "note": body.note,
        "merchant": body.merchant,
        "date": body.date.isoformat(),
        "is_shared": body.is_shared,
        "visibility": "group" if body.is_shared else "private",
        "on_behalf_of": body.on_behalf_of,
        "created_by": uid,
        "is_disputed": False,
        "ai_extracted": body.ai_extracted,
        "ai_confidence": body.ai_confidence,
        "created_at": now,
    }

    _tx_col(uid).document(tx_id).set(tx_data)

    # Budget Check Logic
    budget_info = None
    if body.type == "expense":
        month_start = body.date.replace(day=1).isoformat()
        budgets = get_firestore_client().collection("users").document(uid).collection("budgets") \
            .where("category", "==", body.category) \
            .where("period_start", "==", month_start) \
            .where("is_active", "==", True) \
            .limit(1).get()
        
        if budgets:
            b_doc = budgets[0]
            b_data = b_doc.to_dict()
            limit = float(b_data.get("limit_amount", 0))
            
            # Recompute total spent for this budget
            # (In a real app, you'd use a counter or a more efficient way, but for now re-summing works)
            tx_docs = _tx_col(uid).where("category", "==", body.category) \
                .where("date", ">=", month_start) \
                .where("date", "<", (body.date.replace(day=28) + timedelta(days=4)).replace(day=1).isoformat()) \
                .stream()
            
            spent = sum(float(d.to_dict().get("amount", 0)) for d in tx_docs if (d.to_dict().get("type") or d.to_dict().get("transaction_type")) == "expense")
            
            budget_info = {
                "id": b_doc.id,
                "limit": limit,
                "spent": spent,
                "remaining": max(0, limit - spent),
                "is_over_budget": spent > limit
            }

    try:
        _adjust_wallet_balance(uid, body.wallet_id, body.type, body.amount)
    except Exception:
        pass

    return {
        "data": _normalize_transaction(tx_id, tx_data),
        "budget_status": budget_info
    }



@router.get("/{transaction_id}")
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    snap = _tx_col(uid).document(transaction_id).get()
    if not snap.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaksi tidak ditemukan")
    return {"data": _normalize_transaction(snap.id, snap.to_dict())}


@router.patch("/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    body: TransactionUpdate,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    ref = _tx_col(uid).document(transaction_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaksi tidak ditemukan")

    old_data = snap.to_dict()
    old = _normalize_transaction(snap.id, old_data)

    updates = body.model_dump(exclude_none=True)
    if "date" in updates:
        updates["date"] = updates["date"].isoformat()

    _adjust_wallet_balance(uid, old["wallet_id"], old["type"], float(old["amount"]), reverse=True)
    new_type = updates.get("type", old["type"])
    new_amount = float(updates.get("amount", old["amount"]))
    _adjust_wallet_balance(uid, old["wallet_id"], new_type, new_amount)

    ref.update(updates)
    final_data = {**old_data, **updates}
    
    # Budget Check Logic
    budget_info = None
    if final_data.get("type") == "expense":
        tx_date_str = final_data.get("date")
        if tx_date_str:
            dt = Date.fromisoformat(tx_date_str)
            month_start = dt.replace(day=1).isoformat()
            cat = final_data.get("category", "other")
            
            budgets = get_firestore_client().collection("users").document(uid).collection("budgets") \
                .where("category", "==", cat) \
                .where("period_start", "==", month_start) \
                .where("is_active", "==", True) \
                .limit(1).get()
            
            if budgets:
                b_doc = budgets[0]
                b_data = b_doc.to_dict()
                limit = float(b_data.get("limit_amount", 0))
                
                # Recompute total spent
                month_end = (dt.replace(day=28) + timedelta(days=4)).replace(day=1).isoformat()
                tx_docs = _tx_col(uid).where("date", ">=", month_start).where("date", "<", month_end).stream()
                
                spent = 0.0
                for d in tx_docs:
                    d_data = d.to_dict()
                    if d_data.get("category") == cat:
                        d_type = d_data.get("type") or d_data.get("transaction_type") or "expense"
                        if d_type == "expense":
                            spent += float(d_data.get("amount", 0))
                
                budget_info = {
                    "id": b_doc.id,
                    "limit": limit,
                    "spent": spent,
                    "remaining": max(0, limit - spent),
                    "is_over_budget": spent > limit
                }

    return {
        "data": _normalize_transaction(transaction_id, final_data),
        "budget_status": budget_info
    }


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    ref = _tx_col(uid).document(transaction_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaksi tidak ditemukan")

    old = _normalize_transaction(snap.id, snap.to_dict())
    _adjust_wallet_balance(uid, old["wallet_id"], old["type"], float(old["amount"]), reverse=True)
    ref.delete()
