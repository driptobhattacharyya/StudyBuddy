import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    if getattr(root, "_studybuddy_configured", False):
        root.setLevel(level.upper())
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)-7s %(name)s: %(message)s"))
    root.handlers = [handler]
    root.setLevel(level.upper())
    root._studybuddy_configured = True  # type: ignore[attr-defined]
    for noisy in ("httpx", "httpcore", "apscheduler.executors.default", "pymongo"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
