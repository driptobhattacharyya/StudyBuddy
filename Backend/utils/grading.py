"""Grading on submission: per-question marks, aggregated into per-week marks.

* general questions (MCQ / MSQ / Numeric): MSQ requires an exact set match
* coding questions: the code runs in the sandbox against the *private* tests,
  mark = passed / total

``assignment_mark`` stores a 0..1 mark per (user, question); ``marks`` stores the
per (user, course, week, assgn_type) average as a percentage.
"""
from __future__ import annotations

import base64
import binascii
import logging
import math
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from database.db import db
from runner.base import UnsupportedLanguage
from runner.grading import evaluate_tests, score as test_score

log = logging.getLogger(__name__)

NUMERIC_TYPES = {"Numeric", "Numerical", "Float"}


def flatten(answer: Any) -> list:
    if isinstance(answer, (list, tuple)):
        out: list = []
        for a in answer:
            out.extend(flatten(a))
        return out
    return [answer]


def _norm(x: Any) -> str:
    return str(x).strip().lower()


def _to_float(x: Any) -> float | None:
    try:
        return float(str(x).strip())
    except (TypeError, ValueError):
        return None


def is_correct(assignment: dict, answer: Any) -> bool:
    """Whether a student's answer is right for a general (non-coding) question."""
    given = [a for a in flatten(answer) if str(a).strip() != ""]
    expected = assignment.get("answers", [])
    if not given or not expected:
        return False
    q_type = assignment.get("q_type")
    if q_type in NUMERIC_TYPES:
        g, e = _to_float(given[0]), _to_float(expected[0])
        return g is not None and e is not None and math.isclose(g, e, rel_tol=1e-6, abs_tol=1e-6)
    if q_type == "MCQ":
        return len(given) == 1 and _norm(given[0]) == _norm(expected[0])
    if q_type == "MSQ":
        return {_norm(a) for a in given} == {_norm(a) for a in expected}
    return [_norm(a) for a in given] == [_norm(a) for a in expected]


def decode_code(answer: Any) -> str:
    raw = flatten(answer)[0] if flatten(answer) else ""
    raw = str(raw)
    try:
        return base64.b64decode(raw, validate=True).decode("utf-8")
    except (binascii.Error, UnicodeDecodeError, ValueError):
        return raw


def grade_coding(assignment: dict, code: str) -> float:
    tests = assignment.get("private_testcase") or []
    if not tests:
        return 0.0
    try:
        return test_score(evaluate_tests(assignment["language"], code, tests))
    except UnsupportedLanguage:
        log.warning("Unsupported language on assignment %s", assignment.get("_id"))
        return 0.0


def grade_answer(assignment: dict, answer: Any, coding: bool) -> float:
    if coding:
        return grade_coding(assignment, decode_code(answer))
    return 1.0 if is_correct(assignment, answer) else 0.0


def record_mark(user_id: str, assignment: dict, mark: float) -> None:
    now = datetime.now(timezone.utc)
    db.assignment_mark.update_one(
        {"user_id": user_id, "assgn_id": assignment["_id"]},
        {"$set": {"user_id": user_id, "assgn_id": assignment["_id"], "course_id": assignment["course_id"],
                  "week": assignment["week"], "assgn_type": assignment["assgn_type"],
                  "mark": round(mark, 4), "graded_at": now}},
        upsert=True,
    )
    recompute_week(user_id, assignment["course_id"], assignment["week"], assignment["assgn_type"])


def recompute_week(user_id: str, course_id: str, week: int, assgn_type: str) -> float | None:
    """Average of all questions of that type in the week; unanswered questions count as 0."""
    coll = db.coding_assignment if assgn_type in ("PPA", "GrPA") else db.assignment
    ids = [d["_id"] for d in coll.find({"course_id": course_id, "week": week, "assgn_type": assgn_type}, {"_id": 1})]
    if not ids:
        return None
    marks = {m["assgn_id"]: m["mark"] for m in db.assignment_mark.find({"user_id": user_id, "assgn_id": {"$in": ids}})}
    pct = round(sum(marks.get(i, 0.0) for i in ids) / len(ids) * 100, 1)
    db.marks.update_one(
        {"user_id": user_id, "course_id": course_id, "week": week, "assgn_type": assgn_type},
        {"$set": {"user_id": user_id, "course_id": course_id, "week": week, "assgn_type": assgn_type,
                  "mark": pct, "graded_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return pct


def submit_and_grade(user_id: str, assignment: dict, answer: list, coding: bool) -> float:
    """Store the submission and its mark; returns the question mark in [0, 1]."""
    db.submission.update_one(
        {"assgn_id": assignment["_id"], "user_id": user_id},
        {"$set": {"assgn_id": assignment["_id"], "user_id": user_id, "answer": answer,
                  "submitted_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    mark = grade_answer(assignment, answer, coding)
    record_mark(user_id, assignment, mark)
    return mark


def deadline_passed(assignment: dict, now: datetime | None = None) -> bool:
    deadline = assignment.get("deadline")
    if not isinstance(deadline, datetime):
        return False
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    return (now or datetime.now(timezone.utc)) > deadline


def find_assignment(assgn_id: ObjectId) -> tuple[dict | None, bool]:
    """(document, is_coding)"""
    doc = db.assignment.find_one({"_id": assgn_id})
    if doc:
        return doc, False
    doc = db.coding_assignment.find_one({"_id": assgn_id})
    return doc, True


# ----------------------------------------------------------- insights ----
WEAK_THRESHOLD = 70.0


def _topic_for_week(course_id: str, week: int) -> str:
    m = db.course_material.find_one({"course_id": course_id, "week": week, "material_type": "notes"})
    return (m or {}).get("title") or f"Week {week}"


def student_insights(user_id: str, course_id: str) -> dict[str, Any]:
    by_week: dict[int, list[float]] = {}
    for m in db.marks.find({"user_id": user_id, "course_id": course_id}):
        by_week.setdefault(m["week"], []).append(m["mark"])
    weeks = [{"week": w, "topic": _topic_for_week(course_id, w), "mark": round(sum(v) / len(v), 1)}
             for w, v in sorted(by_week.items())]
    avg = round(sum(w["mark"] for w in weeks) / len(weeks), 1) if weeks else None
    return {
        "course_id": course_id, "average": avg, "weeks": weeks,
        "weak_topics": [w for w in weeks if w["mark"] < WEAK_THRESHOLD],
        "strong_topics": [w for w in weeks if w["mark"] >= 85],
    }


def class_insights(course_id: str) -> dict[str, Any]:
    marks = list(db.marks.find({"course_id": course_id}))
    weeks: dict[int, list[float]] = {}
    per_user: dict[str, list[float]] = {}
    for m in marks:
        weeks.setdefault(m["week"], []).append(m["mark"])
        per_user.setdefault(m["user_id"], []).append(m["mark"])
    students = list(db.user.find({"courses": course_id}))
    at_risk = []
    for u in students:
        if u.get("roles") and any(r in ("admin", "instructor") for r in u["roles"]):
            continue
        vals = per_user.get(u["user_id"], [])
        avg = round(sum(vals) / len(vals), 1) if vals else None
        if avg is None or avg < WEAK_THRESHOLD:
            at_risk.append({"user_id": u["user_id"], "email": u["email"], "name": u.get("name"), "average": avg})
    return {
        "course_id": course_id,
        "week_averages": [{"week": w, "topic": _topic_for_week(course_id, w), "average": round(sum(v) / len(v), 1),
                           "students": len(v)} for w, v in sorted(weeks.items())],
        "students_at_risk": at_risk,
    }
