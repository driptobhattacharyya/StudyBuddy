"""AI observability: every AI call is recorded in ``ai_logs`` ("Under the hood")."""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from ai import providers
from core.config import get_settings
from database.db import db

log = logging.getLogger(__name__)


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4) if text else 0


class Trace:
    def __init__(self, user: str, feature: str, system: str, prompt: str,
                 retrieved: list[dict[str, Any]] | None = None) -> None:
        self.id = ObjectId()
        self.user, self.feature, self.system, self.prompt = user, feature, system, prompt
        self.retrieved = [
            {"title": r.get("title"), "week": r.get("week"), "score": r.get("score"),
             "snippet": (r.get("text") or r.get("snippet") or "")[:300]}
            for r in (retrieved or [])
        ]
        self.started = time.monotonic()
        self.latency_ms = 0
        self.tokens_in = estimate_tokens(system + prompt)
        self.tokens_out = 0
        self.finished = False

    @property
    def trace_id(self) -> str:
        return str(self.id)

    def _doc(self, output: str, status: str, error: str | None) -> dict[str, Any]:
        s = get_settings()
        provider = providers.get_provider()
        self.latency_ms = int((time.monotonic() - self.started) * 1000)
        self.tokens_out = estimate_tokens(output)
        free = provider.model.endswith(":free")
        cost = 0.0 if free else (self.tokens_in * s.ai_cost_in_per_mtok + self.tokens_out * s.ai_cost_out_per_mtok) / 1e6
        return {
            "_id": self.id, "user": self.user, "feature": self.feature, "provider": provider.name,
            "model": provider.model, "system_prompt": self.system, "prompt": self.prompt,
            "retrieved": self.retrieved, "output": output[:6000], "tokens_in": self.tokens_in,
            "tokens_out": self.tokens_out, "latency_ms": self.latency_ms, "status": status,
            "error": error, "cost_usd": round(cost, 6), "created_at": datetime.now(timezone.utc),
        }

    def end(self, output: str = "", status: str = "ok", error: str | None = None) -> None:
        if self.finished:
            return
        self.finished = True
        try:
            db.ai_logs.insert_one(self._doc(output, status, error))
        except Exception:  # noqa: BLE001 - logging must never break a request
            log.exception("Could not write ai_logs entry")

    async def aend(self, output: str = "", status: str = "ok", error: str | None = None) -> None:
        await asyncio.to_thread(self.end, output, status, error)

    def meta(self) -> dict[str, Any]:
        provider = providers.get_provider()
        seen, cites = set(), []
        for r in self.retrieved:
            key = (r["title"], r["week"])
            if key not in seen:
                seen.add(key)
                cites.append({"title": r["title"], "week": r["week"]})
        return {"trace_id": self.trace_id, "citations": cites, "model": provider.model,
                "latency_ms": self.latency_ms, "tokens_in": self.tokens_in, "tokens_out": self.tokens_out}
