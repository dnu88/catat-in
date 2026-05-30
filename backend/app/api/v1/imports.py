"""
Catat.in - Import Router (Supabase)
Endpoint untuk import mutasi bank via CSV/Excel.
"""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field, conlist

from app.core.auth import get_current_user
from app.core.config import settings
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


class ImportTransactionIn(BaseModel):
    date: date
    description: str = Field(min_length=1, max_length=200)
    type: Literal["income", "expense"]
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    category: str = Field(default="other", min_length=1, max_length=50)
    hash: str | None = Field(default=None, pattern=r"^[a-f0-9]{32}$")
    is_duplicate: bool = False
    row_number: int | None = Field(default=None, ge=1, le=MAX_ROWS)


class ConfirmImportRequest(BaseModel):
    transactions: conlist(ImportTransactionIn, min_length=1, max_length=MAX_ROWS)
    wallet_id: UUID
    skip_duplicates: bool = True


def _get_supabase_client():
    try:
        from supabase import create_client
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    except Exception:
        return None


def _get_plan_type(user_id: str) -> str:
    client = _get_supabase_client()
    if not client:
        return "free"
    try:
        result = client.table("profiles").select("plan_type").eq("id", user_id).single().execute()
        return (result.data or {}).get("plan_type", "free")
    except Exception:
        return "free"


def _load_existing_hashes(user_id: str) -> set[str]:
    client = _get_supabase_client()
    if not client:
        return set()
    try:
        result = client.table("transactions").select("nominal,merchant,tanggal").eq("user_id", user_id).execute()
        hashes: set[str] = set()
        for row in result.data or []:
            merchant = row.get("merchant") or ""
            amount = float(row.get("nominal") or 0)
            date = str(row.get("tanggal") or "")
            if not date:
                continue
            hashes.add(generate_tx_hash(date, merchant, amount))
        return hashes
    except Exception:
        return set()


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
    to_import = [
        tx for tx in body.transactions
        if not (body.skip_duplicates and tx.is_duplicate)
    ]

    if not to_import:
        return {
            "success": True,
            "imported": 0,
            "skipped_duplicates": len(body.transactions),
            "message": "Semua transaksi sudah ada sebelumnya, tidak ada yang baru diimpor.",
        }

    client = _get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database tidak tersedia.",
        )

    user_id = current_user["user_id"]

    # Verify wallet exists and is active.
    wallet_id = str(body.wallet_id)
    wallet_result = client.table("wallets").select("id,is_active").eq("id", wallet_id).eq("user_id", user_id).single().execute()
    if not wallet_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet tidak ditemukan")
    if wallet_result.data.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Wallet tidak aktif")

    now = datetime.now(timezone.utc).isoformat()
    records = []
    for tx in to_import:
        amount = float(tx.amount)
        description = tx.description.strip()

        records.append({
            "wallet_id": wallet_id,
            "user_id": user_id,
            "type": tx.type,
            "nominal": amount,
            "kategori": tx.category,
            "catatan": description or None,
            "merchant": description[:100] if description else None,
            "tanggal": tx.date.isoformat(),
            "input_type": "import",
            "status": "done",
            "is_verified": True,
            "created_at": now,
        })

    # Bulk insert transactions. Wallet balance is maintained by database trigger/RPC,
    # not manually here, to avoid double-counting financial movements.
    insert_result = client.table("transactions").insert(records).execute()
    if getattr(insert_result, "error", None):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gagal mengimpor transaksi.",
        )

    return {
        "success": True,
        "imported": len(to_import),
        "skipped_duplicates": len(body.transactions) - len(to_import),
        "message": f"Berhasil mengimpor {len(to_import)} transaksi.",
    }
