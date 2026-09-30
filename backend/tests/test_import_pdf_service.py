from unittest.mock import patch

import pytest
from main import app
from app.core.auth import get_current_user
from app.core.rate_limit import rate_limit_import

from app.services.import_service import generate_tx_hash
from app.services import import_pdf_service
from app.services.import_pdf_service import PdfExtractionResult, parse_bank_pdf


BCA_TABLE = [
    ["Tanggal", "Keterangan", "Mutasi Debet", "Mutasi Kredit", "Saldo"],
    ["01/07/2026", "Transfer Gaji", "", "5.000.000,00", "7.000.000,00"],
    ["02/07/2026", "=TOKO BERISIKO", "125.000,00", "", "6.875.000,00"],
]

MANDIRI_TABLE = [
    ["Tanggal Transaksi", "Deskripsi", "Nominal Debet", "Nominal Kredit", "Saldo"],
    ["03/07/2026", "Bayar Internet", "350.000,00", "", "2.000.000,00"],
    ["04/07/2026", "Refund Marketplace", "", "75.000,00", "2.075.000,00"],
]


def _mock_extraction(tables=None, text="Mutasi Rekening Bank 01/07/2026 Transfer Gaji 5.000.000,00"):
    return PdfExtractionResult(tables=tables or [], text=text, page_count=1)


def test_parse_bca_text_pdf_rows_from_local_table():
    with patch.object(import_pdf_service, "_extract_pdf_sources", return_value=_mock_extraction([BCA_TABLE])):
        result = parse_bank_pdf(b"%PDF fake", "bca")

    assert result["total_rows"] == 2
    assert result["imported"] == 2
    assert result["duplicates"] == []
    assert result["errors"] == []
    assert result["transactions"][0] == {
        "date": "2026-07-01",
        "description": "Transfer Gaji",
        "type": "income",
        "amount": 5_000_000.0,
        "category": "other",
        "hash": generate_tx_hash("2026-07-01", "Transfer Gaji", 5_000_000.0),
        "is_duplicate": False,
        "row_number": 1,
    }
    assert result["transactions"][1]["description"] == "'=TOKO BERISIKO"
    assert result["transactions"][1]["type"] == "expense"


def test_parse_mandiri_text_pdf_rows_from_local_table():
    with patch.object(import_pdf_service, "_extract_pdf_sources", return_value=_mock_extraction([MANDIRI_TABLE])):
        result = parse_bank_pdf(b"%PDF fake", "mandiri")

    assert result["total_rows"] == 2
    assert [tx["type"] for tx in result["transactions"]] == ["expense", "income"]
    assert result["transactions"][0]["description"] == "Bayar Internet"
    assert result["transactions"][1]["amount"] == 75_000.0


def test_parse_bank_pdf_classifies_duplicate_hashes():
    duplicate_hash = generate_tx_hash("2026-07-01", "Transfer Gaji", 5_000_000.0)
    with patch.object(import_pdf_service, "_extract_pdf_sources", return_value=_mock_extraction([BCA_TABLE])):
        result = parse_bank_pdf(b"%PDF fake", "bca", existing_hashes={duplicate_hash})

    assert result["imported"] == 1
    assert len(result["duplicates"]) == 1
    assert result["duplicates"][0]["description"] == "Transfer Gaji"
    assert result["transactions"][0]["description"] == "'=TOKO BERISIKO"


def test_parse_bank_pdf_rejects_unsupported_bank():
    with pytest.raises(ValueError, match="PDF untuk bank ini belum didukung"):
        parse_bank_pdf(b"%PDF fake", "gopay")


def test_parse_bank_pdf_empty_text_requires_ocr_when_disabled():
    with patch.object(import_pdf_service, "_extract_pdf_sources", return_value=_mock_extraction([], text="")):
        with pytest.raises(ValueError, match="OCR belum aktif"):
            parse_bank_pdf(b"%PDF fake", "bca", ocr_enabled=False)


def test_parse_bank_pdf_ocr_fallback_is_gated_and_explicit():
    with patch.object(import_pdf_service, "_extract_pdf_sources", return_value=_mock_extraction([], text="")):
        with patch.object(import_pdf_service, "_parse_pdf_with_ocr_fallback", side_effect=ValueError("OCR provider belum dikonfigurasi")) as ocr:
            with pytest.raises(ValueError, match="OCR provider belum dikonfigurasi"):
                parse_bank_pdf(b"%PDF fake", "bca", ocr_enabled=True)

    assert ocr.called


def test_parse_bank_pdf_rejects_too_many_pages():
    with patch.object(import_pdf_service, "_extract_pdf_sources", return_value=_mock_extraction([BCA_TABLE], text="Mutasi cukup panjang",)):
        with patch.object(import_pdf_service.settings, "IMPORT_PDF_MAX_PAGES", 0):
            with pytest.raises(ValueError, match="terlalu banyak halaman"):
                parse_bank_pdf(b"%PDF fake", "bca")


def test_preview_import_routes_pdf_to_pdf_parser(client):
    fake_user = {"user_id": "user-1", "email": "user@example.com"}
    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[rate_limit_import] = lambda: fake_user
    parsed = {
        "transactions": [],
        "duplicates": [],
        "errors": [],
        "total_rows": 0,
        "imported": 0,
        "skipped_months": 0,
    }
    try:
        with patch("app.api.v1.imports._get_plan_type", return_value="premium"), \
             patch("app.api.v1.imports._load_existing_hashes", return_value=set()), \
             patch("app.api.v1.imports.parse_bank_pdf", return_value=parsed) as pdf_parser, \
             patch("app.api.v1.imports.parse_bank_csv") as csv_parser:
            response = client.post(
                "/api/v1/imports/preview",
                data={"bank_name": "bca"},
                files={"file": ("statement.pdf", b"%PDF fake", "application/pdf")},
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(rate_limit_import, None)

    assert response.status_code == 200
    assert response.json()["bank_name"] == "BCA"
    assert pdf_parser.called
    assert not csv_parser.called


def test_preview_import_keeps_csv_parser_for_non_pdf(client):
    fake_user = {"user_id": "user-1", "email": "user@example.com"}
    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[rate_limit_import] = lambda: fake_user
    parsed = {
        "transactions": [],
        "duplicates": [],
        "errors": [],
        "total_rows": 0,
        "imported": 0,
        "skipped_months": 0,
    }
    try:
        with patch("app.api.v1.imports._get_plan_type", return_value="premium"), \
             patch("app.api.v1.imports._load_existing_hashes", return_value=set()), \
             patch("app.api.v1.imports.parse_bank_pdf") as pdf_parser, \
             patch("app.api.v1.imports.parse_bank_csv", return_value=parsed) as csv_parser:
            response = client.post(
                "/api/v1/imports/preview",
                data={"bank_name": "bca"},
                files={"file": ("statement.csv", b"tanggal,keterangan", "text/csv")},
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(rate_limit_import, None)

    assert response.status_code == 200
    assert csv_parser.called
    assert not pdf_parser.called
