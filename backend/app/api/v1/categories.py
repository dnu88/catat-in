from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from app.core.database import get_supabase
from app.core.auth import get_current_user
from app.core.config import settings
from app.core.schema_compat import has_columns, table_exists

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


def _client():
    return get_supabase()


def _normalize_category(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "label": row.get("label") or row["name"],
        "type": row["type"],
        "icon": row.get("icon"),
        "is_default": row.get("is_default", False),
    }


def _category_supports(column: str) -> bool:
    return has_columns("categories", column)


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
    items = _default_categories(type)

    if not table_exists("categories"):
        return {"data": items}

    select_fields = ["id", "name", "type"]
    if _category_supports("icon"):
        select_fields.append("icon")
    if _category_supports("is_default"):
        select_fields.append("is_default")

    query = (
        _client()
        .table("categories")
        .select(",".join(select_fields))
        .eq("user_id", current_user["user_id"])
        .order("name")
    )
    if type:
        query = query.eq("type", type)

    result = query.execute()
    items.extend(_normalize_category(row) for row in (result.data or []))
    return {"data": items}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    current_user: dict = Depends(get_current_user),
):
    if not table_exists("categories"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Kategori kustom belum aktif karena schema database belum lengkap. "
                "Jalankan migration `backend/supabase/migrations/006_prd_phase1_alignment.sql` lalu coba lagi."
            ),
        )

    normalized_name = body.name.strip()
    if not normalized_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Nama kategori tidak boleh kosong.")

    if any(
        item["name"].lower() == normalized_name.lower() and item["type"] == body.type
        for item in DEFAULT_CATEGORIES
    ):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Kategori bawaan itu sudah tersedia.")

    existing = (
        _client()
        .table("categories")
        .select("id,name")
        .eq("user_id", current_user["user_id"])
        .eq("type", body.type)
        .execute()
    )
    if any(row["name"].lower() == normalized_name.lower() for row in (existing.data or [])):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Kategori dengan nama itu sudah ada.")

    result = (
        _client()
        .table("categories")
        .insert(
            {
                "user_id": current_user["user_id"],
                "name": normalized_name,
                "type": body.type,
                **({"icon": body.icon} if _category_supports("icon") else {}),
                **({"is_default": False} if _category_supports("is_default") else {}),
            }
        )
        .execute()
    )
    return {"data": _normalize_category(result.data[0])}


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    current_user: dict = Depends(get_current_user),
):
    if category_id.startswith("default-"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kategori bawaan tidak bisa dihapus.")

    if not table_exists("categories"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Kategori kustom belum aktif karena schema database belum lengkap. "
                "Jalankan migration `backend/supabase/migrations/006_prd_phase1_alignment.sql` lalu coba lagi."
            ),
        )

    existing = (
        _client()
        .table("categories")
        .select("id")
        .eq("id", category_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kategori tidak ditemukan.")

    _client().table("categories").delete().eq("id", category_id).execute()
