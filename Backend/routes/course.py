from fastapi import APIRouter, Query

from core.security import CurrentUser, InstructorUser
from database.db import db
from models.assignment import AssignmentType
from models.course import Course
from models.model import SuccessCreateResponse
from utils.grading import class_insights
from utils.lookup import ensure_course
from utils.projection import course_contents, public_assignment, public_coding_assignment
from utils.response import objectEntity, objectsEntity, responses, to_doc
from utils.validation import AlreadyExistsError

course = APIRouter(prefix="/course", tags=["Course"])


@course.post("/create", status_code=201, responses=responses)
def create_course(course_input: Course, user: InstructorUser) -> SuccessCreateResponse:
    if db.course.find_one({"course_id": course_input.course_id}):
        raise AlreadyExistsError("Duplicated Course ID")
    res = db.course.insert_one(to_doc(course_input))
    return {"message": "success", "db_entry_id": str(res.inserted_id)}


@course.get("/getall", responses=responses)
def get_courses(user: CurrentUser):
    return objectsEntity(db.course.find())


@course.get("/get/{course_id}", responses=responses)
def get_course(course_id: str, user: CurrentUser):
    return objectEntity(ensure_course(course_id))


@course.put("/update/{course_id}", status_code=202, responses=responses)
def update_course(course_id: str, course_input: Course, user: InstructorUser):
    ensure_course(course_id)
    db.course.update_one({"course_id": course_id}, {"$set": {"course_name": course_input.course_name}})
    return {"message": "success", "db_updated_id": course_id}


@course.get("/course_material/{course_id}", responses=responses)
def get_course_materials(user: CurrentUser, course_id: str):
    ensure_course(course_id)
    return objectsEntity(db.course_material.find({"course_id": course_id}))


def _contents(course_id: str, week: int | None, user) -> list[dict]:
    c = ensure_course(course_id)
    flt: dict = {"course_id": course_id}
    if week is not None:
        flt["week"] = week
    return [course_contents(c, list(db.course_material.find(flt)), list(db.assignment.find(flt)),
                            list(db.coding_assignment.find(flt)), user.is_instructor)]


@course.get("/get_contents", responses=responses)
def get_course_contents(user: CurrentUser, course_id: str):
    return _contents(course_id, None, user)


@course.get("/get_week_content", responses=responses)
def get_course_week_contents(user: CurrentUser, course_id: str, week: int = Query(le=12, ge=1)):
    return _contents(course_id, week, user)


@course.get("/get_assignment", responses=responses)
def get_course_week_assignment(user: CurrentUser, course_id: str, week: int = Query(le=12, ge=1),
                               assgn_type: AssignmentType = Query(description="the type of the assignment")):
    ensure_course(course_id)
    coding = assgn_type.value in ("PPA", "GrPA")
    coll = db.coding_assignment if coding else db.assignment
    proj = public_coding_assignment if coding else public_assignment
    return [proj(d, user.is_instructor)
            for d in coll.find({"course_id": course_id, "week": week, "assgn_type": assgn_type.value})]


@course.get("/get_all_assignment", responses=responses)
def get_course_week_coding_assignment(user: CurrentUser, course_id: str, week: int = Query(le=12, ge=1),
                                      assgn_type: AssignmentType = Query(description="the type of the assignment")):
    ensure_course(course_id)
    return [public_coding_assignment(d, user.is_instructor)
            for d in db.coding_assignment.find({"course_id": course_id, "week": week, "assgn_type": assgn_type.value})]


@course.get("/{course_id}/marks", responses=responses)
def course_gradebook(course_id: str, user: InstructorUser):
    """Instructor gradebook: every student's marks in the course."""
    ensure_course(course_id)
    users = {u["user_id"]: u for u in db.user.find({"courses": course_id})}
    rows = []
    for m in db.marks.find({"course_id": course_id}).sort("week", 1):
        u = users.get(m["user_id"], {})
        rows.append({**objectEntity(m), "email": u.get("email"), "name": u.get("name")})
    return rows


@course.get("/{course_id}/insights", responses=responses)
def course_insights(course_id: str, user: InstructorUser):
    ensure_course(course_id)
    return class_insights(course_id)
