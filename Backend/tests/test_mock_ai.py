"""The offline mock AI provider: every AI feature works without an API key."""
import asyncio
import json

from ai import providers
from ai.mock import MockProvider
from core.config import get_settings
from tests.conftest import b64


def test_demo_mode_without_key_falls_back_to_mock(client):
    assert providers.get_provider().name == "mock"
    assert client.get("/auth/config").json()["ai_provider"] == "mock"


def test_no_demo_no_key_is_not_mock(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_mode", False)
    assert client.get("/auth/config").json()["ai_provider"] == "gemini"


def test_explicit_mock_provider(monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_mode", False)
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")
    assert providers.get_provider().name == "mock"


def test_summarize_and_questions_are_valid_and_contextual(client, student):
    text = "Binary search halves the search interval each step. It requires a sorted array. Its time complexity is O(log n)."
    r = client.post("/summarize", json={"text": text}, headers=student)
    assert r.status_code == 201 and "Binary search" in r.json()["summary"] and r.json()["trace_id"]
    r = client.post("/generate_questions", json={"text": text}, headers=student)
    qs = r.json()["questions"]
    assert len(qs) == 2 and all(q["correct_option"] in (q["option1"], q["option2"], q["option3"], q["option4"]) for q in qs)
    r = client.post("/generate_assignment_questions", json={"text": text}, headers=student)
    assert len(r.json()["questions"]) == 3


def test_draft_from_material(client, instructor):
    text = "Recursion solves a problem by solving smaller instances. A base case stops the recursion."
    r = client.post("/ai/generate_from_material", json={"text": text, "n_questions": 3}, headers=instructor)
    assert r.status_code == 200
    body = r.json()
    assert len(body["quiz"]) == 3 and body["flashcards"] and body["summary"]


def test_course_chat_streams_with_citations_and_meta(client, student, db, course):
    from ai import rag

    db.course_material.insert_one({"course_id": course, "week": 1, "material_type": "notes", "title": "Sorting",
                                   "content": "Merge sort divides the list in half and merges sorted halves."})
    rag.reindex_all()
    token = student["Authorization"].split()[1]
    frames = []
    with client.websocket_connect(f"/search_generate?token={token}") as ws:
        ws.send_json({"query": "how does merge sort work", "course_id": course, "week": 2})
        while True:
            f = ws.receive_text()
            frames.append(f)
            if f == "[[END]]":
                break
    assert len(frames) > 5  # streamed in small chunks
    meta = json.loads(next(f for f in frames if f.startswith("[[META]]"))[len("[[META]] "):])
    assert meta["model"] == "mock-1" and meta["citations"][0]["title"] == "Sorting"
    assert "Merge sort" in "".join(frames) and meta["tokens_out"] > 0


def test_hint_and_feedback(client, student, coding):
    r = client.post("/ai/hint", json={"assgn_id": coding, "message": "stuck"}, headers=student)
    assert r.status_code == 200 and "double it" in r.json()["hint"]
    r = client.post(f"/coding_assignment/{coding}/feedback", json={"assgn_id": coding, "code": b64("print(1)")}, headers=student)
    assert "Complexity" in r.json()["feedback"]


def test_usage_dashboard_counts_mock_calls(client, student, admin):
    client.post("/summarize", json={"text": "Some reasonably long text about graphs and trees."}, headers=student)
    usage = client.get("/admin/ai/usage", headers=admin).json()
    assert usage["total"]["requests"] == 1 and usage["total"]["est_cost_usd"] == 0
    assert client.get("/admin/ai/logs", headers=admin).json()[0]["provider"] == "mock"


def test_rate_limit_applies_to_mock(client, student, monkeypatch):
    from core import ratelimit

    monkeypatch.setattr(get_settings(), "rate_limit_ai_per_minute", 2)
    codes = [client.post("/user/generate", json={"query": "hi"}, headers=student).status_code for _ in range(4)]
    assert 429 in codes


def test_mock_stream_is_chunked():
    async def collect():
        return [c async for c in MockProvider(delay=0).astream("s", "<text>\nwhat is a stack\n</text>")]

    assert len(asyncio.run(collect())) > 3
