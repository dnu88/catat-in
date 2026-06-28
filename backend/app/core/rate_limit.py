"""Rate limiting: per-user (dependency-based) and IP-based (middleware).

- ``rate_limit_ai``, ``rate_limit_import``, ``rate_limit_payment_status``
  are FastAPI dependencies that enforce user-scoped limits.
- ``RateLimitMiddleware`` is an ASGI middleware that enforces IP-based
  limits on webhooks and payment endpoints.
- ``track_mayar_invalid`` is called by the Mayar webhook handler when it
  receives an invalid payload, building up a blocklist of abusive IPs.
"""

from collections import defaultdict, deque
from threading import Lock
from time import time

from fastapi import Depends, HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.auth import get_current_user
from app.core.config import settings

# ═══════════════════════════════════════════════════════════════════
#  In-memory stores
# ═══════════════════════════════════════════════════════════════════

# User-scoped requests (dependency-based limiters)
_requests: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()
_WINDOW_SECONDS = 60

# IP-scoped requests (middleware-based limiters)
_ip_requests: dict[str, deque[float]] = defaultdict(deque)
_ip_lock = Lock()

# Invalid payload tracking (Mayar webhook abuse detection)
_ip_invalid_hits: dict[str, int] = defaultdict(int)
_ip_blocked: set[str] = set()
_ip_block_lock = Lock()


# ═══════════════════════════════════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════════════════════════════════

def _rate_limit_key(scope: str, user_id: str) -> str:
    return f"{scope}:{user_id}"


def _get_client_ip(request: Request) -> str:
    """Extract client IP, respecting common proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    client = request.client
    return client.host if client and client.host else "unknown"


# ═══════════════════════════════════════════════════════════════════
#  User-scoped limiters (FastAPI dependencies)
# ═══════════════════════════════════════════════════════════════════

async def _rate_limit_user(scope: str, limit: int, current_user: dict) -> None:
    """Simple per-process user limiter. Use Redis/proxy for multi-instance scale."""
    now = time()
    key = _rate_limit_key(scope, current_user["user_id"])

    with _lock:
        user_requests = _requests[key]
        while user_requests and (now - user_requests[0]) >= _WINDOW_SECONDS:
            user_requests.popleft()

        if len(user_requests) >= limit:
            retry_after = max(1, int(_WINDOW_SECONDS - (now - user_requests[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Batas penggunaan tercapai. Coba lagi dalam 1 menit.",
                headers={"Retry-After": str(retry_after)},
            )

        user_requests.append(now)


async def rate_limit_ai(current_user: dict = Depends(get_current_user)):
    """Rate limiter for AI endpoints.

    - Free users: ``RATE_LIMIT_AI_ENDPOINT`` (default 20 req/min).
    - Premium users: ``RATE_LIMIT_AI_PREMIUM`` (default 100 req/min).
    """
    limit = (
        settings.RATE_LIMIT_AI_PREMIUM
        if current_user.get("is_premium")
        else settings.RATE_LIMIT_AI_ENDPOINT
    )
    await _rate_limit_user("ai", limit, current_user)
    return current_user


async def rate_limit_import(current_user: dict = Depends(get_current_user)):
    """Rate limiter for import endpoints: N request per menit per user."""
    await _rate_limit_user("import", settings.RATE_LIMIT_IMPORT_ENDPOINT, current_user)
    return current_user


async def rate_limit_payment_status(current_user: dict = Depends(get_current_user)):
    """Rate limiter for payment status polling per user."""
    await _rate_limit_user("payment_status", settings.RATE_LIMIT_PAYMENT_STATUS_ENDPOINT, current_user)
    return current_user


# ═══════════════════════════════════════════════════════════════════
#  IP-based limiter (shared helper)
# ═══════════════════════════════════════════════════════════════════

def _check_ip_rate_limit(scope: str, limit: int, request: Request) -> None:
    """Enforce a per-IP rate limit for *scope*.

    Raises ``HTTPException(429)`` when the limit is exceeded, or
    ``HTTPException(403)`` if the IP has been permanently blocked.
    """
    ip = _get_client_ip(request)

    # Permanently blocked IPs
    with _ip_block_lock:
        if ip in _ip_blocked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Akses diblokir karena terlalu banyak permintaan tidak valid.",
            )

    now = time()
    key = f"{scope}:{ip}"

    with _ip_lock:
        ip_reqs = _ip_requests[key]
        while ip_reqs and (now - ip_reqs[0]) >= _WINDOW_SECONDS:
            ip_reqs.popleft()

        if len(ip_reqs) >= limit:
            retry_after = max(1, int(_WINDOW_SECONDS - (now - ip_reqs[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Terlalu banyak permintaan. Coba lagi nanti.",
                headers={"Retry-After": str(retry_after)},
            )

        ip_reqs.append(now)


# ═══════════════════════════════════════════════════════════════════
#  IP-based invalid payload tracking (Mayar webhook abuse)
# ═══════════════════════════════════════════════════════════════════

def track_mayar_invalid(request: Request) -> bool:
    """Record an invalid payload from the caller's IP.

    Returns ``True`` when the IP has just been **permanently blocked**
    (having exceeded ``MAYAR_WEBHOOK_MAX_INVALID_PAYLOADS``).
    Callers can use this to log or alert.
    """
    ip = _get_client_ip(request)
    max_invalid = settings.MAYAR_WEBHOOK_MAX_INVALID_PAYLOADS

    with _ip_block_lock:
        _ip_invalid_hits[ip] += 1
        count = _ip_invalid_hits[ip]
        if count >= max_invalid and ip not in _ip_blocked:
            _ip_blocked.add(ip)
            return True
    return False


def is_ip_blocked(request: Request) -> bool:
    """Check whether the caller's IP is on the permanent blocklist."""
    ip = _get_client_ip(request)
    with _ip_block_lock:
        return ip in _ip_blocked


def get_ip_invalid_count(request: Request) -> int:
    """Return how many invalid payloads this IP has sent (for debugging)."""
    ip = _get_client_ip(request)
    with _ip_block_lock:
        return _ip_invalid_hits.get(ip, 0)


# ═══════════════════════════════════════════════════════════════════
#  ASGI Middleware
# ═══════════════════════════════════════════════════════════════════

class RateLimitMiddleware(BaseHTTPMiddleware):
    """IP-based rate limiting for selected route prefixes.

    Applied limits:

    - ``/api/v1/webhooks/mayar`` → 5 req/min per IP (``MAYAR_WEBHOOK_RATE_LIMIT``).
    - ``/api/v1/payments/*``      → 10 req/min per IP (``RATE_LIMIT_PAYMENTS_IP``).

    Authenticated endpoints (AI, import, payment status) use the
    dependency-based limiters above and are **not** rate-limited here.
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # ── Mayar webhook: 5 req/min per IP ──
        if path == "/api/v1/webhooks/mayar":
            _check_ip_rate_limit("mayar_webhook", settings.MAYAR_WEBHOOK_RATE_LIMIT, request)

        # ── Payment endpoints: 10 req/min per IP ──
        elif path.startswith("/api/v1/payments"):
            _check_ip_rate_limit("payments", settings.RATE_LIMIT_PAYMENTS_IP, request)

        response = await call_next(request)
        return response
