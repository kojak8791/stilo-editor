import { defineConfig, devices } from '@playwright/test';

/** Benchmarks of SPEC NFR-1 (`npm run bench`), against the demo page in bench mode. */
export default defineConfig({
  testDir: 'bench',
  testMatch: '*.bench.ts',
  timeout: 300_000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5179' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite --port 5179 --strictPort',
    url: 'http://localhost:5179/demo/',
    reuseExistingServer: true,
    // Vite opens a browser tab on start (server.open) unless BROWSER is 'none'.
    env: { BROWSER: 'none' },
  },
});
