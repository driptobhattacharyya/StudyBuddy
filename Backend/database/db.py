"""MongoDB access.

``db`` is a lazy proxy: the real client is only created on first use, so
importing the application never touches the network. Tests (and the demo
"mongomock://" URI) can swap the underlying database with :func:`set_db`.
"""
from __future__ import annotations

import logging
from typing import Any

from core.config import get_settings

log = logging.getLogger(__name__)

_database: Any = None


def _connect() -> Any:
    settings = get_settings()
    uri = settings.mongodb_uri
    if uri.startswith("mongomock://"):
        try:
            import mongomock
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("mongomock:// URIs need `pip install mongomock` (see requirements-dev.txt)") from exc
        log.warning("Using the in-memory mongomock database; data is lost on restart.")
        client = mongomock.MongoClient(tz_aware=True)
    else:
        from pymongo import MongoClient

        client = MongoClient(uri, tz_aware=True, serverSelectionTimeoutMS=5000)
    return client[settings.db_name]


def get_db() -> Any:
    global _database
    if _database is None:
        _database = _connect()
    return _database


def set_db(database: Any) -> None:
    """Replace the active database (used by tests and scripts)."""
    global _database
    _database = database


class _DBProxy:
    def __getattr__(self, name: str) -> Any:
        return getattr(get_db(), name)

    def __getitem__(self, name: str) -> Any:
        return get_db()[name]


db: Any = _DBProxy()


def ensure_indexes() -> None:
    """Create indexes (best effort; failures are logged, never fatal)."""
    try:
        database = get_db()
        database.user.create_index("email", unique=True)
        database.user.create_index("user_id", unique=True)
        database.course.create_index("course_id", unique=True)
        database.flashcard.create_index([("user_id", 1), ("course_id", 1)])
        database.submission.create_index([("user_id", 1), ("assgn_id", 1)], unique=True)
        database.assignment_mark.create_index([("user_id", 1), ("assgn_id", 1)], unique=True)
        database.marks.create_index([("user_id", 1), ("course_id", 1)])
        database.rag_chunks.create_index([("course_id", 1), ("week", 1)])
        database.rag_chunks.create_index("source_id")
    except Exception:  # noqa: BLE001
        log.exception("Could not create database indexes")
