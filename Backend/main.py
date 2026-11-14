"""Study Buddy API - FastAPI application entry point."""
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ai.errors import AIError, to_http
from core.config import get_settings
from core.logging import configure_logging
from database.db import ensure_indexes
from routes.admin import admin
from routes.ai import ai
from routes.ai_ws import ws_router
from routes.assignment import assgn
from routes.auth import auth, oauth
from routes.coding_assignments import coding_assignment
from routes.course import course
from routes.course_material import course_material
from routes.flashcard import fc
from routes.notes import notes
from routes.user import user
from utils.response import responses

log = logging.getLogger("studybuddy")

DESCRIPTION = """
An AI-assisted learning management system: courses, weekly notes, graded and practice assignments
(MCQ / MSQ / numeric / coding), flashcards, and a Gemini/OpenRouter powered study buddy with
retrieval-augmented chat over course material.

Roles: **student**, **instructor**, **admin**. Authenticate with `Authorization: Bearer <jwt>`.
"""

TAGS = [
    {"name": "Auth", "description": "Google sign-in, demo logins, current user"},
    {"name": "User", "description": "Profile, submissions, marks, insights"},
    {"name": "Course", "description": "Courses and course content"},
    {"name": "Course Material", "description": "Weekly material (instructor managed)"},
    {"name": "Notes", "description": "Instructor notes"},
    {"name": "Assignment", "description": "MCQ / MSQ / numeric questions"},
    {"name": "Coding Assignment", "description": "Coding questions run in a sandbox"},
    {"name": "Flashcard", "description": "Personal flashcards"},
    {"name": "AI", "description": "Summaries, question generation, hints, traces"},
    {"name": "Admin", "description": "User management and AI usage"},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    ensure_indexes()
    if settings.seed_demo_on_startup:
        try:
            from scripts.seed_demo import seed

            log.info("Seeding demo data: %s", seed())
        except Exception:  # noqa: BLE001
            log.exception("Demo seeding failed")
    log.info("Study Buddy API started (demo_mode=%s, ai_provider=%s, code_runner=%s)",
             settings.demo_mode, settings.effective_ai_provider, settings.code_runner)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, description=DESCRIPTION, version="2.0.0",
                  openapi_tags=TAGS, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=False,  # auth uses bearer tokens, not cookies
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def access_log(request: Request, call_next):
        start = time.monotonic()
        response = await call_next(request)
        log.info("%s %s -> %s (%d ms)", request.method, request.url.path, response.status_code,
                 (time.monotonic() - start) * 1000)
        return response

    @app.exception_handler(AIError)
    async def ai_error_handler(request: Request, exc: AIError):
        http = to_http(exc)
        return JSONResponse(status_code=http.status_code, content={"detail": http.detail})

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception):
        log.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

    for router in (auth, oauth, user, course, course_material, notes, assgn, coding_assignment, fc, ai,
                   admin, ws_router):
        app.include_router(router)

    @app.get("/", tags=["Home"], responses=responses)
    def home():
        return {"name": settings.app_name, "docs": "/docs", "status": "ok"}

    @app.get("/health", tags=["Home"])
    def health():
        return {"status": "ok"}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
