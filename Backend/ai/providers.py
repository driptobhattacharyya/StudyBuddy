"""LLM provider abstraction: Gemini (google-genai SDK) and OpenRouter (httpx).

Every provider offers the same surface: ``generate`` / ``agenerate`` for a full
reply and ``stream`` / ``astream`` for incremental chunks. ``json_mode`` asks the
API for JSON output where supported.
"""
from __future__ import annotations

import inspect
import json
import logging
import math
from abc import ABC, abstractmethod
from typing import AsyncIterator, Iterator

import httpx

from ai.errors import AINotConfigured, AIProviderError
from core.config import Settings, get_settings

log = logging.getLogger(__name__)


class AIProvider(ABC):
    name = "base"

    def __init__(self, model: str) -> None:
        self.model = model

    @abstractmethod
    def generate(self, system: str, prompt: str, *, json_mode: bool = False, temperature: float = 0.4,
                 max_tokens: int | None = None) -> str: ...

    @abstractmethod
    async def agenerate(self, system: str, prompt: str, *, json_mode: bool = False, temperature: float = 0.4,
                        max_tokens: int | None = None) -> str: ...

    @abstractmethod
    def stream(self, system: str, prompt: str, *, temperature: float = 0.4,
               max_tokens: int | None = None) -> Iterator[str]: ...

    @abstractmethod
    def astream(self, system: str, prompt: str, *, temperature: float = 0.4,
                max_tokens: int | None = None) -> AsyncIterator[str]: ...


# ------------------------------------------------------------------ Gemini ----
class GeminiProvider(AIProvider):
    name = "gemini"

    def __init__(self, api_key: str, model: str, timeout: float = 60.0, client=None) -> None:
        super().__init__(model)
        if not api_key and client is None:
            raise AINotConfigured("GEMINI_API_KEY is not set")
        self._api_key, self._timeout, self._client = api_key, timeout, client

    @property
    def client(self):
        if self._client is None:
            from google import genai
            from google.genai import types

            self._client = genai.Client(
                api_key=self._api_key, http_options=types.HttpOptions(timeout=int(self._timeout * 1000))
            )
        return self._client

    def _config(self, system, json_mode, temperature, max_tokens):
        from google.genai import types

        return types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
            max_output_tokens=max_tokens,
            response_mime_type="application/json" if json_mode else None,
        )

    def generate(self, system, prompt, *, json_mode=False, temperature=0.4, max_tokens=None) -> str:
        try:
            res = self.client.models.generate_content(
                model=self.model, contents=prompt, config=self._config(system, json_mode, temperature, max_tokens)
            )
            return res.text or ""
        except Exception as exc:  # noqa: BLE001
            raise _wrap(exc) from exc

    async def agenerate(self, system, prompt, *, json_mode=False, temperature=0.4, max_tokens=None) -> str:
        try:
            res = await self.client.aio.models.generate_content(
                model=self.model, contents=prompt, config=self._config(system, json_mode, temperature, max_tokens)
            )
            return res.text or ""
        except Exception as exc:  # noqa: BLE001
            raise _wrap(exc) from exc

    def stream(self, system, prompt, *, temperature=0.4, max_tokens=None) -> Iterator[str]:
        try:
            for chunk in self.client.models.generate_content_stream(
                model=self.model, contents=prompt, config=self._config(system, False, temperature, max_tokens)
            ):
                if chunk.text:
                    yield chunk.text
        except Exception as exc:  # noqa: BLE001
            raise _wrap(exc) from exc

    async def astream(self, system, prompt, *, temperature=0.4, max_tokens=None) -> AsyncIterator[str]:
        try:
            result = self.client.aio.models.generate_content_stream(
                model=self.model, contents=prompt, config=self._config(system, False, temperature, max_tokens)
            )
            if inspect.isawaitable(result):
                result = await result
            async for chunk in result:
                if chunk.text:
                    yield chunk.text
        except Exception as exc:  # noqa: BLE001
            raise _wrap(exc) from exc


# -------------------------------------------------------------- OpenRouter ----
class OpenRouterProvider(AIProvider):
    name = "openrouter"

    def __init__(self, api_key: str, model: str, base_url: str = "https://openrouter.ai/api/v1",
                 timeout: float = 60.0, transport: httpx.BaseTransport | None = None,
                 async_transport: httpx.AsyncBaseTransport | None = None) -> None:
        super().__init__(model)
        if not api_key:
            raise AINotConfigured("OPENROUTER_API_KEY is not set")
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-Title": "Study Buddy",
        }
        self._transport, self._async_transport = transport, async_transport

    def _payload(self, system, prompt, json_mode, temperature, max_tokens, stream) -> dict:
        payload: dict = {
            "model": self.model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            "temperature": temperature,
            "stream": stream,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        return payload

    @staticmethod
    def _content(data: dict) -> str:
        try:
            return data["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError):
            raise AIProviderError("Unexpected response from the AI provider") from None

    @staticmethod
    def _delta(line: str) -> str | None:
        """Parse one SSE line; None for keep-alives / end marker."""
        if not line.startswith("data:"):
            return None
        body = line[5:].strip()
        if not body or body == "[DONE]":
            return None
        try:
            return json.loads(body)["choices"][0]["delta"].get("content") or None
        except (ValueError, KeyError, IndexError, TypeError):
            return None

    def generate(self, system, prompt, *, json_mode=False, temperature=0.4, max_tokens=None) -> str:
        try:
            with httpx.Client(base_url=self._base_url, headers=self._headers, timeout=self._timeout,
                              transport=self._transport) as client:
                res = client.post("/chat/completions", json=self._payload(system, prompt, json_mode, temperature, max_tokens, False))
                res.raise_for_status()
                return self._content(res.json())
        except httpx.HTTPError as exc:
            raise _wrap(exc) from exc

    async def agenerate(self, system, prompt, *, json_mode=False, temperature=0.4, max_tokens=None) -> str:
        try:
            async with httpx.AsyncClient(base_url=self._base_url, headers=self._headers, timeout=self._timeout,
                                         transport=self._async_transport) as client:
                res = await client.post("/chat/completions", json=self._payload(system, prompt, json_mode, temperature, max_tokens, False))
                res.raise_for_status()
                return self._content(res.json())
        except httpx.HTTPError as exc:
            raise _wrap(exc) from exc

    def stream(self, system, prompt, *, temperature=0.4, max_tokens=None) -> Iterator[str]:
        try:
            with httpx.Client(base_url=self._base_url, headers=self._headers, timeout=self._timeout,
                              transport=self._transport) as client:
                with client.stream("POST", "/chat/completions",
                                   json=self._payload(system, prompt, False, temperature, max_tokens, True)) as res:
                    res.raise_for_status()
                    for line in res.iter_lines():
                        piece = self._delta(line)
                        if piece:
                            yield piece
        except httpx.HTTPError as exc:
            raise _wrap(exc) from exc

    async def astream(self, system, prompt, *, temperature=0.4, max_tokens=None) -> AsyncIterator[str]:
        try:
            async with httpx.AsyncClient(base_url=self._base_url, headers=self._headers, timeout=self._timeout,
                                         transport=self._async_transport) as client:
                async with client.stream("POST", "/chat/completions",
                                         json=self._payload(system, prompt, False, temperature, max_tokens, True)) as res:
                    res.raise_for_status()
                    async for line in res.aiter_lines():
                        piece = self._delta(line)
                        if piece:
                            yield piece
        except httpx.HTTPError as exc:
            raise _wrap(exc) from exc


def _wrap(exc: Exception) -> AIProviderError:
    if isinstance(exc, AIProviderError):
        return exc
    log.warning("AI provider call failed: %s: %s", type(exc).__name__, str(exc)[:300])
    return AIProviderError("The AI service is temporarily unavailable")


# -------------------------------------------------------------- embeddings ----
class GeminiEmbedder:
    """Gemini embeddings (default model ``gemini-embedding-001``)."""

    BATCH = 50

    def __init__(self, api_key: str, model: str, dimensions: int = 768, client=None) -> None:
        self.model, self.dimensions = model, dimensions
        self._api_key, self._client = api_key, client

    @property
    def client(self):
        if self._client is None:
            from google import genai

            self._client = genai.Client(api_key=self._api_key)
        return self._client

    def embed(self, texts: list[str], task: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
        from google.genai import types

        out: list[list[float]] = []
        try:
            for i in range(0, len(texts), self.BATCH):
                res = self.client.models.embed_content(
                    model=self.model, contents=texts[i : i + self.BATCH],
                    config=types.EmbedContentConfig(task_type=task, output_dimensionality=self.dimensions),
                )
                out.extend(_normalize(list(e.values)) for e in res.embeddings)
        except Exception as exc:  # noqa: BLE001
            raise _wrap(exc) from exc
        return out


def _normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


# ----------------------------------------------------------------- factory ----
_provider_override: AIProvider | None = None
_embedder_override: object | None = None
_provider_cache: dict[tuple, AIProvider] = {}


def build_provider(settings: Settings) -> AIProvider:
    if settings.ai_provider == "openrouter":
        return OpenRouterProvider(settings.openrouter_api_key, settings.openrouter_model,
                                  settings.openrouter_base_url, settings.ai_timeout_seconds)
    return GeminiProvider(settings.gemini_api_key, settings.gemini_model, settings.ai_timeout_seconds)


def get_provider() -> AIProvider:
    if _provider_override is not None:
        return _provider_override
    s = get_settings()
    key = (s.ai_provider, s.ai_api_key, s.gemini_model, s.openrouter_model)
    if key not in _provider_cache:
        _provider_cache[key] = build_provider(s)
    return _provider_cache[key]


def set_provider(provider: AIProvider | None) -> None:
    """Override the provider (tests)."""
    global _provider_override
    _provider_override = provider


def get_embedder():
    """An embedder with ``.embed(texts, task)`` or ``None`` when unavailable."""
    if _embedder_override is not None:
        return _embedder_override
    s = get_settings()
    if not s.gemini_api_key:
        return None
    return GeminiEmbedder(s.gemini_api_key, s.gemini_embedding_model, s.embedding_dimensions)


def set_embedder(embedder: object | None) -> None:
    global _embedder_override
    _embedder_override = embedder
