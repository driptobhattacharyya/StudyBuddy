"""Idempotent demo dataset: ``python -m scripts.seed_demo [--reset]``.

Creates three courses with weekly notes, graded and practice questions, coding tasks with
public + private tests, demo users (student / instructor / admin) and a few classmates with
marks so the instructor gradebook and insights look alive. Safe to run repeatedly: documents are
upserted by natural key and future deadlines are refreshed relative to "now".
"""
from __future__ import annotations

import argparse
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from ai import rag
from core.config import get_settings
from core.logging import configure_logging
from core.security import ADMIN, INSTRUCTOR, STUDENT, create_user, ensure_demo_user
from database.db import db, ensure_indexes
from scripts.seed_content import CODING, COURSES, FLASHCARDS, LECTURES, STARTER_CODE
from utils.grading import submit_and_grade

log = logging.getLogger(__name__)

CLASSMATES = [
    ("aarav.sharma@example.com", "Aarav Sharma", [True, True, True, True, True]),
    ("priya.nair@example.com", "Priya Nair", [True, False, True, True, False]),
    ("liam.chen@example.com", "Liam Chen", [False, False, True, False, False]),
]


def _strip_leading_title(content: str, title: str) -> str:
    """Drop a leading ``# <title>`` H1 so the title is not shown twice."""
    lines = content.lstrip().split("\n", 1)
    if lines[0].strip() == f"# {title}".strip():
        return lines[1].lstrip("\n") if len(lines) > 1 else ""
    return content


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _upsert_assignment(coll, key: dict, doc: dict) -> dict:
    coll.update_one(key, {"$set": doc, "$setOnInsert": {"evaluated": False}}, upsert=True)
    return coll.find_one(key)


def _wrong_answer(a: dict) -> list:
    if a["q_type"] in ("Numeric", "Float"):
        return [str(a["answers"][0] + 1)]
    wrong = [o for o in a["options"] if o not in a["answers"]]
    return [wrong[0]] if wrong else [""]


def _answer(a: dict, correct: bool) -> list:
    if not correct:
        return _wrong_answer(a)
    return [str(a["answers"][0])] if a["q_type"] in ("Numeric", "Float") else list(a["answers"])


def reset_demo_data() -> None:
    ids = [c["course_id"] for c in COURSES]
    qids = [d["_id"] for coll in (db.assignment, db.coding_assignment) for d in coll.find({"course_id": {"$in": ids}}, {"_id": 1})]
    for name in ("course_material", "lecture", "assignment", "coding_assignment", "marks", "assignment_mark", "rag_chunks", "notes", "flashcard"):
        db[name].delete_many({"course_id": {"$in": ids}})
    db.submission.delete_many({"assgn_id": {"$in": qids}})
    db.course.delete_many({"course_id": {"$in": ids}})


def seed(reset: bool = False) -> dict[str, Any]:
    ensure_indexes()
    if reset:
        reset_demo_data()
    now = _now()
    counts = {"courses": 0, "materials": 0, "lectures": 0, "assignments": 0, "coding_assignments": 0}

    for course in COURSES:
        cid = course["course_id"]
        db.course.update_one({"course_id": cid}, {"$set": {"course_id": cid, "course_name": course["course_name"]}}, upsert=True)
        counts["courses"] += 1
        for week, title, content, url in course["notes"]:
            content = _strip_leading_title(content, title)  # the UI already renders the note title as the page heading
            db.course_material.update_one(
                {"course_id": cid, "week": week, "material_type": "notes"},
                {"$set": {"course_id": cid, "week": week, "material_type": "notes", "title": title,
                          "content": content, "url": None}}, upsert=True)
            db.course_material.update_one(
                {"course_id": cid, "week": week, "material_type": "file_URL"},
                {"$set": {"course_id": cid, "week": week, "material_type": "file_URL",
                          "title": f"Further reading - {title}", "content": "Recommended reading", "url": url}},
                upsert=True)
            counts["materials"] += 2

        specs = [("ga1", "GA", 1, -3), ("ga2", "GA", 2, 5), ("aq", "AQ", 3, 12)]
        for field, a_type, week, days in specs:
            for q, q_type, options, answers in course[field]:
                _upsert_assignment(db.assignment, {"course_id": cid, "week": week, "assgn_type": a_type, "question": q}, {
                    "course_id": cid, "week": week, "assgn_type": a_type, "question": q, "q_type": q_type,
                    "options": options, "answers": answers, "deadline": now + timedelta(days=days)})
                counts["assignments"] += 1

    # Created once, matched on the video: after that a lecture belongs to the instructor, and edits,
    # moves or new lectures made in the UI survive later runs (``--reset`` starts over).
    for cid, week, order, title, video, source, description, notes in LECTURES:
        db.lecture.update_one({"course_id": cid, "youtube_id": video}, {"$setOnInsert": {
            "course_id": cid, "week": week, "order": order, "title": title, "youtube_id": video,
            "youtube_url": f"https://www.youtube.com/watch?v={video}", "source": source,
            "description": description, "notes": notes, "duration": None, "resources": []}}, upsert=True)
        counts["lectures"] += 1

    for c in CODING:
        tests = lambda pairs: [{"input": i, "output": o} for i, o in pairs]  # noqa: E731
        _upsert_assignment(db.coding_assignment, {"course_id": c["course_id"], "week": c["week"], "question": c["question"]}, {
            "course_id": c["course_id"], "week": c["week"], "assgn_type": c["assgn_type"], "language": c["language"],
            "question": c["question"], "public_testcase": tests(c["public"]), "private_testcase": tests(c["private"]),
            "starter_code": STARTER_CODE.get(c["language"], ""), "deadline": now + timedelta(days=c["days"])})
        counts["coding_assignments"] += 1

    # ---- users -------------------------------------------------------------
    student = ensure_demo_user(STUDENT)
    ensure_demo_user(INSTRUCTOR)
    ensure_demo_user(ADMIN)
    course_ids = [c["course_id"] for c in COURSES]
    db.user.update_many({"email": {"$in": [u.email for u in (student,)]}}, {"$set": {"courses": course_ids}})
    classmates = []
    for email, name, _ in CLASSMATES:
        u = create_user(email, name)
        db.user.update_one({"email": email}, {"$set": {"courses": course_ids}})
        classmates.append(u)

    # ---- submissions & marks (graded immediately, like the real flow) ------------
    def ga_questions(cid: str) -> list[dict]:
        return list(db.assignment.find({"course_id": cid, "assgn_type": "GA"}).sort([("week", 1), ("_id", 1)]))

    for ci, cid in enumerate(course_ids):
        qs = ga_questions(cid)
        # demo student: strong on week 1 except the MSQ, ok on week 2 -> a visible "weak topic"
        for i, q in enumerate(qs):
            submit_and_grade(student.user_id, q, _answer(q, correct=not (q["week"] == 1 and q["q_type"] == "MSQ")), False)
        for (email, _n, pattern), u in zip(CLASSMATES, classmates):
            for i, q in enumerate(qs):
                submit_and_grade(u.user_id, q, _answer(q, pattern[(i + ci) % len(pattern)]), False)

    from scripts.seed_content import REFERENCE_SOLUTIONS
    import base64

    for c in CODING:
        doc = db.coding_assignment.find_one({"course_id": c["course_id"], "week": c["week"], "question": c["question"]})
        if c["key"] in ("fizzbuzz", "palindrome"):  # demo student has solved the Python tasks
            code = REFERENCE_SOLUTIONS[c["key"]][1]
            submit_and_grade(student.user_id, doc, [base64.b64encode(code.encode()).decode()], True)

    # ---- flashcards ----------------------------------------------------------
    for cid, week, title, content in FLASHCARDS:
        db.flashcard.update_one({"user_id": student.user_id, "course_id": cid, "title": title},
                                {"$set": {"week": week, "content": content}}, upsert=True)

    # ---- retrieval index (keyword search always; embeddings if a key is configured) --------------------
    indexed = 0
    for doc in db.course_material.find({"course_id": {"$in": course_ids}}):
        if not db.rag_chunks.count_documents({"source_id": str(doc["_id"])}):
            indexed += rag.index_material_doc(doc, embed=False)
    rag.embed_pending()

    return {**counts, "users": 3 + len(CLASSMATES), "indexed_chunks": indexed}


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the Study Buddy demo dataset")
    parser.add_argument("--reset", action="store_true", help="delete the demo courses first, then re-create them")
    args = parser.parse_args()
    configure_logging(get_settings().log_level)
    print(seed(reset=args.reset))


if __name__ == "__main__":
    main()
