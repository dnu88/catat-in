"""
Catat.in — Import Router
Endpoint untuk import mutasi bank via CSV/Excel
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from supabase import create_client

from app.core.config import settings
from app.core.auth import get_current_user
from app.core.schema_compat import has_columns, table_exists
from app.services.import_service import parse_bank_csv

router = APIRouter()

ALLOWED_BANKS = ["bca", "mandiri", "bni", "bri", "gopay", "ovo"]
MAX_FILE_SIZE = 5 * 1024 * 1024   # 5MB
MAX_ROWS = 10_000


def _client():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _wallet_supports(column: str) -> bool:
    return has_columns("wallets", column)


def _tx_supports(column: str) -> bool:
    return has_columns("transactions", column)


def _tx_type_column() -> str:
    return "type" if _tx_supports("type") else "transaction_type"


def _tx_note_column() -> str:
    return "note" if _tx_supports("note") else "description"


def _tx_wallet_column() -> str:
    return "wallet_id" if _tx_supports("wallet_id") else "payment_method"


def _db_amount(value: float) -> float | int:
    amount = float(value)
    if amount.is_integer():
        return int(amount)
    return amount


def _get_plan_type(user_id: str) -> str:
    result = _client().table("profiles").select("plan_type").eq("id", user_id).single().execute()
    return result.data.get("plan_type", "free") if result.data else "free"


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


@router.post("/preview", response_model=ImportPreviewResponse)
async def preview_import(
    file: UploadFile = File(...),
    bank_name: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload dan preview file mutasi bank sebelum konfirmasi import.
    Tidak menyimpan data ke database — hanya parsing dan preview.
    """
    if bank_name.lower() not in ALLOWED_BANKS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bank tidak didukung. Pilihan: {', '.join(ALLOWED_BANKS)}"
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File terlalu besar. Maksimal 5MB."
        )

    # Tentukan batas bulan berdasarkan plan
    plan_type = _get_plan_type(current_user["user_id"])
    max_months = settings.FREE_TIER_IMPORT_MONTHS if plan_type == "free" else None

    # Ambil hash transaksi yang sudah ada untuk deteksi duplikat
    existing_tx = (
        _client()
        .table("transactions")
        .select("*")
        .eq("user_id", current_user["user_id"])
        .execute()
    )
    existing_hashes: set[str] = set()
    from app.services.import_service import generate_tx_hash
    for tx in (existing_tx.data or []):
        merchant = tx.get("merchant") or tx.get("note") or tx.get("description", "")
        h = generate_tx_hash(tx["date"], merchant, float(tx["amount"]))
        existing_hashes.add(h)

    try:
        result = parse_bank_csv(
            file_bytes=file_bytes,
            bank_name=bank_name,
            existing_hashes=existing_hashes,
            max_months_back=max_months,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

    if result["total_rows"] > MAX_ROWS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File terlalu banyak baris (maks {MAX_ROWS:,}). Coba upload per periode lebih kecil."
        )

    return ImportPreviewResponse(**result, bank_name=bank_name.upper())


@router.post("/confirm")
async def confirm_import(
    body: ConfirmImportRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Konfirmasi dan simpan transaksi hasil import ke database.
    """
    if not body.transactions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tidak ada transaksi untuk diimpor."
        )

    # Verifikasi wallet milik user
    wallet = (
        _client()
        .table("wallets")
        .select("id, balance")
        .eq("id", body.wallet_id)
        .eq("user_id", current_user["user_id"])
    )
    if _wallet_supports("is_active"):
        wallet = wallet.eq("is_active", True)
    wallet = wallet.single().execute()
    if not wallet.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet tidak ditemukan")

    # Filter duplikat jika diminta
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

    # Siapkan data transaksi untuk insert
    now = datetime.utcnow().isoformat()
    records = []
    balance_delta = 0.0

    for tx in to_import:
        tx_type = tx.get("type", "expense")
        amount = float(tx.get("amount", 0))
        record = {
            "user_id": current_user["user_id"],
            "amount": _db_amount(amount),
            "category": tx.get("category", "other"),
            "date": tx.get("date"),
        }
        record[_tx_wallet_column()] = body.wallet_id
        record[_tx_type_column()] = tx_type
        if _tx_supports("payment_method"):
            record["payment_method"] = body.wallet_id
        if _tx_supports("transaction_type"):
            record["transaction_type"] = tx_type
        legacy_description = tx.get("description", "") or ""
        record[_tx_note_column()] = legacy_description
        if _tx_supports("description"):
            record["description"] = legacy_description
        if _tx_supports("created_by"):
            record["created_by"] = current_user["user_id"]
        if _tx_supports("merchant"):
            record["merchant"] = tx.get("description", "")[:100] if tx.get("description") else None
        if _tx_supports("is_shared"):
            record["is_shared"] = False
        if _tx_supports("visibility"):
            record["visibility"] = "private"
        if _tx_supports("is_disputed"):
            record["is_disputed"] = False
        if _tx_supports("ai_extracted"):
            record["ai_extracted"] = False

        records.append(record)
        balance_delta += amount if tx_type == "income" else -amount

    # Bulk insert
    _client().table("transactions").insert(records).execute()

    # Update saldo wallet
    new_balance = float(wallet.data["balance"]) + balance_delta
    _client().table("wallets").update({"balance": new_balance}).eq("id", body.wallet_id).execute()

    # Log import
    if table_exists("import_logs"):
        _client().table("import_logs").insert({
            "user_id": current_user["user_id"],
            "file_name": "imported",
            "total_rows": len(body.transactions),
            "imported_rows": len(to_import),
            "skipped_rows": len(body.transactions) - len(to_import),
            "duplicate_rows": len(body.transactions) - len(to_import),
            "status": "completed",
        }).execute()

    return {
        "success": True,
        "imported": len(to_import),
        "skipped_duplicates": len(body.transactions) - len(to_import),
        "message": f"Berhasil mengimpor {len(to_import)} transaksi.",
    }
