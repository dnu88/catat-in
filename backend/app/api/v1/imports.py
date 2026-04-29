"""
Catat.in - Import Router (Firebase)
Endpoint untuk import mutasi bank via CSV/Excel.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.firebase import get_firestore_client
from app.services.import_service import generate_tx_hash, parse_bank_csv

router = APIRouter()

ALLOWED_BANKS = ["bca", "mandiri", "bni", "bri", "gopay", "ovo"]
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_ROWS = 10_000


class ImportPreviewResponse(BaseModel):
    transactions: list[dict]
    duplicates: list[dict]
    errors: list[dict]
    total_rows: int
    imported: int
    skipped_months: int
    bank_name: str


class ConfirmImportRequest(BaseModel):
    transactions: list[dict]
    wallet_id: str
    skip_duplicates: bool = True


def _get_plan_type(user_id: str) -> str:
    db = get_firestore_client()
    profile = db.collection("users").document(user_id).get()
    if not profile.exists:
        return "free"
    return (profile.to_dict() or {}).get("plan_type", "free")


def _load_existing_hashes(user_id: str) -> set[str]:
    db = get_firestore_client()
    docs = db.collection("users").document(user_id).collection("transactions").stream()
    hashes: set[str] = set()
    for doc in docs:
        data = doc.to_dict() or {}
        merchant = data.get("merchant") or data.get("note") or data.get("description") or ""
        amount = float(data.get("amount", 0))
        date = str(data.get("date", ""))
        if not date:
            continue
        hashes.add(generate_tx_hash(date, merchant, amount))
    return hashes


@router.post("/preview", response_model=ImportPreviewResponse)
async def preview_import(
    file: UploadFile = File(...),
    bank_name: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    if bank_name.lower() not in ALLOWED_BANKS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bank tidak didukung. Pilihan: {', '.join(ALLOWED_BANKS)}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File terlalu besar. Maksimal 5MB.",
        )

    plan_type = _get_plan_type(current_user["user_id"])
    max_months = settings.FREE_TIER_IMPORT_MONTHS if plan_type == "free" else None
    existing_hashes = _load_existing_hashes(current_user["user_id"])

    try:
        result = parse_bank_csv(
            file_bytes=file_bytes,
            bank_name=bank_name,
            existing_hashes=existing_hashes,
            max_months_back=max_months,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if result["total_rows"] > MAX_ROWS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File terlalu banyak baris (maks {MAX_ROWS:,}). Coba upload per periode lebih kecil.",
        )

    return ImportPreviewResponse(**result, bank_name=bank_name.upper())


@router.post("/confirm")
async def confirm_import(
    body: ConfirmImportRequest,
    current_user: dict = Depends(get_current_user),
):
    if not body.transactions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tidak ada transaksi untuk diimpor.",
        )

    db = get_firestore_client()
    user_id = current_user["user_id"]
    wallet_ref = db.collection("users").document(user_id).collection("wallets").document(body.wallet_id)
    wallet_doc = wallet_ref.get()
    if not wallet_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet tidak ditemukan")

    wallet_data = wallet_doc.to_dict() or {}
    if wallet_data.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Wallet tidak aktif")

    to_import = [
        tx for tx in body.transactions
        if not (body.skip_duplicates and tx.get("is_duplicate"))
    ]

    if not to_import:
        return {
            "success": True,
            "imported": 0,
            "skipped_duplicates": len(body.transactions),
            "message": "Semua transaksi sudah ada sebelumnya, tidak ada yang baru diimpor.",
        }

    now = datetime.utcnow().isoformat()
    tx_collection = db.collection("users").document(user_id).collection("transactions")
    balance_delta = 0.0

    # Firestore batch max 500 ops.
    batch = db.batch()
    op_count = 0

    for tx in to_import:
        tx_type = tx.get("type", "expense")
        amount = float(tx.get("amount", 0))
        description = (tx.get("description") or "").strip()

        record = {
            "wallet_id": body.wallet_id,
            "user_id": user_id,
            "type": tx_type,
            "amount": amount,
            "category": tx.get("category", "other"),
            "note": description or None,
            "merchant": description[:100] if description else None,
            "date": tx.get("date"),
            "is_shared": False,
            "visibility": "private",
            "created_by": user_id,
            "is_disputed": False,
            "created_at": now,
            "ai_extracted": False,
        }

        doc_ref = tx_collection.document()
        batch.set(doc_ref, {k: v for k, v in record.items() if v is not None})
        op_count += 1

        if op_count >= 450:
            batch.commit()
            batch = db.batch()
            op_count = 0

        balance_delta += amount if tx_type == "income" else -amount

    if op_count > 0:
        batch.commit()

    # Update wallet balance.
    current_balance = float(wallet_data.get("balance", 0))
    wallet_ref.update({"balance": current_balance + balance_delta})

    # Simple import log for audit.
    db.collection("users").document(user_id).collection("import_logs").document().set({
        "created_at": now,
        "total_rows": len(body.transactions),
        "imported_rows": len(to_import),
        "skipped_rows": len(body.transactions) - len(to_import),
        "duplicate_rows": len(body.transactions) - len(to_import),
        "status": "completed",
        "wallet_id": body.wallet_id,
    })

    return {
        "success": True,
        "imported": len(to_import),
        "skipped_duplicates": len(body.transactions) - len(to_import),
        "message": f"Berhasil mengimpor {len(to_import)} transaksi.",
    }
