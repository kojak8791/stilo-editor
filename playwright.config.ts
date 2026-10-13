import { defineConfig, devices } from '@playwright/test';

/** E2E tests (`npm run test:e2e`), against the demo page. */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '*.spec.ts',
  reporter: 'list',
  use: { baseURL: 'http://localhost:5180' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npx vite --port 5180 --strictPort',
    url: 'http://localhost:5180/demo/',
    reuseExistingServer: true,
    // Vite opens a browser tab on start (server.open) unless BROWSER is 'none'.
    env: { BROWSER: 'none' },
  },
});
