# Study Buddy - Backend

FastAPI backend for **Study Buddy**, an AI-assisted learning management system: courses, weekly notes, MCQ / MSQ / numeric assignments, sandboxed coding assignments with hidden test cases, flashcards, AI summaries / questions / hints, retrieval-augmented chat over course material, and instant grading.

> Originally built as an IIT Madras BS Software Engineering team project (Team 22, 2024) by Pranjal Choudhury, Sagnik De, Pravin S, Mehak Singal, Madhurima Ghosh, Vibhor Jain and Dripto Bhattacharyya.

## Quick start

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements-dev.txt          # requirements.txt for production only
cp .env.example .env                         # then edit
# zero-setup demo: in-memory DB, one-click logins, seeded data
MONGODB_URI=mongomock:// DEMO_MODE=true SEED_DEMO_ON_STARTUP=true uvicorn main:app --reload
```

Open http://localhost:8000/docs. With a real MongoDB set `MONGODB_URI` and run `python -m scripts.seed_demo` once (or set `SEED_DEMO_ON_STARTUP=true`).
Java and Node.js are only needed to run Java / JavaScript submissions locally (the Docker image bundles both).

Docker: `docker compose up --build` (API + MongoDB, demo mode on).

## Configuration

All settings are environment variables (see [`.env.example`](.env.example), loaded by `core/config.py`). Highlights:

| Variable | Purpose |
|---|---|
| `MONGODB_URI`, `DB_NAME` | database (`mongomock://` = in-memory) |
| `SECRET_KEY` | JWT signing key (random per start if unset) |
| `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, `FRONTEND_URL` | Google sign-in; backend redirects to `${FRONTEND_URL}/auth/callback#token=<jwt>` |
| `INSTRUCTOR_EMAILS`, `ADMIN_EMAILS` | role assignment (everyone else is a student) |
| `DEMO_MODE`, `SEED_DEMO_ON_STARTUP` | `POST /auth/demo` logins for all three roles, auto-seeding |
| `AI_PROVIDER` (`gemini`/`openai`/`openrouter`/`mock`), `GEMINI_*`, `OPENAI_*`, `OPENROUTER_*` | LLM provider and models. `mock` is a deterministic offline provider (also the automatic fallback when `DEMO_MODE=true` and no key is set); `/auth/config` reports the active `ai_provider`. API keys stay in the backend and are redacted from logs |
| `AI_DAILY_REQUEST_CAP`, `RATE_LIMIT_*` | global daily cap and per-user rate limits |
| `CODE_RUNNER` (`local`/`judge0`), `CODE_*`, `JUDGE0_*` | code sandbox |
| `CORS_ORIGINS` | allowed browser origins |

## Roles

`student` < `instructor` < `admin`. The JWT carries `sub` (email), `role`, `scopes`, `exp`; the role is re-resolved from the database / env on every request. Students never receive `answers` or `private_testcase`; marks and flashcards are scoped to their owner.

## Endpoints

| Area | Endpoints | Access |
|---|---|---|
| Auth | `GET /auth/config`, `POST /auth/demo`, `GET /login/google`, `GET /oauth/callback` | public |
| | `GET /auth/me`, `GET /user/me` | any user |
| Courses | `GET /course/getall`, `/course/get/{id}`, `/course/course_material/{id}`, `/course/get_contents`, `/course/get_week_content`, `/course/get_assignment`, `/course/get_all_assignment` | any user (role-filtered) |
| | `POST /course/create`, `PUT /course/update/{id}`, `GET /course/{id}/marks`, `GET /course/{id}/insights` | instructor / admin |
| Material & notes | `GET /course_material/get/{id}`, `GET /notes/get/{id}` | any user |
| | `POST/PUT/DELETE /course_material/*`, `/notes/*` | instructor / admin |
| Assignments | `GET /assignment/get/{id}`, `GET /coding_assignment/get/{id}` | any user (answers stripped for students) |
| | `POST /assignment/create`, `/create_many_questions`, `PUT/DELETE /assignment/*`, `POST/PUT/DELETE /coding_assignment/*` | instructor / admin |
| Coding | `POST /coding_assignment/run` | any user, rate limited. `submit:false` (default) = **Run**: public tests only, nothing saved. `submit:true` = **Submit**: public + hidden tests; a student's attempt is saved and graded. Assignments carry an optional `starter_code` |
| Deadlines | `GET /user/deadlines` | upcoming assignment + coding deadlines across the caller's courses |
| | `POST /coding_assignment/{id}/feedback` | any user, AI |
| Student | `POST /user/submit_answers` (graded instantly), `GET /user/get_marks`, `/user/insights/{course}`, `/user/last_submission`, `/user/flashcards`, `/user/get/course/...`, `POST /user/register_course` | student / any user |
| Flashcards | `POST /flash_card/create`, `GET/PUT/DELETE /flash_card/*`, `POST /flash_card/generate` | owner only |
| AI | `POST /summarize`, `/generate_questions`, `/generate_assignment_questions`, `/ai/hint`, `/user/generate`, `/user/search_generate`; `GET /ai/trace/{trace_id}` | authenticated, rate limited + daily cap; trace: owner or admin |
| | `POST /ai/generate_from_material` | instructor / admin |
| WebSocket | `/generate`, `/search_generate` (`?token=<jwt>`, close code 4401 if invalid) | authenticated |
| Admin | `GET /admin/users`, `PATCH /admin/users/{email}/role`, `GET /admin/stats`, `GET /admin/ai/usage`, `GET /admin/ai/logs`, `POST /admin/demo/reset` | admin |

**WebSocket protocol:** the client sends one JSON message (`{"query"}` or `{"query","course_id","week"}`); the server streams text chunks, then `[[META]] {json}` (`trace_id`, `citations`, `model`, `latency_ms`, `tokens_in`, `tokens_out`), then `[[END]]`, and closes. Failures send `[[ERROR]] <message>`.

## Architecture

```
main.py              app factory, CORS, error handlers, lifespan (indexes, optional demo seed)
core/                config (pydantic-settings), JWT + role dependencies, rate limiter, daily cap
routes/              thin FastAPI routers (sync handlers run in the threadpool)
models/              pydantic request models; utils/ projections, grading, helpers
database/db.py       lazy Mongo client proxy (mongomock supported)
runner/              sandboxed code execution: local (rlimits, tempdir, timeout, stripped env) or Judge0
ai/                  providers (Gemini via google-genai, OpenAI/OpenRouter via httpx, offline mock), prompts, structured JSON
                     output with validation + one retry, RAG (chunks + embeddings in Mongo, BM25 fallback),
                     tracing (every call logged to `ai_logs`)
scripts/             seed_demo.py (idempotent demo data), ingest.py (re-index material for RAG)
tests/               pytest, fully offline (mongomock, fake AI provider, httpx mock transports)
```

* **Grading** happens on submission: general questions are marked per question (MSQ = exact set match); coding submissions run against the private tests (mark = passed / total). Week marks are the average of the week's questions.
* **RAG**: course material is chunked into `rag_chunks`; with a Gemini or OpenAI key chunks get embeddings and are ranked by cosine similarity, otherwise by BM25. Re-index with `python -m scripts.ingest [--course ID] [--no-embed]`. Answers carry citations (title, week).
* **Observability**: each AI call stores prompt, retrieved passages, model, token estimates, latency, status in `ai_logs`; REST responses include `trace_id`.
* **Code runner security**: the local runner is best-effort hardening (not a VM). For untrusted public deployments run in the provided non-root container, keep `CODE_MAX_CONCURRENCY` low, or use `CODE_RUNNER=judge0`.

## Tests

```bash
pytest          # ~80 tests, offline, ~15 s (needs python, node and javac on PATH for runner tests)
```
