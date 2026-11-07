"""Run a program against test cases and compare outputs."""
from __future__ import annotations

from typing import Any

from runner import RunResult, run_suite
from runner.base import OK


def normalize_output(text: str) -> str:
    """Ignore trailing whitespace on each line and trailing blank lines."""
    return "\n".join(line.rstrip() for line in text.replace("\r\n", "\n").strip().split("\n"))


def outputs_match(actual: str, expected: str) -> bool:
    return normalize_output(actual) == normalize_output(expected)


def evaluate_tests(language: str, code: str, tests: list[dict[str, str]]) -> list[dict[str, Any]]:
    """Return one result dict per test case (full detail; callers strip for students)."""
    if not tests:
        return []
    runs: list[RunResult] = run_suite(language, code, [t["input"] for t in tests])
    results = []
    for test, run in zip(tests, runs):
        passed = run.status == OK and outputs_match(run.stdout, test["output"])
        item: dict[str, Any] = {
            "input": test["input"],
            "expected": test["output"],
            "expected_output": test["output"],  # legacy field name
            "output": run.stdout.strip() if len(run.stdout) < 20000 else run.stdout[:20000],
            "passed": passed,
            "status": "Pass" if passed else "Fail",
            "run_status": run.status,
            "time_ms": run.time_ms,
            "error": run.stderr.strip() if run.status != OK else "",
        }
        results.append(item)
    return results


def hide_details(result: dict[str, Any]) -> dict[str, Any]:
    """Strip hidden-test internals: students only learn pass/fail (and a short error class)."""
    return {
        "passed": result["passed"],
        "status": result["status"],
        "run_status": result["run_status"],
        "time_ms": result["time_ms"],
    }


def score(results: list[dict[str, Any]]) -> float:
    """Fraction of passed tests in [0, 1] (0 for an empty list, never divides by zero)."""
    return (sum(1 for r in results if r["passed"]) / len(results)) if results else 0.0
