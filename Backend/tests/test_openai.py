"""OpenAI provider (httpx MockTransport): streaming, real token usage, embeddings and key secrecy."""
import asyncio
import json
import logging

import httpx

from ai import providers
from ai.providers import OpenAIEmbedder, OpenAIProvider
from core.config import get_settings

KEY = "sk-super-secret-test-key-123"


def _sse(*chunks, usage=None):
    lines = [f"data: {json.dumps({'choices': [{'delta': {'content': c}}]})}\n\n" for c in chunks]
    if usage:
        lines.append(f"data: {json.dumps({'choices': [], 'usage': usage})}\n\n")
    lines.append("data: [DONE]\n\n")
    return "".join(lines)


def _provider(handler):
    t = httpx.MockTransport(handler)
    return OpenAIProvider(KEY, "gpt-4o-mini", transport=t, async_transport=t)


def test_defaults_and_factory(monkeypatch):
    s = get_settings()
    assert s.openai_model == "gpt-4o-mini" and s.openai_base_url == "https://api.openai.com/v1"
    assert s.openai_embedding_model == "text-embedding-3-small"
    monkeypatch.setattr(s, "demo_mode", False)
    monkeypatch.setattr(s, "ai_provider", "openai")
    monkeypatch.setattr(s, "openai_api_key", KEY)
    assert providers.get_provider().name == "openai"
    assert providers.get_embedder().model == "text-embedding-3-small"


def test_generate_and_stream_request_shape_and_usage():
    seen = []

    def handler(request):
        body = json.loads(request.content)
        seen.append((request.url.path, request.headers["authorization"], body))
        if body["stream"]:
            return httpx.Response(200, text=_sse("Hel", "lo", usage={"prompt_tokens": 11, "completion_tokens": 2}))
        return httpx.Response(200, json={"choices": [{"message": {"content": "hi"}}],
                                         "usage": {"prompt_tokens": 7, "completion_tokens": 3}})

    p = _provider(handler)
    assert p.generate("s", "p", json_mode=True) == "hi"
    assert providers.usage_var.get() == {"in": 7, "out": 3}
    assert seen[0][2]["response_format"] == {"type": "json_object"} and seen[0][1] == f"Bearer {KEY}"

    async def collect():
        return [c async for c in p.astream("s", "p")]

    assert "".join(asyncio.run(collect())) == "Hello"
    assert seen[1][2]["stream_options"] == {"include_usage": True} and seen[1][0] == "/v1/chat/completions"


def test_embedder():
    def handler(request):
        n = len(json.loads(request.content)["input"])
        return httpx.Response(200, json={"data": [{"index": i, "embedding": [3.0, 4.0]} for i in reversed(range(n))]})

    e = OpenAIEmbedder(KEY, "text-embedding-3-small", transport=httpx.MockTransport(handler))
    assert e.embed(["a", "b"]) == [[0.6, 0.8], [0.6, 0.8]]


def test_real_usage_and_key_never_exposed(client, student, admin, monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)

    def handler(request):
        if json.loads(request.content)["stream"]:
            return httpx.Response(200, text=_sse("a", "b", usage={"prompt_tokens": 123, "completion_tokens": 45}))
        if request.headers.get("x-fail"):
            return httpx.Response(401, json={"error": {"message": f"bad key {KEY}"}})
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"summary": "ok"}'}}],
                                         "usage": {"prompt_tokens": 50, "completion_tokens": 9}})

    providers.set_provider(_provider(handler))
    monkeypatch.setattr(get_settings(), "openai_api_key", KEY)
    r = client.post("/summarize", json={"text": "some text to summarise"}, headers=student)
    assert r.status_code == 201
    trace = client.get(f"/ai/trace/{r.json()['trace_id']}", headers=student).json()
    assert (trace["tokens_in"], trace["tokens_out"]) == (50, 9)

    token = student["Authorization"].split()[1]
    with client.websocket_connect(f"/generate?token={token}") as ws:
        ws.send_json({"query": "hi"})
        frames = []
        while (f := ws.receive_text()) != "[[END]]":
            frames.append(f)
    meta = json.loads(next(f for f in frames if f.startswith("[[META]]"))[9:])
    assert (meta["tokens_in"], meta["tokens_out"]) == (123, 45)

    # provider failure whose upstream body echoes the key must not leak it
    class Boom(OpenAIProvider):
        async def agenerate(self, *a, **k):
            raise providers._wrap(httpx.HTTPStatusError(f"401 {KEY}", request=httpx.Request("POST", "http://x"),
                                                        response=httpx.Response(401)))

    providers.set_provider(Boom(KEY, "gpt-4o-mini"))
    err = client.post("/summarize", json={"text": "some text to summarise"}, headers=student)
    assert err.status_code == 502

    blobs = [client.get("/auth/config").text, trace and json.dumps(trace), err.text,
             client.get("/admin/ai/logs", headers=admin).text, client.get("/admin/ai/usage", headers=admin).text,
             client.get("/admin/users", headers=admin).text, caplog.text, json.dumps(frames)]
    assert not any(KEY in b for b in blobs)
