import { expect, test } from '@playwright/test';

test('publishes game_start through the shell analytics stub', async ({ page }) => {
  await page.goto('/?auto=B,senhora');
  await expect.poll(
    () => page.evaluate(() => window.__csbrasilAnalyticsEvents?.find(event => event.name === 'game_start')),
    { timeout: 20_000 }
  ).toMatchObject({ name: 'game_start', data: { team: 'B', character: 'senhora' } });
});
