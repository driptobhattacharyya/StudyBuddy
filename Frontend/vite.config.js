import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
