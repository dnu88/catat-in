#!/usr/bin/env python3
"""Buat gambar struk uji (untuk memverifikasi pembaca struk AI).

Output: /tmp/kw-struk-uji.png
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 560, 900
PAPER = (252, 250, 244)
INK = (28, 28, 32)

img = Image.new("RGB", (W, H), PAPER)
draw = ImageDraw.Draw(img)

mono = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
mono_bold = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
f = ImageFont.truetype(mono, 20)
fb = ImageFont.truetype(mono_bold, 22)
fs = ImageFont.truetype(mono, 18)

y = 34
line = "-" * 34


def center(text, font, dy=34):
    global y
    w = draw.textlength(text, font=font)
    draw.text(((W - w) / 2, y), text, font=font, fill=INK)
    y += dy


def left(text, font=fs, dy=26):
    global y
    draw.text((44, y), text, font=font, fill=INK)
    y += dy


def row(label, value, font=fs):
    global y
    draw.text((44, y), label, font=font, fill=INK)
    w = draw.textlength(value, font=font)
    draw.text((W - 44 - w, y), value, font=font, fill=INK)
    y += 26


center("TOKO SEDERHANA JAYA", fb, 30)
center("Jl. Merdeka No. 12, Bandung", fs, 24)
center("Telp 0812-3456-7890", fs, 30)
center(line, fs, 26)
row("No. Struk", "0042")
row("Tanggal", "02/10/2026 14:35")
row("Kasir", "SITI")
left(line, fs, 26)
row("Kopi Susu 2x", "40.000")
row("Nasi Goreng 1x", "25.000")
row("Air Mineral 1x", "5.000")
row("Roti Gandum 1x", "18.000")
left(line, fs, 26)
row("TOTAL", "88.000", fb)
row("Tunai", "100.000")
row("Kembali", "12.000")
left(line, fs, 26)
center("Terima kasih telah berbelanja", fs, 26)
center("Barang yang sudah dibeli", fs, 24)
center("tidak dapat ditukar", fs, 34)

img.save("/tmp/kw-struk-uji.png")
print("ditulis: /tmp/kw-struk-uji.png", img.size)
