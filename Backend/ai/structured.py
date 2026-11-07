"""Structured (JSON) generation with schema validation and a single retry."""
from __future__ import annotations

import json
import logging
import re
from typing import TypeVar

from pydantic import BaseModel, ValidationError

from ai.errors import AIOutputError
from ai.prompts import JSON_RETRY
from ai.providers import AIProvider

log = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)

_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def extract_json(raw: str):
    """Parse JSON from a model reply, tolerating code fences and surrounding prose."""
    text = _FENCE.sub("", raw.strip()).strip()
    try:
        return json.loads(text)
    except ValueError:
        pass
    for open_c, close_c in (("{", "}"), ("[", "]")):
        start, end = text.find(open_c), text.rfind(close_c)
        if start != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except ValueError:
                continue
    raise ValueError("reply is not valid JSON")


def parse_model(raw: str, model: type[T]) -> T:
    data = extract_json(raw)
    return model.model_validate(data)


def _retry_prompt(prompt: str, raw: str, error: Exception) -> str:
    msg = str(error).splitlines()[0][:200] if str(error) else type(error).__name__
    return f"{prompt}\n\n{JSON_RETRY.format(error=msg)}"


async def agenerate_structured(provider: AIProvider, system: str, prompt: str, model: type[T],
                               temperature: float = 0.3) -> T:
    attempt_prompt = prompt
    last: Exception | None = None
    for attempt in range(2):
        raw = await provider.agenerate(system, attempt_prompt, json_mode=True, temperature=temperature)
        try:
            return parse_model(raw, model)
        except (ValueError, ValidationError) as exc:
            last = exc
            log.info("Structured output invalid (attempt %d): %s", attempt + 1, str(exc)[:200])
            attempt_prompt = _retry_prompt(prompt, raw, exc)
    raise AIOutputError("The AI returned an unusable response. Please try again.") from last


def generate_structured(provider: AIProvider, system: str, prompt: str, model: type[T],
                        temperature: float = 0.3) -> T:
    attempt_prompt = prompt
    last: Exception | None = None
    for attempt in range(2):
        raw = provider.generate(system, attempt_prompt, json_mode=True, temperature=temperature)
        try:
            return parse_model(raw, model)
        except (ValueError, ValidationError) as exc:
            last = exc
            attempt_prompt = _retry_prompt(prompt, raw, exc)
    raise AIOutputError("The AI returned an unusable response. Please try again.") from last
