"""Reconcile stuck Mayar payments: paid at provider but profile not yet premium.

This is a one-off operational tool, run manually by an operator. It does NOT
run during normal request flow.

Why it exists
------------
Mayar is gated behind a triple-guard model (ADR-0003). When
``MAYAR_ACTIVATION_ENABLED=false`` the orchestrator intentionally refuses to
flip ``profiles.plan_type`` to ``premium`` and keeps ``payments.status`` as
``pending`` even if Mayar reports the invoice as paid. If a test payment was
made while the gate was closed, the account stays free until a status sync is
re-run with activation enabled.

This script forces activation for the run, then re-syncs the affected Mayar
orders via the existing ``fetch_and_sync_status`` path (the same code used by
``GET /payments/{order_id}/status``). It is idempotent: orders already in a
terminal state (paid/failed/expired) are left untouched.

Usage
-----
Run from the backend directory with the production env loaded (Supabase
service key, MAYAR_API_KEY, etc.):

    # Dry-run (default) — only prints what would change, writes nothing.
    python scripts/reconcile_mayar_payment.py --order-id kw-xxxxxxxx-1234567890-abcdef

    # Sync every still-pending Mayar order (dry-run first):
    python scripts/reconcile_mayar_payment.py --all

    # Apply changes for real:
    python scripts/reconcile_mayar_payment.py --order-id <id> --apply
    python scripts/reconcile_mayar_payment.py --all --apply

Safety
------
* ``--dry-run`` is the default; ``--apply`` is required to write.
* Activation is forced only for this process by setting
  ``settings.MAYAR_ACTIVATION_ENABLED = True`` in-memory. The on-disk env is
  not modified — set ``MAYAR_ACTIVATION_ENABLED=true`` in your real env to keep
  future Mayar payments activating automatically.
* No secrets are printed.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys

# Make ``app.*`` importable when run as a standalone script.
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.core.config import settings  # noqa: E402
from app.services.payment_service import fetch_and_sync_status  # noqa: E402
from app.services.payments import repository as payment_repository  # noqa: E402
from app.core.auth import _get_supabase_service_client  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("reconcile_mayar")


def _list_mayar_payments(client, *, order_id: str | None, statuses: list[str]):
    query = client.table("payments").select(
        "id,user_id,order_id,status,amount,plan,provider,provider_order_id"
    ).eq("provider", "mayar")
    if order_id:
        query = query.eq("order_id", order_id)
    else:
        query = query.in_("status", statuses)
    res = query.order("created_at", desc=True).execute()
    return getattr(res, "data", None) or []


def _sync_one(row: dict, *, apply: bool) -> dict:
    order_id = row["order_id"]
    provider_order_id = row.get("provider_order_id") or order_id
    if apply:
        result = fetch_and_sync_status(
            order_id,
            provider_name="mayar",
            provider_order_id=provider_order_id,
        )
        return {"order_id": order_id, "before": row["status"], "after": result}
    # Dry-run: report current state + Mayar provider status without writing.
    from app.services.payment_service import _mayar_provider, _provider_for_name

    provider = _provider_for_name("mayar")
    try:
        note = provider.fetch_status(provider_order_id)
        provider_status = provider.build_status_response(note).get("provider_status")
        mapped = provider.map_internal_status(note)
    except Exception as exc:  # noqa: BLE001
        provider_status = f"ERROR: {exc}"
        mapped = "unknown"
    return {
        "order_id": order_id,
        "current_status": row["status"],
        "mayar_provider_status": provider_status,
        "would_become": mapped,
        "plan": row.get("plan"),
        "amount": row.get("amount"),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    g = parser.add_mutually_exclusive_group(required=True)
    g.add_argument("--order-id", help="Specific Mayar order_id to reconcile.")
    g.add_argument("--all", action="store_true", help="Reconcile ALL still-pending Mayar orders.")
    parser.add_argument("--apply", action="store_true", help="Actually write changes. Default is dry-run.")
    parser.add_argument("--include-terminal", action="store_true", help="Also list paid/failed/expired Mayar rows (debug).")
    args = parser.parse_args()

    if not settings.MAYAR_API_KEY:
        log.error("MAYAR_API_KEY tidak ter-set di environment. Load env production dulu.")
        sys.exit(2)

    client = _get_supabase_service_client()
    if client is None:
        log.error("Supabase service client tidak tersedia (SUPABASE_SERVICE_ROLE_KEY?).")
        sys.exit(2)

    statuses = ["pending"] if not args.include_terminal else ["pending", "paid", "failed", "expired"]
    rows = _list_mayar_payments(client, order_id=args.order_id, statuses=statuses)
    if not rows:
        log.warning("Tidak ada order Mayar yang cocok (order_id=%s, statuses=%s).", args.order_id, statuses)
        return

    log.info("Ditemukan %d order Mayar. Mode: %s.", len(rows), "APPLY" if args.apply else "DRY-RUN")

    # Force activation for this process only (in-memory override).
    if args.apply:
        settings.MAYAR_ACTIVATION_ENABLED = True
        log.info("MAYAR_ACTIVATION_ENABLED dipaksa True untuk run ini (env on-disk tidak diubah).")

    for row in rows:
        try:
            report = _sync_one(row, apply=args.apply)
            log.info("%s", report)
        except Exception as exc:  # noqa: BLE001
            log.error("order_id=%s gagal: %s", row.get("order_id"), exc)

    if not args.apply:
        log.info("Dry-run selesai. Jalankan ulang dengan --apply untuk benar-benar mengaktifkan premium.")
        log.info("PERINGATAN: demi keamanan permanen, set MAYAR_ACTIVATION_ENABLED=true di env production "
                 "dan tambahkan email ke MAYAR_ALLOWED_EMAILS agar Mayar aktivasi otomatis ke depan.")


if __name__ == "__main__":
    main()
