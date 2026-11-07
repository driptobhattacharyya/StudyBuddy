"""Pluggable, sandboxed code execution. See ``runner.local`` and ``runner.judge0``."""
from __future__ import annotations

import asyncio

from core.config import get_settings
from runner.base import (  # noqa: F401
    COMPILE_ERROR, INTERNAL_ERROR, OK, OUTPUT_LIMIT, RUNTIME_ERROR, SUPPORTED_LANGUAGES, TIMEOUT,
    RunResult, UnsupportedLanguage, normalize_language,
)


def get_runner():
    if get_settings().code_runner == "judge0":
        from runner.judge0 import Judge0Runner

        return Judge0Runner()
    from runner.local import LocalRunner

    return LocalRunner()


def run_suite(language: str, code: str, inputs: list[str]) -> list[RunResult]:
    return get_runner().run_suite(language, code, inputs)


def run_code(language: str, code: str, stdin: str = "") -> RunResult:
    return run_suite(language, code, [stdin])[0]


async def arun_suite(language: str, code: str, inputs: list[str]) -> list[RunResult]:
    """Non-blocking variant: the sandbox work happens in a worker thread."""
    return await asyncio.to_thread(run_suite, language, code, inputs)
