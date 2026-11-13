"""Shared fixtures: in-memory Mongo (mongomock), fake AI provider, API client. Everything runs offline."""
from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone

import mongomock
import pytest
from fastapi.testclient import TestClient

from ai import providers
from ai.providers import AIProvider
from core import ratelimit
from core.config import get_settings, reset_settings_cache
from database import db as dbmod


@pytest.fixture(autouse=True)
def _env(monkeypatch, tmp_path):
    for key in ("GEMINI_API_KEY", "GOOGLE_AI_KEY", "OPENROUTER_API_KEY", "ADMIN_EMAILS", "INSTRUCTOR_EMAILS",
                "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-0123456789-0123456789")
    monkeypatch.setenv("DEMO_MODE", "true")
    monkeypatch.setenv("MONGODB_URI", "mongomock://")
    monkeypatch.setenv("CODE_RUNNER", "local")
    monkeypatch.chdir(tmp_path)  # never pick up a developer's local .env
    reset_settings_cache()
    dbmod.set_db(mongomock.MongoClient(tz_aware=True)["test"])
    for limiter in (ratelimit.ai_limiter, ratelimit.run_limiter, ratelimit.auth_limiter):
        limiter.reset()
    providers.set_provider(None)
    providers.set_embedder(None)
    yield
    providers.set_provider(None)
    providers.set_embedder(None)
    reset_settings_cache()


class FakeProvider(AIProvider):
    """Queue-driven provider: ``replies`` are returned in order (last one repeats)."""

    name = "fake"

    def __init__(self, replies=None):
        super().__init__("fake-model")
        self.replies = list(replies or ["ok"])
        self.calls: list[dict] = []

    def _next(self):
        return self.replies.pop(0) if len(self.replies) > 1 else self.replies[0]

    def generate(self, system, prompt, *, json_mode=False, temperature=0.4, max_tokens=None):
        self.calls.append({"system": system, "prompt": prompt, "json": json_mode})
        return self._next()

    async def agenerate(self, system, prompt, *, json_mode=False, temperature=0.4, max_tokens=None):
        return self.generate(system, prompt, json_mode=json_mode)

    def stream(self, system, prompt, *, temperature=0.4, max_tokens=None):
        self.calls.append({"system": system, "prompt": prompt, "json": False})
        yield from self._next().split(" ")

    async def astream(self, system, prompt, *, temperature=0.4, max_tokens=None):
        for i, piece in enumerate(self.stream(system, prompt)):
            yield piece if i == 0 else " " + piece


@pytest.fixture
def fake_ai():
    provider = FakeProvider()
    providers.set_provider(provider)
    return provider


@pytest.fixture
def client():
    from main import create_app

    return TestClient(create_app())


@pytest.fixture
def db():
    return dbmod.get_db()


def _login(client: TestClient, role: str) -> dict:
    res = client.post("/auth/demo", json={"role": role})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture
def student(client):
    return _login(client, "student")


@pytest.fixture
def instructor(client):
    return _login(client, "instructor")


@pytest.fixture
def admin(client):
    return _login(client, "admin")


@pytest.fixture
def course(db):
    db.course.insert_one({"course_id": "T101", "course_name": "Testing 101"})
    return "T101"


def future(days=5):
    return datetime.now(timezone.utc) + timedelta(days=days)


@pytest.fixture
def questions(db, course):
    """One of each: MCQ, MSQ, numeric (open deadline) and a past-deadline question."""
    base = {"course_id": course, "week": 1, "assgn_type": "GA", "deadline": future(), "evaluated": False}
    docs = {
        "mcq": {**base, "question": "2+2?", "q_type": "MCQ", "options": ["3", "4", "5"], "answers": ["4"]},
        "msq": {**base, "question": "Primes?", "q_type": "MSQ", "options": ["2", "3", "4", "9"], "answers": ["2", "3"]},
        "num": {**base, "question": "sqrt(16)?", "q_type": "Numeric", "options": [], "answers": [4]},
        "late": {**base, "question": "old", "q_type": "MCQ", "options": ["a", "b"], "answers": ["a"],
                 "deadline": datetime.now(timezone.utc) - timedelta(days=1)},
    }
    out = {}
    for k, d in docs.items():
        d = dict(d)
        res = db.assignment.insert_one(d)
        out[k] = str(res.inserted_id)
    return out


@pytest.fixture
def coding(db, course):
    doc = {
        "course_id": course, "week": 1, "assgn_type": "GrPA", "language": "python", "question": "double it",
        "public_testcase": [{"input": "2", "output": "4"}],
        "private_testcase": [{"input": "5", "output": "10"}, {"input": "7", "output": "14"}],
        "deadline": future(), "evaluated": False,
    }
    return str(db.coding_assignment.insert_one(doc).inserted_id)


def b64(code: str) -> str:
    return base64.b64encode(code.encode()).decode()
