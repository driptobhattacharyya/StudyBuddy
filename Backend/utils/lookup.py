from bson import ObjectId

from database.db import db
from utils.response import parse_object_id
from utils.validation import NotExistsError


def ensure_course(course_id: str) -> dict:
    course = db.course.find_one({"course_id": course_id})
    if not course:
        raise NotExistsError("Course not found")
    return course


def get_or_404(collection: str, id_str: str, label: str = "id") -> dict:
    doc = db[collection].find_one({"_id": parse_object_id(id_str, label)})
    if not doc:
        raise NotExistsError()
    return doc


def oid(value: str) -> ObjectId:
    return parse_object_id(value)
