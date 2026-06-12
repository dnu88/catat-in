"""
Catat.in - Import Router (Supabase)
Endpoint untuk import mutasi bank via CSV/Excel.
"""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field, conlist, field_validator, model_validator

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.rate_limit import rate_limit_import
from app.services.import_service import escape_formula_text, generate_tx_hash, parse_bank_csv

router = APIRouter()

ALLOWED_BANKS = ["bca", "mandiri", "bni", "bri", "gopay", "ovo"]
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_ROWS = 10_000
WRITER_HOUSEHOLD_ROLES = {"owner", "admin", "member"}


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ImportPreviewTransaction(StrictBaseModel):
    date: date
    description: str = Field(min_length=1, max_length=200)
    type: Literal["income", "expense"]
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    category: str = Field(default="other", min_length=1, max_length=50)
    hash: str = Field(pattern=r"^[a-f0-9]{32}$")
    is_duplicate: bool = False
    row_number: int = Field(ge=1, le=MAX_ROWS)


class ImportRowError(StrictBaseModel):
    row: int = Field(ge=1)
    reason: str = Field(min_length=1, max_length=300)


class ImportPreviewResponse(StrictBaseModel):
    transactions: list[ImportPreviewTransaction]
    duplicates: list[ImportPreviewTransaction]
    errors: list[ImportRowError]
    total_rows: int
    imported: int
    skipped_months: int
    bank_name: str


class ImportTransactionIn(StrictBaseModel):
    date: date
    description: str = Field(min_length=1, max_length=200)
    type: Literal["income", "expense"]
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    category: str = Field(default="other", min_length=1, max_length=50)
    hash: str | None = Field(default=None, pattern=r"^[a-f0-9]{32}$")
    is_duplicate: bool = False
    row_number: int | None = Field(default=None, ge=1, le=MAX_ROWS)

    @field_validator("description", "category")
    @classmethod
    def reject_blank_strings(cls, value: str):
        if not value or not value.strip():
            raise ValueError("must not be blank")
        return escape_formula_text(value)


class ConfirmImportRequest(StrictBaseModel):
    transactions: conlist(ImportTransactionIn, min_length=1, max_length=MAX_ROWS)
    wallet_id: UUID
    skip_duplicates: bool = True
    context_type: Literal["personal", "household"] = "personal"
    household_id: UUID | None = None

    @model_validator(mode="after")
    def validate_context(self):
        if self.context_type == "personal" and self.household_id is not None:
            raise ValueError("household_id must be empty for personal imports")
        if self.context_type == "household" and self.household_id is None:
            raise ValueError("household_id is required for household imports")
        return self


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


def _load_existing_hashes(user_id: str, wallet_id: str | None = None) -> set[str]:
    client = _get_supabase_client()
    if not client:
        return set()
    try:
        query = client.table("transactions").select("import_hash,nominal,merchant,catatan,tanggal").eq("user_id", user_id)
        if wallet_id:
            query = query.eq("wallet_id", wallet_id)
        result = query.execute()
        hashes: set[str] = set()
        for row in result.data or []:
            if row.get("import_hash"):
                hashes.add(str(row["import_hash"]))
                continue
            description = row.get("catatan") or row.get("merchant") or ""
            amount = float(row.get("nominal") or 0)
            tx_date = str(row.get("tanggal") or "")
            if not tx_date:
                continue
            hashes.add(generate_tx_hash(tx_date, description, amount))
        return hashes
    except Exception:
        return set()


async def _read_upload_with_limit(request: Request, file: UploadFile) -> bytes:
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File terlalu besar. Maksimal 5MB.",
        )

    file_bytes = await file.read(MAX_FILE_SIZE + 1)
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File terlalu besar. Maksimal 5MB.",
        )
    return file_bytes


def _require_active_wallet_for_context(client, wallet_id: str, user_id: str, body: ConfirmImportRequest) -> dict:
    wallet_result = (
        client.table("wallets")
        .select("id,user_id,household_id,is_active,created_by")
        .eq("id", wallet_id)
        .single()
        .execute()
    )
    wallet = wallet_result.data
    if not wallet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet tidak ditemukan")
    if wallet.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Wallet tidak aktif")

    wallet_household_id = wallet.get("household_id")
    if body.context_type == "personal":
        if wallet_household_id is not None or wallet.get("user_id") != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet tidak ditemukan")
        return wallet

    household_id = str(body.household_id)
    if str(wallet_household_id) != household_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet tidak ditemukan")

    membership_result = (
        client.table("household_members")
        .select("role,status")
        .eq("household_id", household_id)
        .eq("user_id", user_id)
        .eq("status", "active")
        .limit(1)
        .execute()
    )
    membership = membership_result.data[0] if isinstance(membership_result.data, list) and membership_result.data else None
    if not membership or membership.get("role") not in WRITER_HOUSEHOLD_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tidak punya akses impor ke household ini")

    return wallet


@router.post("/preview", response_model=ImportPreviewResponse, dependencies=[Depends(rate_limit_import)])
async def preview_import(
    request: Request,
    file: UploadFile = File(...),
    bank_name: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    if bank_name.lower() not in ALLOWED_BANKS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bank tidak didukung. Pilihan: {', '.join(ALLOWED_BANKS)}",
        )

    file_bytes = await _read_upload_with_limit(request, file)

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


@router.post("/confirm", dependencies=[Depends(rate_limit_import)])
async def confirm_import(
    body: ConfirmImportRequest,
    current_user: dict = Depends(get_current_user),
):
    client = _get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database tidak tersedia.",
        )

    user_id = current_user["user_id"]
    wallet_id = str(body.wallet_id)
    _require_active_wallet_for_context(client, wallet_id, user_id, body)

    existing_hashes = _load_existing_hashes(user_id, wallet_id)
    to_import: list[tuple[ImportTransactionIn, str]] = []
    skipped_duplicates = 0

    for tx in body.transactions:
        amount = float(tx.amount)
        description = tx.description.strip()
        import_hash = generate_tx_hash(tx.date.isoformat(), description, amount)
        if tx.hash and tx.hash != import_hash:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Hash transaksi import tidak sesuai dengan isi transaksi.",
            )
        if (body.skip_duplicates and tx.is_duplicate) or import_hash in existing_hashes:
            skipped_duplicates += 1
            continue
        existing_hashes.add(import_hash)
        to_import.append((tx, import_hash))

    if not to_import:
        return {
            "success": True,
            "imported": 0,
            "skipped_duplicates": skipped_duplicates,
            "message": "Semua transaksi sudah ada sebelumnya, tidak ada yang baru diimpor.",
        }

    now = datetime.now(timezone.utc).isoformat()
    household_id = str(body.household_id) if body.context_type == "household" else None
    records = []
    for tx, import_hash in to_import:
        amount = float(tx.amount)
        description = tx.description.strip()
        category = tx.category.strip()

        records.append({
            "wallet_id": wallet_id,
            "user_id": user_id,
            "household_id": household_id,
            "created_by": user_id,
            "updated_by": user_id,
            "type": tx.type,
            "nominal": amount,
            "kategori": category,
            "catatan": description,
            "merchant": description[:100],
            "tanggal": tx.date.isoformat(),
            "input_type": "import",
            "status": "done",
            "is_verified": True,
            "import_hash": import_hash,
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
        "skipped_duplicates": skipped_duplicates,
        "message": f"Berhasil mengimpor {len(to_import)} transaksi.",
    }
