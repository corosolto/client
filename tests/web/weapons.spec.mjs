import { expect, test } from '@playwright/test';

test('switches between independent AWP, pistol, and knife slots', async ({ page }) => {
  await page.goto('/?auto=P,esquerdomacho');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.weaponId), { timeout: 15_000 }).toBe('awp');

  const canvas = page.locator('canvas');
  await canvas.click({ position: { x: 640, y: 360 } });
  await page.keyboard.press('2');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.weaponId)).toBe('pistol');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.ammo)).toBe(12);
  await page.waitForTimeout(400);
  await canvas.click({ position: { x: 640, y: 360 } });
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.ammo)).toBe(11);

  await page.keyboard.press('3');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.weaponId)).toBe('knife');
  await canvas.click({ button: 'right', position: { x: 640, y: 360 } });
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.scoped)).toBe(false);

  await page.keyboard.press('1');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.weaponId)).toBe('awp');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.ammo)).toBe(5);
});
