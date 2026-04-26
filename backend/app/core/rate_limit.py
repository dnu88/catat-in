from collections import defaultdict, deque
from threading import Lock
from time import time

from fastapi import Depends, HTTPException, status

from app.core.auth import get_current_user
from app.core.config import settings

_requests: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()
_WINDOW_SECONDS = 60


async def rate_limit_ai(current_user: dict = Depends(get_current_user)):
    """Rate limiter sederhana untuk endpoint AI: N request per menit per user."""
    now = time()
    key = current_user["user_id"]

    with _lock:
        user_requests = _requests[key]
        while user_requests and (now - user_requests[0]) >= _WINDOW_SECONDS:
            user_requests.popleft()

        if len(user_requests) >= settings.RATE_LIMIT_AI_ENDPOINT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Batas penggunaan AI tercapai. Coba lagi dalam 1 menit.",
            )

        user_requests.append(now)
