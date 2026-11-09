import { defineConfig, devices } from '@playwright/test';

/* As réguas afirmam texto em PT ("Y SALA", "TIME B"). O produto decide idioma por ?lang >
   cs_lang > país da borda; no preview Cloudflare o runner do GitHub está nos EUA e a home vira
   EN. O smoke fixa cs_lang=pt como um jogador BR que já voltou, em toda página do fixture. */
const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
export const estadoPt = { cookies: [], origins: [{ origin: new URL(base).origin, localStorage: [{ name: 'cs_lang', value: 'pt' }] }] };

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 300_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: base,
    storageState: estadoPt,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
