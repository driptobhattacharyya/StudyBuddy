/** Fail fast with a helpful message if the backend is not up (or not in demo + mock AI mode). */
export default async function globalSetup() {
  const api = process.env.E2E_API_URL || 'http://localhost:8000'
  let cfg
  try {
    cfg = await (await fetch(`${api}/auth/config`)).json()
  } catch {
    throw new Error(
      `Backend not reachable at ${api}. Start it first, e.g.\n  cd Backend && MONGODB_URI=mongomock:// DEMO_MODE=true SEED_DEMO_ON_STARTUP=true AI_PROVIDER=mock uvicorn main:app --port 8000`,
    )
  }
  if (!cfg.demo_mode) throw new Error('The backend must run with DEMO_MODE=true for the e2e suite.')
  if (cfg.ai_provider !== 'mock') throw new Error('The backend must run with AI_PROVIDER=mock for the e2e suite.')
}
