"""Optional extra courses: ``python -m scripts.seed_extra_courses [--dry-run] [--course CS01] [--enrol-demo]``.

Adds three full courses on top of the demo set, each organised by week:

* CS01 Python Data Structures and Algorithms (MIT 6.006 lectures, 6 weeks)
* MA01 Linear Algebra, Visually (3Blue1Brown, 5 weeks)
* BIO01 Foundations of Cell Biology (Crash Course, 5 weeks)

Together: 38 YouTube lectures with notes, 16 weekly reading notes, 160 MCQ/MSQ/numeric questions
(activity, practice and graded) and 15 auto-graded Python problems.

Safe to run repeatedly. Courses, notes and questions are updated in place, but deadlines and the
``evaluated`` flag are only set the first time. Lectures are created once and never overwritten,
so instructor edits survive. Lectures whose video ids have not been checked yet are listed in
``PENDING_LECTURES`` in each data file and are skipped unless ``--include-unverified`` is given.
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime, timedelta, timezone

from scripts.extra_courses import bio01, cs01, ma01

COURSES = [cs01, ma01, bio01]
_YT_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
STARTER = "# Read from standard input with input() and print() the result.\n\n"


def _deadline(week: int, start: datetime) -> datetime:
    return (start + timedelta(weeks=week)).replace(hour=23, minute=59, second=0, microsecond=0)


def build(module, include_unverified: bool, start: datetime) -> dict:
    cid = module.COURSE["course_id"]
    lectures = list(module.LECTURES) + (list(module.PENDING_LECTURES) if include_unverified else [])
    graded = lambda w, t: {"course_id": cid, "week": w, "assgn_type": t, "deadline": _deadline(w, start)}  # noqa: E731
    return {
        "course": {**module.COURSE, "week_titles": {str(k): v for k, v in module.WEEK_TITLES.items()}},
        "lectures": [{**lec, "course_id": cid} for lec in lectures],
        "notes": [{"course_id": cid, "week": n["week"], "material_type": "notes", "title": n["title"],
                   "content": n["content"], "url": None} for n in module.NOTES],
        "questions": [{**q, **graded(w, t)} for w, by in module.QUESTIONS.items() for t, qs in by.items() for q in qs],
        "coding": [{**c, **graded(w, t), "starter_code": STARTER}
                   for w, by in module.CODING.items() for t, cs in by.items() for c in cs],
    }


def validate(data: dict) -> list[str]:
    problems = []
    slots = set()
    for lec in data["lectures"]:
        if not _YT_ID.match(lec["youtube_id"]):
            problems.append(f"bad YouTube id in {lec['title']!r}")
        if (lec["week"], lec["order"]) in slots:
            problems.append(f"two lectures in week {lec['week']} position {lec['order']}")
        slots.add((lec["week"], lec["order"]))
    for q in data["questions"]:
        if q["assgn_type"] not in ("AQ", "PA", "GA"):
            problems.append(f"bad question type {q['assgn_type']}")
        if q["q_type"] in ("MCQ", "MSQ") and not set(q["answers"]) <= set(q["options"]):
            problems.append(f"answer not among options: {q['question'][:60]!r}")
    for c in data["coding"]:
        if c["assgn_type"] not in ("PPA", "GrPA"):
            problems.append(f"bad coding type {c['assgn_type']}")
    return problems


def write(db, data: dict) -> None:
    cid = data["course"]["course_id"]
    db.course.update_one({"course_id": cid}, {"$set": data["course"]}, upsert=True)
    for lec in data["lectures"]:
        db.lecture.update_one({"course_id": cid, "youtube_id": lec["youtube_id"]}, {"$setOnInsert": lec}, upsert=True)
    for n in data["notes"]:
        db.course_material.update_one({"course_id": cid, "material_type": "notes", "title": n["title"]}, {"$set": n}, upsert=True)

    def upsert(coll, row):
        fixed = {"deadline": row["deadline"], "evaluated": False}
        content = {k: v for k, v in row.items() if k != "deadline"}
        key = {"course_id": cid, "week": row["week"], "assgn_type": row["assgn_type"], "question": row["question"]}
        coll.update_one(key, {"$set": content, "$setOnInsert": fixed}, upsert=True)

    for q in data["questions"]:
        upsert(db.assignment, q)
    for c in data["coding"]:
        upsert(db.coding_assignment, c)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="validate and print counts; no database needed")
    parser.add_argument("--course", action="append", help="only this course id (repeatable)")
    parser.add_argument("--include-unverified", action="store_true", help="also load lectures with unchecked video ids")
    parser.add_argument("--enrol-demo", action="store_true", help="enrol the demo student in these courses")
    args = parser.parse_args(argv)

    start = datetime.now(timezone.utc)
    modules = [m for m in COURSES if not args.course or m.COURSE["course_id"] in args.course]
    if not modules:
        parser.error(f"no course matches {args.course}")

    built, failed = [], False
    for module in modules:
        data = build(module, args.include_unverified, start)
        problems = validate(data)
        c = data["course"]
        print(f"{c['course_id']:6} {c['course_name']:42} {len(data['lectures']):3} lectures {len(data['notes']):3} notes "
              f"{len(data['questions']):4} questions {len(data['coding']):3} coding")
        for p in problems:
            print(f"   ! {p}")
        failed |= bool(problems)
        built.append(data)
    if failed:
        print("Validation failed; nothing written.")
        return 1
    if args.dry_run:
        print("Dry run: nothing written.")
        return 0

    from database.db import db, ensure_indexes  # late import: --dry-run needs no database settings

    ensure_indexes()
    for data in built:
        write(db, data)
    if args.enrol_demo:
        from core.security import STUDENT, demo_user_id

        db.user.update_one({"user_id": demo_user_id(STUDENT)},
                           {"$addToSet": {"courses": {"$each": [d["course"]["course_id"] for d in built]}}})
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
