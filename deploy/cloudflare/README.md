# Cloudflare deployment

One Worker (`studybuddy`) serves the built SPA (`Frontend/dist`) and proxies `/api/*` to the Render API
(`API_ORIGIN` in `wrangler.jsonc`, `/api` prefix stripped, WebSockets supported). A cron trigger pings
`/health` every 10 minutes to keep the free Render instance warm. Live at https://studybuddy.driptobhattacharyya.com.

```sh
export CLOUDFLARE_API_TOKEN=...   # Workers edit + zone/DNS edit for the domain
export CLOUDFLARE_ACCOUNT_ID=...
npm ci
npm run deploy                    # builds Frontend with VITE_API_URL=<site>/api, then wrangler deploy
```

CI: `.github/workflows/deploy-cloudflare.yml` deploys on pushes to `main`; add repo secrets
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. See `docs/DEPLOYMENT.md`.
