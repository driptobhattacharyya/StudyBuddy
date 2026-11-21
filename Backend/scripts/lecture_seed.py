"""Seed a course's lectures at most once, so instructor deletes and edits are never undone."""
from __future__ import annotations

from pymongo.errors import DuplicateKeyError


def seed_lectures_once(db, course_id: str, lectures: list[dict]) -> int:
    """Insert ``lectures`` for a course the first time only; returns how many rows were inserted.

    A ``seed_markers`` document with a unique ``_id`` is inserted first and only the process that wins that
    insert seeds, so concurrent boots cannot both do it. A course that already has lectures (seeded by an
    older version that had no marker) only gets the marker, so nothing an instructor removed comes back.
    """
    try:
        db.seed_markers.insert_one({"_id": f"lectures:{course_id}"})
    except DuplicateKeyError:
        return 0
    if not lectures or db.lecture.count_documents({"course_id": course_id}, limit=1):
        return 0
    db.lecture.insert_many([dict(lec) for lec in lectures])
    return len(lectures)
