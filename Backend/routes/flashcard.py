from fastapi import APIRouter

from ai import service as ai_service
from ai.errors import AIError, to_http
from core.deps import AIUser
from core.security import CurrentUser
from database.db import db
from models.flashcard import FlashCard, FlashCardUpdate
from utils.lookup import ensure_course
from utils.response import objectEntity, parse_object_id, responses
from utils.validation import NotExistsError

fc = APIRouter(prefix="/flash_card", tags=["Flashcard"])


def _own_card(flash_card_id: str, user) -> dict:
    """Return the card only if it belongs to the caller (404 otherwise, never leaking existence)."""
    card = db.flashcard.find_one({"_id": parse_object_id(flash_card_id, "flash card id"), "user_id": user.user_id})
    if not card:
        raise NotExistsError()
    return card


@fc.post("/create", status_code=201, responses=responses)
def create_flash_card(flash_card: FlashCard, user: CurrentUser):
    ensure_course(flash_card.course_id)
    doc = flash_card.model_dump()
    doc["user_id"] = user.user_id
    res = db.flashcard.insert_one(doc)
    return {"message": "success", "db_entry_id": str(res.inserted_id)}


@fc.get("/get/{flash_card_id}", responses=responses)
def get_flash_card(flash_card_id: str, user: CurrentUser):
    return objectEntity(_own_card(flash_card_id, user))


@fc.put("/update/{flash_card_id}", status_code=202, responses=responses)
def update_flash_card(flash_card_id: str, flash_card: FlashCardUpdate, user: CurrentUser):
    card = _own_card(flash_card_id, user)
    changes = flash_card.model_dump(exclude_unset=True)
    if changes:
        db.flashcard.update_one({"_id": card["_id"]}, {"$set": changes})
    return {"message": "FlashCard Updated successfully"}


@fc.delete("/delete/{flash_card_id}", responses=responses)
def delete_flash_card(flash_card_id: str, user: CurrentUser):
    card = _own_card(flash_card_id, user)
    db.flashcard.delete_one({"_id": card["_id"]})
    return {"message": "FlashCard deleted successfully"}


@fc.post("/generate", responses=responses)
async def generate_flashcard(flashcard_input: FlashCard, user: AIUser):
    """Generate the back of a card from course material (RAG) and save it for the caller."""
    from fastapi.concurrency import run_in_threadpool

    await run_in_threadpool(ensure_course, flashcard_input.course_id)
    try:
        result = await ai_service.flashcard_back(user.email, flashcard_input.course_id, flashcard_input.week,
                                                 flashcard_input.title)
    except AIError as exc:
        raise to_http(exc) from None

    def _save():
        res = db.flashcard.insert_one({
            "user_id": user.user_id, "course_id": flashcard_input.course_id, "week": flashcard_input.week,
            "title": flashcard_input.title, "content": result["content"],
        })
        return db.flashcard.find_one({"_id": res.inserted_id})

    card = objectEntity(await run_in_threadpool(_save))
    card["trace_id"] = result["trace_id"]
    card["sources"] = result["sources"]
    return card
