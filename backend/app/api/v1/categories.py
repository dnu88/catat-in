from typing import Optional, Any
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from app.core.firebase import get_firestore_client
from app.core.auth import get_current_user

router = APIRouter()

DEFAULT_CATEGORIES = [
    {"id": "default-food", "name": "food", "label": "Makan & Minum", "type": "expense", "icon": None, "is_default": True},
    {"id": "default-transport", "name": "transport", "label": "Transportasi", "type": "expense", "icon": None, "is_default": True},
    {"id": "default-shopping", "name": "shopping", "label": "Belanja", "type": "expense", "icon": None, "is_default": True},
    {"id": "default-health", "name": "health", "label": "Kesehatan", "type": "expense", "icon": None, "is_default": True},
    {"id": "default-entertainment", "name": "entertainment", "label": "Hiburan", "type": "expense", "icon": None, "is_default": True},
    {"id": "default-education", "name": "education", "label": "Pendidikan", "type": "expense", "icon": None, "is_default": True},
    {"id": "default-housing", "name": "housing", "label": "Rumah", "type": "expense", "icon": None, "is_default": True},
    {"id": "default-other", "name": "other", "label": "Lainnya", "type": "expense", "icon": None, "is_default": True},
    {"id": "default-salary", "name": "salary", "label": "Gaji", "type": "income", "icon": None, "is_default": True},
    {"id": "default-freelance", "name": "freelance", "label": "Freelance", "type": "income", "icon": None, "is_default": True},
    {"id": "default-investment", "name": "investment", "label": "Investasi", "type": "income", "icon": None, "is_default": True},
]


def _db():
    return get_firestore_client()


def _categories_col(uid: str):
    return _db().collection("users").document(uid).collection("categories")


def _normalize_category(doc_id: str, data: dict) -> dict:
    return {
        "id": doc_id,
        "name": data["name"],
        "label": data.get("label") or data["name"],
        "type": data["type"],
        "icon": data.get("icon"),
        "is_default": data.get("is_default", False),
    }


def _default_categories(category_type: Optional[str]) -> list[dict]:
    if category_type:
        return [item for item in DEFAULT_CATEGORIES if item["type"] == category_type]
    return list(DEFAULT_CATEGORIES)


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    type: str = Field(..., pattern="^(income|expense)$")
    icon: Optional[str] = Field(None, max_length=10)


@router.get("/")
async def list_categories(
    type: Optional[str] = Query(None, pattern="^(income|expense)$"),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    items = _default_categories(type)

    # Get custom categories from Firestore
    query = _categories_col(uid)
    if type:
        query = query.where("type", "==", type)
    
    custom_docs = query.stream()
    for doc in custom_docs:
        items.append(_normalize_category(doc.id, doc.to_dict()))

    return {"data": items}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    normalized_name = body.name.strip()
    
    if not normalized_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Nama kategori tidak boleh kosong.")

    # Check defaults
    if any(
        item["name"].lower() == normalized_name.lower() and item["type"] == body.type
        for item in DEFAULT_CATEGORIES
    ):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Kategori bawaan itu sudah tersedia.")

    # Check existing custom
    existing = _categories_col(uid).where("name", "==", normalized_name).where("type", "==", body.type).limit(1).get()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Kategori dengan nama itu sudah ada.")

    cat_id = str(uuid.uuid4())
    cat_data = {
        "name": normalized_name,
        "label": normalized_name,
        "type": body.type,
        "icon": body.icon,
        "is_default": False,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    _categories_col(uid).document(cat_id).set(cat_data)
    return {"data": _normalize_category(cat_id, cat_data)}


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    current_user: dict = Depends(get_current_user),
):
    if category_id.startswith("default-"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kategori bawaan tidak bisa dihapus.")

    uid = current_user["user_id"]
    ref = _categories_col(uid).document(category_id)
    doc = ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kategori tidak ditemukan.")

    ref.delete()

