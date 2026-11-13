"""High level AI features. Every call is traced (see ``ai.tracing``)."""
from __future__ import annotations

import asyncio
import re
from typing import Any, AsyncIterator

from fastapi import HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator

from ai import prompts, providers, rag
from ai.errors import AIError
from ai.structured import agenerate_structured
from ai.tracing import Trace
from core.config import get_settings


# --------------------------------------------------------------- schemas ----
class SummarySchema(BaseModel):
    summary: str = Field(min_length=1)


class MCQSchema(BaseModel):
    question: str = Field(min_length=1)
    option1: str
    option2: str
    option3: str
    option4: str
    correct_option: str

    @field_validator("question", "option1", "option2", "option3", "option4", "correct_option", mode="before")
    @classmethod
    def _to_str(cls, v):
        return str(v).strip()

    @model_validator(mode="after")
    def _check(self):
        opts = [self.option1, self.option2, self.option3, self.option4]
        if len(set(opts)) != 4:
            raise ValueError("options must be distinct")
        if self.correct_option not in opts:
            c = self.correct_option.lower().replace("option", "").strip(" .):")
            idx = {"1": 0, "2": 1, "3": 2, "4": 3, "a": 0, "b": 1, "c": 2, "d": 3}.get(c)
            if idx is None:
                raise ValueError("correct_option must be one of the options")
            self.correct_option = opts[idx]
        return self


class QuestionsSchema(BaseModel):
    questions: list[MCQSchema] = Field(min_length=1)


class FlashcardDraft(BaseModel):
    title: str
    content: str


class DraftSchema(BaseModel):
    summary: str
    questions: list[MCQSchema] = Field(min_length=1)
    flashcards: list[FlashcardDraft] = Field(default_factory=list)


# --------------------------------------------------------------- helpers ----
def cap(text: str, name: str = "text", limit: int | None = None) -> str:
    limit = limit or get_settings().ai_max_input_chars
    text = (text or "").strip()
    if not text:
        raise HTTPException(status_code=422, detail=f"{name} must not be empty")
    if len(text) > limit:
        raise HTTPException(status_code=422, detail=f"{name} is too long (max {limit} characters)")
    return text


def _wrap(tag: str, text: str) -> str:
    # neutralise attempts to close our delimiter early
    safe = re.sub(rf"</?{tag}>", "", text, flags=re.IGNORECASE)
    return f"<{tag}>\n{safe}\n</{tag}>"


async def _text(user: str, feature: str, system: str, prompt: str, retrieved=None,
                temperature: float = 0.4) -> tuple[str, Trace]:
    trace = Trace(user, feature, system, prompt, retrieved)
    try:
        out = await providers.get_provider().agenerate(system, prompt, temperature=temperature)
    except AIError as exc:
        await trace.aend("", "error", str(exc))
        raise
    await trace.aend(out)
    return out.strip(), trace


async def _structured(user: str, feature: str, system: str, prompt: str, schema: type[BaseModel]):
    trace = Trace(user, feature, system, prompt)
    try:
        obj = await agenerate_structured(providers.get_provider(), system, prompt, schema)
    except AIError as exc:
        await trace.aend("", "error", str(exc))
        raise
    await trace.aend(obj.model_dump_json())
    return obj, trace


class StreamSession:
    """An in-flight streamed answer. Iterate ``chunks()``, then read ``trace.meta()``."""

    def __init__(self, trace: Trace, system: str, prompt: str, suffix: str = "") -> None:
        self.trace, self.system, self.prompt, self.suffix = trace, system, prompt, suffix

    async def chunks(self) -> AsyncIterator[str]:
        parts: list[str] = []
        try:
            async for piece in providers.get_provider().astream(self.system, self.prompt):
                parts.append(piece)
                yield piece
            if self.suffix:
                parts.append(self.suffix)
                yield self.suffix
        except AIError as exc:
            await self.trace.aend("".join(parts), "error", str(exc))
            raise
        await self.trace.aend("".join(parts))


# ------------------------------------------------------------- features ----
async def summarize(user: str, text: str) -> dict[str, Any]:
    text = cap(text)
    obj, trace = await _structured(user, "summarize", prompts.SUMMARIZE, _wrap("text", text), SummarySchema)
    return {"summary": obj.summary, "trace_id": trace.trace_id}


async def generate_questions(user: str, text: str) -> dict[str, Any]:
    text = cap(text)
    obj, trace = await _structured(user, "generate_questions", prompts.MCQ_FROM_TEXT,
                                   "Write 2 questions.\n" + _wrap("text", text), QuestionsSchema)
    return {**obj.model_dump(), "trace_id": trace.trace_id}


async def generate_similar_questions(user: str, text: str) -> dict[str, Any]:
    text = cap(text)
    obj, trace = await _structured(user, "similar_questions", prompts.MCQ_SIMILAR,
                                   "Write 3 new questions.\n" + _wrap("text", text), QuestionsSchema)
    return {**obj.model_dump(), "trace_id": trace.trace_id}


async def chat(user: str, query: str) -> dict[str, Any]:
    query = cap(query, "query")
    out, trace = await _text(user, "chat", prompts.TUTOR, _wrap("text", query))
    return {"response": out, "trace_id": trace.trace_id}


def _course_prompt(query: str, chunks: list[dict]) -> str:
    ctx = rag.build_context(chunks) or "(no relevant excerpts found)"
    return f"<context>\n{ctx}\n</context>\n\nStudent question:\n{_wrap('text', query)}"


async def retrieve(course_id: str, week: int | None, query: str) -> list[dict]:
    return await asyncio.to_thread(rag.retrieve, course_id, week, query, get_settings().rag_top_k)


async def course_chat(user: str, course_id: str, week: int, query: str) -> dict[str, Any]:
    query = cap(query, "query")
    chunks = await retrieve(course_id, week, query)
    out, trace = await _text(user, "course_chat", prompts.COURSE_QA, _course_prompt(query, chunks), chunks)
    return {"response": out, "sources": rag.citations(chunks), "trace_id": trace.trace_id}


async def flashcard_back(user: str, course_id: str, week: int, title: str) -> dict[str, Any]:
    title = cap(title, "title", 300)
    chunks = await retrieve(course_id, week, title)
    ctx = rag.build_context(chunks) or "(none)"
    prompt = f"<title>{title}</title>\n<context>\n{ctx}\n</context>"
    out, trace = await _text(user, "flashcard", prompts.FLASHCARD, prompt, chunks, temperature=0.2)
    return {"content": out, "sources": rag.citations(chunks), "trace_id": trace.trace_id}


def begin_chat_stream(user: str, query: str) -> StreamSession:
    query = cap(query, "query")
    prompt = _wrap("text", query)
    return StreamSession(Trace(user, "chat", prompts.TUTOR, prompt), prompts.TUTOR, prompt)


async def begin_course_stream(user: str, course_id: str, week: int, query: str) -> StreamSession:
    query = cap(query, "query")
    chunks = await retrieve(course_id, week, query)
    prompt = _course_prompt(query, chunks)
    trace = Trace(user, "course_chat", prompts.COURSE_QA, prompt, chunks)
    return StreamSession(trace, prompts.COURSE_QA, prompt, rag.sources_footer(rag.citations(chunks)))


def _assignment_block(assignment: dict) -> str:
    """Question text only: answers and hidden tests are NEVER sent to the model for hints."""
    parts = [f"Question: {assignment.get('question', '')}"]
    if assignment.get("options"):
        parts.append("Options: " + "; ".join(map(str, assignment["options"])))
    if assignment.get("language"):
        parts.append(f"Language: {assignment['language']}")
    for i, t in enumerate(assignment.get("public_testcase", [])[:3], 1):
        parts.append(f"Example {i}: input={t.get('input')!r} expected output={t.get('output')!r}")
    return "\n".join(parts)


async def hint(user: str, assignment: dict, code: str | None, message: str | None) -> dict[str, Any]:
    prompt = _wrap("assignment", _assignment_block(assignment))
    if code:
        prompt += "\n" + _wrap("student_code", cap(code, "code", 6000))
    prompt += "\n" + _wrap("student_message", cap(message, "message", 1000) if message else "Give me a hint.")
    out, trace = await _text(user, "hint", prompts.HINT, prompt, temperature=0.5)
    return {"hint": out, "trace_id": trace.trace_id}


async def code_feedback(user: str, assignment: dict, code: str, deadline_passed: bool) -> dict[str, Any]:
    policy = (
        "The deadline has passed: you may discuss a full solution approach."
        if deadline_passed
        else "The deadline has NOT passed: do not write or reveal a complete solution; show at most tiny illustrative snippets."
    )
    prompt = (
        _wrap("assignment", _assignment_block(assignment)) + "\n"
        + _wrap("student_code", cap(code, "code", 8000)) + "\n" + policy
    )
    out, trace = await _text(user, "code_feedback", prompts.FEEDBACK, prompt, temperature=0.3)
    return {"feedback": out, "trace_id": trace.trace_id}


async def draft_from_material(user: str, text: str, n_questions: int = 4) -> dict[str, Any]:
    text = cap(text, "text", 12000)
    n = max(1, min(n_questions, 10))
    obj, trace = await _structured(
        user, "generate_from_material", prompts.DRAFT_FROM_MATERIAL,
        f"Write {n} questions and 4 flashcards.\n" + _wrap("text", text), DraftSchema)
    quiz = [
        {"question": q.question, "q_type": "MCQ", "options": [q.option1, q.option2, q.option3, q.option4],
         "answers": [q.correct_option]}
        for q in obj.questions
    ]
    return {"summary": obj.summary, "quiz": quiz,
            "flashcards": [f.model_dump() for f in obj.flashcards], "trace_id": trace.trace_id}
