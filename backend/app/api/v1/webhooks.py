"""Webhook handlers for payment notification callbacks.

- ``POST /midtrans``: Midtrans payment notification. Signature-verified via
  the Midtrans ``signature_key`` HMAC-SHA512 scheme before activation.
- ``POST /mayar``: Mayar payment notification. Mayar does NOT sign webhooks, so
  this handler is gated behind ``MAYAR_WEBHOOKS_ENABLED`` and optionally a soft
  ``MAYAR_MERCHANT_ID`` check, then delegates to ``reconcile_mayar_notification``
  which re-fetches the authoritative status from Mayar's authenticated Invoice
  API before any premium activation. The webhook payload itself is never trusted
  as a source of truth. See ADR-0003.
"""
from fastapi import APIRouter, Request, HTTPException, status

from app.core.config import settings
from app.core.rate_limit import track_mayar_invalid, is_ip_blocked
from app.services.payment_service import (
    MayarApiError,
    verify_notification_signature, activate_premium_from_notification,
    verify_mayar_notification_signature, reconcile_mayar_notification,
)

router = APIRouter()


@router.post("/midtrans")
async def midtrans_notification(request: Request):
    payload = await request.json()
    if not verify_notification_signature(payload):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="signature invalid")
    internal_status = activate_premium_from_notification(payload)
    return {"status": internal_status}


@router.post("/mayar")
async def mayar_notification(request: Request):
    # Guard 0 — IP permanently blocked after repeated invalid payloads.
    if is_ip_blocked(request):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                           detail="Akses diblokir — terlalu banyak payload tidak valid.")

    # Guard 1 — endpoint disabled until the operator opts in. Respond 404 so the
    # endpoint is not discoverable/probed when Mayar webhooks are not in use.
    if not settings.MAYAR_WEBHOOKS_ENABLED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

    # Guard 2 — malformed JSON body. Track invalid payload per IP.
    try:
        payload = await request.json()
    except Exception as exc:  # noqa: BLE001 — malformed JSON body
        blocked = track_mayar_invalid(request)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="invalid JSON body"
        ) from exc

    # Guard 3 — payload must be a JSON object. Track invalid payload per IP.
    if not isinstance(payload, dict):
        track_mayar_invalid(request)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="payload must be a JSON object"
        )

    # Guard 4 — optional soft-auth (Mayar has no cryptographic signature). When
    # MAYAR_MERCHANT_ID is configured, reject cross-merchant payloads before
    # triggering a Mayar API re-fetch. When unset, fall through to the
    # re-fetch-from-API trust model. Track invalid payload per IP.
    if settings.MAYAR_MERCHANT_ID and not verify_mayar_notification_signature(payload):
        track_mayar_invalid(request)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="mayar merchant mismatch")

    try:
        return reconcile_mayar_notification(payload)
    except MayarApiError as exc:
        # Upstream Mayar API error -> 502 Bad Gateway. Filter API-key leakage.
        inner = str(exc)
        detail = "Gagal memverifikasi status pembayaran Mayar."
        if inner and "api key" not in inner.lower() and "key=" not in inner.lower():
            detail = f"{detail} {inner}"
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc
    except RuntimeError as exc:
        # Our own infra unavailable (Supabase) or Mayar misconfig (API key / base
        # URL not set) -> 503 Service Unavailable. Mayar upstream errors are raised
        # as MayarApiError (caught above), so they never reach this branch.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Layanan pembayaran sedang tidak tersedia.",
        ) from exc
    except Exception as exc:  # noqa: BLE001 — unexpected upstream failure (e.g. httpx)
        inner = str(exc)
        detail = "Gagal memverifikasi status pembayaran Mayar."
        if inner and "api key" not in inner.lower() and "key=" not in inner.lower():
            detail = f"{detail} {inner}"
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc
