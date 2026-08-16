import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/web',
  fullyParallel: false,
	workers: 1,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:8177',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: './scripts/serve-godot-web.sh',
      url: 'http://127.0.0.1:8177',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: './scripts/serve-legacy-web.sh',
      url: 'http://127.0.0.1:8176',
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
