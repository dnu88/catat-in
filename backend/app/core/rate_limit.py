from collections import defaultdict, deque
from threading import Lock
from time import time

from fastapi import Depends, HTTPException, status

from app.core.auth import get_current_user
from app.core.config import settings

_requests: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()
_WINDOW_SECONDS = 60


def _rate_limit_key(scope: str, user_id: str) -> str:
    return f"{scope}:{user_id}"


async def _rate_limit_user(scope: str, limit: int, current_user: dict):
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
    """Rate limiter sederhana untuk endpoint AI: N request per menit per user."""
    await _rate_limit_user("ai", settings.RATE_LIMIT_AI_ENDPOINT, current_user)
    return current_user


async def rate_limit_import(current_user: dict = Depends(get_current_user)):
    """Rate limiter untuk endpoint import file/confirm: N request per menit per user."""
    await _rate_limit_user("import", settings.RATE_LIMIT_IMPORT_ENDPOINT, current_user)
    return current_user
