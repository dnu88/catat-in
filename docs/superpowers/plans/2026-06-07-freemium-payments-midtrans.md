# Freemium Payments — Midtrans Snap (Plan 2/3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Aktivasi Premium otomatis lewat Midtrans Snap (QRIS + GoPay + ShopeePay) dengan harga server-side + promo 100 user pertama, webhook idempoten, dan fallback status-check. Sandbox dulu.

**Architecture:** Layanan tipis `payment_service.py` (logika harga/promo + wrapper Snap + verifikasi signature, semuanya testable). Endpoint `payments.py` (create + status) dan `webhooks.py` (notifikasi). Aktivasi menulis ke `profiles` + `payments` via service role. Tabel `payments` sudah dibuat di Plan 1.

**Tech Stack:** FastAPI, `midtransclient==1.4.2` (sudah dependency), Supabase service role, pytest.

**Spec:** `docs/superpowers/specs/2026-06-07-freemium-ai-monetization-design.md` · **Branch:** `feat/freemium-ai-monetization`
**Prasyarat:** Plan 1 selesai (tabel `payments`, config harga, `_get_supabase_service_client`).

> Test backend: `cd backend && python -m pytest`.

---

### Task 1: Logika harga & tier promo (murni)

**Files:**
- Create: `backend/app/services/payment_service.py`
- Test: `backend/tests/test_payment_pricing.py`

- [ ] **Step 1: Test gagal**

```python
# backend/tests/test_payment_pricing.py
import pytest
from app.services import payment_service as ps


def test_price_for_promo_and_normal():
    assert ps.price_for("monthly", "promo") == 29000
    assert ps.price_for("monthly", "normal") == 39000
    assert ps.price_for("yearly", "promo") == 249000
    assert ps.price_for("yearly", "normal") == 349000


def test_tier_for_count_boundary():
    assert ps.tier_for_count(0) == "promo"
    assert ps.tier_for_count(99) == "promo"
    assert ps.tier_for_count(100) == "normal"
    assert ps.tier_for_count(500) == "normal"


def test_price_for_invalid_plan():
    with pytest.raises(ValueError):
        ps.price_for("weekly", "promo")
```

- [ ] **Step 2: Jalankan, gagal**

Run: `cd backend && python -m pytest tests/test_payment_pricing.py -v` → FAIL (modul belum ada).

- [ ] **Step 3: Implementasi**

```python
# backend/app/services/payment_service.py
"""Midtrans Snap: harga/promo, pembuatan transaksi, verifikasi notifikasi."""
import hashlib
from app.core.config import settings

_PRICES = {
    "monthly": {"promo": "PRICE_MONTHLY_PROMO", "normal": "PRICE_MONTHLY_NORMAL"},
    "yearly": {"promo": "PRICE_YEARLY_PROMO", "normal": "PRICE_YEARLY_NORMAL"},
}
_DURATION_DAYS = {"monthly": 30, "yearly": 365}


def price_for(plan: str, tier: str) -> int:
    if plan not in _PRICES or tier not in ("promo", "normal"):
        raise ValueError(f"plan/tier tak valid: {plan}/{tier}")
    return int(getattr(settings, _PRICES[plan][tier]))


def tier_for_count(paid_user_count: int) -> str:
    return "promo" if paid_user_count < settings.PROMO_MAX_SUBSCRIBERS else "normal"


def duration_days(plan: str) -> int:
    if plan not in _DURATION_DAYS:
        raise ValueError(f"plan tak valid: {plan}")
    return _DURATION_DAYS[plan]
```

- [ ] **Step 4: Jalankan, lulus** → `pytest tests/test_payment_pricing.py -v` PASS
- [ ] **Step 5: Commit**

```bash
git add backend/app/services/payment_service.py backend/tests/test_payment_pricing.py
git commit -m "feat(payments): server-side pricing + promo tier logic"
```

---

### Task 2: Verifikasi signature + pemetaan status (murni)

**Files:**
- Modify: `backend/app/services/payment_service.py`
- Test: `backend/tests/test_payment_signature.py`

- [ ] **Step 1: Test gagal**

```python
# backend/tests/test_payment_signature.py
import hashlib
from unittest.mock import patch
from app.services import payment_service as ps


def _sig(order_id, status_code, gross, server_key):
    return hashlib.sha512(f"{order_id}{status_code}{gross}{server_key}".encode()).hexdigest()


def test_verify_signature_ok():
    with patch.object(ps.settings, "MIDTRANS_SERVER_KEY", "SK-test"):
        payload = {"order_id": "kw-1", "status_code": "200", "gross_amount": "29000.00",
                   "signature_key": _sig("kw-1", "200", "29000.00", "SK-test")}
        assert ps.verify_notification_signature(payload) is True


def test_verify_signature_bad():
    with patch.object(ps.settings, "MIDTRANS_SERVER_KEY", "SK-test"):
        payload = {"order_id": "kw-1", "status_code": "200", "gross_amount": "29000.00",
                   "signature_key": "deadbeef"}
        assert ps.verify_notification_signature(payload) is False


def test_map_status():
    assert ps.map_status("settlement", "accept") == "paid"
    assert ps.map_status("capture", "accept") == "paid"
    assert ps.map_status("capture", "challenge") == "pending"
    assert ps.map_status("pending", None) == "pending"
    assert ps.map_status("deny", None) == "failed"
    assert ps.map_status("cancel", None) == "failed"
    assert ps.map_status("expire", None) == "expired"
```

- [ ] **Step 2: Jalankan, gagal** → FAIL
- [ ] **Step 3: Implementasi (tambah ke `payment_service.py`)**

```python
def verify_notification_signature(payload: dict) -> bool:
    raw = (f"{payload.get('order_id','')}{payload.get('status_code','')}"
           f"{payload.get('gross_amount','')}{settings.MIDTRANS_SERVER_KEY or ''}")
    expected = hashlib.sha512(raw.encode()).hexdigest()
    return expected == payload.get("signature_key", "")


def map_status(transaction_status: str, fraud_status: str | None) -> str:
    if transaction_status in ("settlement",) or (
        transaction_status == "capture" and fraud_status == "accept"
    ):
        return "paid"
    if transaction_status == "capture":  # fraud challenge
        return "pending"
    if transaction_status == "pending":
        return "pending"
    if transaction_status in ("deny", "cancel"):
        return "failed"
    if transaction_status in ("expire", "failure"):
        return "expired"
    return "pending"
```

- [ ] **Step 4: Lulus** → PASS
- [ ] **Step 5: Commit**

```bash
git add backend/app/services/payment_service.py backend/tests/test_payment_signature.py
git commit -m "feat(payments): notification signature verify + status mapping"
```

---

### Task 3: Wrapper Snap (buat transaksi) + order_id

**Files:**
- Modify: `backend/app/services/payment_service.py`
- Test: `backend/tests/test_payment_snap.py`

- [ ] **Step 1: Test gagal**

```python
# backend/tests/test_payment_snap.py
from unittest.mock import MagicMock, patch
from app.services import payment_service as ps


def test_make_order_id_unique_prefix():
    oid = ps.make_order_id("user-abcdefgh")
    assert oid.startswith("kw-")


def test_create_snap_transaction_passes_params():
    fake_snap = MagicMock()
    fake_snap.create_transaction.return_value = {"token": "tok-1", "redirect_url": "https://snap/tok-1"}
    with patch.object(ps, "_snap_client", return_value=fake_snap), \
         patch.object(ps.settings, "MIDTRANS_SERVER_KEY", "SK"):
        out = ps.create_snap_transaction(order_id="kw-x", amount=29000, plan="monthly",
                                         email="u@example.com")
    assert out["token"] == "tok-1"
    arg = fake_snap.create_transaction.call_args[0][0]
    assert arg["transaction_details"]["order_id"] == "kw-x"
    assert arg["transaction_details"]["gross_amount"] == 29000
    assert set(arg["enabled_payments"]) >= {"qris", "gopay", "shopeepay"}
```

- [ ] **Step 2: Jalankan, gagal** → FAIL
- [ ] **Step 3: Implementasi**

```python
import time
import midtransclient


def _snap_client():
    return midtransclient.Snap(
        is_production=bool(settings.MIDTRANS_IS_PRODUCTION),
        server_key=settings.MIDTRANS_SERVER_KEY or "",
        client_key=settings.MIDTRANS_CLIENT_KEY or "",
    )


def make_order_id(user_id: str) -> str:
    return f"kw-{user_id[:8]}-{int(time.time())}"


def create_snap_transaction(*, order_id: str, amount: int, plan: str, email: str) -> dict:
    snap = _snap_client()
    param = {
        "transaction_details": {"order_id": order_id, "gross_amount": amount},
        "enabled_payments": ["qris", "gopay", "shopeepay"],
        "item_details": [{"id": f"premium-{plan}", "price": amount, "quantity": 1,
                          "name": f"Kaswise Premium ({plan})"}],
        "customer_details": {"email": email},
    }
    res = snap.create_transaction(param)
    return {"token": res["token"], "redirect_url": res["redirect_url"]}
```

- [ ] **Step 4: Lulus** → PASS
- [ ] **Step 5: Commit**

```bash
git add backend/app/services/payment_service.py backend/tests/test_payment_snap.py
git commit -m "feat(payments): Snap transaction wrapper + order_id"
```

---

### Task 4: Aktivasi premium + repositori payments (akses data)

**Files:**
- Modify: `backend/app/services/payment_service.py`
- Test: `backend/tests/test_payment_repo.py`

- [ ] **Step 1: Test gagal**

```python
# backend/tests/test_payment_repo.py
from types import SimpleNamespace
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from app.services import payment_service as ps


def _resp(data):
    return SimpleNamespace(data=data)


def test_count_paid_users():
    client = MagicMock()
    q = client.table.return_value.select.return_value.eq.return_value
    q.execute.return_value = _resp([{"user_id": "a"}, {"user_id": "a"}, {"user_id": "b"}])
    with patch.object(ps, "_get_supabase_service_client", return_value=client):
        assert ps.count_paid_users() == 2  # distinct


def test_activate_premium_updates_profile_and_payment():
    client = MagicMock()
    # payment row lookup -> pending, plan monthly
    pay = client.table.return_value.select.return_value.eq.return_value.limit.return_value
    pay.execute.return_value = _resp([{"id": "p1", "user_id": "u1", "plan": "monthly",
                                       "status": "pending"}])
    # profile expiry lookup -> none
    prof = client.table.return_value.select.return_value.eq.return_value.limit.return_value
    with patch.object(ps, "_get_supabase_service_client", return_value=client), \
         patch.object(ps, "_now", return_value=datetime(2026, 6, 7, tzinfo=timezone.utc)):
        result = ps.activate_premium_from_notification(
            {"order_id": "kw-x", "transaction_status": "settlement",
             "fraud_status": "accept", "payment_type": "qris"})
    assert result == "paid"
    # profiles update dipanggil dgn plan_type premium
    update_calls = [c for c in client.table.return_value.update.call_args_list]
    assert any("plan_type" in (c.args[0] if c.args else {}) for c in update_calls)
```

- [ ] **Step 2: Jalankan, gagal** → FAIL
- [ ] **Step 3: Implementasi**

```python
from datetime import datetime, timedelta, timezone
from app.core.auth import _get_supabase_service_client


def _now():
    return datetime.now(timezone.utc)


def count_paid_users() -> int:
    client = _get_supabase_service_client()
    if client is None:
        return 0
    res = client.table("payments").select("user_id").eq("status", "paid").execute()
    rows = getattr(res, "data", None) or []
    return len({r["user_id"] for r in rows})


def activate_premium_from_notification(payload: dict) -> str:
    """Idempoten: verifikasi sudah dilakukan caller. Return status internal."""
    client = _get_supabase_service_client()
    order_id = payload.get("order_id", "")
    new_status = map_status(payload.get("transaction_status", ""), payload.get("fraud_status"))
    if client is None:
        return new_status

    pay = (client.table("payments").select("id,user_id,plan,status")
           .eq("order_id", order_id).limit(1).execute())
    row = pay.data[0] if getattr(pay, "data", None) else None
    if row is None:
        return new_status
    if row["status"] == "paid":   # idempotensi
        return "paid"

    payment_update = {"midtrans_status": payload.get("transaction_status"),
                      "status": new_status, "method": payload.get("payment_type"),
                      "raw_payload": payload}

    if new_status == "paid":
        # perpanjang dari max(now, expiry lama)
        prof = (client.table("profiles").select("plan_expires_at")
                .eq("id", row["user_id"]).limit(1).execute())
        prow = prof.data[0] if getattr(prof, "data", None) else None
        base = _now()
        if prow and prow.get("plan_expires_at"):
            try:
                cur = datetime.fromisoformat(str(prow["plan_expires_at"]).replace("Z", "+00:00"))
                base = max(base, cur)
            except ValueError:
                pass
        until = base + timedelta(days=duration_days(row["plan"]))
        client.table("profiles").update(
            {"plan_type": "premium", "plan_expires_at": until.isoformat()}
        ).eq("id", row["user_id"]).execute()
        payment_update["paid_at"] = _now().isoformat()
        payment_update["granted_until"] = until.isoformat()

    client.table("payments").update(payment_update).eq("order_id", order_id).execute()
    return new_status
```

- [ ] **Step 4: Lulus** → PASS
- [ ] **Step 5: Commit**

```bash
git add backend/app/services/payment_service.py backend/tests/test_payment_repo.py
git commit -m "feat(payments): premium activation + paid-user count (idempotent)"
```

---

### Task 5: Endpoint `POST /api/v1/payments/create`

**Files:**
- Create: `backend/app/api/v1/payments.py`
- Modify: `backend/main.py` (include router)
- Test: `backend/tests/test_payments_create.py`

- [ ] **Step 1: Test gagal**

```python
# backend/tests/test_payments_create.py
from unittest.mock import MagicMock, patch
from main import app
from app.core.auth import get_current_user
from app.core.rate_limit import rate_limit_ai

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def test_create_payment_returns_snap_token(client):
    with patch("app.api.v1.payments.count_paid_users", return_value=0), \
         patch("app.api.v1.payments.create_snap_transaction",
               return_value={"token": "tok-1", "redirect_url": "https://snap/tok-1"}), \
         patch("app.api.v1.payments._insert_pending_payment") as ins:
        r = client.post("/api/v1/payments/create", json={"plan": "monthly"},
                        headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    data = r.json()
    assert data["snap_token"] == "tok-1"
    assert data["amount"] == 29000 and data["price_tier"] == "promo"
    ins.assert_called_once()


def test_create_payment_invalid_plan_422(client):
    r = client.post("/api/v1/payments/create", json={"plan": "weekly"},
                    headers={"Authorization": "Bearer x"})
    assert r.status_code == 422
```

- [ ] **Step 2: Jalankan, gagal** → FAIL (404)
- [ ] **Step 3: Implementasi router**

```python
# backend/app/api/v1/payments.py
"""Endpoint pembayaran Midtrans Snap."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from app.core.auth import get_current_user, _get_supabase_service_client
from app.services.payment_service import (
    price_for, tier_for_count, count_paid_users, make_order_id,
    create_snap_transaction,
)

router = APIRouter()


class CreatePaymentRequest(BaseModel):
    plan: str

    @field_validator("plan")
    @classmethod
    def _valid(cls, v):
        if v not in ("monthly", "yearly"):
            raise ValueError("plan harus 'monthly' atau 'yearly'")
        return v


def _insert_pending_payment(user_id, order_id, plan, amount, tier):
    client = _get_supabase_service_client()
    if client is None:
        return
    client.table("payments").insert({
        "user_id": user_id, "order_id": order_id, "plan": plan,
        "amount": amount, "price_tier": tier, "status": "pending",
    }).execute()


@router.post("/create")
async def create_payment(body: CreatePaymentRequest, current_user=Depends(get_current_user)):
    tier = tier_for_count(count_paid_users())
    amount = price_for(body.plan, tier)
    order_id = make_order_id(current_user["user_id"])
    try:
        snap = create_snap_transaction(order_id=order_id, amount=amount,
                                       plan=body.plan, email=current_user.get("email", ""))
    except Exception as exc:  # midtrans error
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Gagal membuat transaksi pembayaran.") from exc
    _insert_pending_payment(current_user["user_id"], order_id, body.plan, amount, tier)
    return {"order_id": order_id, "amount": amount, "price_tier": tier,
            "plan": body.plan, "snap_token": snap["token"],
            "redirect_url": snap["redirect_url"]}
```

- [ ] **Step 4: Daftarkan router di `main.py`**

Tambah `payments` ke import `from app.api.v1 import ...`, lalu:
```python
app.include_router(payments.router, prefix=f"{API_PREFIX}/payments", tags=["Payments"])
```

- [ ] **Step 5: Lulus** → `pytest tests/test_payments_create.py -v` PASS
- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/payments.py backend/main.py backend/tests/test_payments_create.py
git commit -m "feat(api): POST /payments/create (Snap, server-side price+promo)"
```

---

### Task 6: Webhook `POST /api/v1/webhooks/midtrans`

**Files:**
- Modify: `backend/app/api/v1/webhooks.py`
- Test: `backend/tests/test_webhook_midtrans.py`

- [ ] **Step 1: Test gagal**

```python
# backend/tests/test_webhook_midtrans.py
from unittest.mock import patch
from main import app  # noqa


def test_webhook_bad_signature_403(client):
    with patch("app.api.v1.webhooks.verify_notification_signature", return_value=False):
        r = client.post("/api/v1/webhooks/midtrans", json={"order_id": "kw-x"})
    assert r.status_code == 403


def test_webhook_valid_activates(client):
    payload = {"order_id": "kw-x", "transaction_status": "settlement",
               "fraud_status": "accept", "status_code": "200", "gross_amount": "29000.00",
               "signature_key": "ok"}
    with patch("app.api.v1.webhooks.verify_notification_signature", return_value=True), \
         patch("app.api.v1.webhooks.activate_premium_from_notification",
               return_value="paid") as act:
        r = client.post("/api/v1/webhooks/midtrans", json=payload)
    assert r.status_code == 200
    assert r.json()["status"] == "paid"
    act.assert_called_once()
```

- [ ] **Step 2: Jalankan, gagal** → FAIL
- [ ] **Step 3: Implementasi (ganti isi `webhooks.py`, tetap pakai `router` yang ada)**

```python
# backend/app/api/v1/webhooks.py
"""Webhook handler (Midtrans payment notification)."""
from fastapi import APIRouter, Request, HTTPException, status

from app.services.payment_service import (
    verify_notification_signature, activate_premium_from_notification,
)

router = APIRouter()


@router.post("/midtrans")
async def midtrans_notification(request: Request):
    payload = await request.json()  # raw JSON dari Midtrans
    if not verify_notification_signature(payload):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="signature invalid")
    internal_status = activate_premium_from_notification(payload)
    return {"status": internal_status}
```

> Catatan deploy: pastikan proxy (NPM/Cloudflare) tidak mengubah body; daftarkan URL `https://api.kaswise.com/api/v1/webhooks/midtrans` di dashboard Midtrans. `TrustedHostMiddleware` sudah mengizinkan `api.kaswise.com`? (host backend) — verifikasi `ALLOWED_HOSTS`.

- [ ] **Step 4: Lulus** → PASS (jalankan juga regresi `tests/` penuh)
- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/webhooks.py backend/tests/test_webhook_midtrans.py
git commit -m "feat(api): Midtrans webhook (verify + idempotent activation)"
```

---

### Task 7: Fallback `GET /api/v1/payments/{order_id}/status`

**Files:**
- Modify: `backend/app/services/payment_service.py` (tambah `fetch_and_sync_status`)
- Modify: `backend/app/api/v1/payments.py` (route status)
- Test: `backend/tests/test_payments_status.py`

- [ ] **Step 1: Test gagal**

```python
# backend/tests/test_payments_status.py
from unittest.mock import MagicMock, patch
from main import app
from app.core.auth import get_current_user

FAKE = {"user_id": "u1", "email": "u1@example.com"}


def setup_module():
    app.dependency_overrides[get_current_user] = lambda: FAKE


def teardown_module():
    app.dependency_overrides.clear()


def test_status_syncs_from_midtrans(client):
    with patch("app.api.v1.payments.fetch_and_sync_status",
               return_value={"order_id": "kw-x", "status": "paid"}):
        r = client.get("/api/v1/payments/kw-x/status", headers={"Authorization": "Bearer x"})
    assert r.status_code == 200
    assert r.json()["status"] == "paid"
```

- [ ] **Step 2: Jalankan, gagal** → FAIL (404)
- [ ] **Step 3: Implementasi**

Tambah ke `payment_service.py`:
```python
def _core_client():
    return midtransclient.CoreApi(
        is_production=bool(settings.MIDTRANS_IS_PRODUCTION),
        server_key=settings.MIDTRANS_SERVER_KEY or "",
        client_key=settings.MIDTRANS_CLIENT_KEY or "",
    )


def fetch_and_sync_status(order_id: str) -> dict:
    core = _core_client()
    note = core.transactions.status(order_id)  # dict mirip notifikasi
    internal = activate_premium_from_notification(note)
    return {"order_id": order_id, "status": internal,
            "midtrans_status": note.get("transaction_status")}
```
Tambah route di `payments.py`:
```python
from app.services.payment_service import fetch_and_sync_status

@router.get("/{order_id}/status")
async def payment_status(order_id: str, current_user=Depends(get_current_user)):
    try:
        return fetch_and_sync_status(order_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Gagal cek status pembayaran.") from exc
```

- [ ] **Step 4: Lulus** → PASS
- [ ] **Step 5: Commit**

```bash
git add backend/app/services/payment_service.py backend/app/api/v1/payments.py backend/tests/test_payments_status.py
git commit -m "feat(api): GET /payments/{order_id}/status fallback sync"
```

---

### Task 8: Regresi & verifikasi sandbox

- [ ] **Step 1: Semua test lulus** → `cd backend && python -m pytest -q`
- [ ] **Step 2: Set kredensial sandbox**

Di `backend/.env`: `MIDTRANS_IS_PRODUCTION=false`, `MIDTRANS_SERVER_KEY=SB-Mid-server-...`, `MIDTRANS_CLIENT_KEY=SB-Mid-client-...` (dari dashboard Midtrans Sandbox).

- [ ] **Step 3: Uji manual end-to-end (sandbox)**

1. `POST /api/v1/payments/create {plan:"monthly"}` (dgn JWT) → dapat `snap_token` + `redirect_url`.
2. Buka `redirect_url`, bayar pakai simulator QRIS sandbox.
3. Daftarkan webhook sandbox → `https://<host>/api/v1/webhooks/midtrans` (atau picu manual via dashboard "send test notification"); cek `profiles.plan_type='premium'` + `payments.status='paid'`.
4. Bila webhook tak sampai: `GET /api/v1/payments/{order_id}/status` → harus sinkron jadi `paid`.
5. `GET /api/v1/me/entitlements` → `plan: "premium"`.

- [ ] **Step 4: Catatan go-live (jangan dikerjakan sampai approval)**

Flip `MIDTRANS_IS_PRODUCTION=true` + key produksi **hanya setelah** akun merchant disetujui. Sampai itu, tetap sandbox.

---

## Plan berikutnya
**Plan 3 — UI Mobile:** konsumsi `/me/entitlements`, indikator kuota + gembok foto di capture, paywall screen + buka Snap (`expo-web-browser`), status plan di settings, refresh entitlement setelah bayar.
