"""Shared types for code runners."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

SUPPORTED_LANGUAGES = ("python", "javascript", "java")
_ALIASES = {
    "python": "python", "py": "python", "python3": "python",
    "javascript": "javascript", "js": "javascript", "node": "javascript",
    "java": "java",
}

# Run statuses
OK = "ok"
COMPILE_ERROR = "compile_error"
RUNTIME_ERROR = "runtime_error"
TIMEOUT = "timeout"
OUTPUT_LIMIT = "output_limit"
INTERNAL_ERROR = "internal_error"


class UnsupportedLanguage(ValueError):
    pass


def normalize_language(language: str) -> str:
    try:
        return _ALIASES[str(language).strip().lower()]
    except KeyError:
        raise UnsupportedLanguage(f"Unsupported language: {language}") from None


@dataclass
class RunResult:
    status: str
    stdout: str = ""
    stderr: str = ""
    exit_code: int | None = None
    time_ms: int = 0
    truncated: bool = False

    @property
    def ok(self) -> bool:
        return self.status == OK


class Runner(Protocol):
    def run_suite(self, language: str, code: str, inputs: list[str]) -> list[RunResult]:
        """Run ``code`` once per stdin in ``inputs`` (compiling at most once)."""
        ...


@dataclass
class _Limits:
    timeout: float
    max_output: int
    memory_mb: int
    max_procs: int
    extra: dict = field(default_factory=dict)
