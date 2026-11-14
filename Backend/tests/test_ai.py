import json

import httpx
import pytest

from ai import providers, rag
from ai.errors import AIOutputError, AIProviderError
from ai.providers import OpenRouterProvider
from ai.structured import agenerate_structured, extract_json, generate_structured
from ai.service import QuestionsSchema
from core.config import get_settings
from core.ratelimit import RateLimiter
from tests.conftest import FakeProvider

MCQ_JSON = json.dumps({"questions": [{"question": "Q?", "option1": "a", "option2": "b", "option3": "c",
                                      "option4": "d", "correct_option": "b"}]})


# ---------------------------------------------------------------- rate limiter
def test_rate_limiter_window():
    now = [0.0]
    rl = RateLimiter(2, 60, clock=lambda: now[0])
    assert rl.hit("u") == 0 and rl.hit("u") == 0
    assert rl.hit("u") > 0 and rl.hit("other") == 0
    now[0] = 61
    assert rl.hit("u") == 0


def test_ai_endpoint_rate_limit_and_auth(client, student, fake_ai):
    get_settings().rate_limit_ai_per_minute = 2
    fake_ai.replies = ['{"summary": "s"}']
    assert client.post("/summarize", json={"text": "hello"}).status_code == 401
    assert client.post("/summarize", json={"text": "hello"}, headers=student).status_code == 201
    assert client.post("/summarize", json={"text": "hello"}, headers=student).status_code == 201
    res = client.post("/summarize", json={"text": "hello"}, headers=student)
    assert res.status_code == 429 and "Retry-After" in res.headers


def test_daily_cap(client, student, fake_ai):
    get_settings().ai_daily_request_cap = 1
    fake_ai.replies = ['{"summary": "s"}']
    assert client.post("/summarize", json={"text": "x"}, headers=student).status_code == 201
    res = client.post("/summarize", json={"text": "x"}, headers=student)
    assert res.status_code == 429 and "tomorrow" in res.json()["detail"]


def test_input_caps(client, student, fake_ai):
    get_settings().ai_max_input_chars = 50
    assert client.post("/summarize", json={"text": "x" * 51}, headers=student).status_code == 422
    assert client.post("/summarize", json={"text": "   "}, headers=student).status_code == 422


# ------------------------------------------------------------- structured output
def test_extract_json_tolerates_fences_and_prose():
    assert extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert extract_json('Sure! {"a": 1} hope it helps') == {"a": 1}
    with pytest.raises(ValueError):
        extract_json("no json here")


def test_structured_retries_once_then_succeeds():
    p = FakeProvider(["not json", MCQ_JSON])
    out = generate_structured(p, "sys", "prompt", QuestionsSchema)
    assert out.questions[0].correct_option == "b" and len(p.calls) == 2
    assert "could not be used" in p.calls[1]["prompt"]


def test_structured_fails_after_retry():
    import asyncio

    p = FakeProvider(["nope", "still nope"])
    with pytest.raises(AIOutputError):
        asyncio.run(agenerate_structured(p, "s", "p", QuestionsSchema))
    assert len(p.calls) == 2


def test_correct_option_letter_is_normalised():
    bad = json.loads(MCQ_JSON)
    bad["questions"][0]["correct_option"] = "C"
    q = QuestionsSchema.model_validate(bad).questions[0]
    assert q.correct_option == "c"
    bad["questions"][0]["option2"] = "a"  # duplicate options rejected
    with pytest.raises(Exception):
        QuestionsSchema.model_validate(bad)


# ----------------------------------------------------------------- REST features
def test_summarize_logs_and_trace(client, student, admin, instructor, fake_ai, db):
    fake_ai.replies = ['{"summary": "Short."}']
    res = client.post("/summarize", json={"text": "Long text about cells."}, headers=student)
    body = res.json()
    assert body["summary"] == "Short." and body["trace_id"]
    log = db.ai_logs.find_one({})
    assert log["feature"] == "summarize" and log["status"] == "ok" and log["model"] == "fake-model"
    assert log["tokens_in"] > 0 and log["latency_ms"] >= 0 and "cells" in log["prompt"]
    trace = client.get(f"/ai/trace/{body['trace_id']}", headers=student)
    assert trace.status_code == 200 and trace.json()["system_prompt"]
    assert client.get(f"/ai/trace/{body['trace_id']}", headers=admin).status_code == 200
    assert client.get(f"/ai/trace/{body['trace_id']}", headers=instructor).status_code == 404
    assert client.get("/ai/trace/zzz", headers=student).status_code == 422


def test_generate_questions_shape(client, student, fake_ai):
    fake_ai.replies = [MCQ_JSON]
    body = client.post("/generate_questions", json={"text": "t"}, headers=student).json()
    assert body["questions"][0]["correct_option"] == "b" and body["trace_id"]
    fake_ai.replies = [MCQ_JSON]
    assert "questions" in client.post("/generate_assignment_questions", json={"text": "t"}, headers=student).json()


def test_provider_failure_is_friendly(client, student, fake_ai):
    def boom(*a, **k):
        raise AIProviderError("x")

    fake_ai.generate = boom
    async def aboom(*a, **k):
        raise AIProviderError("x")

    fake_ai.agenerate = aboom
    res = client.post("/user/generate", json={"query": "hi"}, headers=student)
    assert res.status_code == 502 and "temporarily" in res.json()["detail"]


def test_ai_not_configured_gives_503(client, student, monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_mode", False)  # demo mode would fall back to the mock provider
    res = client.post("/user/generate", json={"query": "hi"}, headers=student)
    assert res.status_code == 503


def test_hint_never_sends_answers(client, student, fake_ai, questions, coding):
    fake_ai.replies = ["Think about what happens when n is doubled."]
    res = client.post("/ai/hint", json={"assgn_id": questions["mcq"], "message": "help"}, headers=student)
    assert res.status_code == 200 and "hint" in res.json()
    prompt = fake_ai.calls[-1]["prompt"]
    assert "2+2?" in prompt and "Correct" not in prompt
    assert "never the solution" in fake_ai.calls[-1]["system"].lower() or "HINT" in fake_ai.calls[-1]["system"]
    client.post("/ai/hint", json={"assgn_id": coding, "code": "print(1)"}, headers=student)
    assert "14" not in fake_ai.calls[-1]["prompt"]  # private test expectations never reach the model
    assert client.post("/ai/hint", json={"assgn_id": "c" * 24}, headers=student).status_code == 404


def test_code_feedback_policy(client, student, fake_ai, coding, db):
    from tests.conftest import b64

    fake_ai.replies = ["Looks fine."]
    res = client.post(f"/coding_assignment/{coding}/feedback", json={"assgn_id": coding, "code": b64("print(1)")}, headers=student)
    assert res.status_code == 200
    assert "NOT passed" in fake_ai.calls[-1]["prompt"]


def test_generate_from_material_instructor_only(client, student, instructor, fake_ai, course, db):
    draft = {"summary": "S", "questions": json.loads(MCQ_JSON)["questions"], "flashcards": [{"title": "t", "content": "c"}]}
    fake_ai.replies = [json.dumps(draft)]
    assert client.post("/ai/generate_from_material", json={"text": "abc"}, headers=student).status_code == 403
    res = client.post("/ai/generate_from_material", json={"text": "abc"}, headers=instructor)
    assert res.status_code == 200 and res.json()["quiz"][0]["answers"] == ["b"]
    assert client.post("/ai/generate_from_material", json={}, headers=instructor).status_code == 422


# -------------------------------------------------------------------------- RAG
def _material(db, course, title, week, content):
    doc = {"course_id": course, "material_type": "notes", "title": title, "week": week, "content": content}
    doc["_id"] = db.course_material.insert_one(dict(doc)).inserted_id
    rag.index_material_doc(doc, embed=False)


def test_chunking_and_bm25():
    text = "\n\n".join(f"Paragraph {i} " + "word " * 120 for i in range(6))
    chunks = rag.chunk_text(text, max_chars=500)
    assert len(chunks) > 3 and all(len(c) < 800 for c in chunks)
    scores = rag.bm25_scores("binary search", ["binary search halves the range", "cooking pasta", "search engines"])
    assert scores[0] > scores[2] > scores[1] == 0


def test_retrieval_filters_by_course_and_week(db, course):
    _material(db, course, "Hashing", 1, "Hash tables give constant time lookup using a hash function.")
    _material(db, course, "Trees", 3, "Binary search trees keep keys ordered for fast lookup.")
    _material(db, "OTHER", "Hashing", 1, "Hash tables in another course.")
    hits = rag.retrieve(course, 2, "hash lookup", k=3)
    assert [h["title"] for h in hits] == ["Hashing"] and hits[0]["method"] == "keyword"
    assert {h["title"] for h in rag.retrieve(course, 12, "lookup", k=3)} == {"Hashing", "Trees"}
    assert rag.retrieve(course, 12, "zebra xylophone") == []
    cites = rag.citations(hits)
    assert cites[0]["title"] == "Hashing" and cites[0]["week"] == 1


def test_embedding_retrieval_used_when_available(db, course):
    class Emb:
        model = "fake-emb"

        def embed(self, texts, task="x"):
            return [[1.0, 0.0] if "alpha" in t.lower() else [0.0, 1.0] for t in texts]

    providers.set_embedder(Emb())
    doc = {"course_id": course, "material_type": "notes", "title": "A", "week": 1, "content": "alpha topic text"}
    doc["_id"] = db.course_material.insert_one(dict(doc)).inserted_id
    rag.index_material_doc(doc)
    doc2 = {"course_id": course, "material_type": "notes", "title": "B", "week": 1, "content": "beta topic text"}
    doc2["_id"] = db.course_material.insert_one(dict(doc2)).inserted_id
    rag.index_material_doc(doc2)
    hits = rag.retrieve(course, 5, "alpha", k=2)
    assert hits[0]["title"] == "A" and hits[0]["method"] == "embedding"


def test_reindex_all(db, course):
    _material(db, course, "T", 1, "Some content about graphs and edges.")
    db.notes.insert_one({"course_id": course, "title": "N", "content": "Notes on sorting algorithms."})
    stats = rag.reindex_all(embed=False)
    assert stats["sources"] == 2 and stats["chunks"] == 2


def test_course_chat_returns_citations_and_trace(client, student, fake_ai, db, course):
    _material(db, course, "Hashing", 1, "Hash tables give constant time lookup.")
    fake_ai.replies = ["Constant time [1]."]
    res = client.post("/user/search_generate", json={"query": "hash lookup", "course_id": course, "week": 3}, headers=student).json()
    assert res["sources"][0]["title"] == "Hashing" and res["trace_id"]
    assert "Hash tables give constant time" in fake_ai.calls[-1]["prompt"]
    log = db.ai_logs.find_one({"feature": "course_chat"})
    assert log["retrieved"][0]["title"] == "Hashing"


def test_flashcard_generate(client, student, fake_ai, db, course):
    _material(db, course, "Hashing", 1, "Hash tables give constant time lookup.")
    fake_ai.replies = ["Constant-time key lookup."]
    card = client.post("/flash_card/generate", json={"course_id": course, "week": 2, "title": "Hash tables"}, headers=student).json()
    assert card["content"] == "Constant-time key lookup." and card["trace_id"] and db.flashcard.count_documents({}) == 1


# ------------------------------------------------------------------- websockets
def test_websocket_chat_stream_with_meta(client, student, fake_ai):
    fake_ai.replies = ["Hello there friend"]
    token = student["Authorization"].split()[1]
    with client.websocket_connect(f"/generate?token={token}") as ws:
        ws.send_json({"query": "hi"})
        frames = []
        while True:
            f = ws.receive_text()
            frames.append(f)
            if f == "[[END]]":
                break
    assert "".join(frames[:-2]) == "Hello there friend"
    assert frames[-2].startswith("[[META]] ")
    meta = json.loads(frames[-2][len("[[META]] "):])
    assert {"trace_id", "citations", "model", "latency_ms", "tokens_in", "tokens_out"} <= set(meta)


def test_websocket_search_generate_cites(client, student, fake_ai, db, course):
    _material(db, course, "Hashing", 1, "Hash tables give constant time lookup.")
    fake_ai.replies = ["Use hashing"]
    token = student["Authorization"].split()[1]
    with client.websocket_connect(f"/search_generate?token={token}") as ws:
        ws.send_json({"query": "hash lookup", "course_id": course, "week": 4})
        frames = []
        while (f := ws.receive_text()) != "[[END]]":
            frames.append(f)
    meta = json.loads(frames[-1][len("[[META]] "):])
    assert meta["citations"] == [{"title": "Hashing", "week": 1}]
    assert any("Sources" in f for f in frames)


def test_websocket_errors(client, student, fake_ai):
    token = student["Authorization"].split()[1]
    with client.websocket_connect(f"/generate?token={token}") as ws:
        ws.send_json({"nope": 1})
        assert ws.receive_text().startswith("[[ERROR]]")
    get_settings().rate_limit_ai_per_minute = 0
    with client.websocket_connect(f"/generate?token={token}") as ws:
        ws.send_json({"query": "x"})
        assert ws.receive_text().startswith("[[ERROR]]")


# ---------------------------------------------------------------------- providers
def test_openrouter_provider_generate_and_stream():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.read())
        seen["payload"], seen["auth"] = payload, request.headers["authorization"]
        if payload["stream"]:
            sse = 'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: [DONE]\n\n'
            return httpx.Response(200, content=sse, headers={"content-type": "text/event-stream"})
        return httpx.Response(200, json={"choices": [{"message": {"content": "answer"}}]})

    p = OpenRouterProvider("k", "m:free", transport=httpx.MockTransport(handler))
    assert p.generate("sys", "hi", json_mode=True) == "answer"
    assert seen["auth"] == "Bearer k" and seen["payload"]["response_format"] == {"type": "json_object"}
    assert seen["payload"]["messages"][0] == {"role": "system", "content": "sys"}
    assert "".join(p.stream("sys", "hi")) == "Hello"


def test_openrouter_async_and_errors():
    import asyncio

    def handler(request):
        return httpx.Response(500, json={"error": "x"})

    p = OpenRouterProvider("k", "m", async_transport=httpx.MockTransport(handler))
    with pytest.raises(AIProviderError):
        asyncio.run(p.agenerate("s", "p"))

    async def collect():
        return [c async for c in p.astream("s", "p")]

    with pytest.raises(AIProviderError):
        asyncio.run(collect())


def test_provider_factory(monkeypatch):
    from ai.errors import AINotConfigured

    monkeypatch.setattr(get_settings(), "demo_mode", False)
    with pytest.raises(AINotConfigured):
        providers.get_provider()
    monkeypatch.setattr(get_settings(), "ai_provider", "openrouter")
    monkeypatch.setattr(get_settings(), "openrouter_api_key", "k")
    assert providers.get_provider().name == "openrouter"


def test_gemini_provider_with_fake_client():
    import asyncio

    class R:
        def __init__(self, t): self.text = t

    class Models:
        def generate_content(self, **kw): return R("full")
        def generate_content_stream(self, **kw): return iter([R("a"), R("b")])

    class AModels:
        async def generate_content(self, **kw): return R("afull")
        async def generate_content_stream(self, **kw):
            async def gen():
                yield R("x"); yield R("y")
            return gen()

    class Client:
        models = Models()
        class aio:  # noqa: N801
            models = AModels()

    p = providers.GeminiProvider("", "gemini-2.5-flash", client=Client())
    assert p.generate("s", "p", json_mode=True) == "full"
    assert "".join(p.stream("s", "p")) == "ab"
    assert asyncio.run(p.agenerate("s", "p")) == "afull"

    async def collect():
        return "".join([c async for c in p.astream("s", "p")])

    assert asyncio.run(collect()) == "xy"
