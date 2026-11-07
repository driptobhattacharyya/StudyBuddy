"""Hardened local subprocess runner.

Isolation provided (best effort, no container needed):
  * a fresh temporary directory per run, used as cwd and HOME, removed afterwards
  * environment stripped to a minimal PATH
  * POSIX rlimits applied in the child: CPU time, address space (python), file size,
    open files, process count, core dumps off
  * wall-clock timeout; the whole process group is killed on timeout
  * stdout/stderr capped; the run is aborted when the cap is exceeded
  * bounded concurrency; blocking work happens in worker threads (see ``arun_suite``)

For real multi-tenant use put the API in a locked-down container (see Dockerfile)
or use ``CODE_RUNNER=judge0``.
"""
from __future__ import annotations

import logging
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time

from core.config import get_settings
from runner.base import (
    COMPILE_ERROR,
    INTERNAL_ERROR,
    OK,
    OUTPUT_LIMIT,
    RUNTIME_ERROR,
    TIMEOUT,
    RunResult,
    normalize_language,
)

try:  # POSIX only
    import resource
except ImportError:  # pragma: no cover
    resource = None  # type: ignore[assignment]

log = logging.getLogger(__name__)

_MAX_STDIN = 256 * 1024
_semaphore: threading.BoundedSemaphore | None = None
_semaphore_size = 0
_sem_lock = threading.Lock()


def _get_semaphore() -> threading.BoundedSemaphore:
    global _semaphore, _semaphore_size
    size = max(1, get_settings().code_max_concurrency)
    with _sem_lock:
        if _semaphore is None or size != _semaphore_size:
            _semaphore, _semaphore_size = threading.BoundedSemaphore(size), size
        return _semaphore


def _make_preexec(cpu_seconds: int, memory_bytes: int | None, max_procs: int):
    def _apply() -> None:  # runs in the forked child, keep it tiny and allocation-light
        os.setsid()
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 1))
        resource.setrlimit(resource.RLIMIT_FSIZE, (2 * 1024 * 1024, 2 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_NOFILE, (256, 256))
        if memory_bytes:
            resource.setrlimit(resource.RLIMIT_AS, (memory_bytes, memory_bytes))
        if max_procs:
            resource.setrlimit(resource.RLIMIT_NPROC, (max_procs, max_procs))

    return _apply


def _kill_group(proc: subprocess.Popen) -> None:
    try:
        os.killpg(proc.pid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        pass
    try:
        proc.kill()
    except ProcessLookupError:
        pass


class _Reader(threading.Thread):
    """Reads a pipe up to a byte cap; flags when the cap is exceeded."""

    def __init__(self, stream, cap: int, on_overflow):
        super().__init__(daemon=True)
        self.stream, self.cap, self.on_overflow = stream, cap, on_overflow
        self.buf = bytearray()
        self.overflow = False

    def run(self) -> None:
        try:
            while True:
                chunk = self.stream.read(8192)
                if not chunk:
                    return
                room = self.cap - len(self.buf)
                if len(chunk) > room:
                    self.buf += chunk[: max(room, 0)]
                    self.overflow = True
                    self.on_overflow()
                    return
                self.buf += chunk
        except (ValueError, OSError):
            return


def _feed_stdin(proc: subprocess.Popen, data: bytes) -> None:
    try:
        proc.stdin.write(data)
        proc.stdin.close()
    except (BrokenPipeError, OSError, ValueError):
        pass


def _decode(buf: bytes | bytearray) -> str:
    return bytes(buf).decode("utf-8", errors="replace")


def _clean_stderr(text: str, workdir: str) -> str:
    return text.replace(workdir + "/", "").replace(workdir, "")[-4000:]


class LocalRunner:
    def __init__(self) -> None:
        self.settings = get_settings()

    # --------------------------------------------------------------- public
    def run_suite(self, language: str, code: str, inputs: list[str]) -> list[RunResult]:
        language = normalize_language(language)
        if resource is None:  # pragma: no cover
            raise RuntimeError("The local code runner requires a POSIX system")
        if len(code.encode("utf-8", errors="replace")) > self.settings.code_max_source_bytes:
            return [RunResult(COMPILE_ERROR, stderr="Source code is too large") for _ in inputs]
        with _get_semaphore(), tempfile.TemporaryDirectory(prefix="sb-run-") as workdir:
            os.chmod(workdir, 0o755)
            try:
                command, compile_error = self._prepare(language, code, workdir)
            except FileNotFoundError as exc:
                log.error("Interpreter missing for %s: %s", language, exc)
                return [RunResult(INTERNAL_ERROR, stderr=f"{language} is not available on this server") for _ in inputs]
            if compile_error is not None:
                return [compile_error for _ in inputs]
            return [self._execute(language, command, workdir, stdin) for stdin in inputs]

    # -------------------------------------------------------------- helpers
    def _env(self, workdir: str) -> dict[str, str]:
        return {
            "PATH": "/usr/local/bin:/usr/bin:/bin",
            "HOME": workdir,
            "TMPDIR": workdir,
            "LANG": "C.UTF-8",
            "PYTHONIOENCODING": "utf-8",
            "PYTHONDONTWRITEBYTECODE": "1",
            "NODE_OPTIONS": "",
        }

    def _prepare(self, language: str, code: str, workdir: str):
        """Write sources, compile if needed. Returns (command, compile_error_result)."""
        if language == "python":
            path = os.path.join(workdir, "main.py")
            _write(path, code)
            return [sys.executable, "-I", "-B", "main.py"], None
        if language == "javascript":
            node = shutil.which("node") or shutil.which("nodejs")
            if not node:
                raise FileNotFoundError("node")
            _write(os.path.join(workdir, "main.js"), code)
            return [node, "--max-old-space-size=%d" % min(self.settings.code_memory_mb, 256), "main.js"], None
        # java
        javac, java = shutil.which("javac"), shutil.which("java")
        if not javac or not java:
            raise FileNotFoundError("javac/java")
        match = re.search(r"public\s+(?:final\s+|abstract\s+)*(?:class|interface|enum|record)\s+(\w+)", code)
        class_name = match.group(1) if match else "Main"
        _write(os.path.join(workdir, f"{class_name}.java"), code)
        result = self._spawn(
            [javac, "-J-Xmx256m", "-J-XX:+UseSerialGC", "-encoding", "UTF-8", "-d", ".", f"{class_name}.java"],
            workdir, b"", timeout=max(self.settings.code_timeout_seconds * 4, 20), memory=False,
        )
        if result.status != OK:
            stderr = result.stderr or "Compilation failed"
            status = COMPILE_ERROR if result.status in (RUNTIME_ERROR, COMPILE_ERROR) else result.status
            return None, RunResult(status, stderr=stderr, exit_code=result.exit_code, time_ms=result.time_ms)
        return [java, "-Xmx128m", "-Xss512k", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1",
                "-XX:-UsePerfData", "-Xshare:auto", "-cp", ".", class_name], None

    def _execute(self, language: str, command: list[str], workdir: str, stdin: str) -> RunResult:
        data = stdin.encode("utf-8", errors="replace")[:_MAX_STDIN]
        # V8 and the JVM reserve huge virtual ranges, so an address-space rlimit would break them;
        # they get heap flags instead (see _prepare).
        return self._spawn(command, workdir, data, timeout=self.settings.code_timeout_seconds,
                           memory=(language == "python"))

    def _spawn(self, command: list[str], workdir: str, stdin: bytes, timeout: float, memory: bool) -> RunResult:
        s = self.settings
        preexec = _make_preexec(
            cpu_seconds=int(timeout) + 2,
            memory_bytes=s.code_memory_mb * 1024 * 1024 if memory else None,
            max_procs=s.code_max_procs,
        )
        started = time.monotonic()
        try:
            proc = subprocess.Popen(
                command, cwd=workdir, env=self._env(workdir), stdin=subprocess.PIPE,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, preexec_fn=preexec,  # noqa: PLW1509
                close_fds=True,
            )
        except OSError as exc:
            log.exception("Failed to start sandboxed process")
            return RunResult(INTERNAL_ERROR, stderr=f"Could not start process: {exc.strerror or exc}")

        overflow = threading.Event()
        kill = lambda: (overflow.set(), _kill_group(proc))  # noqa: E731
        out_r = _Reader(proc.stdout, s.code_max_output_bytes, kill)
        err_r = _Reader(proc.stderr, 16384, kill)
        in_t = threading.Thread(target=_feed_stdin, args=(proc, stdin), daemon=True)
        for t in (out_r, err_r, in_t):
            t.start()

        timed_out = False
        try:
            proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            _kill_group(proc)
            proc.wait()
        # make sure nothing in the group lingers (e.g. forked children)
        _kill_group(proc)
        for t in (out_r, err_r):
            t.join(timeout=2)
        elapsed = int((time.monotonic() - started) * 1000)

        stdout, stderr = _decode(out_r.buf), _clean_stderr(_decode(err_r.buf), workdir)
        truncated = out_r.overflow or err_r.overflow
        if timed_out:
            return RunResult(TIMEOUT, stdout, stderr or "Time limit exceeded", proc.returncode, elapsed, truncated)
        if truncated and overflow.is_set():
            return RunResult(OUTPUT_LIMIT, stdout, stderr or "Output limit exceeded", proc.returncode, elapsed, True)
        if proc.returncode != 0:
            if proc.returncode in (-signal.SIGKILL, -signal.SIGXCPU):
                return RunResult(TIMEOUT, stdout, stderr or "Time or resource limit exceeded", proc.returncode, elapsed, truncated)
            return RunResult(RUNTIME_ERROR, stdout, stderr, proc.returncode, elapsed, truncated)
        return RunResult(OK, stdout, stderr, 0, elapsed, truncated)


def _write(path: str, text: str) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
