"""AI endpoints (all authenticated, rate limited, input capped) + trace inspection."""
from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool

from ai import service as ai_service
from ai.errors import AIError, to_http
from bson import ObjectId
from core.deps import AIUser
from core.security import ADMIN, CurrentUser, InstructorUser  # noqa: F401
from database.db import db
from models.model import GenerateFromMaterial, HintRequest, TextBody
from utils.lookup import get_or_404
from utils.projection import public_assignment_any
from utils.response import convert_to_serializable, responses

ai = APIRouter(tags=["AI"])


async def _guard(coro):
    try:
        return await coro
    except AIError as exc:
        raise to_http(exc) from None


@ai.post("/summarize", status_code=201, responses=responses)
async def summarize_text(body: TextBody, user: AIUser):
    return await _guard(ai_service.summarize(user.email, body.text))


@ai.post("/generate_questions", status_code=201, responses=responses)
async def question_gen(body: TextBody, user: AIUser):
    return await _guard(ai_service.generate_questions(user.email, body.text))


@ai.post("/generate_assignment_questions", status_code=201, responses=responses)
async def similar_question_gen(body: TextBody, user: AIUser):
    return await _guard(ai_service.generate_similar_questions(user.email, body.text))


def _find_assignment(assgn_id: str) -> dict:
    try:
        oid = ObjectId(assgn_id)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=422, detail="Invalid assignment id") from None
    doc = db.assignment.find_one({"_id": oid}) or db.coding_assignment.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return doc


@ai.post("/ai/hint", responses=responses)
async def assignment_hint(body: HintRequest, user: AIUser):
    """Socratic hint for an assignment; answers and hidden tests never reach the model."""
    assignment = await run_in_threadpool(_find_assignment, body.assgn_id)
    safe = public_assignment_any(assignment, False)
    return await _guard(ai_service.hint(user.email, safe, body.code, body.message))


@ai.post("/ai/generate_from_material", responses=responses)
async def generate_from_material(body: GenerateFromMaterial, user: AIUser, staff: InstructorUser):
    """Instructor: draft quiz + flashcards + summary from a material id or pasted text."""
    text = body.text
    if body.material_id:
        doc = await run_in_threadpool(get_or_404, "course_material", body.material_id, "material id")
        text = doc.get("content") or ""
    if not text:
        raise HTTPException(status_code=422, detail="Provide material_id (with text content) or text")
    return await _guard(ai_service.draft_from_material(user.email, text, body.n_questions))


@ai.get("/ai/trace/{trace_id}", responses=responses)
def get_trace(trace_id: str, user: CurrentUser):
    try:
        oid = ObjectId(trace_id)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=422, detail="Invalid trace id") from None
    doc = db.ai_logs.find_one({"_id": oid})
    if not doc or (doc["user"] != user.email and user.role != ADMIN):
        raise HTTPException(status_code=404, detail="Trace not found")
    return convert_to_serializable(doc)
