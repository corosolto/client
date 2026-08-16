import { expect, test } from '@playwright/test';

test('scopes, kills the bot with the AWP, and observes respawn', async ({ page }) => {
  await page.goto('/?auto=P,esquerdomacho');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.botAlive), { timeout: 15_000 }).toBe(true);

  const canvas = page.locator('canvas');
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.captured)).toBe(true);
  await canvas.click({ button: 'right', position: { x: 640, y: 360 } });
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.scoped)).toBe(true);
  await canvas.click({ position: { x: 640, y: 360 } });

  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.ammo)).toBe(4);
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.botAlive)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.botAlive), { timeout: 5_000 }).toBe(true);
});
