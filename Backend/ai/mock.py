"""Deterministic, offline "AI" used for demos, CI and local development (``AI_PROVIDER=mock``).

It does not call any network service. Replies are canned but *context-aware*: they are built from the
prompt itself (retrieved course excerpts, the text to summarise, the assignment question, ...), so the whole
product - streaming, citations, structured JSON, traces, rate limits and the admin usage dashboard - can be
exercised without an API key. The output is intentionally simple and clearly labelled as a mock.
"""
from __future__ import annotations

import asyncio
import json
import re
import time
from typing import AsyncIterator, Iterator

from ai import prompts
from ai.providers import AIProvider

MOCK_MODEL = "mock-1"
STREAM_DELAY = 0.02  # seconds between streamed chunks


def _tag(prompt: str, tag: str) -> str:
    m = re.search(rf"<{tag}>\s*(.*?)\s*</{tag}>", prompt, re.S | re.I)
    return m.group(1).strip() if m else ""


def _sentences(text: str) -> list[str]:
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"^\s*#+\s*", "", text, flags=re.M)
    text = re.sub(r"[*_`>|]+", "", text)
    text = re.sub(r"^\s*[-+]\s+", "", text, flags=re.M)
    parts = re.split(r"(?<=[.!?])\s+|\n+", text)
    out = []
    for p in parts:
        p = re.sub(r"\s+", " ", p).strip(" -")
        if len(p) >= 25 and p not in out:
            out.append(p if len(p) <= 220 else p[:217].rstrip() + "...")
    return out


def _keywords(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9_]{3,}", text.lower())}


def _best(sentences: list[str], query: str, n: int = 2) -> list[str]:
    q = _keywords(query)
    ranked = sorted(sentences, key=lambda s: -len(q & _keywords(s)))
    return ranked[:n]


def _context_blocks(prompt: str) -> list[tuple[int, str, str]]:
    ctx = _tag(prompt, "context")
    blocks = []
    for m in re.finditer(r"\[(\d+)\] \(Week (\d+) - (.*?)\)\n(.*?)(?=\n\n\[\d+\] \(Week|\Z)", ctx, re.S):
        blocks.append((int(m.group(1)), m.group(3), m.group(4)))
    return blocks


class MockProvider(AIProvider):
    name = "mock"

    def __init__(self, model: str = MOCK_MODEL, delay: float = STREAM_DELAY) -> None:
        super().__init__(model)
        self.delay = delay

    # ---------------------------------------------------------- replies ----
    def _reply(self, system: str, prompt: str, json_mode: bool) -> str:
        if system == prompts.SUMMARIZE:
            return json.dumps({"summary": self._summary(_tag(prompt, "text"))})
        if system in (prompts.MCQ_FROM_TEXT, prompts.MCQ_SIMILAR):
            n = 3 if system == prompts.MCQ_SIMILAR else 2
            return json.dumps({"questions": self._questions(_tag(prompt, "text"), n)})
        if system == prompts.DRAFT_FROM_MATERIAL:
            m = re.search(r"Write (\d+) questions", prompt)
            n = int(m.group(1)) if m else 4
            text = _tag(prompt, "text")
            cards = [{"title": f"Key idea {i}", "content": s} for i, s in enumerate(_sentences(text)[:4], 1)]
            return json.dumps({"summary": self._summary(text), "questions": self._questions(text, n),
                               "flashcards": cards or [{"title": "Key idea", "content": "Review the material."}]})
        if system == prompts.FLASHCARD:
            sents = _sentences(_tag(prompt, "context"))
            best = _best(sents, _tag(prompt, "title"), 2) if sents else []
            title = _tag(prompt, "title") or "This topic"
            return " ".join(best) or (f"{title} is a core idea in this course; check the notes for the precise "
                                      "definition and a worked example (mock AI answer).")
        if system == prompts.FLASHCARD_DECK:
            return json.dumps({"cards": self._deck(prompt)})
        if system == prompts.HINT:
            return self._hint(prompt)
        if system == prompts.FEEDBACK:
            return self._feedback(prompt)
        if system == prompts.COURSE_QA:
            return self._course_answer(prompt)
        return self._chat(prompt)

    @staticmethod
    def _deck(prompt: str) -> list[dict]:
        topic = _tag(prompt, "topic") or "this topic"
        m = re.search(r"<count>\s*(\d+)", prompt)
        n = int(m.group(1)) if m else 6
        ctx = _tag(prompt, "context")
        pairs = []  # (sentence, week, title) from retrieved passages, in retrieval order
        for m2 in re.finditer(r"\[\d+\] \(Week (\d+) - (.*?)\)\n(.*?)(?=\n\n\[\d+\] \(Week|\Z)", ctx, re.S):
            for s in _sentences(m2.group(3)):
                if s not in [p[0] for p in pairs]:
                    pairs.append((s, int(m2.group(1)), m2.group(2)))
        kw = _keywords(topic)
        pairs.sort(key=lambda p: -len(kw & _keywords(p[0])))  # stable: ties keep retrieval order
        cards = []
        for i, (sent, week, title) in enumerate(pairs[:n]):
            words = re.findall(r"[A-Za-z0-9_']+", sent)
            focus = " ".join(words[:6])
            cards.append({"front": f"{topic.strip().capitalize()}: what should you know about \"{focus}\"?",
                          "back": sent, "week": week, "source": title})
        generic = ["What is the core definition of {t}?", "Why is {t} useful in practice?",
                   "What is a common mistake when working with {t}?", "How would you explain {t} with a small example?",
                   "What are the key terms related to {t}?", "How does {t} connect to earlier course topics?"]
        for g in generic:
            if len(cards) >= n:
                break
            front = g.format(t=topic)
            cards.append({"front": front, "back": f"A short general answer about {topic} (offline mock AI; "
                          "check the course notes for precise details).", "week": None, "source": None})
        return cards[:n]

    @staticmethod
    def _summary(text: str) -> str:
        sents = _sentences(text) or ["The provided text is very short."]
        points = "\n".join(f"- {s}" for s in sents[1:6])
        return (f"**Overview:** {sents[0]}\n\n**Key points**\n{points or '- (no further points)'}\n\n"
                "_Generated by the offline mock AI._")

    @staticmethod
    def _questions(text: str, n: int) -> list[dict]:
        sents = _sentences(text) or ["Study Buddy helps students learn with course notes and practice."]
        out = []
        for i in range(n):
            s = sents[i % len(sents)]
            wrong = [
                f"The opposite is true: {s[0].lower() + s[1:]}"[:200],
                "None of the ideas in the material apply here, so nothing can be said.",
                "The material only discusses this idea in an unrelated context.",
            ]
            out.append({"question": f"Which statement is supported by the material? (Q{i + 1})",
                        "option1": s, "option2": wrong[0] + f" (variant {i + 1})",
                        "option3": wrong[1] + f" ({i + 1})", "option4": wrong[2] + f" ({i + 1})",
                        "correct_option": s})
        return out

    @staticmethod
    def _chat(prompt: str) -> str:
        q = _tag(prompt, "text") or "your question"
        return (f"Here is a quick explanation of **{q[:80]}**.\n\n"
                "1. Start from the core definition and a tiny example.\n"
                "2. Check edge cases and try it on paper.\n"
                "3. Compare with something you already know.\n\n"
                "_This is a canned reply from the offline mock AI (no API key configured)._")

    @staticmethod
    def _course_answer(prompt: str) -> str:
        blocks = _context_blocks(prompt)
        question = prompt.rsplit("Student question:", 1)[-1]
        question = _tag(question, "text") or question
        if not blocks:
            return ("I could not find this in the course material, so this is a general answer (not from the "
                    "course): try breaking the problem into smaller steps.\n\n_Offline mock AI._")
        lines = []
        for ref, title, text in blocks[:3]:
            sents = _sentences(text)
            pick = _best(sents, question, 1) if sents else []
            if pick:
                lines.append(f"- {pick[0]} [{ref}]")
        body = "\n".join(lines) or f"- See the course excerpt [{blocks[0][0]}]."
        return (f"Based on your course material, here is what is relevant to \"{question[:90]}\":\n\n{body}\n\n"
                "_Offline mock AI: a real model would write a fuller explanation._")

    @staticmethod
    def _hint(prompt: str) -> str:
        q = _tag(prompt, "assignment")
        first = (q.splitlines() or [""])[0].replace("Question:", "").strip()[:140]
        has_code = "<student_code>" in prompt
        lead = "Look closely at how your code handles the input, e.g. an empty or boundary value." if has_code \
            else "Start by writing down the input and the expected output for one example by hand."
        return (f"Hint for \"{first}\": {lead} Which sub-step could you solve on its own first? "
                "Try printing an intermediate value to confirm your assumption.")

    @staticmethod
    def _feedback(prompt: str) -> str:
        code = _tag(prompt, "student_code")
        loops = len(re.findall(r"\b(for|while)\b", code))
        cx = "O(n^2) because of nested loops" if loops > 1 else ("O(n)" if loops == 1 else "O(1)")
        return ("**Correctness**\nYour solution looks reasonable; double-check empty input and boundary values.\n\n"
                "**Style**\nUse descriptive names and keep functions short.\n\n"
                f"**Complexity**\nEstimated time complexity: {cx}; extra space is O(1).\n\n"
                "_Offline mock AI review._")

    # ------------------------------------------------------- interface ----
    def generate(self, system, prompt, *, json_mode=False, temperature=0.4, max_tokens=None) -> str:
        time.sleep(self.delay)
        return self._reply(system, prompt, json_mode)

    async def agenerate(self, system, prompt, *, json_mode=False, temperature=0.4, max_tokens=None) -> str:
        await asyncio.sleep(self.delay * 3)
        return self._reply(system, prompt, json_mode)

    @staticmethod
    def _pieces(text: str) -> list[str]:
        return re.findall(r"\S+\s*", text)

    def stream(self, system, prompt, *, temperature=0.4, max_tokens=None) -> Iterator[str]:
        for piece in self._pieces(self._reply(system, prompt, False)):
            time.sleep(self.delay)
            yield piece

    async def astream(self, system, prompt, *, temperature=0.4, max_tokens=None) -> AsyncIterator[str]:
        pieces = self._pieces(self._reply(system, prompt, False))
        # group 2 words per frame: small chunks, fast enough for a snappy demo
        for i in range(0, len(pieces), 2):
            await asyncio.sleep(self.delay)
            yield "".join(pieces[i:i + 2])
