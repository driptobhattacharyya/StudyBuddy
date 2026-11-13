from fastapi import APIRouter, BackgroundTasks

from ai import rag
from core.security import CurrentUser, InstructorUser
from database.db import db
from models.course import Notes, NotesUpdate
from models.model import SuccessCreateResponse
from utils.lookup import ensure_course, get_or_404
from utils.response import objectsEntity, responses, to_doc

notes = APIRouter(prefix="/notes", tags=["Notes"])


@notes.post("/create", status_code=201, responses=responses)
def create_notes(data: Notes, user: InstructorUser, bg: BackgroundTasks) -> SuccessCreateResponse:
    ensure_course(data.course_id)
    res = db.notes.insert_one(to_doc(data))
    bg.add_task(rag.index_note_doc, db.notes.find_one({"_id": res.inserted_id}))
    return {"message": "success", "db_entry_id": str(res.inserted_id)}


@notes.get("/get/{course_id}", responses=responses)
def get_notes(course_id: str, user: CurrentUser):
    ensure_course(course_id)
    return objectsEntity(db.notes.find({"course_id": course_id}))


@notes.put("/update/{notes_id}", status_code=202, responses=responses)
def update_notes(notes_id: str, data: NotesUpdate, user: InstructorUser, bg: BackgroundTasks):
    existing = get_or_404("notes", notes_id)
    db.notes.update_one({"_id": existing["_id"]}, {"$set": to_doc(data)})
    bg.add_task(rag.index_note_doc, db.notes.find_one({"_id": existing["_id"]}))
    return {"message": "success", "db_entry_id": notes_id}


@notes.delete("/delete/{notes_id}", responses=responses)
def delete_notes(notes_id: str, user: InstructorUser):
    existing = get_or_404("notes", notes_id)
    db.notes.delete_one({"_id": existing["_id"]})
    rag.delete_source(str(existing["_id"]))
    return {"msg": "Notes Deleted"}
