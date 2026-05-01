"""
Catat.in - Professional Experience Router
Fase 2.5: activity logs, saved views, savings goals, health score.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.firebase import get_firestore_client

router = APIRouter()


# ---------- Firestore helpers ----------
def _db():
    return get_firestore_client()


def _doc_with_id(doc) -> dict[str, Any]:
    return {"id": doc.id, **(doc.to_dict() or {})}


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def write_activity_log(*, user_id: str, action: str, entity_type: str, entity_id: Optional[str] = None, metadata: Optional[dict[str, Any]] = None):
    _db().collection("activity_logs").document().set(
        {
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "metadata": metadata or {},
            "created_at": _now_iso(),
        }
    )


# ---------- Schemas ----------
class ActivityLogCreate(BaseModel):
    action: str = Field(..., min_length=2, max_length=80)
    entity_type: str = Field(..., min_length=2, max_length=50)
    entity_id: Optional[str] = Field(None, max_length=120)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SavedViewCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    scope: Literal["transactions", "reports"]
    filters: dict[str, Any] = Field(default_factory=dict)


class SavedViewUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=60)
    filters: Optional[dict[str, Any]] = None


class SavingsGoalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(0, ge=0)
    deadline: Optional[str] = None


class SavingsGoalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=80)
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    deadline: Optional[str] = None


# ---------- Activity logs ----------
@router.get("/activity-logs")
async def list_activity_logs(
    action: Optional[str] = Query(None),
    limit: int = Query(30, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    q = (
        _db()
        .collection("activity_logs")
        .where("user_id", "==", current_user["user_id"])
        .order_by("created_at", direction="DESCENDING")
        .limit(limit)
    )
    if action:
        q = q.where("action", "==", action)

    rows = [_doc_with_id(doc) for doc in q.stream()]
    return {"data": rows}


@router.post("/activity-logs", status_code=status.HTTP_201_CREATED)
async def create_activity_log(body: ActivityLogCreate, current_user: dict = Depends(get_current_user)):
    write_activity_log(
        user_id=current_user["user_id"],
        action=body.action.strip(),
        entity_type=body.entity_type.strip(),
        entity_id=body.entity_id,
        metadata=body.metadata,
    )
    return {"message": "Activity log tersimpan"}


# ---------- Saved views ----------
@router.get("/saved-views")
async def list_saved_views(scope: Optional[str] = Query(None), current_user: dict = Depends(get_current_user)):
    q = _db().collection("saved_views").where("user_id", "==", current_user["user_id"])
    if scope:
        q = q.where("scope", "==", scope)
    rows = sorted([_doc_with_id(doc) for doc in q.stream()], key=lambda x: x.get("created_at", ""), reverse=True)
    return {"data": rows}


@router.post("/saved-views", status_code=status.HTTP_201_CREATED)
async def create_saved_view(body: SavedViewCreate, current_user: dict = Depends(get_current_user)):
    payload = {
        "user_id": current_user["user_id"],
        "name": body.name.strip(),
        "scope": body.scope,
        "filters": body.filters,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    ref = _db().collection("saved_views").document()
    ref.set(payload)
    write_activity_log(user_id=current_user["user_id"], action="saved_view.create", entity_type="saved_view", entity_id=ref.id)
    return {"data": {"id": ref.id, **payload}}


@router.patch("/saved-views/{view_id}")
async def update_saved_view(view_id: str, body: SavedViewUpdate, current_user: dict = Depends(get_current_user)):
    ref = _db().collection("saved_views").document(view_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Saved view tidak ditemukan")
    data = doc.to_dict() or {}
    if data.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Tidak diizinkan")

    updates = body.model_dump(exclude_none=True)
    if "name" in updates:
        updates["name"] = updates["name"].strip()
    updates["updated_at"] = _now_iso()
    ref.update(updates)
    write_activity_log(user_id=current_user["user_id"], action="saved_view.update", entity_type="saved_view", entity_id=view_id)
    return {"data": _doc_with_id(ref.get())}


@router.delete("/saved-views/{view_id}")
async def delete_saved_view(view_id: str, current_user: dict = Depends(get_current_user)):
    ref = _db().collection("saved_views").document(view_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Saved view tidak ditemukan")
    data = doc.to_dict() or {}
    if data.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Tidak diizinkan")
    ref.delete()
    write_activity_log(user_id=current_user["user_id"], action="saved_view.delete", entity_type="saved_view", entity_id=view_id)
    return {"message": "Saved view dihapus"}


# ---------- Savings goals ----------
@router.get("/savings-goals")
async def list_savings_goals(current_user: dict = Depends(get_current_user)):
    rows = [
        _doc_with_id(doc)
        for doc in _db().collection("savings_goals").where("user_id", "==", current_user["user_id"]).stream()
    ]
    rows.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"data": rows}


@router.post("/savings-goals", status_code=status.HTTP_201_CREATED)
async def create_savings_goal(body: SavingsGoalCreate, current_user: dict = Depends(get_current_user)):
    payload = {
        "user_id": current_user["user_id"],
        "name": body.name.strip(),
        "target_amount": body.target_amount,
        "current_amount": body.current_amount,
        "deadline": body.deadline,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    ref = _db().collection("savings_goals").document()
    ref.set(payload)
    write_activity_log(user_id=current_user["user_id"], action="goal.create", entity_type="savings_goal", entity_id=ref.id)
    return {"data": {"id": ref.id, **payload}}


@router.patch("/savings-goals/{goal_id}")
async def update_savings_goal(goal_id: str, body: SavingsGoalUpdate, current_user: dict = Depends(get_current_user)):
    ref = _db().collection("savings_goals").document(goal_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Goal tidak ditemukan")
    data = doc.to_dict() or {}
    if data.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Tidak diizinkan")

    updates = body.model_dump(exclude_none=True)
    if "name" in updates:
        updates["name"] = updates["name"].strip()
    updates["updated_at"] = _now_iso()
    ref.update(updates)
    write_activity_log(user_id=current_user["user_id"], action="goal.update", entity_type="savings_goal", entity_id=goal_id)
    return {"data": _doc_with_id(ref.get())}


@router.delete("/savings-goals/{goal_id}")
async def delete_savings_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    ref = _db().collection("savings_goals").document(goal_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Goal tidak ditemukan")
    data = doc.to_dict() or {}
    if data.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Tidak diizinkan")
    ref.delete()
    write_activity_log(user_id=current_user["user_id"], action="goal.delete", entity_type="savings_goal", entity_id=goal_id)
    return {"message": "Goal dihapus"}


# ---------- Health score (v1) ----------
@router.get("/reports/health-score")
async def get_health_score(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    tx_docs = _db().collection("transactions").where("user_id", "==", user_id).stream()

    income = 0.0
    expense = 0.0
    for doc in tx_docs:
        tx = doc.to_dict() or {}
        amount = float(tx.get("amount", 0) or 0)
        tx_type = tx.get("type") or tx.get("transaction_type") or "expense"
        if tx_type == "income":
            income += amount
        else:
            expense += amount

    score = 50
    recommendations: list[str] = []

    if income <= 0 and expense > 0:
        score = 20
        recommendations.append("Tambahkan pencatatan pemasukan agar arus kas lebih akurat.")
    elif income > 0:
        ratio = expense / income if income else 1
        if ratio <= 0.7:
            score = 85
            recommendations.append("Kondisi bagus. Pertahankan rasio pengeluaran di bawah 70% pemasukan.")
        elif ratio <= 0.9:
            score = 70
            recommendations.append("Cukup sehat. Coba kurangi pengeluaran variabel 5–10%.")
        else:
            score = 45
            recommendations.append("Pengeluaran terlalu tinggi. Evaluasi 3 kategori terbesar bulan ini.")

    if not recommendations:
        recommendations.append("Lengkapi data transaksi minimal 1 bulan untuk insight yang lebih akurat.")

    return {
        "data": {
            "score": int(max(0, min(100, score))),
            "income_total": income,
            "expense_total": expense,
            "recommendations": recommendations[:3],
            "generated_at": _now_iso(),
        }
    }
