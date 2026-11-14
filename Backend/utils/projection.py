"""Role based projections: students must never receive answers or hidden tests."""
from __future__ import annotations

from typing import Any

from utils.response import convert_to_serializable

ASSIGNMENT_SECRET_FIELDS = ("answers",)
CODING_SECRET_FIELDS = ("private_testcase",)


def _strip(doc: dict, fields: tuple[str, ...]) -> dict:
    return {k: v for k, v in doc.items() if k not in fields}


def public_assignment(doc: dict, is_instructor: bool) -> dict:
    out = convert_to_serializable(doc)
    return out if is_instructor else _strip(out, ASSIGNMENT_SECRET_FIELDS)


def public_coding_assignment(doc: dict, is_instructor: bool) -> dict:
    out = convert_to_serializable(doc)
    if is_instructor:
        return out
    out = _strip(out, CODING_SECRET_FIELDS)
    out["private_testcase_count"] = len(doc.get("private_testcase", []))
    return out


def public_assignment_any(doc: dict, is_instructor: bool) -> dict:
    """Pick the right projection for either assignment kind."""
    if "public_testcase" in doc or "private_testcase" in doc:
        return public_coding_assignment(doc, is_instructor)
    return public_assignment(doc, is_instructor)


def course_contents(course: dict, materials: list[dict], assignments: list[dict], coding: list[dict],
                    is_instructor: bool) -> dict[str, Any]:
    """Same shape the old aggregation pipeline produced, filtered by role."""
    def assg(a: dict) -> dict:
        d = {
            "assgn_id": a["_id"], "question": a.get("question"), "q_type": a.get("q_type"),
            "options": a.get("options", []), "answers": a.get("answers", []),
            "assgn_type": a.get("assgn_type"), "course_id": a.get("course_id"),
            "week": a.get("week"), "deadline": a.get("deadline"),
        }
        return public_assignment(d, is_instructor)

    def code(a: dict) -> dict:
        d = {
            "assgn_id": a["_id"], "question": a.get("question"), "language": a.get("language"),
            "public_testcase": a.get("public_testcase", []),
            "private_testcase": a.get("private_testcase", []), "starter_code": a.get("starter_code", ""),
            "assgn_type": a.get("assgn_type"), "course_id": a.get("course_id"),
            "week": a.get("week"), "deadline": a.get("deadline"),
        }
        return public_coding_assignment(d, is_instructor)

    return convert_to_serializable({
        "_id": course["_id"], "course_id": course["course_id"], "course_name": course.get("course_name"),
        "materials": [
            {
                "material_id": m["_id"], "course_id": m.get("course_id"),
                "material_type": m.get("material_type"), "title": m.get("title"), "url": m.get("url"),
                "content": m.get("content"), "week": m.get("week"),
            }
            for m in sorted(materials, key=lambda m: m.get("week", 0))
        ],
        "assignments": [assg(a) for a in sorted(assignments, key=lambda a: a.get("week", 0))],
        "coding_assignments": [code(a) for a in sorted(coding, key=lambda a: a.get("week", 0))],
    })
