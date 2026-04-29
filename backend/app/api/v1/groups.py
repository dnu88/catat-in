"""
Catat.in - Groups Router (Firebase)
Manajemen grup keuangan bersama: buat, gabung, lihat anggota, keluar.
"""

from __future__ import annotations

import random
import string
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.firebase import get_firestore_client

router = APIRouter()


def _db():
    return get_firestore_client()


def _groups_col():
    return _db().collection("groups")


def _group_members_col():
    return _db().collection("group_members")


def _generate_invite_code(length: int = 8) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def _member_doc_id(group_id: str, user_id: str) -> str:
    return f"{group_id}_{user_id}"


def _group_dict(doc) -> dict:
    data = doc.to_dict() or {}
    return {"id": doc.id, **data}


def _member_dict(doc) -> dict:
    data = doc.to_dict() or {}
    return {"id": doc.id, **data}


def _get_user_profile(user_id: str) -> dict:
    user_doc = _db().collection("users").document(user_id).get()
    data = user_doc.to_dict() if user_doc.exists else {}
    return {
        "id": user_id,
        "full_name": data.get("full_name") or data.get("email") or "Pengguna",
        "avatar_url": data.get("avatar_url"),
        "email": data.get("email", ""),
    }


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


@router.get("/")
async def list_my_groups(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    member_docs = _group_members_col().where("user_id", "==", user_id).stream()

    rows = []
    for doc in member_docs:
        member = _member_dict(doc)
        if member.get("status") != "active":
            continue
        group_doc = _groups_col().document(member["group_id"]).get()
        if not group_doc.exists:
            continue
        rows.append({
            "role": member.get("role", "viewer"),
            "status": member.get("status", "active"),
            "joined_at": member.get("joined_at"),
            "groups": _group_dict(group_doc),
        })

    rows.sort(key=lambda item: item["groups"].get("created_at", ""), reverse=True)
    return {"data": rows}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_group(
    body: GroupCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    invite_code = _generate_invite_code()
    invite_link = f"https://catat.in/join/{invite_code}"
    now = datetime.utcnow().isoformat()

    group_ref = _groups_col().document()
    group_data = {
        "name": body.name.strip(),
        "description": (body.description or "").strip() or None,
        "owner_id": user_id,
        "invite_code": invite_code,
        "invite_link": invite_link,
        "max_members": settings.GROUP_MAX_MEMBERS,
        "created_at": now,
    }
    group_ref.set(group_data)

    member_ref = _group_members_col().document(_member_doc_id(group_ref.id, user_id))
    member_ref.set({
        "group_id": group_ref.id,
        "user_id": user_id,
        "role": "admin",
        "status": "active",
        "joined_at": now,
        "invited_by": user_id,
    })

    return {"data": {"id": group_ref.id, **group_data}}


@router.get("/{group_id}")
async def get_group(
    group_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    my_member_ref = _group_members_col().document(_member_doc_id(group_id, user_id))
    my_member_doc = my_member_ref.get()
    if not my_member_doc.exists:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Kamu bukan anggota grup ini")
    my_member = _member_dict(my_member_doc)
    if my_member.get("status") != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Kamu bukan anggota aktif grup ini")

    group_doc = _groups_col().document(group_id).get()
    if not group_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grup tidak ditemukan")
    group_data = _group_dict(group_doc)

    member_docs = _group_members_col().where("group_id", "==", group_id).stream()
    members = []
    for doc in member_docs:
        member = _member_dict(doc)
        if member.get("status") != "active":
            continue
        members.append({
            **member,
            "profiles": _get_user_profile(member["user_id"]),
        })

    return {"data": {**group_data, "members": members, "my_role": my_member.get("role", "viewer")}}


@router.patch("/{group_id}")
async def update_group(
    group_id: str,
    body: GroupUpdate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    my_member_doc = _group_members_col().document(_member_doc_id(group_id, user_id)).get()
    if not my_member_doc.exists or (_member_dict(my_member_doc).get("role") != "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya admin yang bisa mengubah grup")

    updates = body.model_dump(exclude_none=True)
    if "name" in updates:
        updates["name"] = updates["name"].strip()
    if "description" in updates:
        updates["description"] = updates["description"].strip() or None

    if updates:
        _groups_col().document(group_id).update(updates)

    group_doc = _groups_col().document(group_id).get()
    if not group_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grup tidak ditemukan")
    return {"data": _group_dict(group_doc)}


@router.post("/join")
async def join_group(
    body: JoinGroupRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    invite_code = body.invite_code.strip().upper()

    candidates = list(_groups_col().where("invite_code", "==", invite_code).limit(1).stream())
    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kode undangan tidak valid atau sudah kadaluarsa",
        )

    group_doc = candidates[0]
    group = _group_dict(group_doc)

    member_ref = _group_members_col().document(_member_doc_id(group["id"], user_id))
    existing_doc = member_ref.get()
    if existing_doc.exists and (_member_dict(existing_doc).get("status") == "active"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kamu sudah menjadi anggota grup ini")

    active_members = [
        _member_dict(doc)
        for doc in _group_members_col().where("group_id", "==", group["id"]).stream()
        if (_member_dict(doc).get("status") == "active")
    ]
    if len(active_members) >= int(group.get("max_members", settings.GROUP_MAX_MEMBERS)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Grup sudah penuh")

    now = datetime.utcnow().isoformat()
    member_data = {
        "group_id": group["id"],
        "user_id": user_id,
        "role": "viewer",
        "status": "active",
        "joined_at": now,
        "invited_by": user_id,
    }

    if existing_doc.exists:
        member_ref.update({
            "status": "active",
            "joined_at": now,
            "role": "viewer",
        })
        merged_doc = member_ref.get()
        data = _member_dict(merged_doc)
    else:
        member_ref.set(member_data)
        data = {"id": member_ref.id, **member_data}

    return {"data": data, "group": group, "message": f"Berhasil bergabung ke grup '{group['name']}'"}


@router.delete("/{group_id}/leave", status_code=status.HTTP_200_OK)
async def leave_group(
    group_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    member_ref = _group_members_col().document(_member_doc_id(group_id, user_id))
    member_doc = member_ref.get()
    if not member_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kamu bukan anggota grup ini")

    member = _member_dict(member_doc)
    if member.get("status") != "active":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kamu bukan anggota aktif grup ini")

    if member.get("role") == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin tidak bisa langsung keluar. Transfer peran admin ke anggota lain terlebih dahulu.",
        )

    member_ref.update({"status": "left"})
    return {"message": "Berhasil keluar dari grup"}


@router.patch("/{group_id}/members/{member_user_id}")
async def update_member_role(
    group_id: str,
    member_user_id: str,
    body: UpdateMemberRequest,
    current_user: dict = Depends(get_current_user),
):
    requester_ref = _group_members_col().document(_member_doc_id(group_id, current_user["user_id"]))
    requester_doc = requester_ref.get()
    if not requester_doc.exists or (_member_dict(requester_doc).get("role") != "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya admin yang bisa mengubah peran anggota")

    target_ref = _group_members_col().document(_member_doc_id(group_id, member_user_id))
    target_doc = target_ref.get()
    if not target_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anggota tidak ditemukan")

    target = _member_dict(target_doc)
    if target.get("status") != "active":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anggota tidak aktif")

    target_ref.update({"role": body.role})
    updated = _member_dict(target_ref.get())
    return {"data": updated}


@router.delete("/{group_id}/members/{member_user_id}", status_code=status.HTTP_200_OK)
async def remove_member(
    group_id: str,
    member_user_id: str,
    current_user: dict = Depends(get_current_user),
):
    requester_ref = _group_members_col().document(_member_doc_id(group_id, current_user["user_id"]))
    requester_doc = requester_ref.get()
    if not requester_doc.exists or (_member_dict(requester_doc).get("role") != "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya admin yang bisa mengeluarkan anggota")

    if member_user_id == current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak bisa mengeluarkan diri sendiri")

    target_ref = _group_members_col().document(_member_doc_id(group_id, member_user_id))
    target_doc = target_ref.get()
    if not target_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anggota tidak ditemukan")

    target_ref.update({"status": "removed"})
    return {"message": "Anggota berhasil dikeluarkan"}
