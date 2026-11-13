import base64
import binascii
import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool

from ai import service as ai_service
from ai.errors import AIError, to_http
from core.deps import AIUser, RunUser
from core.security import CurrentUser, InstructorUser
from database.db import db
from models.assignment import CodingSubmission, ProgrammingAssignment, ProgrammingAssignmentUpdate
from runner import UnsupportedLanguage, normalize_language
from runner.grading import evaluate_tests, hide_details, score
from utils.grading import deadline_passed, record_mark
from utils.lookup import ensure_course, get_or_404
from utils.projection import public_coding_assignment
from utils.response import responses, to_doc
from utils.validation import bad_request

log = logging.getLogger(__name__)
coding_assignment = APIRouter(prefix="/coding_assignment", tags=["Coding Assignment"])


def _doc(model) -> dict:
    doc = to_doc(model)
    doc["language"] = normalize_language(doc["language"]).replace("javascript", "js")
    doc["public_testcase"] = [dict(t) for t in doc["public_testcase"]]
    doc["private_testcase"] = [dict(t) for t in doc["private_testcase"]]
    return doc


@coding_assignment.post("/create_programming_question", status_code=201, responses=responses)
def create_programming_question(user: InstructorUser, assignment: ProgrammingAssignment):
    ensure_course(assignment.course_id)
    res = db.coding_assignment.insert_one(_doc(assignment))
    return {"msg": "success", "db_entry_id": str(res.inserted_id)}


@coding_assignment.get("/get/{assgn_id}", responses=responses)
def get_coding_assignment(assgn_id: str, user: CurrentUser):
    return public_coding_assignment(get_or_404("coding_assignment", assgn_id, "assignment id"), user.is_instructor)


@coding_assignment.delete("/delete/{assgn_id}", responses=responses)
def delete_coding_assignment(assgn_id: str, user: InstructorUser):
    existing = get_or_404("coding_assignment", assgn_id, "assignment id")
    db.coding_assignment.delete_one({"_id": existing["_id"]})
    return {"msg": "Assignment Deleted"}


@coding_assignment.put("/update/{assgn_id}", status_code=202, responses=responses)
def update_coding_assignment(user: InstructorUser, assgn_id: str, assgn: ProgrammingAssignmentUpdate):
    existing = get_or_404("coding_assignment", assgn_id, "assignment id")
    db.coding_assignment.update_one({"_id": existing["_id"]}, {"$set": _doc(assgn)})
    return {"msg": "Assigment Updated"}


def _decode(code_b64: str) -> str:
    try:
        return base64.b64decode(code_b64, validate=True).decode("utf-8")
    except (binascii.Error, UnicodeDecodeError, ValueError):
        raise bad_request("code must be base64 encoded UTF-8 text") from None


def _run(assgn: dict, code: str, staff: bool) -> dict:
    public = assgn.get("public_testcase", [])
    private = assgn.get("private_testcase", [])
    try:
        normalize_language(assgn["language"])
    except UnsupportedLanguage as exc:
        raise bad_request(str(exc)) from None
    public_results = evaluate_tests(assgn["language"], code, public)
    private_results = evaluate_tests(assgn["language"], code, private)
    mark = int(round(score(private_results) * 100))
    return {
        "public_testcases": public_results,
        "private_testcases": private_results if staff else [hide_details(r) for r in private_results],
        "passed_public_count": f"{sum(r['passed'] for r in public_results)}/{len(public)}",
        "passed_private_count": f"{sum(r['passed'] for r in private_results)}/{len(private)}",
        "mark": mark,
    }


@coding_assignment.post("/run", responses=responses)
def run_code(user: RunUser, submission: CodingSubmission):
    """Run code against public + hidden tests in the sandbox. Students' latest run is saved and graded."""
    assgn = get_or_404("coding_assignment", submission.assgn_id, "assignment id")
    code = _decode(submission.code)
    result = _run(assgn, code, user.is_instructor)
    if not user.is_instructor and not (assgn["assgn_type"] == "GrPA" and deadline_passed(assgn)):
        db.submission.update_one(
            {"assgn_id": assgn["_id"], "user_id": user.user_id},
            {"$set": {"assgn_id": assgn["_id"], "user_id": user.user_id, "answer": [submission.code],
                      "submitted_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        record_mark(user.user_id, assgn, result["mark"] / 100)
        result["saved"] = True
    return result


@coding_assignment.post("/{assgn_id}/feedback", responses=responses)
async def code_feedback(assgn_id: str, body: CodingSubmission, user: AIUser):
    """AI code review. Never reveals a full solution before the deadline."""
    assgn = await run_in_threadpool(get_or_404, "coding_assignment", assgn_id, "assignment id")
    code = _decode(body.code)
    try:
        return await ai_service.code_feedback(
            user.email, assgn, code, deadline_passed(assgn) or user.is_instructor)
    except AIError as exc:
        raise to_http(exc) from None
