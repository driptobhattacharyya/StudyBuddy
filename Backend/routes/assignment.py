from typing import List

from fastapi import APIRouter, HTTPException

from core.security import CurrentUser, InstructorUser
from database.db import db
from models.assignment import Assignment, AssignmentUpdate
from utils.lookup import ensure_course, get_or_404
from utils.projection import public_assignment
from utils.response import responses, to_doc

assgn = APIRouter(prefix="/assignment", tags=["Assignment"])


@assgn.post("/create", status_code=201, responses=responses)
def create_question(user: InstructorUser, assignment: Assignment):
    ensure_course(assignment.course_id)
    res = db.assignment.insert_one(to_doc(assignment))
    return {"message": "success", "db_entry_id": str(res.inserted_id)}


@assgn.post("/create_many_questions", status_code=201, responses=responses)
def create_many_questions(user: InstructorUser, assignments: List[Assignment]):
    if not assignments:
        raise HTTPException(status_code=422, detail="Provide at least one question")
    for course_id in {a.course_id for a in assignments}:
        ensure_course(course_id)
    res = db.assignment.insert_many([to_doc(a) for a in assignments])
    return {"message": "success", "db_entry_ids": [str(i) for i in res.inserted_ids]}


@assgn.get("/get/{assgn_id}", responses=responses)
def get_question(user: CurrentUser, assgn_id: str):
    return public_assignment(get_or_404("assignment", assgn_id, "assignment id"), user.is_instructor)


@assgn.put("/update/{assgn_id}", status_code=202, responses=responses)
def update_question(user: InstructorUser, assgn_id: str, assgn: AssignmentUpdate):
    existing = get_or_404("assignment", assgn_id, "assignment id")
    db.assignment.update_one({"_id": existing["_id"]}, {"$set": to_doc(assgn)})
    return {"msg": "Assigment Updated"}


@assgn.delete("/delete/{assgn_id}", responses=responses)
def delete_question(user: InstructorUser, assgn_id: str):
    existing = get_or_404("assignment", assgn_id, "assignment id")
    db.assignment.delete_one({"_id": existing["_id"]})
    return {"msg": "Deleted Successfully"}
