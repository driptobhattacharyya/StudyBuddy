from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Path, Query
from fastapi.concurrency import run_in_threadpool

from ai import service as ai_service
from ai.errors import AIError, to_http
from core.deps import AIUser
from core.security import CurrentUser, StudentUser
from database.db import db
from models.assignment import AssignmentSubmissionForm, AssignmentType
from models.model import AIQuery, GenerateResponse
from utils.grading import deadline_passed, find_assignment, student_insights, submit_and_grade
from utils.lookup import ensure_course
from utils.response import objectsEntity, parse_object_id, responses

user = APIRouter(prefix="/user", tags=["User"])


@user.get("/me", responses=responses)
def get_current_user(current_user: CurrentUser):
    return {
        "user_id": current_user.user_id, "email": current_user.email, "name": current_user.name,
        "picture": current_user.picture, "role": current_user.role, "roles": [current_user.role],
        "courses": current_user.courses or [], "disabled": current_user.disabled,
    }


def _plain(text: str, n: int = 90) -> str:
    text = " ".join(str(text or "").replace("*", "").replace("`", "").replace("#", "").split())
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"


@user.get("/deadlines", responses=responses)
def upcoming_deadlines(current_user: CurrentUser, limit: int = Query(20, ge=1, le=100)):
    """Upcoming assignment + coding deadlines across the caller's courses, soonest first."""
    course_ids = current_user.courses or []
    if not course_ids:
        return []
    names = {c["course_id"]: c.get("course_name") for c in db.course.find({"course_id": {"$in": course_ids}})}
    now = datetime.now(timezone.utc)
    items = []
    for kind, coll in (("assignment", db.assignment), ("coding", db.coding_assignment)):
        for a in coll.find({"course_id": {"$in": course_ids}, "deadline": {"$gte": now}}):
            items.append({
                "assgn_id": str(a["_id"]), "kind": kind, "course_id": a["course_id"],
                "course_name": names.get(a["course_id"]), "week": a.get("week"), "assgn_type": a.get("assgn_type"),
                "title": _plain(a.get("question")), "deadline": a["deadline"].isoformat(),
            })
    submitted = {str(s["assgn_id"]) for s in db.submission.find(
        {"user_id": current_user.user_id, "assgn_id": {"$in": [ObjectId(i["assgn_id"]) for i in items]}})}
    for i in items:
        i["submitted"] = i["assgn_id"] in submitted
    items.sort(key=lambda i: i["deadline"])
    return items[:limit]


@user.get("/get/course/{course_id}", responses=responses)
def get_flash_card_course_filter(course_id: str, current_user: CurrentUser):
    ensure_course(course_id)
    return objectsEntity(db.flashcard.find({"course_id": course_id, "user_id": current_user.user_id}))


@user.get("/get/course/{course_id}/week/{week_id}")
def get_flash_card_course_and_week_filter(current_user: CurrentUser, course_id: str,
                                          week_id: int = Path(..., title="Week ID", ge=0, le=12)):
    return objectsEntity(db.flashcard.find(
        {"course_id": course_id, "user_id": current_user.user_id, "week": week_id}))


@user.get("/flashcards", responses=responses)
def get_all_flashcards(current_user: CurrentUser):
    cards = objectsEntity(db.flashcard.find({"user_id": current_user.user_id}))
    cards.reverse()
    return cards


@user.post("/search_generate")
async def search_and_generate_response(query: GenerateResponse, current_user: AIUser):
    await run_in_threadpool(ensure_course, query.course_id)
    try:
        return await ai_service.course_chat(current_user.email, query.course_id, query.week, query.query)
    except AIError as exc:
        raise to_http(exc) from None


@user.post("/generate")
async def generate_response(query: AIQuery, current_user: AIUser):
    try:
        return await ai_service.chat(current_user.email, query.query)
    except AIError as exc:
        raise to_http(exc) from None


@user.post("/register_course", include_in_schema=False)
def register_courses(current_user: CurrentUser, courses: List[str]):
    for c_id in set(courses):
        ensure_course(c_id)
    db.user.update_one({"user_id": current_user.user_id}, {"$set": {"courses": list(dict.fromkeys(courses))}})
    return {"msg": "Courses have been registered successfully"}


@user.post("/submit_answers", responses=responses)
def submit_answers(current_user: StudentUser, submissions: List[AssignmentSubmissionForm]):
    """Store answers and grade them immediately (per-question marks)."""
    if not submissions:
        raise HTTPException(status_code=422, detail="No submissions provided")
    resolved = []
    for sub in submissions:
        assignment, coding = find_assignment(parse_object_id(sub.assgn_id, "assignment id"))
        if assignment is None:
            raise HTTPException(status_code=404, detail=f"Assignment {sub.assgn_id} not found")
        if assignment["assgn_type"] in ("GA", "GrPA") and deadline_passed(assignment):
            raise HTTPException(status_code=400, detail="The deadline for this assignment has passed")
        resolved.append((sub, assignment, coding))

    results = []
    for sub, assignment, coding in resolved:
        mark = submit_and_grade(current_user.user_id, assignment, sub.answer, coding)
        results.append({"assgn_id": sub.assgn_id, "mark": mark, "correct": mark >= 1.0})

    first = resolved[0][1]
    db.last_submission.update_one(
        {"user_id": current_user.user_id, "course_id": first["course_id"], "week": first["week"],
         "assgn_type": first["assgn_type"]},
        {"$set": {"last_submission": datetime.now(timezone.utc)}}, upsert=True)
    return {"message": "Assignment_submitted", "submission_time": datetime.now(timezone.utc).isoformat(),
            "results": results}


@user.get("/get_marks", responses=responses)
def get_marks(current_user: CurrentUser, course_id: str):
    """The caller's own marks only, week by week."""
    return objectsEntity(db.marks.find({"course_id": course_id, "user_id": current_user.user_id}).sort("week", 1))


@user.get("/insights/{course_id}", responses=responses)
def my_insights(course_id: str, current_user: CurrentUser):
    ensure_course(course_id)
    return student_insights(current_user.user_id, course_id)


@user.get("/last_submission", responses=responses)
def last_submission_time(current_user: CurrentUser, course_id: str, week: int = Query(le=12, ge=1),
                         assgn_type: AssignmentType = Query(description="the type of the assignment")):
    ensure_course(course_id)
    return objectsEntity(db.last_submission.find({
        "user_id": current_user.user_id, "course_id": course_id, "assgn_type": assgn_type.value, "week": week}))
