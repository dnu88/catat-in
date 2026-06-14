#!/usr/bin/env python3
"""Generator PDF: Flow Transaksi — Customer Journey Kaswise.

Sumber kebenaran (grounded di kode):
- apps/mobile/app/upgrade.tsx              (UI checkout + state polling)
- apps/mobile/src/services/billing.ts      (pricing, createPayment, status)
- apps/mobile/app/(tabs)/capture.tsx:747   (gate foto struk OCR)
- apps/mobile/app/(tabs)/reports.tsx:291   (gate AI Insight)
- apps/mobile/app/(tabs)/settings.tsx:1118 (tombol upgrade)
- backend/app/services/payment_service.py  (Midtrans Snap, order_id, signature)

Jalankan:  backend/.venv/bin/python docs/product/gen_flow_transaksi_pdf.py
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    Flowable, KeepTogether, NextPageTemplate, PageBreak,
)
from reportlab.pdfgen import canvas as canvas_mod

# ── Brand palette (dari apps/mobile/src/theme) ─────────────────────────────
GREEN      = colors.HexColor("#3F6212")  # brandPrimaryDeep
LIME       = colors.HexColor("#A3FF12")  # brandPrimary
BLUE       = colors.HexColor("#4A80F0")  # brandSecondary
INK        = colors.HexColor("#1A1D17")
SLATE      = colors.HexColor("#5B6152")
MUTE       = colors.HexColor("#8A9181")
LINE       = colors.HexColor("#E2E7DA")
SURFACE    = colors.HexColor("#F6F8F1")
GREEN_SOFT = colors.HexColor("#EAF1DC")
BLUE_SOFT  = colors.HexColor("#E7EEFD")
AMBER      = colors.HexColor("#B45309")
AMBER_SOFT = colors.HexColor("#FCEFD9")
WHITE      = colors.white

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

# ── Styles ─────────────────────────────────────────────────────────────────
ss = getSampleStyleSheet()
def style(name, **kw):
    base = kw.pop("parent", ss["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

H1     = style("H1", fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=GREEN, spaceBefore=2, spaceAfter=6)
H2     = style("H2", fontName="Helvetica-Bold", fontSize=13.5, leading=17, textColor=INK, spaceBefore=14, spaceAfter=5)
BODY   = style("Body", fontName="Helvetica", fontSize=9.5, leading=14, textColor=INK, spaceAfter=4)
SMALL  = style("Small", fontName="Helvetica", fontSize=8, leading=11, textColor=SLATE)
LEAD   = style("Lead", fontName="Helvetica", fontSize=10.5, leading=16, textColor=SLATE, spaceAfter=4)
CELLH  = style("CellH", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=WHITE)
CELL   = style("Cell", fontName="Helvetica", fontSize=8.5, leading=11.5, textColor=INK)
CELLB  = style("CellB", fontName="Helvetica-Bold", fontSize=8.5, leading=11.5, textColor=INK)
KBD    = style("Kbd", fontName="Courier", fontSize=8, leading=11, textColor=GREEN)
COVERT = style("CoverT", fontName="Helvetica-Bold", fontSize=30, leading=34, textColor=WHITE, alignment=TA_LEFT)
COVERS = style("CoverS", fontName="Helvetica", fontSize=12.5, leading=18, textColor=colors.HexColor("#D7F59B"), alignment=TA_LEFT)


def hx(c):
    """HexColor -> string '#rrggbb' untuk atribut font inline."""
    return "#" + c.hexval()[2:]


# ── Flowable: kartu tahap dalam diagram alur vertikal ──────────────────────
class StageFlow(Flowable):
    """Diagram alur vertikal: tiap tahap satu kartu, dihubungkan panah."""
    def __init__(self, stages, width):
        super().__init__()
        self.stages = stages
        self.width = width
        self.card_h = 19 * mm
        self.gap = 7 * mm
        self.height = len(stages) * self.card_h + (len(stages) - 1) * self.gap

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        x = 0
        y = self.height
        num_w = 11 * mm
        for i, s in enumerate(self.stages):
            top = y - i * (self.card_h + self.gap)
            bot = top - self.card_h
            accent = s.get("accent", GREEN)
            highlight = s.get("highlight", False)
            # kartu
            c.setFillColor(AMBER_SOFT if highlight else SURFACE)
            c.setStrokeColor(accent)
            c.setLineWidth(1.6 if highlight else 0.8)
            c.roundRect(x, bot, self.width, self.card_h, 4, stroke=1, fill=1)
            # blok nomor
            c.setFillColor(accent)
            c.roundRect(x, bot, num_w, self.card_h, 4, stroke=0, fill=1)
            c.setFillColor(WHITE if accent != LIME else INK)
            c.setFont("Helvetica-Bold", 13)
            c.drawCentredString(x + num_w / 2, top - self.card_h / 2 - 4, str(s["n"]))
            # konten
            tx = x + num_w + 5 * mm
            c.setFillColor(INK)
            c.setFont("Helvetica-Bold", 10)
            c.drawString(tx, top - 6.2 * mm, s["title"])
            c.setFillColor(SLATE)
            c.setFont("Helvetica", 7.8)
            c.drawString(tx, top - 11 * mm, s["desc"][:96])
            if s.get("desc2"):
                c.drawString(tx, top - 14.8 * mm, s["desc2"][:96])
            # tag kanan
            if s.get("tag"):
                tag = s["tag"]; tagc = s.get("tagc", BLUE)
                c.setFont("Helvetica-Bold", 6.6)
                tw = c.stringWidth(tag, "Helvetica-Bold", 6.6) + 8
                c.setFillColor(tagc)
                c.roundRect(x + self.width - tw - 4 * mm, top - 7.2 * mm, tw, 5 * mm, 2.5, stroke=0, fill=1)
                c.setFillColor(WHITE if tagc != LIME else INK)
                c.drawCentredString(x + self.width - tw / 2 - 4 * mm, top - 5.6 * mm, tag)
            # panah ke bawah
            if i < len(self.stages) - 1:
                ax = x + num_w / 2
                c.setStrokeColor(MUTE); c.setLineWidth(1.2)
                c.line(ax, bot, ax, bot - self.gap + 2.2 * mm)
                c.setFillColor(MUTE)
                yt = bot - self.gap + 2.2 * mm
                c.setStrokeColor(MUTE)
                p = c.beginPath(); p.moveTo(ax - 2.2 * mm, yt); p.lineTo(ax + 2.2 * mm, yt); p.lineTo(ax, yt - 2.4 * mm); p.close()
                c.drawPath(p, fill=1, stroke=0)


class HRule(Flowable):
    def __init__(self, width, color=LINE, thick=0.8):
        super().__init__(); self.width = width; self.color = color; self.thick = thick
    def wrap(self, aw, ah): return self.width, self.thick + 4
    def draw(self):
        self.canv.setStrokeColor(self.color); self.canv.setLineWidth(self.thick)
        self.canv.line(0, 2, self.width, 2)


# ── Page chrome ─────────────────────────────────────────────────────────────
def cover_page(c, doc):
    c.saveState()
    c.setFillColor(GREEN); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # aksen lime
    c.setFillColor(LIME); c.rect(0, PAGE_H - 6 * mm, PAGE_W, 6 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#33500F"))
    c.circle(PAGE_W - 8 * mm, 36 * mm, 60 * mm, fill=1, stroke=0)
    c.setFillColor(LIME)
    c.setFont("Helvetica-Bold", 11); c.drawString(MARGIN, PAGE_H - 24 * mm, "KASWISE  ·  CATAT.IN")
    c.setFillColor(colors.HexColor("#D7F59B"))
    c.setFont("Helvetica", 9); c.drawString(MARGIN, PAGE_H - 30 * mm, "Dokumen Produk / UX")
    c.restoreState()


def content_page(c, doc):
    c.saveState()
    c.setFillColor(GREEN); c.rect(0, PAGE_H - 4 * mm, PAGE_W, 4 * mm, fill=1, stroke=0)
    c.setFillColor(MUTE); c.setFont("Helvetica", 7.5)
    c.drawString(MARGIN, 10 * mm, "Kaswise — Flow Transaksi / Customer Journey")
    c.drawRightString(PAGE_W - MARGIN, 10 * mm, f"Hal. {doc.page - 1}")
    c.setStrokeColor(LINE); c.setLineWidth(0.6); c.line(MARGIN, 13 * mm, PAGE_W - MARGIN, 13 * mm)
    c.restoreState()


# ── Build ───────────────────────────────────────────────────────────────────
CW = PAGE_W - 2 * MARGIN
story = []

def P(txt, st=BODY): story.append(Paragraph(txt, st))
def gap(h): story.append(Spacer(1, h))

# Cover content (di atas gambar cover)
story.append(Spacer(1, 78 * mm))
story.append(Paragraph("Flow Transaksi", COVERT))
story.append(Paragraph("Customer Journey", COVERT))
story.append(Spacer(1, 6 * mm))
story.append(Paragraph(
    "Perjalanan pengguna dari membuka aplikasi hingga<br/>checkout masuk ke halaman pembayaran (Midtrans).",
    COVERS))
story.append(Spacer(1, 10 * mm))
meta = Table([
    ["Produk", "Kaswise Premium (upgrade berbayar)"],
    ["Platform", "Expo — Android / iOS / Web PWA"],
    ["Payment gateway", "Midtrans Snap (QRIS, GoPay, ShopeePay)"],
    ["Versi dokumen", "1.0  ·  12 Juni 2026"],
    ["Sumber", "Grounded di kode mobile + backend"],
], colWidths=[34 * mm, CW - 34 * mm])
meta.setStyle(TableStyle([
    ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 9),
    ("FONT", (1, 0), (1, -1), "Helvetica", 9),
    ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#D7F59B")),
    ("TEXTCOLOR", (1, 0), (1, -1), WHITE),
    ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ("LINEBELOW", (0, 0), (-1, -2), 0.4, colors.HexColor("#5C7A23")),
]))
story.append(meta)
story.append(NextPageTemplate("content"))
story.append(PageBreak())

# ── 1. Ringkasan ─────────────────────────────────────────────────────────────
P("Ringkasan", H1)
P("Dokumen ini memetakan <b>customer journey transaksi pembelian</b> di Kaswise: dari pengguna "
  "membuka aplikasi, memakai fitur gratis, menyentuh gerbang fitur Premium, memilih paket, "
  "hingga diarahkan ke <b>halaman pembayaran Midtrans</b>. Tahap inti yang diminta berakhir di "
  "titik checkout masuk ke payment page (Tahap 8); tahap pasca-bayar (9–12) disertakan sebagai "
  "konteks agar alur utuh.", LEAD)
gap(2)
# kartu fakta cepat
facts = Table([
    [Paragraph("3", style("f1", parent=H1, fontSize=22, textColor=GREEN, alignment=TA_CENTER)),
     Paragraph("8", style("f2", parent=H1, fontSize=22, textColor=BLUE, alignment=TA_CENTER)),
     Paragraph("≤60 dtk", style("f3", parent=H1, fontSize=18, textColor=AMBER, alignment=TA_CENTER))],
    [Paragraph("pintu masuk checkout<br/>(Foto struk · AI Insight · Settings)", style("fc1", parent=SMALL, alignment=TA_CENTER)),
     Paragraph("tahap sampai<br/>payment page", style("fc2", parent=SMALL, alignment=TA_CENTER)),
     Paragraph("window polling status<br/>(2 dtk × 30)", style("fc3", parent=SMALL, alignment=TA_CENTER))],
], colWidths=[CW / 3] * 3)
facts.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (0, -1), GREEN_SOFT),
    ("BACKGROUND", (1, 0), (1, -1), BLUE_SOFT),
    ("BACKGROUND", (2, 0), (2, -1), AMBER_SOFT),
    ("BOX", (0, 0), (0, -1), 0.6, GREEN), ("BOX", (1, 0), (1, -1), 0.6, BLUE), ("BOX", (2, 0), (2, -1), 0.6, AMBER),
    ("TOPPADDING", (0, 0), (-1, 0), 8), ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
    ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
]))
story.append(facts)
story.append(PageBreak())

# ── 2. Diagram alur ──────────────────────────────────────────────────────────
story.append(Paragraph("Diagram Alur — Buka Aplikasi &rarr; Payment Page", style("H1d", parent=H1, spaceAfter=8)))
stages = [
    {"n": 1, "title": "Buka Aplikasi", "desc": "User membuka Kaswise (Web PWA / Android / iOS).",
     "tag": "ENTRY", "tagc": GREEN, "accent": GREEN},
    {"n": 2, "title": "Autentikasi (Supabase Auth)", "desc": "Login / daftar: email-password atau Google OAuth.",
     "desc2": "Returning user: sesi otomatis dipulihkan.", "tag": "AUTH", "tagc": BLUE, "accent": GREEN},
    {"n": 3, "title": "Dashboard — Pemakaian Free", "desc": "Catat transaksi manual, lihat dashboard, wallet, budget, tagihan.",
     "tag": "FREE", "tagc": SLATE, "accent": GREEN},
    {"n": 4, "title": "Menyentuh Gerbang Premium", "desc": "Foto struk OCR · AI Insight di Reports · tombol Upgrade di Settings.",
     "tag": "GATE", "tagc": AMBER, "accent": AMBER},
    {"n": 5, "title": "Halaman Upgrade (/upgrade)", "desc": "Muat harga: GET /payments/pricing — tier promo/normal, paket bulanan & tahunan.",
     "tag": "PRICING", "tagc": BLUE, "accent": GREEN},
    {"n": 6, "title": "Pilih Paket", "desc": "Tap Bulanan atau Tahunan (badge HEMAT — hemat 2 bulan).",
     "tag": "SELECT", "tagc": SLATE, "accent": GREEN},
    {"n": 7, "title": "Buat Transaksi Pembayaran", "desc": "POST /payments/create -> order_id + Snap token + redirect_url.",
     "desc2": "Backend hitung tier & buat transaksi Midtrans Snap.", "tag": "API", "tagc": BLUE, "accent": GREEN},
    {"n": 8, "title": "PAYMENT PAGE — Midtrans Snap", "desc": "App buka redirect_url (in-app browser). User di halaman bayar.",
     "desc2": "QRIS · GoPay · ShopeePay.  <-- AKHIR SCOPE UTAMA", "tag": "CHECKOUT", "tagc": AMBER, "accent": AMBER, "highlight": True},
]
story.append(StageFlow(stages, CW))
gap(4)
P("Tahap 9–12 (pasca payment page): polling status tiap 2 detik &rarr; user membayar &rarr; "
  "Midtrans mengirim webhook ke backend (verifikasi tanda tangan SHA512) &rarr; Premium aktif &rarr; "
  "layar menampilkan “Pembayaran berhasil”.", SMALL)

story.append(PageBreak())

# ── 3. Pintu masuk checkout ──────────────────────────────────────────────────
P("Pintu Masuk ke Checkout (Gerbang Premium)", H1)
P("Ada tiga titik di aplikasi yang mengarahkan pengguna free ke layar <b>/upgrade</b>. Semuanya "
  "memanggil <font face='Courier' size=8>router.push(\"/upgrade\")</font>.", BODY)
gate_rows = [
    [Paragraph("Pintu Masuk", CELLH), Paragraph("Pemicu", CELLH), Paragraph("Lokasi di kode", CELLH)],
    [Paragraph("Foto struk (OCR)", CELLB),
     Paragraph("User pilih mode “Foto” di Capture, tapi kuota foto terkunci untuk free.", CELL),
     Paragraph("apps/mobile/app/(tabs)/capture.tsx:747", KBD)],
    [Paragraph("AI Insight", CELLB),
     Paragraph("User buka kartu AI Insight di Reports tanpa status premium.", CELL),
     Paragraph("apps/mobile/app/(tabs)/reports.tsx:291", KBD)],
    [Paragraph("Settings", CELLB),
     Paragraph("User menekan tombol “Upgrade ke Premium” di pengaturan.", CELL),
     Paragraph("apps/mobile/app/(tabs)/settings.tsx:1118", KBD)],
]
t = Table(gate_rows, colWidths=[32 * mm, CW - 32 * mm - 62 * mm, 62 * mm])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SURFACE]),
    ("GRID", (0, 0), (-1, -1), 0.5, LINE),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
]))
story.append(t)

# ── 4. Detail per tahap ──────────────────────────────────────────────────────
P("Detail Tiap Tahap", H2)
DNUM  = style("DNum", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=GREEN)
DSTEP = style("DStep", fontName="Helvetica-Bold", fontSize=8, leading=10.5, textColor=INK)
DWHAT = style("DWhat", fontName="Helvetica", fontSize=8, leading=10.5, textColor=SLATE)
DTECH = style("DTech", fontName="Courier", fontSize=7, leading=9.5, textColor=BLUE)
_detail = [
    ("1", "Buka aplikasi", "Pengguna membuka PWA/aplikasi native. Splash + cek sesi.", "Expo Router root layout"),
    ("2", "Autentikasi", "Login/daftar via email-password atau Google. Sesi tersimpan.", "Supabase Auth + RLS"),
    ("3", "Pakai fitur free", "Catat transaksi manual, lihat dashboard, wallet, budget, tagihan.", "Supabase SDK langsung"),
    ("4", "Gerbang premium", "Aksi premium memicu pengalihan ke /upgrade (3 pintu masuk).", "router.push('/upgrade')"),
    ("5", "Layar upgrade", "Tampilkan harga &amp; benefit (OCR, AI chat 200/bln, AI Insight). Badge promo.", "GET /payments/pricing"),
    ("6", "Pilih paket", "Pilih Bulanan / Tahunan. Tombol nonaktif saat proses.", "state busy"),
    ("7", "Create payment", "Backend tentukan tier, buat order_id, minta token Snap ke Midtrans.", "POST /payments/create"),
    ("8", "Payment page", "App buka redirect_url di in-app browser. Halaman bayar Midtrans.", "WebBrowser.openBrowserAsync()"),
    ("9", "Polling status", "App cek status tiap 2 dtk (maks 30&#215;). Tombol 'Saya sudah bayar'.", "GET /payments/{id}/status"),
    ("10", "Pembayaran", "User memilih metode (QRIS/GoPay/ShopeePay) &amp; menyelesaikan bayar.", "Midtrans Snap"),
    ("11", "Webhook", "Midtrans kirim notifikasi; backend verifikasi tanda tangan &amp; aktifkan Premium.", "POST /webhooks/midtrans"),
    ("12", "Konfirmasi", "Polling melihat status 'paid' &rarr; layar sukses &rarr; kembali sebagai Premium.", "phase = 'paid'"),
]
detail_rows = [[Paragraph("#", CELLH), Paragraph("Tahap", CELLH), Paragraph("Apa yang terjadi", CELLH), Paragraph("Teknis", CELLH)]]
for n, stp, what, tech in _detail:
    detail_rows.append([Paragraph(n, DNUM), Paragraph(stp, DSTEP), Paragraph(what, DWHAT), Paragraph(tech, DTECH)])
dt = Table(detail_rows, colWidths=[8 * mm, 27 * mm, CW - 8 * mm - 27 * mm - 47 * mm, 47 * mm], repeatRows=1)
dstyle = [
    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SURFACE]),
    ("GRID", (0, 0), (-1, -1), 0.4, LINE),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 4.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
    ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
]
# Sorot baris payment page (tahap 8 => row index 8)
dstyle += [("BACKGROUND", (0, 8), (-1, 8), AMBER_SOFT), ("BOX", (0, 8), (-1, 8), 1.0, AMBER)]
dt.setStyle(TableStyle(dstyle))
story.append(dt)

story.append(PageBreak())

# ── 5. Detail teknis create payment ─────────────────────────────────────────
P("Detail Teknis — Checkout & Payment Page", H1)
P("Sekuens dari tap paket hingga payment page terbuka:", BODY)
seq = [
    ("Mobile", "createPayment(supabase, plan)", "billing.ts:37 — POST /api/v1/payments/create dengan body { plan }."),
    ("Backend", "tentukan tier harga", "payment_service.py — promo bila jumlah pelanggan < PROMO_MAX_SUBSCRIBERS, selain itu normal."),
    ("Backend", "make_order_id(user_id)", "Format kw-{user_id[:8]}-{epoch_ms}-{6 hex} (payment_service.py:81)."),
    ("Backend", "create_snap_transaction(...)", "Panggil Midtrans Snap; enabled_payments: QRIS, GoPay, ShopeePay (payment_service.py:86)."),
    ("Backend", "balas snap_token + redirect_url", "Disimpan ke tabel payments (status awal: pending)."),
    ("Mobile", "WebBrowser.openBrowserAsync(redirect_url)", "upgrade.tsx:129 — payment page Midtrans terbuka di in-app browser."),
    ("Mobile", "startPolling(order_id)", "Poll status tiap 2 dtk, maksimum 30 kali (upgrade.tsx:27-28)."),
]
seq_rows = [[Paragraph("Sisi", CELLH), Paragraph("Aksi", CELLH), Paragraph("Keterangan", CELLH)]]
for side, act, note in seq:
    sc = BLUE if side == "Mobile" else GREEN
    seq_rows.append([
        Paragraph(f"<font color='{hx(sc)}'><b>{side}</b></font>", CELL),
        Paragraph(act, KBD),
        Paragraph(note, CELL),
    ])
st = Table(seq_rows, colWidths=[18 * mm, 64 * mm, CW - 18 * mm - 64 * mm])
st.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SURFACE]),
    ("GRID", (0, 0), (-1, -1), 0.4, LINE),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
]))
story.append(st)

# ── 6. State UI layar upgrade ────────────────────────────────────────────────
P("State Layar Upgrade & Metode Pembayaran", H2)
left = Table([
    [Paragraph("State UI (upgrade.tsx)", CELLH)],
    [Paragraph("<b>idle</b> — tampil kartu paket Bulanan/Tahunan", CELL)],
    [Paragraph("<b>polling</b> — “Memeriksa status pembayaran…” + tombol “Saya sudah bayar”", CELL)],
    [Paragraph("<b>paid</b> — ✅ “Pembayaran berhasil! Akun Premium”", CELL)],
    [Paragraph("<b>error</b> — gagal/timeout + tombol “Cek lagi”", CELL)],
], colWidths=[(CW - 6 * mm) / 2])
right = Table([
    [Paragraph("Metode pembayaran (Midtrans)", CELLH)],
    [Paragraph("QRIS — semua e-wallet & m-banking via QR", CELL)],
    [Paragraph("GoPay", CELL)],
    [Paragraph("ShopeePay", CELL)],
    [Paragraph("Paket: Bulanan (30 hari) · Tahunan (365 hari)", CELLB)],
], colWidths=[(CW - 6 * mm) / 2])
for tb, hc in ((left, BLUE), (right, GREEN)):
    tb.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), hc),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SURFACE]),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]))
combo = Table([[left, right]], colWidths=[(CW - 6 * mm) / 2 + 3 * mm, (CW - 6 * mm) / 2 + 3 * mm])
combo.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
story.append(combo)

# ── 7. Catatan ───────────────────────────────────────────────────────────────
P("Catatan & Asumsi", H2)
for note in [
    "Tahap inti yang diminta (“sampai checkout masuk ke payment page”) berakhir di <b>Tahap 8</b>. Tahap 9–12 disertakan untuk kelengkapan alur pasca-bayar.",
    "Aktivasi Premium yang otoritatif terjadi via <b>webhook Midtrans</b> (server-to-server), bukan dari sisi aplikasi. Polling di app hanya untuk memperbarui tampilan.",
    "Mobile mengakses data lewat Supabase langsung (RLS); backend FastAPI hanya menangani AI, Import, dan pembayaran/webhook.",
    "Pengguna <b>returning</b> melewati Tahap 2 (sesi otomatis) dan bisa langsung dari dashboard menuju checkout.",
    "Diagram & langkah grounded di kode per commit 490cf77 (12 Jun 2026); bila alur berubah, perbarui generator di docs/product/gen_flow_transaksi_pdf.py.",
]:
    story.append(Paragraph(f"•&nbsp;&nbsp;{note}", BODY))

# ── Render ──────────────────────────────────────────────────────────────────
OUT = "/home/Danu88/catat-in/docs/product/Flow_Transaksi_Customer_Journey.pdf"
doc = BaseDocTemplate(OUT, pagesize=A4,
                      leftMargin=MARGIN, rightMargin=MARGIN, topMargin=20 * mm, bottomMargin=18 * mm,
                      title="Flow Transaksi — Customer Journey Kaswise", author="Kaswise")
frame_cover = Frame(MARGIN, 18 * mm, CW, PAGE_H - 36 * mm, id="cover")
frame_content = Frame(MARGIN, 16 * mm, CW, PAGE_H - 36 * mm, id="content")
doc.addPageTemplates([
    PageTemplate(id="cover", frames=[frame_cover], onPage=cover_page),
    PageTemplate(id="content", frames=[frame_content], onPage=content_page),
])
doc.build(story)
print(f"OK -> {OUT}")
