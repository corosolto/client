import { expect, test } from '@playwright/test';

test('captures pointer, moves forward, and releases safely', async ({ page }) => {
  await page.goto('/?auto=P,esquerdomacho');
  await expect.poll(() => page.evaluate(() => window.__csbrasilGodotReady), { timeout: 15_000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.z), { timeout: 15_000 }).toBe(-42);

  const canvas = page.locator('canvas');
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.captured), { timeout: 10_000 }).toBe(true);

  const initialZ = await page.evaluate(() => window.__csbrasilPlayerState.z);
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState.z)).toBeGreaterThan(initialZ + 0.5);

  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.captured)).toBe(false);
});
