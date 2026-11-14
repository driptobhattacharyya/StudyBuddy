"""Retrieval-augmented generation over course material, stored in MongoDB.

* Course material / notes are split into chunks stored in ``rag_chunks``.
* If an embedding provider is available, chunks get an embedding vector and retrieval
  uses cosine similarity (pure Python - course corpora are small).
* Otherwise (no API key, provider error, or chunks not embedded yet) retrieval falls back
  to BM25 keyword ranking, so chat-with-notes keeps working offline.
"""
from __future__ import annotations

import hashlib
import logging
import math
import re
from collections import Counter
from typing import Any

from ai import providers
from database.db import db

log = logging.getLogger(__name__)

CHUNK_CHARS = 1100
CHUNK_OVERLAP = 150
_STOPWORDS = frozenset(
    "a an and are as at be but by for from has have how i in is it its of on or that the this to was what when "
    "where which who why will with you your do does can about into than then there these those not".split()
)
_TOKEN = re.compile(r"[a-z0-9_]+")
_MD_NOISE = re.compile(r"[#*`>|]+")


# ------------------------------------------------------------- chunking ----
def clean_text(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)  # strip html tags
    text = _MD_NOISE.sub(" ", text)
    return re.sub(r"[ \t]+", " ", text).strip()


def chunk_text(text: str, max_chars: int = CHUNK_CHARS, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split on paragraph boundaries into ~max_chars chunks with a small overlap."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        while len(para) > max_chars:  # hard split very long paragraphs
            cut = para.rfind(". ", 0, max_chars)
            cut = cut + 1 if cut > max_chars // 2 else max_chars
            piece, para = para[:cut].strip(), para[cut:].strip()
            if current:
                chunks.append(current)
                current = ""
            chunks.append(piece)
        if current and len(current) + len(para) + 2 > max_chars:
            chunks.append(current)
            current = (current[-overlap:] + "\n\n" if overlap else "") + para
        else:
            current = f"{current}\n\n{para}" if current else para
    if current.strip():
        chunks.append(current.strip())
    return chunks


def tokenize(text: str) -> list[str]:
    return [t for t in _TOKEN.findall(text.lower()) if t not in _STOPWORDS and len(t) > 1]


# ------------------------------------------------------------- scoring -----
def bm25_scores(query: str, docs: list[str], k1: float = 1.5, b: float = 0.75) -> list[float]:
    q_terms = set(tokenize(query))
    tokenized = [tokenize(d) for d in docs]
    if not q_terms or not tokenized:
        return [0.0] * len(docs)
    n = len(tokenized)
    avg_len = (sum(len(t) for t in tokenized) / n) or 1.0
    df = Counter(term for toks in tokenized for term in q_terms.intersection(toks))
    scores = []
    for toks in tokenized:
        tf = Counter(toks)
        score = 0.0
        for term in q_terms:
            if not tf[term]:
                continue
            idf = math.log(1 + (n - df[term] + 0.5) / (df[term] + 0.5))
            score += idf * tf[term] * (k1 + 1) / (tf[term] + k1 * (1 - b + b * len(toks) / avg_len))
        scores.append(score)
    return scores


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)


# ------------------------------------------------------------- indexing ----
def _chunk_id(source_id: str, idx: int, text: str) -> str:
    return hashlib.sha1(f"{source_id}:{idx}:{text}".encode()).hexdigest()


def index_source(source_type: str, source_id: str, course_id: str, week: int | None, title: str | None,
                 text: str | None, embed: bool = True) -> int:
    """(Re)index one note / material item. Returns the number of chunks stored."""
    delete_source(source_id)
    pieces = chunk_text(text or "") if text and text.strip() else []
    if not pieces:
        return 0
    docs = [
        {
            "chunk_id": _chunk_id(source_id, i, p), "source_id": source_id, "source_type": source_type,
            "course_id": course_id, "week": week if week is not None else 0, "title": title or "Untitled",
            "text": p, "embedding": None, "embedding_model": None, "idx": i,
        }
        for i, p in enumerate(pieces)
    ]
    db.rag_chunks.insert_many(docs)
    if embed:
        embed_pending(source_id=source_id)
    return len(docs)


def delete_source(source_id: str) -> None:
    db.rag_chunks.delete_many({"source_id": source_id})


def embed_pending(source_id: str | None = None, course_id: str | None = None) -> int:
    """Embed chunks that have no vector yet. Returns how many were embedded (0 if unavailable)."""
    embedder = providers.get_embedder()
    if embedder is None:
        return 0
    query: dict[str, Any] = {"embedding": None}
    if source_id:
        query["source_id"] = source_id
    if course_id:
        query["course_id"] = course_id
    pending = list(db.rag_chunks.find(query))
    if not pending:
        return 0
    try:
        vectors = embedder.embed([f"{c['title']}\n{c['text']}" for c in pending], "RETRIEVAL_DOCUMENT")
    except Exception:  # noqa: BLE001
        log.warning("Embedding failed; chunks stay keyword-searchable", exc_info=True)
        return 0
    model = getattr(embedder, "model", "unknown")
    for chunk, vec in zip(pending, vectors):
        db.rag_chunks.update_one({"_id": chunk["_id"]}, {"$set": {"embedding": vec, "embedding_model": model}})
    return len(vectors)


def index_material_doc(doc: dict, embed: bool = True) -> int:
    """Index a ``course_material`` document (only text-bearing types)."""
    if doc.get("material_type") not in ("notes", "transcript") or not doc.get("content"):
        delete_source(str(doc["_id"]))
        return 0
    title = doc.get("title") or f"{doc.get('material_type', 'notes').title()} - week {doc.get('week', 0)}"
    return index_source("material", str(doc["_id"]), doc["course_id"], doc.get("week"), title,
                        doc["content"], embed)


def index_note_doc(doc: dict, embed: bool = True) -> int:
    return index_source("note", str(doc["_id"]), doc["course_id"], doc.get("week"), doc.get("title"),
                        doc.get("content"), embed)


def reindex_all(course_id: str | None = None, embed: bool = True) -> dict[str, int]:
    """Rebuild the whole index (or one course). Used by ``python -m scripts.ingest``."""
    flt = {"course_id": course_id} if course_id else {}
    if course_id:
        db.rag_chunks.delete_many({"course_id": course_id})
    else:
        db.rag_chunks.delete_many({})
    sources = chunks = 0
    for doc in db.course_material.find(flt):
        n = index_material_doc(doc, embed=False)
        sources += 1 if n else 0
        chunks += n
    for doc in db.notes.find(flt):
        n = index_note_doc(doc, embed=False)
        sources += 1 if n else 0
        chunks += n
    embedded = embed_pending(course_id=course_id) if embed else 0
    return {"sources": sources, "chunks": chunks, "embedded": embedded}


# ------------------------------------------------------------ retrieval ----
def retrieve(course_id: str, week_lte: int | None, query: str, k: int = 4) -> list[dict[str, Any]]:
    """Top-k chunks for ``query`` restricted to a course and weeks <= week_lte."""
    flt: dict[str, Any] = {"course_id": course_id}
    if week_lte is not None:
        flt["week"] = {"$lte": week_lte}
    candidates = list(db.rag_chunks.find(flt))
    if not candidates or not query.strip():
        return []

    scores: list[float] | None = None
    method = "keyword"
    embedder = providers.get_embedder()
    model = getattr(embedder, "model", None)
    if embedder is not None and all(c.get("embedding") and c.get("embedding_model") in (model, None) for c in candidates):
        try:
            qvec = embedder.embed([query], "RETRIEVAL_QUERY")[0]
            scores = [cosine(qvec, c["embedding"]) for c in candidates]
            method = "embedding"
        except Exception:  # noqa: BLE001
            log.warning("Query embedding failed; using keyword search", exc_info=True)
    if scores is None:
        scores = bm25_scores(query, [f"{c['title']} {c['text']}" for c in candidates])

    ranked = sorted(zip(scores, candidates), key=lambda x: x[0], reverse=True)
    results = []
    for score, chunk in ranked[:k]:
        if method == "keyword" and score <= 0:
            continue
        results.append({
            "title": chunk["title"], "week": chunk.get("week", 0), "text": chunk["text"],
            "source_id": chunk["source_id"], "source_type": chunk["source_type"],
            "score": round(float(score), 4), "method": method,
        })
    return results


def build_context(chunks: list[dict[str, Any]]) -> str:
    return "\n\n".join(f"[{i}] (Week {c['week']} - {c['title']})\n{c['text']}" for i, c in enumerate(chunks, 1))


def citations(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Unique source citations, numbered like the context blocks."""
    seen: set[str] = set()
    out = []
    for i, c in enumerate(chunks, 1):
        if c["source_id"] in seen:
            continue
        seen.add(c["source_id"])
        out.append({"ref": i, "title": c["title"], "week": c["week"], "source_id": c["source_id"],
                    "snippet": c["text"][:200]})
    return out


def sources_footer(cites: list[dict[str, Any]]) -> str:
    if not cites:
        return ""
    lines = [f"[{c['ref']}] {c['title']} (Week {c['week']})" for c in cites]
    return "\n\n**Sources**\n" + "\n".join(f"- {line}" for line in lines)
