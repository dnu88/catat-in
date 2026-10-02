"""Verifikasi pembaca struk di dalam image produksi (dijalankan di dalam container).

Dipakai oleh /tmp/kw-uji-struk.sh. Tidak menyentuh kuota/DB: hanya memanggil
fungsi AI-nya langsung dengan gambar struk uji.
"""
import asyncio
import json
import pathlib

from app.core.config import settings
from app.services import ai_service

image = pathlib.Path("/tmp/struk-uji.png").read_bytes()
print("provider gambar aktif :", ai_service.active_vision_provider())
print("model gambar          :", settings.GEMINI_MODEL)
print("ukuran gambar         :", len(image), "bytes")
print("-" * 60)

result = asyncio.run(ai_service.analyze_receipt_image(image, "image/png"))
print(json.dumps(result, indent=2, ensure_ascii=False))
print("-" * 60)

total = result.get("total_amount")
readable = result.get("readable")
ok = bool(total) and float(total) > 0
print("HASIL:", "LOLOS" if ok else "GAGAL", f"(total={total}, readable={readable})")
