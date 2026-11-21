from typing import Optional

from fastapi import APIRouter, Query

from core.security import CurrentUser, InstructorUser
from database.db import db
from models.lecture import Lecture, LectureUpdate, extract_youtube_id
from models.model import SuccessCreateResponse
from utils.lookup import ensure_course, get_or_404
from utils.response import objectEntity, objectsEntity, responses, to_doc

lecture = APIRouter(prefix="/lecture", tags=["Lecture"])


def _doc(data: LectureUpdate) -> dict:
    doc = to_doc(data)
    doc["youtube_id"] = extract_youtube_id(data.youtube_url)
    return doc


@lecture.post("/create", status_code=201, responses=responses)
def create_lecture(data: Lecture, user: InstructorUser) -> SuccessCreateResponse:
    ensure_course(data.course_id)
    res = db.lecture.insert_one(_doc(data))
    return {"message": "success", "db_entry_id": str(res.inserted_id)}


@lecture.get("/get/{course_id}", responses=responses)
def get_lectures(course_id: str, user: CurrentUser, week: Optional[int] = Query(default=None, ge=1, le=12)):
    ensure_course(course_id)
    query = {"course_id": course_id} if week is None else {"course_id": course_id, "week": week}
    return objectsEntity(db.lecture.find(query).sort([("week", 1), ("order", 1), ("_id", 1)]))


@lecture.get("/one/{lecture_id}", responses=responses)
def get_lecture(lecture_id: str, user: CurrentUser):
    return objectEntity(get_or_404("lecture", lecture_id, "lecture id"))


@lecture.put("/update/{lecture_id}", status_code=202, responses=responses)
def update_lecture(lecture_id: str, data: LectureUpdate, user: InstructorUser):
    existing = get_or_404("lecture", lecture_id, "lecture id")
    db.lecture.update_one({"_id": existing["_id"]}, {"$set": _doc(data)})
    return {"message": "success", "db_entry_id": lecture_id}


@lecture.delete("/delete/{lecture_id}", responses=responses)
def delete_lecture(lecture_id: str, user: InstructorUser):
    existing = get_or_404("lecture", lecture_id, "lecture id")
    db.lecture.delete_one({"_id": existing["_id"]})
    return {"msg": "Lecture Deleted"}
