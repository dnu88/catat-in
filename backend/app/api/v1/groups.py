"""
Catat.in — Groups Router
Manajemen grup keuangan bersama: buat, gabung, lihat anggota, keluar.
"""

import random
import string
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from supabase import create_client

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.schema_compat import require_tables

router = APIRouter()


def _client():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _generate_invite_code(length: int = 8) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


# ── SCHEMAS ──────────────────────────────────────────────────

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    description: Optional[str] = None


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=60)
    description: Optional[str] = None


class JoinGroupRequest(BaseModel):
    invite_code: str


class UpdateMemberRequest(BaseModel):
    role: str = Field(..., pattern="^(admin|editor|viewer)$")


# ── ENDPOINTS ────────────────────────────────────────────────

@router.get("/")
async def list_my_groups(current_user: dict = Depends(get_current_user)):
    """Daftar semua grup yang diikuti user."""
    require_tables("groups", "group_members")
    result = (
        _client()
        .table("group_members")
        .select("role, status, joined_at, groups(*)")
        .eq("user_id", current_user["user_id"])
        .eq("status", "active")
        .execute()
    )
    return {"data": result.data}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_group(
    body: GroupCreate,
    current_user: dict = Depends(get_current_user),
):
    """Buat grup baru. Pembuat otomatis jadi admin."""
    require_tables("groups", "group_members")
    invite_code = _generate_invite_code()
    invite_link = f"https://catat.in/join/{invite_code}"

    group_result = (
        _client()
        .table("groups")
        .insert({
            "name": body.name,
            "description": body.description,
            "owner_id": current_user["user_id"],
            "invite_code": invite_code,
            "invite_link": invite_link,
            "max_members": settings.GROUP_MAX_MEMBERS,
        })
        .execute()
    )
    group = group_result.data[0]

    # Tambah creator sebagai admin
    _client().table("group_members").insert({
        "group_id": group["id"],
        "user_id": current_user["user_id"],
        "role": "admin",
        "status": "active",
        "joined_at": datetime.utcnow().isoformat(),
        "invited_by": current_user["user_id"],
    }).execute()

    return {"data": group}


@router.get("/{group_id}")
async def get_group(
    group_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Detail grup beserta daftar anggota aktif."""
    require_tables("groups", "group_members")
    # Verifikasi membership
    member = (
        _client()
        .table("group_members")
        .select("role")
        .eq("group_id", group_id)
        .eq("user_id", current_user["user_id"])
        .eq("status", "active")
        .execute()
    )
    if not member.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Kamu bukan anggota grup ini")

    group = _client().table("groups").select("*").eq("id", group_id).single().execute()
    if not group.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grup tidak ditemukan")

    members = (
        _client()
        .table("group_members")
        .select("*, profiles:profiles!group_members_user_id_fkey(id, full_name, avatar_url, email)")
        .eq("group_id", group_id)
        .eq("status", "active")
        .execute()
    )

    return {"data": {**group.data, "members": members.data, "my_role": member.data[0]["role"]}}


@router.patch("/{group_id}")
async def update_group(
    group_id: str,
    body: GroupUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update nama/deskripsi grup. Hanya admin."""
    require_tables("groups", "group_members")
    member = (
        _client()
        .table("group_members")
        .select("role")
        .eq("group_id", group_id)
        .eq("user_id", current_user["user_id"])
        .eq("status", "active")
        .execute()
    )
    if not member.data or member.data[0]["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya admin yang bisa mengubah grup")

    updates = body.model_dump(exclude_none=True)
    result = _client().table("groups").update(updates).eq("id", group_id).execute()
    return {"data": result.data[0]}


@router.post("/join")
async def join_group(
    body: JoinGroupRequest,
    current_user: dict = Depends(get_current_user),
):
    """Gabung grup menggunakan kode undangan."""
    require_tables("groups", "group_members")
    group = (
        _client()
        .table("groups")
        .select("*")
        .eq("invite_code", body.invite_code.upper())
        .single()
        .execute()
    )
    if not group.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kode undangan tidak valid atau sudah kadaluarsa")

    group_data = group.data

    # Cek sudah jadi anggota
    existing = (
        _client()
        .table("group_members")
        .select("id, status")
        .eq("group_id", group_data["id"])
        .eq("user_id", current_user["user_id"])
        .execute()
    )
    if existing.data and existing.data[0]["status"] == "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kamu sudah menjadi anggota grup ini")

    # Cek kapasitas
    count = (
        _client()
        .table("group_members")
        .select("id", count="exact")
        .eq("group_id", group_data["id"])
        .eq("status", "active")
        .execute()
    )
    if (count.count or 0) >= group_data["max_members"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Grup sudah penuh")

    now = datetime.utcnow().isoformat()
    if existing.data:
        result = (
            _client()
            .table("group_members")
            .update({"status": "active", "joined_at": now})
            .eq("id", existing.data[0]["id"])
            .execute()
        )
    else:
        result = (
            _client()
            .table("group_members")
            .insert({
                "group_id": group_data["id"],
                "user_id": current_user["user_id"],
                "role": "viewer",
                "status": "active",
                "joined_at": now,
                "invited_by": current_user["user_id"],
            })
            .execute()
        )

    return {"data": result.data[0], "group": group_data, "message": f"Berhasil bergabung ke grup '{group_data['name']}'"}


@router.delete("/{group_id}/leave", status_code=status.HTTP_200_OK)
async def leave_group(
    group_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Keluar dari grup. Admin tidak bisa keluar langsung."""
    require_tables("groups", "group_members")
    member = (
        _client()
        .table("group_members")
        .select("id, role")
        .eq("group_id", group_id)
        .eq("user_id", current_user["user_id"])
        .eq("status", "active")
        .execute()
    )
    if not member.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kamu bukan anggota grup ini")

    if member.data[0]["role"] == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin tidak bisa langsung keluar. Transfer peran admin ke anggota lain terlebih dahulu.",
        )

    _client().table("group_members").update({"status": "left"}).eq("id", member.data[0]["id"]).execute()
    return {"message": "Berhasil keluar dari grup"}


@router.patch("/{group_id}/members/{member_user_id}")
async def update_member_role(
    group_id: str,
    member_user_id: str,
    body: UpdateMemberRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update peran anggota. Hanya admin."""
    require_tables("groups", "group_members")
    requester = (
        _client()
        .table("group_members")
        .select("role")
        .eq("group_id", group_id)
        .eq("user_id", current_user["user_id"])
        .eq("status", "active")
        .execute()
    )
    if not requester.data or requester.data[0]["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya admin yang bisa mengubah peran anggota")

    target = (
        _client()
        .table("group_members")
        .select("id")
        .eq("group_id", group_id)
        .eq("user_id", member_user_id)
        .eq("status", "active")
        .execute()
    )
    if not target.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anggota tidak ditemukan")

    result = _client().table("group_members").update({"role": body.role}).eq("id", target.data[0]["id"]).execute()
    return {"data": result.data[0]}


@router.delete("/{group_id}/members/{member_user_id}", status_code=status.HTTP_200_OK)
async def remove_member(
    group_id: str,
    member_user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Keluarkan anggota dari grup. Hanya admin."""
    require_tables("groups", "group_members")
    requester = (
        _client()
        .table("group_members")
        .select("role")
        .eq("group_id", group_id)
        .eq("user_id", current_user["user_id"])
        .eq("status", "active")
        .execute()
    )
    if not requester.data or requester.data[0]["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya admin yang bisa mengeluarkan anggota")

    if member_user_id == current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak bisa mengeluarkan diri sendiri")

    target = (
        _client()
        .table("group_members")
        .select("id")
        .eq("group_id", group_id)
        .eq("user_id", member_user_id)
        .eq("status", "active")
        .execute()
    )
    if not target.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anggota tidak ditemukan")

    _client().table("group_members").update({"status": "removed"}).eq("id", target.data[0]["id"]).execute()
    return {"message": "Anggota berhasil dikeluarkan"}
