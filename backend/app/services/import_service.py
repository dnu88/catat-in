"""
Catat.in — CSV Import Service
Parser mutasi bank dari berbagai format e-banking Indonesia:
BCA, Mandiri, BNI, BRI, GoPay, OVO
"""

import io
import hashlib
from datetime import datetime
from typing import Optional
import chardet
import pandas as pd

from app.core.config import settings


# ── KONFIGURASI PARSER PER BANK ──────────────────────────────

BANK_PARSERS = {
    "bca": {
        "encoding": "latin-1",     # BCA sering pakai latin-1
        "skip_rows": 10,           # BCA punya header panjang
        "date_col": "Tanggal",
        "desc_col": "Keterangan",
        "debit_col": "Mutasi Debet",
        "credit_col": "Mutasi Kredit",
        "date_format": "%d/%m/%Y",
        "decimal_sep": ",",
        "thousands_sep": ".",
    },
    "mandiri": {
        "encoding": "utf-8",
        "skip_rows": 5,
        "date_col": "Tanggal Transaksi",
        "desc_col": "Deskripsi",
        "debit_col": "Nominal Debet",
        "credit_col": "Nominal Kredit",
        "date_format": "%d/%m/%Y",
        "decimal_sep": ",",
        "thousands_sep": ".",
    },
    "bni": {
        "encoding": "utf-8",
        "skip_rows": 6,
        "date_col": "TGL",
        "desc_col": "KETERANGAN",
        "debit_col": "DEBET",
        "credit_col": "KREDIT",
        "date_format": "%d-%m-%Y",
        "decimal_sep": ",",
        "thousands_sep": ".",
    },
    "bri": {
        "encoding": "utf-8",
        "skip_rows": 4,
        "date_col": "TANGGAL",
        "desc_col": "KETERANGAN",
        "debit_col": "DEBET",
        "credit_col": "KREDIT",
        "date_format": "%d/%m/%Y",
        "decimal_sep": ",",
        "thousands_sep": ".",
    },
    "gopay": {
        "encoding": "utf-8",
        "skip_rows": 1,
        "date_col": "Date",
        "desc_col": "Description",
        "debit_col": "Debit",
        "credit_col": "Credit",
        "date_format": "%Y-%m-%d",
        "decimal_sep": ".",
        "thousands_sep": ",",
    },
    "ovo": {
        "encoding": "utf-8",
        "skip_rows": 1,
        "date_col": "Tanggal",
        "desc_col": "Keterangan",
        "debit_col": "Debit",
        "credit_col": "Kredit",
        "date_format": "%d %B %Y",
        "decimal_sep": ",",
        "thousands_sep": ".",
    },
}


# ── HELPER FUNCTIONS ─────────────────────────────────────────

def detect_encoding(raw_bytes: bytes) -> str:
    """Auto-detect encoding file CSV."""
    result = chardet.detect(raw_bytes)
    return result.get("encoding", "utf-8") or "utf-8"


def clean_amount(value: str, decimal_sep: str = ",", thousands_sep: str = ".") -> float:
    """Bersihkan string nominal jadi float."""
    if pd.isna(value) or str(value).strip() == "":
        return 0.0
    cleaned = (
        str(value)
        .replace(thousands_sep, "")
        .replace(decimal_sep, ".")
        .replace("Rp", "")
        .replace("IDR", "")
        .strip()
    )
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def generate_tx_hash(date: str, description: str, amount: float) -> str:
    """
    Generate hash unik per transaksi untuk deteksi duplikat.
    Kombinasi tanggal + deskripsi + amount.
    """
    raw = f"{date}|{description.lower().strip()}|{amount:.2f}"
    return hashlib.md5(raw.encode()).hexdigest()


# ── MAIN PARSER ──────────────────────────────────────────────

def parse_bank_csv(
    file_bytes: bytes,
    bank_name: str,
    existing_hashes: set[str] = None,
    max_months_back: int = None,
) -> dict:
    """
    Parse file CSV/Excel mutasi bank.

    Args:
        file_bytes: Raw bytes dari file yang diupload
        bank_name: Nama bank (bca, mandiri, bni, bri, gopay, ovo)
        existing_hashes: Set hash transaksi yang sudah ada (untuk deteksi duplikat)
        max_months_back: Batasi import N bulan terakhir (untuk free tier)

    Returns:
        {
            "transactions": [...],   # list transaksi yang valid
            "duplicates": [...],     # list yang terdeteksi duplikat
            "errors": [...],         # baris yang gagal di-parse
            "total_rows": int,
            "imported": int,
            "skipped_months": int,
        }
    """
    if existing_hashes is None:
        existing_hashes = set()

    config = BANK_PARSERS.get(bank_name.lower())
    if not config:
        raise ValueError(
            f"Bank '{bank_name}' tidak didukung. "
            f"Bank yang tersedia: {', '.join(BANK_PARSERS.keys())}"
        )

    # Auto-detect encoding jika berbeda dari config
    detected_enc = detect_encoding(file_bytes)
    encoding = config["encoding"] if detected_enc in (config["encoding"], None) else detected_enc

    # Baca file
    try:
        if file_bytes[:4] in (b'PK\x03\x04', b'PK\x05\x06'):
            # File Excel (.xlsx)
            df = pd.read_excel(
                io.BytesIO(file_bytes),
                skiprows=config["skip_rows"],
                dtype=str,
            )
        else:
            # File CSV
            df = pd.read_csv(
                io.BytesIO(file_bytes),
                encoding=encoding,
                skiprows=config["skip_rows"],
                dtype=str,
                on_bad_lines="skip",
            )
    except Exception as e:
        raise ValueError(f"Gagal membaca file: {str(e)}")

    # Bersihkan nama kolom
    df.columns = df.columns.str.strip()

    # Validasi kolom wajib ada
    required_cols = [config["date_col"], config["desc_col"]]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(
            f"Format file tidak sesuai untuk bank {bank_name.upper()}. "
            f"Kolom yang tidak ditemukan: {', '.join(missing)}"
        )

    # Cutoff date untuk free tier
    cutoff_date = None
    if max_months_back:
        from dateutil.relativedelta import relativedelta
        cutoff_date = datetime.now() - relativedelta(months=max_months_back)

    transactions = []
    duplicates = []
    errors = []
    skipped_months = 0

    for idx, row in df.iterrows():
        try:
            # Parse tanggal
            date_str = str(row[config["date_col"]]).strip()
            if not date_str or date_str == "nan":
                continue

            try:
                tx_date = datetime.strptime(date_str, config["date_format"])
            except ValueError:
                errors.append({"row": idx + 1, "reason": f"Format tanggal tidak valid: {date_str}"})
                continue

            # Filter berdasarkan cutoff (free tier)
            if cutoff_date and tx_date < cutoff_date:
                skipped_months += 1
                continue

            # Parse nominal
            debit = clean_amount(
                row.get(config["debit_col"], ""),
                config["decimal_sep"],
                config["thousands_sep"]
            )
            credit = clean_amount(
                row.get(config["credit_col"], ""),
                config["decimal_sep"],
                config["thousands_sep"]
            )

            # Skip baris kosong
            if debit == 0 and credit == 0:
                continue

            description = str(row[config["desc_col"]]).strip()
            tx_type = "income" if credit > 0 else "expense"
            amount = credit if credit > 0 else debit

            # Deteksi duplikat
            tx_hash = generate_tx_hash(tx_date.strftime("%Y-%m-%d"), description, amount)
            is_duplicate = tx_hash in existing_hashes

            tx_data = {
                "date": tx_date.strftime("%Y-%m-%d"),
                "description": description,
                "type": tx_type,
                "amount": amount,
                "category": "other",   # AI akan kategorisasi nanti
                "hash": tx_hash,
                "is_duplicate": is_duplicate,
                "row_number": idx + 1,
            }

            if is_duplicate:
                duplicates.append(tx_data)
            else:
                transactions.append(tx_data)
                existing_hashes.add(tx_hash)

        except Exception as e:
            errors.append({"row": idx + 1, "reason": str(e)})

    return {
        "transactions": transactions,
        "duplicates": duplicates,
        "errors": errors,
        "total_rows": len(df),
        "imported": len(transactions),
        "skipped_months": skipped_months,
    }
