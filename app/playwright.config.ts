import { defineConfig, devices } from '@playwright/test'

// The test runner and the browser share one zone, so a `new Date(…)` written
// in a test means the moment the app sees — and it's a zone with DST, as in
// the unit tests.
process.env.TZ = 'America/New_York'

const PORT = 5293

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Pixel 7'],
    // The system Chrome: no browser download needed.
    channel: 'chrome',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    trace: 'retain-on-failure',
  },
  webServer: {
    // A build, not the dev server: a page loads as one bundle, not every module one at a time.
    command: `pnpm exec vite build --mode test --outDir dist-e2e && pnpm exec vite preview --mode test --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
})
