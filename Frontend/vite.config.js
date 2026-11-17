import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'

// Static hosts without a dashboard SPA-rewrite rule (e.g. Render static sites) serve 404.html for unknown paths.
// Emitting a copy of index.html there lets a hard refresh on /app/... still boot the router.
const spaFallback404 = () => ({
  name: 'spa-fallback-404',
  apply: 'build',
  closeBundle() {
    const dist = path.resolve(import.meta.dirname, 'dist')
    const index = path.join(dist, 'index.html')
    if (fs.existsSync(index)) fs.copyFileSync(index, path.join(dist, '404.html'))
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback404()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  build: {
    // The only chunk above the default 500 kB is the lazily loaded Monaco editor (CodeMonaco, ~2.7 MB / ~700 kB gzip),
    // which is fetched only on the code editor pages. Raise the warning limit just enough to cover it.
    chunkSizeWarningLimit: 2900,
  },
  server: { port: 5173 },
  preview: { port: 4173 },
})
