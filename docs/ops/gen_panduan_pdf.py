#!/usr/bin/env python3
"""Konverter Markdown -> PDF berbranding Kaswise untuk Panduan Kelola User & Pembayaran.

Mendukung subset markdown yang dipakai di PANDUAN_KELOLA_USER_PEMBAYARAN.md:
heading (#/##/###), paragraf, **tebal**, `kode`, daftar (- / - [ ]),
blok kode ```sql```, kutipan > (callout), garis ---, dan tabel | ... |.

Jalankan: backend/.venv/bin/python docs/ops/gen_panduan_pdf.py
"""
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    Preformatted, Flowable, KeepTogether, CondPageBreak,
)

SRC = "/home/Danu88/catat-in/docs/ops/PANDUAN_KELOLA_USER_PEMBAYARAN.md"
OUT = "/home/Danu88/catat-in/docs/ops/Panduan_Kelola_User_Pembayaran.pdf"

# ── Brand palette ───────────────────────────────────────────────────────────
GREEN   = colors.HexColor("#3F6212")
LIME    = colors.HexColor("#A3FF12")
BLUE    = colors.HexColor("#4A80F0")
INK     = colors.HexColor("#1A1D17")
SLATE   = colors.HexColor("#4B5142")
MUTE    = colors.HexColor("#8A9181")
LINE    = colors.HexColor("#E2E7DA")
SURFACE = colors.HexColor("#F6F8F1")
GSOFT   = colors.HexColor("#EAF1DC")
CODEBG  = colors.HexColor("#1E2A12")
CODEFG  = colors.HexColor("#D7F59B")
AMBER   = colors.HexColor("#B45309")
AMBERBG = colors.HexColor("#FCEFD9")
WHITE   = colors.white

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
CW = PAGE_W - 2 * MARGIN

ss = getSampleStyleSheet()
def st(name, **kw):
    return ParagraphStyle(name, parent=ss["Normal"], **kw)

TITLE = st("Title", fontName="Helvetica-Bold", fontSize=21, leading=25, textColor=GREEN, spaceAfter=2)
H2    = st("H2", fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=GREEN, spaceBefore=14, spaceAfter=5)
H3    = st("H3", fontName="Helvetica-Bold", fontSize=11, leading=15, textColor=INK, spaceBefore=9, spaceAfter=3)
BODY  = st("Body", fontName="Helvetica", fontSize=9.5, leading=14, textColor=INK, spaceAfter=4)
LI    = st("Li", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=INK, leftIndent=12, spaceAfter=2)
CALL  = st("Call", fontName="Helvetica", fontSize=9.3, leading=13.5, textColor=INK)
CODE  = st("Code", fontName="Courier", fontSize=8.2, leading=11.5, textColor=CODEFG)
CELLH = st("CellH", fontName="Helvetica-Bold", fontSize=8.6, leading=11, textColor=WHITE)
CELL  = st("Cell", fontName="Helvetica", fontSize=8.6, leading=11.5, textColor=INK)

# ── Sanitasi unicode -> aman untuk font standar PDF ─────────────────────────
_REPL = {
    "→": "->", "←": "<-", "⚠️": "", "⚠": "", "✅": "", "❌": "", "💡": "", "🛟": "",
    "📊": "", "👀": "", "👋": "", "💳": "", "⏳": "", "⌛": "", "❓": "", "🔑": "",
    "🛠️": "", "🛠": "", "📘": "", "≥": ">=", "≤": "<=", "×": "x", "·": "-", "—": "-",
    "–": "-", "’": "'", "‘": "'", "“": '"', "”": '"', "…": "...",
}
def sani(s):
    for k, v in _REPL.items():
        s = s.replace(k, v)
    out = []
    for c in s:
        try:
            c.encode("latin-1"); out.append(c)
        except UnicodeEncodeError:
            pass
    return re.sub(r"  +", " ", "".join(out)).strip()

def inline(s):
    s = sani(s)
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"`([^`]+)`", lambda m: f'<font face="Courier" size=8.5 color="#2F5A0E">{m.group(1)}</font>', s)
    return s

# ── Callout flowable (kotak kutipan) ────────────────────────────────────────
def callout(text, warn=False):
    bg = AMBERBG if warn else GSOFT
    bar = AMBER if warn else GREEN
    p = Paragraph(inline(text), CALL)
    t = Table([[p]], colWidths=[CW])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LINEBEFORE", (0, 0), (0, -1), 3, bar),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t

def code_block(lines):
    pre = Preformatted("\n".join(sani(x) for x in lines), CODE)
    t = Table([[pre]], colWidths=[CW])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CODEBG),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    return t

def md_table(rows):
    header, body = rows[0], rows[1:]
    ncol = len(header)
    cw = [CW / ncol] * ncol
    data = [[Paragraph(inline(c), CELLH) for c in header]]
    for r in body:
        data.append([Paragraph(inline(c), CELL) for c in r])
    t = Table(data, colWidths=cw, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SURFACE]),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t

# ── Parse markdown -> flowables ─────────────────────────────────────────────
def split_row(line):
    cells = line.strip().strip("|").split("|")
    return [c.strip() for c in cells]

raw = open(SRC, encoding="utf-8").read().splitlines()
flow = []
i = 0
first_title = True
while i < len(raw):
    line = raw[i]
    s = line.strip()

    if not s:
        i += 1; continue

    # garis pemisah
    if s == "---":
        flow.append(Spacer(1, 3))
        from reportlab.platypus import HRFlowable
        flow.append(HRFlowable(width=CW, thickness=0.6, color=LINE, spaceBefore=2, spaceAfter=6))
        i += 1; continue

    # blok kode
    if s.startswith("```"):
        i += 1; buf = []
        while i < len(raw) and not raw[i].strip().startswith("```"):
            buf.append(raw[i]); i += 1
        i += 1
        flow.append(Spacer(1, 2)); flow.append(code_block(buf)); flow.append(Spacer(1, 4))
        continue

    # kutipan / callout (gabung baris berurutan)
    if s.startswith(">"):
        buf = []; warn = False
        while i < len(raw) and raw[i].strip().startswith(">"):
            t = raw[i].strip()[1:].strip()
            if any(w in t for w in ("⚠", "JANGAN", "MENGUBAH", "hati", "rahasia")):
                warn = True
            buf.append(t); i += 1
        flow.append(Spacer(1, 2)); flow.append(callout(" ".join(buf), warn)); flow.append(Spacer(1, 5))
        continue

    # tabel
    if s.startswith("|"):
        tbuf = []
        while i < len(raw) and raw[i].strip().startswith("|"):
            tbuf.append(split_row(raw[i])); i += 1
        tbuf = [r for r in tbuf if not all(set(c) <= set("-: ") for c in r)]  # buang baris |---|
        flow.append(Spacer(1, 2)); flow.append(md_table(tbuf)); flow.append(Spacer(1, 6))
        continue

    # heading
    if s.startswith("### "):
        flow.append(Paragraph(inline(s[4:]), H3)); i += 1; continue
    if s.startswith("## "):
        flow.append(CondPageBreak(40 * mm)); flow.append(Paragraph(inline(s[3:]), H2)); i += 1; continue
    if s.startswith("# "):
        flow.append(Paragraph(inline(s[2:]), TITLE)); i += 1; continue

    # daftar (- / - [ ] / - [x])
    if re.match(r"^- ", s):
        m = re.match(r"^- \[( |x)\] (.*)", s)
        if m:
            box = "[v]" if m.group(1) == "x" else "[  ]"
            flow.append(Paragraph(f'<font face="Courier" color="#3F6212">{box}</font>&nbsp; ' + inline(m.group(2)), LI))
        else:
            flow.append(Paragraph("&bull;&nbsp; " + inline(s[2:]), LI))
        i += 1; continue

    # paragraf biasa
    flow.append(Paragraph(inline(s), BODY)); i += 1

# ── Page chrome ─────────────────────────────────────────────────────────────
def header_band(c, doc):
    c.saveState()
    c.setFillColor(GREEN); c.rect(0, PAGE_H - 12 * mm, PAGE_W, 12 * mm, fill=1, stroke=0)
    c.setFillColor(LIME); c.rect(0, PAGE_H - 12 * mm, PAGE_W, 1.4 * mm, fill=1, stroke=0)
    c.setFillColor(LIME); c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN, PAGE_H - 8 * mm, "KASWISE")
    c.setFillColor(colors.HexColor("#D7F59B")); c.setFont("Helvetica", 8)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 8 * mm, "Panduan Kelola User & Pembayaran")
    c.setFillColor(MUTE); c.setFont("Helvetica", 7.5)
    c.drawString(MARGIN, 9 * mm, "Untuk owner - tanpa ngoding")
    c.drawRightString(PAGE_W - MARGIN, 9 * mm, f"Hal. {doc.page}")
    c.setStrokeColor(LINE); c.setLineWidth(0.5); c.line(MARGIN, 12 * mm, PAGE_W - MARGIN, 12 * mm)
    c.restoreState()

doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                      topMargin=18 * mm, bottomMargin=15 * mm,
                      title="Panduan Kelola User & Pembayaran Kaswise", author="Kaswise")
frame = Frame(MARGIN, 14 * mm, CW, PAGE_H - 30 * mm, id="main")
doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=header_band)])
doc.build(flow)
print(f"OK -> {OUT}")
