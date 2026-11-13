from fastapi import APIRouter, BackgroundTasks

from ai import rag
from core.security import CurrentUser, InstructorUser
from database.db import db
from models.course import CourseMaterial, CourseMaterialUpdate
from models.model import SuccessCreateResponse
from utils.lookup import ensure_course, get_or_404
from utils.response import objectsEntity, responses, to_doc

course_material = APIRouter(prefix="/course_material", tags=["Course Material"])


@course_material.post("/create", status_code=201, responses=responses)
def create_course_material(data: CourseMaterial, user: InstructorUser, bg: BackgroundTasks) -> SuccessCreateResponse:
    ensure_course(data.course_id)
    doc = to_doc(data)
    res = db.course_material.insert_one(doc)
    bg.add_task(rag.index_material_doc, db.course_material.find_one({"_id": res.inserted_id}))
    return {"message": "success", "db_entry_id": str(res.inserted_id)}


@course_material.get("/get/{course_id}", responses=responses)
def get_course_material(course_id: str, user: CurrentUser):
    ensure_course(course_id)
    return objectsEntity(db.course_material.find({"course_id": course_id}))


@course_material.put("/update/{course_material_id}", status_code=202, responses=responses)
def update_course_material(course_material_id: str, data: CourseMaterialUpdate, user: InstructorUser,
                           bg: BackgroundTasks):
    existing = get_or_404("course_material", course_material_id)
    db.course_material.update_one({"_id": existing["_id"]}, {"$set": to_doc(data)})
    bg.add_task(rag.index_material_doc, db.course_material.find_one({"_id": existing["_id"]}))
    return {"message": "success", "db_entry_id": course_material_id}


@course_material.delete("/delete/{course_material_id}", responses=responses)
def delete_course_material(course_material_id: str, user: InstructorUser):
    existing = get_or_404("course_material", course_material_id)
    db.course_material.delete_one({"_id": existing["_id"]})
    rag.delete_source(str(existing["_id"]))
    return {"msg": "Course Material Deleted"}
