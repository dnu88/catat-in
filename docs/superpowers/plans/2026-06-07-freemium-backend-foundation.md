# Freemium Backend Foundation — Implementation Plan (1/3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tegakkan model freemium di backend — kuota chat AI bulanan, foto struk premium-only, model Haiku 4.5 + prompt caching — sehingga limit nyata terpakai meski premium masih diaktifkan manual.

**Architecture:** Gating authoritative di endpoint AI backend. State plan dari `profiles`, kuota dari tabel baru `ai_usage` (kunci `period_ym`, reset implisit). Logika kuota dipisah jadi fungsi murni `evaluate()` (mudah diuji) + akses data tipis ke Supabase (service role). Tabel `payments` dibuat sekarang (dipakai Plan 2).

**Tech Stack:** FastAPI, pydantic-settings, Supabase (Postgres+RLS, `supabase-py`), Anthropic SDK (Haiku 4.5), pytest.

**Spec:** `docs/superpowers/specs/2026-06-07-freemium-ai-monetization-design.md`
**Branch:** `feat/freemium-ai-monetization`

**Cakupan plan ini (1/3):** config, migrasi `ai_usage`+`payments`, model+caching, modul `entitlements`, gating `/ai/chat` & `/ai/receipt`, endpoint `/me/entitlements`. **Plan 2** = pembayaran Midtrans. **Plan 3** = UI mobile.

> Jalankan test backend dari folder `backend/`: `cd backend && python -m pytest`.

---

### Task 1: Konfigurasi freemium (settings)

**Files:**
- Modify: `backend/app/core/config.py` (tambah field di class `Settings`, setelah blok `# Midtrans`/pricing yang sudah ada ~baris 79-121)
- Test: `backend/tests/test_freemium_config.py`

- [ ] **Step 1: Tulis test gagal**

```python
# backend/tests/test_freemium_config.py
from app.core.config import settings


def test_freemium_defaults():
    assert settings.ANTHROPIC_MODEL_EXTRACT == "claude-haiku-4-5"
    assert settings.ANTHROPIC_MODEL_INSIGHT == "claude-sonnet-4-6"
    assert settings.FREE_CHAT_MONTHLY == 25
    assert settings.PREMIUM_CHAT_MONTHLY == 200
    assert settings.PREMIUM_PHOTO_MONTHLY == 100
    assert settings.PROMO_MAX_SUBSCRIBERS == 100
    assert settings.PRICE_MONTHLY_NORMAL == 39000
    assert settings.PRICE_YEARLY_NORMAL == 349000
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd backend && python -m pytest tests/test_freemium_config.py -v`
Expected: FAIL — `AttributeError: 'Settings' object has no attribute 'ANTHROPIC_MODEL_EXTRACT'`

- [ ] **Step 3: Tambah field di `Settings`**

Sisipkan tepat sebelum baris `# Rate limiting` di `backend/app/core/config.py`:

```python
    # Freemium — model AI
    ANTHROPIC_MODEL_EXTRACT: str = "claude-haiku-4-5"   # chat extract + OCR struk
    ANTHROPIC_MODEL_INSIGHT: str = "claude-sonnet-4-6"  # AI Insight (penalaran)

    # Freemium — kuota bulanan
    FREE_CHAT_MONTHLY: int = 25
    PREMIUM_CHAT_MONTHLY: int = 200
    PREMIUM_PHOTO_MONTHLY: int = 100

    # Freemium — harga (rupiah) & promo
    PRICE_MONTHLY_PROMO: int = 29_000
    PRICE_MONTHLY_NORMAL: int = 39_000
    PRICE_YEARLY_PROMO: int = 249_000
    PRICE_YEARLY_NORMAL: int = 349_000
    PROMO_MAX_SUBSCRIBERS: int = 100
```

> Catatan: field lama `PREMIUM_PRICE_MONTHLY_IDR`/`PREMIUM_PRICE_YEARLY_IDR` (29000/249000) dibiarkan; nilai promo baru menggantikannya secara semantik. Jangan dihapus di plan ini agar tidak memecah kode lain.

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `cd backend && python -m pytest tests/test_freemium_config.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/config.py backend/tests/test_freemium_config.py
git commit -m "feat(backend): add freemium config (models, quotas, pricing)"
```

---

### Task 2: Migrasi DB — `ai_usage` + `payments` + RPC increment

**Files:**
- Create: `supabase/migrations/202606070001_freemium_ai_usage_payments.sql`

> SQL diverifikasi dengan menerapkan migrasi ke DB (Supabase) — bukan pytest. Gunakan staging/lokal dulu.

- [ ] **Step 1: Tulis file migrasi (lengkap)**

```sql
-- Kaswise freemium: tabel kuota AI (ai_usage) + pembayaran (payments).
-- ai_usage: counter per user per bulan (period_ym), reset implisit.
-- payments: order Midtrans Snap + idempotensi (Plan 2).

-- ── ai_usage ────────────────────────────────────────────────
create table if not exists public.ai_usage (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  period_ym   text        not null,           -- 'YYYY-MM'
  chat_count  int         not null default 0,
  photo_count int         not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, period_ym)
);

alter table public.ai_usage enable row level security;

drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage
  for select using (auth.uid() = user_id);
-- Tulis hanya via service role (backend) / RPC di bawah.

-- Increment atomik. Dipanggil backend dgn service role -> p_user_id eksplisit.
create or replace function public.increment_ai_usage(
  p_user_id uuid, p_period text, p_kind text
) returns public.ai_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.ai_usage;
begin
  insert into public.ai_usage (user_id, period_ym, chat_count, photo_count)
  values (
    p_user_id, p_period,
    case when p_kind = 'chat'  then 1 else 0 end,
    case when p_kind = 'photo' then 1 else 0 end
  )
  on conflict (user_id, period_ym) do update set
    chat_count  = public.ai_usage.chat_count  + (case when p_kind = 'chat'  then 1 else 0 end),
    photo_count = public.ai_usage.photo_count + (case when p_kind = 'photo' then 1 else 0 end),
    updated_at  = now()
  returning * into rec;
  return rec;
end;
$$;

revoke all on function public.increment_ai_usage(uuid, text, text) from public, anon, authenticated;

-- ── payments ────────────────────────────────────────────────
create table if not exists public.payments (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  order_id        text        not null unique,
  plan            text        not null check (plan in ('monthly','yearly')),
  amount          int         not null,
  price_tier      text        not null check (price_tier in ('promo','normal')),
  method          text,
  midtrans_status text,
  status          text        not null default 'pending'
                              check (status in ('pending','paid','failed','expired')),
  paid_at         timestamptz,
  granted_until   timestamptz,
  raw_payload     jsonb,
  created_at      timestamptz not null default now()
);

alter table public.payments enable row level security;

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select using (auth.uid() = user_id);
-- Tulis hanya via service role (backend).

create index if not exists payments_user_created_idx
  on public.payments (user_id, created_at desc);
```

- [ ] **Step 2: Terapkan ke DB staging/lokal & verifikasi**

Run (sesuaikan dgn workflow repo — Supabase CLI):
`supabase db push` (atau jalankan file via `psql "$SUPABASE_DB_URL" -f supabase/migrations/202606070001_freemium_ai_usage_payments.sql`)
Expected: sukses tanpa error; `\d public.ai_usage` dan `\d public.payments` menampilkan tabel; fungsi `increment_ai_usage` ada.

- [ ] **Step 3: Smoke RPC**

Run: `psql "$SUPABASE_DB_URL" -c "select public.increment_ai_usage('00000000-0000-0000-0000-000000000000','2026-06','chat');"`
Expected: 1 baris dgn `chat_count=1` (lalu hapus baris uji: `delete from public.ai_usage where user_id='00000000-0000-0000-0000-000000000000';`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202606070001_freemium_ai_usage_payments.sql
git commit -m "feat(db): add ai_usage + payments tables and increment_ai_usage rpc"
```

---

### Task 3: Upgrade Anthropic SDK + model Haiku & prompt caching

**Files:**
- Modify: `backend/requirements.txt:20` (`anthropic==0.28.0` → versi terbaru)
- Modify: `backend/app/services/ai_service.py` (fungsi `extract_transaction_from_text`, `analyze_receipt_image`, `generate_financial_insight`)
- Test: `backend/tests/test_ai_service_model.py`

- [ ] **Step 1: Bump SDK**

Ubah `backend/requirements.txt` baris `anthropic==0.28.0` menjadi:
```
anthropic==0.40.0
```
Lalu: `cd backend && pip install -r requirements.txt`
(0.28.0 terlalu lama untuk prompt caching via system content blocks.)

- [ ] **Step 2: Tulis test gagal**

```python
# backend/tests/test_ai_service_model.py
import json
from unittest.mock import AsyncMock, patch
import pytest
from app.services import ai_service


def _fake_response(text):
    class _Block: pass
    b = _Block(); b.text = text
    class _Resp: pass
    r = _Resp(); r.content = [b]
    return r


@pytest.mark.asyncio
async def test_chat_uses_haiku_and_cache():
    captured = {}
    fake_client = AsyncMock()
    async def _create(**kwargs):
        captured.update(kwargs)
        return _fake_response(json.dumps({"transactions": [], "unclear": None}))
    fake_client.messages.create = _create
    with patch.object(ai_service, "_get_async_anthropic_client", return_value=fake_client), \
         patch.object(ai_service.settings, "ANTHROPIC_API_KEY", "sk-test"):
        await ai_service.extract_transaction_from_text("beli kopi 15rb")
    assert captured["model"] == "claude-haiku-4-5"
    # system harus berupa content blocks dgn cache_control
    assert isinstance(captured["system"], list)
    assert captured["system"][0]["cache_control"] == {"type": "ephemeral"}
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `cd backend && python -m pytest tests/test_ai_service_model.py -v`
Expected: FAIL — `model` masih `claude-sonnet-4-6` / `system` masih string.

- [ ] **Step 4: Ubah `ai_service.py`**

Di `extract_transaction_from_text`, ganti pemanggilan `client.messages.create(...)` menjadi:
```python
        response = await client.messages.create(
            model=settings.ANTHROPIC_MODEL_EXTRACT,
            max_tokens=500,
            system=[{
                "type": "text",
                "text": TRANSACTION_EXTRACT_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }],
            messages=[{"role": "user", "content": user_text}],
        )
```
Di `analyze_receipt_image`, ganti `model=settings.ANTHROPIC_MODEL` → `model=settings.ANTHROPIC_MODEL_EXTRACT` dan ubah `system=RECEIPT_ANALYSIS_PROMPT` menjadi:
```python
            system=[{
                "type": "text",
                "text": RECEIPT_ANALYSIS_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }],
```
Di `generate_financial_insight`, ganti `model=settings.ANTHROPIC_MODEL` → `model=settings.ANTHROPIC_MODEL_INSIGHT` (biarkan sisanya).

- [ ] **Step 5: Jalankan test (model+caching) & regresi AI**

Run: `cd backend && python -m pytest tests/test_ai_service_model.py tests/test_ai.py -v`
Expected: PASS semua.

- [ ] **Step 6: Commit**

```bash
git add backend/requirements.txt backend/app/services/ai_service.py backend/tests/test_ai_service_model.py
git commit -m "feat(ai): use Haiku 4.5 for extract/OCR + prompt caching; Sonnet for insight"
```

---

### Task 4: Logika kuota murni — `entitlements.evaluate()`

**Files:**
- Create: `backend/app/core/entitlements.py`
- Test: `backend/tests/test_entitlements_evaluate.py`

- [ ] **Step 1: Tulis test gagal**

```python
# backend/tests/test_entitlements_evaluate.py
from app.core import entitlements as ent


def test_free_chat_within_limit_allowed():
    d = ent.evaluate(is_premium=False, kind="chat", chat_count=10, photo_count=0)
    assert d.allowed is True


def test_free_chat_exhausted_paywall_402():
    d = ent.evaluate(is_premium=False, kind="chat", chat_count=25, photo_count=0)
    assert d.allowed is False and d.status_code == 402 and d.reason == "quota_exhausted"


def test_free_photo_is_premium_only_402():
    d = ent.evaluate(is_premium=False, kind="photo", chat_count=0, photo_count=0)
    assert d.allowed is False and d.status_code == 402 and d.reason == "premium_only"


def test_premium_chat_fairuse_429():
    d = ent.evaluate(is_premium=True, kind="chat", chat_count=200, photo_count=0)
    assert d.allowed is False and d.status_code == 429 and d.reason == "fair_use"


def test_premium_photo_within_and_over():
    assert ent.evaluate(is_premium=True, kind="photo", chat_count=0, photo_count=99).allowed is True
    over = ent.evaluate(is_premium=True, kind="photo", chat_count=0, photo_count=100)
    assert over.allowed is False and over.status_code == 429 and over.reason == "fair_use"
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd backend && python -m pytest tests/test_entitlements_evaluate.py -v`
Expected: FAIL — modul `entitlements` belum ada.

- [ ] **Step 3: Implementasi murni**

```python
# backend/app/core/entitlements.py
"""Logika entitlement & kuota freemium (murni + akses data)."""
from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.config import settings


@dataclass
class QuotaDecision:
    allowed: bool
    reason: str | None = None
    status_code: int | None = None


def chat_limit(is_premium: bool) -> int:
    return settings.PREMIUM_CHAT_MONTHLY if is_premium else settings.FREE_CHAT_MONTHLY


def photo_limit(is_premium: bool) -> int:
    return settings.PREMIUM_PHOTO_MONTHLY if is_premium else 0


def evaluate(*, is_premium: bool, kind: str, chat_count: int, photo_count: int) -> QuotaDecision:
    if kind == "chat":
        if chat_count < chat_limit(is_premium):
            return QuotaDecision(True)
        return QuotaDecision(False, "fair_use" if is_premium else "quota_exhausted",
                             429 if is_premium else 402)
    if kind == "photo":
        if not is_premium:
            return QuotaDecision(False, "premium_only", 402)
        if photo_count < photo_limit(True):
            return QuotaDecision(True)
        return QuotaDecision(False, "fair_use", 429)
    raise ValueError(f"kind tak dikenal: {kind}")


def current_period_ym(now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    return now.strftime("%Y-%m")
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `cd backend && python -m pytest tests/test_entitlements_evaluate.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/entitlements.py backend/tests/test_entitlements_evaluate.py
git commit -m "feat(backend): pure quota evaluate() in entitlements"
```

---

### Task 5: Akses data entitlement — `load_state()` + `record_use()`

**Files:**
- Modify: `backend/app/core/entitlements.py`
- Test: `backend/tests/test_entitlements_data.py`

- [ ] **Step 1: Tulis test gagal**

```python
# backend/tests/test_entitlements_data.py
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from app.core import entitlements as ent


def _resp(data):
    return SimpleNamespace(data=data)


def test_load_state_premium_and_counts():
    client = MagicMock()
    # profiles -> premium aktif (expires null)
    prof = client.table.return_value.select.return_value.eq.return_value.limit.return_value
    prof.execute.return_value = _resp([{"plan_type": "premium", "plan_expires_at": None}])
    # ai_usage -> chat 5, photo 2
    usage = client.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value
    usage.execute.return_value = _resp([{"chat_count": 5, "photo_count": 2}])
    with patch.object(ent, "_get_supabase_service_client", return_value=client):
        st = ent.load_state("user-1")
    assert st["is_premium"] is True
    assert st["chat_count"] == 5 and st["photo_count"] == 2
    assert "period_ym" in st


def test_record_use_calls_rpc():
    client = MagicMock()
    with patch.object(ent, "_get_supabase_service_client", return_value=client):
        ent.record_use("user-1", "2026-06", "chat")
    client.rpc.assert_called_once_with(
        "increment_ai_usage",
        {"p_user_id": "user-1", "p_period": "2026-06", "p_kind": "chat"},
    )
    client.rpc.return_value.execute.assert_called_once()
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd backend && python -m pytest tests/test_entitlements_data.py -v`
Expected: FAIL — `load_state`/`record_use` belum ada.

- [ ] **Step 3: Tambah akses data ke `entitlements.py`**

Tambahkan import & fungsi:
```python
from app.core.auth import _get_supabase_service_client, _is_active_premium_profile


def load_state(user_id: str) -> dict:
    client = _get_supabase_service_client()
    period = current_period_ym()
    is_premium = False
    chat_count = photo_count = 0
    if client is not None:
        prof = (client.table("profiles").select("plan_type,plan_expires_at")
                .eq("id", user_id).limit(1).execute())
        prow = prof.data[0] if getattr(prof, "data", None) else None
        is_premium = _is_active_premium_profile(prow)
        usage = (client.table("ai_usage").select("chat_count,photo_count")
                 .eq("user_id", user_id).eq("period_ym", period).limit(1).execute())
        urow = usage.data[0] if getattr(usage, "data", None) else None
        if urow:
            chat_count = int(urow.get("chat_count", 0))
            photo_count = int(urow.get("photo_count", 0))
    return {
        "is_premium": is_premium,
        "period_ym": period,
        "chat_count": chat_count,
        "photo_count": photo_count,
        "chat_limit": chat_limit(is_premium),
        "photo_limit": photo_limit(is_premium),
    }


def record_use(user_id: str, period_ym: str, kind: str) -> None:
    client = _get_supabase_service_client()
    if client is None:
        return
    client.rpc("increment_ai_usage",
               {"p_user_id": user_id, "p_period": period_ym, "p_kind": kind}).execute()
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `cd backend && python -m pytest tests/test_entitlements_data.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/entitlements.py backend/tests/test_entitlements_data.py
git commit -m "feat(backend): load_state + record_use data access for entitlements"
```

---

### Task 6: Gating `/ai/chat`

**Files:**
- Modify: `backend/app/api/v1/ai.py` (handler `chat_input`)
- Test: `backend/tests/test_ai_gating_chat.py`

- [ ] **Step 1: Tulis test gagal**

```python
# backend/tests/test_ai_gating_chat.py
from unittest.mock import AsyncMock, patch
from main import app
from app.core.auth import get_current_user
from app.core.rate_limit import rate_limit_ai

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE
    app.dependency_overrides[rate_limit_ai] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def _state(is_premium=False, chat_count=0):
    return {"is_premium": is_premium, "period_ym": "2026-06",
            "chat_count": chat_count, "photo_count": 0,
            "chat_limit": 200 if is_premium else 25, "photo_limit": 100 if is_premium else 0}


def test_free_chat_quota_exhausted_returns_402(client):
    with patch("app.api.v1.ai.load_state", return_value=_state(False, 25)):
        r = client.post("/api/v1/ai/chat", json={"text": "beli kopi 15rb"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 402
    assert r.json()["detail"]["reason"] == "quota_exhausted"


def test_chat_success_increments(client):
    result = {"transactions": [{"amount": 15000, "confidence": 0.9}], "unclear": None}
    with patch("app.api.v1.ai.load_state", return_value=_state(False, 0)), \
         patch("app.api.v1.ai.extract_transaction_from_text", new=AsyncMock(return_value=result)), \
         patch("app.api.v1.ai.record_use") as rec:
        r = client.post("/api/v1/ai/chat", json={"text": "beli kopi 15rb"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    rec.assert_called_once_with("u1", "2026-06", "chat")


def test_chat_empty_extraction_no_increment(client):
    result = {"transactions": [], "unclear": "tidak jelas"}
    with patch("app.api.v1.ai.load_state", return_value=_state(False, 0)), \
         patch("app.api.v1.ai.extract_transaction_from_text", new=AsyncMock(return_value=result)), \
         patch("app.api.v1.ai.record_use") as rec:
        r = client.post("/api/v1/ai/chat", json={"text": "halo"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    rec.assert_not_called()
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd backend && python -m pytest tests/test_ai_gating_chat.py -v`
Expected: FAIL — gating belum ada (402 tidak muncul; `load_state` belum diimport di ai.py).

- [ ] **Step 3: Tambah gating di `chat_input`**

Di atas file `backend/app/api/v1/ai.py` tambah import:
```python
from app.core.entitlements import load_state, record_use, evaluate
```
Ganti isi `chat_input` (setelah validasi panjang teks, sebelum `try:`) menjadi:
```python
    state = load_state(current_user["user_id"])
    decision = evaluate(is_premium=state["is_premium"], kind="chat",
                        chat_count=state["chat_count"], photo_count=state["photo_count"])
    if not decision.allowed:
        raise HTTPException(
            status_code=decision.status_code,
            detail={"reason": decision.reason, "feature": "chat",
                    "limit": state["chat_limit"], "used": state["chat_count"]},
        )

    try:
        result = await extract_transaction_from_text(body.text)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    if result.get("transactions"):
        record_use(current_user["user_id"], state["period_ym"], "chat")
    return result
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `cd backend && python -m pytest tests/test_ai_gating_chat.py tests/test_ai.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/ai.py backend/tests/test_ai_gating_chat.py
git commit -m "feat(ai): enforce chat quota gating with usage increment"
```

---

### Task 7: Gating `/ai/receipt` (premium-only + fair-use)

**Files:**
- Modify: `backend/app/api/v1/ai.py` (handler `analyze_receipt`)
- Test: `backend/tests/test_ai_gating_receipt.py`

- [ ] **Step 1: Tulis test gagal**

```python
# backend/tests/test_ai_gating_receipt.py
import io
from unittest.mock import AsyncMock, patch
from main import app
from app.core.auth import get_current_user
from app.core.rate_limit import rate_limit_ai

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE
    app.dependency_overrides[rate_limit_ai] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def _state(is_premium, photo_count=0):
    return {"is_premium": is_premium, "period_ym": "2026-06",
            "chat_count": 0, "photo_count": photo_count,
            "chat_limit": 200 if is_premium else 25, "photo_limit": 100 if is_premium else 0}


def _file():
    return {"file": ("struk.jpg", io.BytesIO(b"\xff\xd8\xff\x00data"), "image/jpeg")}


def test_free_receipt_premium_only_402(client):
    with patch("app.api.v1.ai.load_state", return_value=_state(False)):
        r = client.post("/api/v1/ai/receipt", files=_file(),
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 402
    assert r.json()["detail"]["reason"] == "premium_only"


def test_premium_receipt_success_increments(client):
    result = {"total_amount": 50000, "readable": True, "confidence": 0.8, "items": []}
    with patch("app.api.v1.ai.load_state", return_value=_state(True, 0)), \
         patch("app.api.v1.ai.analyze_receipt_image", new=AsyncMock(return_value=result)), \
         patch("app.api.v1.ai.record_use") as rec:
        r = client.post("/api/v1/ai/receipt", files=_file(),
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    rec.assert_called_once_with("u1", "2026-06", "photo")


def test_premium_receipt_fairuse_429(client):
    with patch("app.api.v1.ai.load_state", return_value=_state(True, 100)):
        r = client.post("/api/v1/ai/receipt", files=_file(),
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 429
    assert r.json()["detail"]["reason"] == "fair_use"
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd backend && python -m pytest tests/test_ai_gating_receipt.py -v`
Expected: FAIL — gating receipt belum ada.

- [ ] **Step 3: Tambah gating di `analyze_receipt`**

Di `backend/app/api/v1/ai.py`, dalam `analyze_receipt`, **setelah** validasi `content_type` & `MAX_FILE_SIZE` (sebelum `try:`), sisipkan:
```python
    state = load_state(current_user["user_id"])
    decision = evaluate(is_premium=state["is_premium"], kind="photo",
                        chat_count=state["chat_count"], photo_count=state["photo_count"])
    if not decision.allowed:
        raise HTTPException(
            status_code=decision.status_code,
            detail={"reason": decision.reason, "feature": "photo",
                    "limit": state["photo_limit"], "used": state["photo_count"]},
        )
```
Lalu ganti blok `try:` aktivasi menjadi:
```python
    try:
        result = await analyze_receipt_image(image_data, file.content_type)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    if result.get("readable") or result.get("total_amount"):
        record_use(current_user["user_id"], state["period_ym"], "photo")
    return result
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `cd backend && python -m pytest tests/test_ai_gating_receipt.py tests/test_ai.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/ai.py backend/tests/test_ai_gating_receipt.py
git commit -m "feat(ai): receipt gating (premium-only + photo fair-use)"
```

---

### Task 8: Endpoint `GET /me/entitlements`

**Files:**
- Create: `backend/app/api/v1/me.py`
- Modify: `backend/main.py` (include router baru)
- Test: `backend/tests/test_me_entitlements.py`

- [ ] **Step 1: Tulis test gagal**

```python
# backend/tests/test_me_entitlements.py
from unittest.mock import patch
from main import app
from app.core.auth import get_current_user

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def test_entitlements_returns_plan_and_quota(client):
    st = {"is_premium": False, "period_ym": "2026-06", "chat_count": 3, "photo_count": 0,
          "chat_limit": 25, "photo_limit": 0}
    with patch("app.api.v1.me.load_state", return_value=st):
        r = client.get("/api/v1/me/entitlements", headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    data = r.json()
    assert data["plan"] == "free"
    assert data["chat_used"] == 3 and data["chat_limit"] == 25
    assert data["photo_limit"] == 0


def test_entitlements_requires_auth(client):
    app.dependency_overrides.pop(get_current_user, None)
    r = client.get("/api/v1/me/entitlements")
    assert r.status_code == 401
    app.dependency_overrides[get_current_user] = lambda: FAKE
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd backend && python -m pytest tests/test_me_entitlements.py -v`
Expected: FAIL — route 404.

- [ ] **Step 3: Buat router `me.py`**

```python
# backend/app/api/v1/me.py
"""Endpoint info akun: status plan & kuota AI."""
from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.core.entitlements import load_state

router = APIRouter()


@router.get("/entitlements")
async def get_entitlements(current_user=Depends(get_current_user)):
    st = load_state(current_user["user_id"])
    return {
        "plan": "premium" if st["is_premium"] else "free",
        "period_ym": st["period_ym"],
        "chat_used": st["chat_count"],
        "chat_limit": st["chat_limit"],
        "photo_used": st["photo_count"],
        "photo_limit": st["photo_limit"],
    }
```

- [ ] **Step 4: Daftarkan router di `main.py`**

Di `backend/main.py`, di blok import router tambah `me`, lalu setelah baris `app.include_router(webhooks.router, ...)` tambah:
```python
app.include_router(me.router, prefix=f"{API_PREFIX}/me", tags=["Me"])
```
(Sesuaikan import: pada baris import existing `from app.api.v1 import ai, imports, webhooks` → tambahkan `me`.)

- [ ] **Step 5: Jalankan, pastikan lulus**

Run: `cd backend && python -m pytest tests/test_me_entitlements.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/me.py backend/main.py backend/tests/test_me_entitlements.py
git commit -m "feat(api): GET /me/entitlements (plan + quota)"
```

---

### Task 9: Regresi penuh & verifikasi manual

- [ ] **Step 1: Seluruh test backend lulus**

Run: `cd backend && python -m pytest -q`
Expected: semua PASS (termasuk test lama `test_ai.py`, `test_health.py`, dst).

- [ ] **Step 2: Verifikasi manual aktivasi premium (manual)**

Karena Plan 1 belum punya pembayaran, premium diaktifkan manual untuk uji: di Supabase set `profiles.plan_type='premium'`, `plan_expires_at` = masa depan untuk satu akun uji. Panggil `GET /api/v1/me/entitlements` (dgn JWT akun itu) → `plan: "premium"`, `chat_limit: 200`, `photo_limit: 100`. Set balik ke `free` → `photo_limit: 0`.

- [ ] **Step 3: Catat hasil & lanjut**

Plan 1 selesai: limit freemium aktif end-to-end (premium via aktivasi manual). Lanjut **Plan 2 (Midtrans Snap)** untuk aktivasi otomatis.

---

## Plan berikutnya (akan ditulis terpisah)

- **Plan 2 — Pembayaran Midtrans Snap:** peta harga server-side + eligibility promo (≤100 user), `POST /api/v1/payments/create` (Snap token), `POST /api/v1/webhooks/midtrans` (verifikasi signature + idempotensi + aktivasi `plan_type/plan_expires_at`), `GET /api/v1/payments/{order_id}/status` (fallback), sandbox config. Bergantung pada tabel `payments` (Task 2).
- **Plan 3 — UI Mobile:** konsumsi `GET /me/entitlements`, indikator kuota di capture, gembok + paywall foto, paywall screen + Snap webview, status plan di settings. Bergantung pada Plan 1 & 2.
