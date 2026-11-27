"""PDF rekening koran import helpers.

PDF import is intentionally preview-only. The confirm endpoint keeps using the
same normalized transaction payload as CSV/XLSX imports.
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable

import pdfplumber
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.core.config import settings
from app.services.import_service import clean_amount, escape_formula_text, generate_tx_hash

PDF_SUPPORTED_BANKS = {"bca", "mandiri"}

PDF_BANK_CONFIGS = {
    "bca": {
        "date_col": "Tanggal",
        "desc_col": "Keterangan",
        "debit_col": "Mutasi Debet",
        "credit_col": "Mutasi Kredit",
        "date_formats": ("%d/%m/%Y", "%d-%m-%Y"),
        "decimal_sep": ",",
        "thousands_sep": ".",
    },
    "mandiri": {
        "date_col": "Tanggal Transaksi",
        "desc_col": "Deskripsi",
        "debit_col": "Nominal Debet",
        "credit_col": "Nominal Kredit",
        "date_formats": ("%d/%m/%Y", "%d-%m-%Y"),
        "decimal_sep": ",",
        "thousands_sep": ".",
    },
}

COLUMN_ALIASES = {
    "Tanggal": ("tanggal", "tgl"),
    "Tanggal Transaksi": ("tanggal transaksi", "tgl transaksi", "tanggal"),
    "Keterangan": ("keterangan", "uraian", "deskripsi", "description"),
    "Deskripsi": ("deskripsi", "keterangan", "uraian", "description"),
    "Mutasi Debet": ("mutasi debet", "debet", "debit", "nominal debet"),
    "Mutasi Kredit": ("mutasi kredit", "kredit", "credit", "nominal kredit"),
    "Nominal Debet": ("nominal debet", "debet", "debit", "mutasi debet"),
    "Nominal Kredit": ("nominal kredit", "kredit", "credit", "mutasi kredit"),
}


@dataclass(frozen=True)
class PdfExtractionResult:
    tables: list[list[list[str | None]]]
    text: str
    page_count: int


def parse_bank_pdf(
    file_bytes: bytes,
    bank_name: str,
    existing_hashes: set[str] | None = None,
    max_months_back: int | None = None,
    ocr_enabled: bool | None = None,
) -> dict:
    """Parse a bank/e-wallet statement PDF into the existing import preview shape."""
    normalized_bank = bank_name.lower().strip()
    if normalized_bank not in PDF_SUPPORTED_BANKS:
        raise ValueError(
            "PDF untuk bank ini belum didukung. Gunakan CSV/XLSX atau pilih BCA/Mandiri."
        )

    if existing_hashes is None:
        existing_hashes = set()
    if ocr_enabled is None:
        ocr_enabled = settings.IMPORT_PDF_OCR_ENABLED

    extracted = _extract_pdf_sources(file_bytes)
    if extracted.page_count > settings.IMPORT_PDF_MAX_PAGES:
        raise ValueError(
            f"PDF terlalu banyak halaman (maks {settings.IMPORT_PDF_MAX_PAGES} halaman)."
        )

    has_table_rows = any(len(table) > 1 for table in extracted.tables)
    has_enough_text = len(extracted.text.strip()) >= settings.IMPORT_PDF_TEXT_MIN_CHARS
    if not has_table_rows and not has_enough_text:
        if ocr_enabled:
            return _parse_pdf_with_ocr_fallback(
                file_bytes=file_bytes,
                bank_name=normalized_bank,
                existing_hashes=existing_hashes,
                max_months_back=max_months_back,
            )
        raise ValueError(
            "PDF ini terlihat seperti hasil scan/gambar atau teksnya kosong. OCR belum aktif untuk import PDF."
        )

    rows = _rows_from_tables(extracted.tables, normalized_bank)
    if not rows:
        rows = _rows_from_text(extracted.text, normalized_bank)

    if not rows:
        if ocr_enabled:
            return _parse_pdf_with_ocr_fallback(
                file_bytes=file_bytes,
                bank_name=normalized_bank,
                existing_hashes=existing_hashes,
                max_months_back=max_months_back,
            )
        raise ValueError(
            "Format PDF belum terbaca untuk bank ini. Coba PDF asli dari bank atau aktifkan OCR fallback."
        )

    return _normalize_pdf_rows(
        rows=rows,
        bank_name=normalized_bank,
        existing_hashes=existing_hashes,
        max_months_back=max_months_back,
    )


def _extract_pdf_sources(file_bytes: bytes) -> PdfExtractionResult:
    """Extract text and tables from a text-based PDF without persisting raw data."""
    buffer = io.BytesIO(file_bytes)
    try:
        reader = PdfReader(buffer)
        if reader.is_encrypted:
            raise ValueError("PDF terkunci/password-protected belum didukung.")
    except ValueError:
        raise
    except PdfReadError as exc:
        raise ValueError("File PDF tidak valid atau rusak.") from exc
    except Exception as exc:
        raise ValueError("File PDF tidak bisa dibaca.") from exc

    buffer.seek(0)
    tables: list[list[list[str | None]]] = []
    texts: list[str] = []
    try:
        with pdfplumber.open(buffer) as pdf:
            page_count = len(pdf.pages)
            if page_count > settings.IMPORT_PDF_MAX_PAGES:
                return PdfExtractionResult(tables=[], text="", page_count=page_count)
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                if page_text:
                    texts.append(page_text)
                for table in page.extract_tables() or []:
                    if table:
                        tables.append(table)
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("Gagal membaca isi PDF rekening koran.") from exc

    return PdfExtractionResult(tables=tables, text="\n".join(texts), page_count=page_count)


def _parse_pdf_with_ocr_fallback(
    file_bytes: bytes,
    bank_name: str,
    existing_hashes: set[str],
    max_months_back: int | None,
) -> dict:
    """OCR adapter placeholder.

    The gate is wired now, but provider integration should stay explicit and
    canary-only so scanned financial documents are not silently sent anywhere.
    """
    raise ValueError(
        "OCR provider belum dikonfigurasi. Gunakan PDF asli/text-based atau CSV/XLSX untuk saat ini."
    )


def _normalize_header(value: str | None) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _find_column_index(header: list[str | None], canonical: str) -> int | None:
    normalized_header = [_normalize_header(cell) for cell in header]
    aliases = COLUMN_ALIASES.get(canonical, (canonical.lower(),))
    for alias in aliases:
        normalized_alias = _normalize_header(alias)
        for index, value in enumerate(normalized_header):
            if value == normalized_alias or normalized_alias in value:
                return index
    return None


def _rows_from_tables(tables: Iterable[list[list[str | None]]], bank_name: str) -> list[dict[str, str]]:
    config = PDF_BANK_CONFIGS[bank_name]
    parsed_rows: list[dict[str, str]] = []

    for table in tables:
        if not table:
            continue
        header_index = None
        column_indexes: dict[str, int] = {}
        for index, candidate_header in enumerate(table[:5]):
            candidate_indexes = {
                key: _find_column_index(candidate_header, config[key])
                for key in ("date_col", "desc_col", "debit_col", "credit_col")
            }
            if all(value is not None for value in candidate_indexes.values()):
                header_index = index
                column_indexes = {key: int(value) for key, value in candidate_indexes.items() if value is not None}
                break
        if header_index is None:
            continue

        for raw_row in table[header_index + 1 :]:
            if not raw_row or all(not str(cell or "").strip() for cell in raw_row):
                continue
            parsed_rows.append(
                {
                    "date": _cell(raw_row, column_indexes["date_col"]),
                    "description": _cell(raw_row, column_indexes["desc_col"]),
                    "debit": _cell(raw_row, column_indexes["debit_col"]),
                    "credit": _cell(raw_row, column_indexes["credit_col"]),
                }
            )

    return parsed_rows


def _rows_from_text(text: str, bank_name: str) -> list[dict[str, str]]:
    """Conservative line fallback for text PDFs where table extraction fails."""
    rows: list[dict[str, str]] = []
    date_pattern = re.compile(r"^(?P<date>\d{2}[/-]\d{2}[/-]\d{4})\s+(?P<body>.+)$")
    amount_pattern = re.compile(r"(?P<amount>\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:,\d{2})?)")
    credit_words = ("cr", "kredit", "credit", "+")

    for line in text.splitlines():
        normalized = " ".join(line.split())
        match = date_pattern.match(normalized)
        if not match:
            continue
        amounts = list(amount_pattern.finditer(match.group("body")))
        if not amounts:
            continue
        amount_match = amounts[-1]
        description = match.group("body")[: amount_match.start()].strip(" -|")
        amount = amount_match.group("amount")
        trailing = match.group("body")[amount_match.end() :].strip().lower()
        is_credit = any(word in trailing for word in credit_words)
        rows.append(
            {
                "date": match.group("date"),
                "description": description,
                "debit": "" if is_credit else amount,
                "credit": amount if is_credit else "",
            }
        )
    return rows


def _cell(row: list[str | None], index: int) -> str:
    if index >= len(row):
        return ""
    return " ".join(str(row[index] or "").split())


def _parse_pdf_date(value: str, date_formats: Iterable[str]) -> datetime:
    raw = value.strip()
    for date_format in date_formats:
        try:
            return datetime.strptime(raw, date_format)
        except ValueError:
            continue
    raise ValueError(f"Format tanggal tidak valid: {raw}")


def _normalize_pdf_rows(
    rows: list[dict[str, str]],
    bank_name: str,
    existing_hashes: set[str],
    max_months_back: int | None,
) -> dict:
    config = PDF_BANK_CONFIGS[bank_name]
    cutoff_date = None
    if max_months_back:
        from dateutil.relativedelta import relativedelta

        cutoff_date = datetime.now() - relativedelta(months=max_months_back)

    transactions = []
    duplicates = []
    errors = []
    skipped_months = 0

    for index, row in enumerate(rows, start=1):
        try:
            date_str = str(row.get("date", "")).strip()
            if not date_str:
                continue
            tx_date = _parse_pdf_date(date_str, config["date_formats"])
            if cutoff_date and tx_date < cutoff_date:
                skipped_months += 1
                continue

            debit = clean_amount(row.get("debit", ""), config["decimal_sep"], config["thousands_sep"])
            credit = clean_amount(row.get("credit", ""), config["decimal_sep"], config["thousands_sep"])
            if debit == 0 and credit == 0:
                continue

            description = escape_formula_text(row.get("description", ""))
            if not description or description == "nan":
                errors.append({"row": index, "reason": "Keterangan transaksi kosong"})
                continue

            tx_type = "income" if credit > 0 else "expense"
            amount = credit if credit > 0 else debit
            formatted_date = tx_date.strftime("%Y-%m-%d")
            tx_hash = generate_tx_hash(formatted_date, description, amount)
            tx_data = {
                "date": formatted_date,
                "description": description,
                "type": tx_type,
                "amount": amount,
                "category": "other",
                "hash": tx_hash,
                "is_duplicate": tx_hash in existing_hashes,
                "row_number": index,
            }
            if tx_data["is_duplicate"]:
                duplicates.append(tx_data)
            else:
                transactions.append(tx_data)
                existing_hashes.add(tx_hash)
        except Exception as exc:
            errors.append({"row": index, "reason": str(exc)})

    return {
        "transactions": transactions,
        "duplicates": duplicates,
        "errors": errors,
        "total_rows": len(rows),
        "imported": len(transactions),
        "skipped_months": skipped_months,
    }
