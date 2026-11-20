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

// WebSocket proxy: the Worker is a WS *client* to the origin and a WS *server* to the browser.
// Host / Sec-WebSocket-* / Origin / Connection are deliberately not forwarded.
const BAD_CLOSE = new Set([1004, 1005, 1006, 1015])
const safeCode = (c) => {
  if (c === undefined || BAD_CLOSE.has(c)) return c === 1005 || c === undefined ? 1000 : 1011
  if (c === 1000 || (c >= 3000 && c <= 4999) || (c >= 1001 && c <= 1014)) return c
  return 1011
}
const safeReason = (r) => (r || '').slice(0, 120) // close reason must be <=123 bytes

async function proxyWebSocket(request, target, url) {
  const upHeaders = { Upgrade: 'websocket', 'X-Forwarded-Host': url.host, 'X-Forwarded-Proto': url.protocol.replace(':', '') }
  for (const h of ['Authorization', 'Cookie']) {
    const v = request.headers.get(h)
    if (v) upHeaders[h] = v
  }
  const connect = async () => {
    try {
      return await fetch(target, { headers: upHeaders })
    } catch {
      return null
    }
  }
  let upstream = await connect()
  if (!upstream || RETRY_STATUS.has(upstream.status)) {
    await sleep(2000)
    upstream = await connect()
  }
  if (!upstream) return new Response('Upstream unavailable', { status: 502 })
  const ws = upstream.webSocket
  if (!ws) return new Response(upstream.body, { status: upstream.status === 101 ? 502 : upstream.status, headers: upstream.headers })

  const pair = new WebSocketPair()
  const [client, server] = Object.values(pair)
  server.accept()
  ws.accept()

  const closeBoth = (code, reason) => {
    for (const s of [server, ws]) {
      try { s.close(safeCode(code), safeReason(reason)) } catch {}
    }
  }
  server.addEventListener('message', (e) => { try { ws.send(e.data) } catch { closeBoth(1011, 'proxy error') } })
  ws.addEventListener('message', (e) => { try { server.send(e.data) } catch { closeBoth(1011, 'proxy error') } })
  server.addEventListener('close', (e) => closeBoth(e.code, e.reason))
  ws.addEventListener('close', (e) => closeBoth(e.code, e.reason))
  server.addEventListener('error', () => closeBoth(1011, 'client error'))
  ws.addEventListener('error', () => closeBoth(1011, 'upstream error'))

  return new Response(null, { status: 101, webSocket: client })
}

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
  if (isUpgrade) return proxyWebSocket(request, target, url)

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
