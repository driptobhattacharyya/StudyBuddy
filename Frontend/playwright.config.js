import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end smoke suite. It expects:
 *  - the backend running on E2E_API_URL (default http://localhost:8000) with DEMO_MODE=true and AI_PROVIDER=mock
 *    (mongomock is fine: MONGODB_URI=mongomock://), and
 *  - the frontend built against that API; `vite preview` is started here unless something already listens on E2E_BASE_URL.
 * See e2e/README or the "End-to-end tests" section of the root README.
 */
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4173'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: process.env.CI ? 'retain-on-failure' : 'off',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
    // Optional: point at a pre-installed Chromium (not needed after `npx playwright install chromium`).
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
