# Deployment

This guide deploys Study Buddy to Render: a Docker web service for the API (`Backend/`) and a static site for the frontend (`Frontend/`). The live demo runs this way on Render's free plan in Singapore:

* Site: https://study-buddy-web-h7r8.onrender.com
* API: https://study-buddy-api-8i28.onrender.com

Two routes are described. The Blueprint route uses [`render.yaml`](../render.yaml) and is the quickest. The manual route creates the same two services by hand.

## Before you start

* A GitHub fork or copy of the repository that Render can read.
* A Render account.
* Optional: a MongoDB Atlas cluster (for persistent data), an OpenAI API key (for real AI answers), and a Google Cloud OAuth client (for Google sign-in).

The hosted demo currently uses an in-memory database (`MONGODB_URI=mongomock://`), so it runs with no database setup. See [Switching to Atlas](#switching-to-atlas) when you want data to persist.

## Route 1: Blueprint (recommended)

1. In the Render dashboard, choose **New** > **Blueprint** and select the repository and branch. Render reads `render.yaml` and proposes two services: `study-buddy-api` and `study-buddy-web`.
2. Fill in the values that the Blueprint marks as secret (`sync: false`) before the first deploy:
   * `MONGODB_URI`: `mongomock://` for the in-memory demo, or an Atlas connection string.
   * `SECRET_KEY`: a long random string, for example `python -c "import secrets;print(secrets.token_urlsafe(48))"`.
   * `OPENAI_API_KEY`: optional; without it the offline `mock` provider answers in demo mode.
   * `FRONTEND_URL` and `CORS_ORIGINS`: the static site URL with no trailing slash, for example `https://study-buddy-web-h7r8.onrender.com`.
   * `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: optional, see [Google sign-in](#google-sign-in).
3. Apply the Blueprint and wait for both services to deploy.
4. Check the URLs. The Blueprint hard-codes `VITE_API_URL`, `FRONTEND_URL` and `CORS_ORIGINS` to the expected host names. If Render gave a service a different URL (the live demo's API is `study-buddy-api-8i28.onrender.com`), update:
   * `VITE_API_URL` on the static site to the API's actual URL, then redeploy the site. This value is baked into the build, so a rebuild is required.
   * `FRONTEND_URL` and `CORS_ORIGINS` on the API to the site's actual URL. The API restarts with the new values.
5. Open the site and the health endpoint:
   ```bash
   curl https://<api-host>/health
   ```

## Route 2: Manual, two services

### API (Docker web service)

1. **New** > **Web Service**, connect the repository.
2. Runtime: **Docker**. Dockerfile path: `./Backend/Dockerfile`. Docker build context: `./Backend`.
3. Plan: **Free**. Health check path: `/health`.
4. Add the environment variables from the [table below](#environment-variables). The image listens on `$PORT`, which Render sets.
5. Deploy. Note the service URL.

### Frontend (static site)

1. **New** > **Static Site**, connect the same repository.
2. Build command: `cd Frontend && npm ci && npm run build`
3. Publish directory: `Frontend/dist`
4. Environment variables:
   * `NODE_VERSION=22`
   * `VITE_API_URL=<the API URL from the previous step>` (no trailing slash; build-time value)
5. **Redirects/Rewrites**: add a rule with source `/*`, destination `/index.html`, action **Rewrite**. This lets client-side routes such as `/app/notes` load on refresh.
6. Deploy and note the site URL.

### Connect the two

Set `FRONTEND_URL` and `CORS_ORIGINS` on the API to the site URL, then let the API redeploy. The API needs the site URL for sign-in redirects and CORS, and the site needs the API URL at build time, so the first deploy of each service may need a second pass.

## Environment variables

Variables marked secret must be entered in the Render dashboard and never committed. The "Set by" column shows where each value comes from: the Blueprint (`render.yaml`) or the dashboard. Defaults come from [`Backend/.env.example`](../Backend/.env.example) and `core/config.py`.

| Variable | Service | Secret | Set by | Purpose and default |
|---|---|---|---|---|
| `MONGODB_URI` | API | yes | dashboard | `mongomock://` (in-memory demo) or an Atlas `mongodb+srv://` string. Default `mongodb://localhost:27017` |
| `DB_NAME` | API | no | optional | Database name, default `study_buddy` |
| `SECRET_KEY` | API | yes | dashboard | JWT signing key. If unset, a random key is generated at start-up and tokens stop working after each restart |
| `DEMO_MODE` | API | no | Blueprint: `true` | Enables one-click demo logins for the student, instructor and admin roles (`POST /auth/demo`). Set `false` for real users |
| `SEED_DEMO_ON_STARTUP` | API | no | Blueprint: `true` | Seeds the demo dataset when the API starts (idempotent) |
| `AI_PROVIDER` | API | no | Blueprint: `openai` | `openai`, `gemini`, `openrouter` or `mock`. Default in code is `gemini`. `mock` is used automatically in demo mode when no key is set |
| `OPENAI_API_KEY` | API | yes | dashboard | OpenAI key for chat and embeddings. Stays in the backend; never sent to the browser or written to logs or traces |
| `OPENAI_MODEL` | API | no | optional | Chat model, default `gpt-4o-mini` |
| `OPENAI_EMBEDDING_MODEL` | API | no | optional | Retrieval embeddings, default `text-embedding-3-small` |
| `GEMINI_API_KEY` | API | yes | dashboard | Gemini key, only needed when `AI_PROVIDER=gemini` (also enables Gemini embeddings) |
| `GEMINI_MODEL` | API | no | optional | Default `gemini-2.5-flash` |
| `OPENROUTER_API_KEY` | API | yes | dashboard | Only needed when `AI_PROVIDER=openrouter` |
| `CODE_RUNNER` | API | no | Blueprint: `local` | `local` (hardened subprocess) or `judge0` |
| `JUDGE0_URL`, `JUDGE0_API_KEY` | API | key: yes | dashboard | Judge0 endpoint and key when `CODE_RUNNER=judge0` |
| `GOOGLE_CLIENT_ID` | API | no | dashboard | Enables Google sign-in together with the secret below |
| `GOOGLE_CLIENT_SECRET` | API | yes | dashboard | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | API | no | dashboard | `https://<api-host>/oauth/callback`. Not in the Blueprint; default is `http://localhost:8000/oauth/callback` |
| `FRONTEND_URL` | API | no | dashboard | Site URL. The API redirects to `${FRONTEND_URL}/auth/callback` after sign-in |
| `CORS_ORIGINS` | API | no | dashboard | Comma-separated browser origins, for example the site URL |
| `INSTRUCTOR_EMAILS`, `ADMIN_EMAILS` | API | no | optional | Comma-separated emails that receive those roles on sign-in |
| `AI_DAILY_REQUEST_CAP` | API | no | optional | Global AI calls per UTC day, default `500` |
| `RATE_LIMIT_AI_PER_MINUTE` | API | no | optional | Per-user AI calls per minute, default `20` |
| `LOG_LEVEL` | API | no | optional | Default `INFO` |
| `VITE_API_URL` | Site | no | Blueprint | API base URL, baked in at build time. Rebuild the site after changing it |
| `NODE_VERSION` | Site | no | Blueprint: `22` | Node.js version for the build |

## Switching to Atlas

The in-memory demo loses its data on every restart. To keep data:

1. Create a free MongoDB Atlas cluster, a database user, and a network access rule that lets the API connect. Render does not guarantee fixed outbound addresses for every plan; if you cannot allow the service's addresses, `0.0.0.0/0` with a strong database password is the simple option. Restrict it when you can.
2. Copy the `mongodb+srv://` connection string into the API's `MONGODB_URI` (secret). `DB_NAME` is optional.
3. Seed the demo data, once:
   * Automatic: keep `SEED_DEMO_ON_STARTUP=true`. The API seeds on start-up and the seed is idempotent.
   * Manual, from a checkout of the repository with the same `MONGODB_URI` set: `cd Backend && python -m scripts.seed_demo` (add `--reset` to recreate the demo courses).
4. Index course material for the AI tutor's retrieval, after seeding and whenever material changes: `cd Backend && python -m scripts.ingest` (optionally `--course <id>`, or `--no-embed` for keyword search only).
5. Redeploy the API and confirm that demo data persists across a restart.

## Enabling real AI

By default the Blueprint sets `AI_PROVIDER=openai`. Without a key, demo mode uses the offline `mock` provider, which returns canned answers and makes no network calls.

1. Add `OPENAI_API_KEY` to the API service as a secret and redeploy. With a key present, the mock fallback is no longer used.
2. Optionally set `OPENAI_MODEL` and `OPENAI_EMBEDDING_MODEL`.
3. Re-run `python -m scripts.ingest` so that existing course chunks get embeddings. Without embeddings retrieval falls back to BM25 keyword search.
4. Check the active provider with `curl https://<api-host>/auth/config`, which reports `ai_provider`.

Keep the daily cap (`AI_DAILY_REQUEST_CAP`) and per-minute limits in place to control spend. The admin AI usage page shows estimated cost per day and feature.

## Google sign-in

1. In Google Cloud Console, create an OAuth client ID of type **Web application**.
2. Add the authorized redirect URI: `https://<api-host>/oauth/callback`. The backend's callback route is `GET /oauth/callback`, and sign-in starts at `GET /login/google`.
3. On the API service, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` to the same callback URL.
4. Make sure `FRONTEND_URL` is the site URL. After sign-in the API redirects to `${FRONTEND_URL}/auth/callback` with the token in the URL fragment.
5. Only verified Google email addresses are accepted. Use `INSTRUCTOR_EMAILS` and `ADMIN_EMAILS` to give instructor or admin roles; everyone else is a student.

## Cloudflare (production)

Production is https://studybuddy.driptobhattacharyya.com. One Cloudflare Worker (`studybuddy`, in [`deploy/cloudflare/`](../deploy/cloudflare)) serves the built SPA and proxies `/api/*` to the Render API, so the browser sees a single origin (no CORS, one certificate). The Render API is only the origin.

* **Static files:** `Frontend/dist` as Workers static assets with SPA fallback. Security headers, `no-cache` for `index.html` and immutable caching for `/assets/*` come from `Frontend/public/_headers`. No CSP is set: it was not verified against Monaco's web workers, jsPDF and inline styles.
* **API proxy:** `/api/x` becomes `https://study-buddy-api-8i28.onrender.com/x` (method, headers, body and query preserved, WebSockets supported, never cached). Idempotent requests are retried once after 2 s on 502/503/504 or a network error.
* **Keep-warm:** a cron trigger calls `/health` every 10 minutes so the free Render instance rarely sleeps.
* **Build:** the frontend is built with `VITE_API_URL=https://studybuddy.driptobhattacharyya.com/api`.
* **Deploy by hand:** `cd deploy/cloudflare && npm ci && npm run deploy` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set. The custom domain is created from `routes` in `wrangler.jsonc`.
* **Deploy from CI:** add repository secrets `CLOUDFLARE_API_TOKEN` (Workers edit and DNS edit for the zone) and `CLOUDFLARE_ACCOUNT_ID`. `.github/workflows/deploy-cloudflare.yml` then deploys on pushes to `main` that touch `Frontend/` or `deploy/cloudflare/`; without the secrets its steps are skipped.
* **API settings:** set `FRONTEND_URL=https://studybuddy.driptobhattacharyya.com` on the Render API. For Google sign-in use `GOOGLE_REDIRECT_URI=https://studybuddy.driptobhattacharyya.com/api/oauth/callback` (also add it in Google Cloud Console), since the browser reaches the API under `/api`.

## Free-tier caveats

* **Sleep.** The API sleeps when idle. The first request after a sleep can take up to a minute while it starts.
* **In-memory data resets.** With `MONGODB_URI=mongomock://`, every restart, including a wake-up after sleep, starts with an empty database. Demo data is re-created when `SEED_DEMO_ON_STARTUP=true`, but anything users created is lost. Use Atlas for data that should persist.
* **Sign-outs on restart.** Without a fixed `SECRET_KEY`, every restart invalidates existing tokens.
* **Per-process counters.** Rate limits are in memory. The `AI_DAILY_REQUEST_CAP` count is stored in the database.
* **Local code runner.** `CODE_RUNNER=local` runs submissions as subprocesses on the service's host. It is best-effort hardening, not a virtual machine.

## Hardening for real users

Before opening the app to users who are not demonstrating it:

* Set `DEMO_MODE=false`. This removes the one-click logins.
* Set `SECRET_KEY` to a long random value, and keep it in the dashboard only.
* Use Atlas for `MONGODB_URI` and set `SEED_DEMO_ON_STARTUP=false`.
* Run code submissions in an isolated environment: set `CODE_RUNNER=judge0` with `JUDGE0_URL` and `JUDGE0_API_KEY`, or keep `local` with a low `CODE_MAX_CONCURRENCY`. The provided Dockerfile already runs the API as a non-root user (uid 10001); treat that as a baseline, not a full sandbox.
* Restrict `CORS_ORIGINS` to the site origin only.
* Set `INSTRUCTOR_EMAILS` and `ADMIN_EMAILS` to the people who need those roles.
* Keep `AI_DAILY_REQUEST_CAP` and the per-minute limits at a level you can pay for.
