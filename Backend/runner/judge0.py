"""Judge0 backend (self-hosted or hosted). Enable with CODE_RUNNER=judge0."""
from __future__ import annotations

import base64
import logging

import httpx

from core.config import get_settings
from runner.base import (
    COMPILE_ERROR, INTERNAL_ERROR, OK, RUNTIME_ERROR, TIMEOUT, RunResult, normalize_language,
)

log = logging.getLogger(__name__)

LANGUAGE_IDS = {"python": 71, "javascript": 63, "java": 62}  # Python 3.8, Node 12, OpenJDK 13 (Judge0 CE defaults)


def _b64(text: str) -> str:
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


def _unb64(text: str | None) -> str:
    if not text:
        return ""
    try:
        return base64.b64decode(text).decode("utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        return text


class Judge0Runner:
    def __init__(self, client: httpx.Client | None = None) -> None:
        self.settings = get_settings()
        self._client = client

    def _http(self) -> httpx.Client:
        if self._client is not None:
            return self._client
        s = self.settings
        headers = {s.judge0_auth_header: s.judge0_api_key} if s.judge0_api_key else {}
        return httpx.Client(base_url=s.judge0_url.rstrip("/"), headers=headers, timeout=s.code_timeout_seconds + 30)

    def run_suite(self, language: str, code: str, inputs: list[str]) -> list[RunResult]:
        language = normalize_language(language)
        if not self.settings.judge0_url and self._client is None:
            return [RunResult(INTERNAL_ERROR, stderr="JUDGE0_URL is not configured") for _ in inputs]
        client = self._http()
        try:
            return [self._one(client, language, code, stdin) for stdin in inputs]
        finally:
            if self._client is None:
                client.close()

    def _one(self, client: httpx.Client, language: str, code: str, stdin: str) -> RunResult:
        payload = {
            "language_id": LANGUAGE_IDS[language],
            "source_code": _b64(code),
            "stdin": _b64(stdin),
            "cpu_time_limit": self.settings.code_timeout_seconds,
            "wall_time_limit": self.settings.code_timeout_seconds * 2,
            "memory_limit": self.settings.code_memory_mb * 1024,
        }
        try:
            res = client.post("/submissions", params={"base64_encoded": "true", "wait": "true"}, json=payload)
            res.raise_for_status()
            data = res.json()
        except (httpx.HTTPError, ValueError):
            log.exception("Judge0 request failed")
            return RunResult(INTERNAL_ERROR, stderr="Code execution service unavailable")

        status_id = (data.get("status") or {}).get("id", 0)
        stdout = _unb64(data.get("stdout"))
        stderr = _unb64(data.get("stderr")) or _unb64(data.get("compile_output")) or _unb64(data.get("message"))
        elapsed = int(float(data.get("time") or 0) * 1000)
        limit = self.settings.code_max_output_bytes
        truncated = len(stdout) > limit
        stdout = stdout[:limit]
        if status_id == 3:
            return RunResult(OK, stdout, stderr, 0, elapsed, truncated)
        if status_id == 5:
            return RunResult(TIMEOUT, stdout, stderr or "Time limit exceeded", None, elapsed, truncated)
        if status_id == 6:
            return RunResult(COMPILE_ERROR, stdout, stderr, None, elapsed, truncated)
        if status_id in (7, 8, 9, 10, 11, 12):
            return RunResult(RUNTIME_ERROR, stdout, stderr, data.get("exit_code"), elapsed, truncated)
        return RunResult(INTERNAL_ERROR, stdout, stderr or "Execution failed", None, elapsed, truncated)
