// Study Buddy edge worker.
//  - Static SPA assets are served by the assets layer (see wrangler.jsonc).
//  - /api/* is proxied to the Render API with the /api prefix removed (REST + WebSocket).
//  - A cron trigger pings /health so the free Render instance stays warm.

const HOP_BY_HOP = [
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding',
]
const RETRY_STATUS = new Set([502, 503, 504])
const IDEMPOTENT = new Set(['GET', 'HEAD', 'OPTIONS'])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function proxyApi(request, env) {
  const url = new URL(request.url)
  const origin = new URL(env.API_ORIGIN)
  const path = url.pathname.replace(/^\/api(?=\/|$)/, '') || '/'
  const target = `${origin.origin}${path}${url.search}`

  const headers = new Headers(request.headers)
  for (const h of HOP_BY_HOP) headers.delete(h)
  headers.set('X-Forwarded-Host', url.host)
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''))

  const isUpgrade = (request.headers.get('Upgrade') || '').toLowerCase() === 'websocket'
  if (isUpgrade) {
    // Keep the Upgrade handshake headers; fetch() performs the WebSocket upgrade to the origin.
    headers.set('Upgrade', 'websocket')
    return fetch(target, { method: request.method, headers })
  }

  const method = request.method
  const hasBody = !['GET', 'HEAD'].includes(method)
  const body = hasBody ? await request.arrayBuffer() : undefined // buffered so a retry can resend it
  const canRetry = IDEMPOTENT.has(method)
  const send = () =>
    fetch(target, { method, headers, body, redirect: 'manual', cf: { cacheTtl: 0, cacheEverything: false } })

  let res
  try {
    res = await send()
    if (canRetry && RETRY_STATUS.has(res.status)) {
      await sleep(2000)
      res = await send()
    }
  } catch (err) {
    if (!canRetry) return Response.json({ detail: 'Upstream unavailable' }, { status: 502 })
    await sleep(2000)
    try {
      res = await send()
    } catch {
      return Response.json({ detail: 'Upstream unavailable' }, { status: 502 })
    }
  }

  const out = new Response(res.body, res)
  for (const h of HOP_BY_HOP) out.headers.delete(h)
  out.headers.set('Cache-Control', 'no-store')
  return out
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api' || pathname.startsWith('/api/')) return proxyApi(request, env)
    // Only reached if run_worker_first is widened; static files and headers come from the assets layer.
    return env.ASSETS.fetch(request)
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      fetch(`${env.API_ORIGIN}/health`, { headers: { 'User-Agent': 'studybuddy-keepwarm' } }).catch(() => {}),
    )
  },
}
