from app.services.import_service import escape_formula_text


def test_escape_formula_text_prefixes_spreadsheet_formulas():
    assert escape_formula_text("=CMD()") == "'=CMD()"
    assert escape_formula_text("+SUM(A1:A2)") == "'+SUM(A1:A2)"
    assert escape_formula_text("-10+20") == "'-10+20"
    assert escape_formula_text("@HYPERLINK(x)") == "'@HYPERLINK(x)"


def test_escape_formula_text_leaves_normal_text():
    assert escape_formula_text("Transfer Gaji") == "Transfer Gaji"
