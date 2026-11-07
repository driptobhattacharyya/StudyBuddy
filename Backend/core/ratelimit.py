"""Tiny in-memory sliding-window rate limiter (per process)."""
from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Callable

from fastapi import HTTPException

from core.config import get_settings


class RateLimiter:
    def __init__(self, max_calls: int | Callable[[], int], window_seconds: float = 60.0,
                 clock: Callable[[], float] = time.monotonic):
        self._max = max_calls
        self.window = window_seconds
        self._clock = clock
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    @property
    def max_calls(self) -> int:
        return self._max() if callable(self._max) else self._max

    def hit(self, key: str) -> float:
        """Record a call. Returns 0 if allowed, else seconds until the next slot."""
        now = self._clock()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] >= self.window:
                q.popleft()
            if len(q) >= self.max_calls:
                return max(self.window - (now - q[0]), 0.001)
            q.append(now)
            if not q:  # pragma: no cover
                del self._hits[key]
            return 0.0

    def check(self, key: str) -> None:
        wait = self.hit(key)
        if wait:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please slow down and try again shortly.",
                headers={"Retry-After": str(int(wait) + 1)},
            )

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


ai_limiter = RateLimiter(lambda: get_settings().rate_limit_ai_per_minute)
run_limiter = RateLimiter(lambda: get_settings().rate_limit_run_per_minute)
auth_limiter = RateLimiter(lambda: get_settings().rate_limit_auth_per_minute)
