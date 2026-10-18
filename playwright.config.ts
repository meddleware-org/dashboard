import { defineConfig, devices } from '@playwright/test'

// Browser smoke test of the BUILT dashboard: every route and every tool tab mounts without an uncaught
// error. `npm run test:e2e` builds, serves dist with `vite preview` and drives Chromium; CI installs
// Chromium first. All requests that leave localhost are refused in the spec, so the run is hermetic.
const PORT = 4181

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, viewport: { width: 1280, height: 900 } },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
