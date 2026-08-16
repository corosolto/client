import { expect, test } from '@playwright/test';

test('boots an eight-actor match and advances the round while playing', async ({ page }) => {
  await page.goto('/?auto=P,esquerdomacho');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.actorCount), {
    timeout: 15_000,
  }).toBe(8);
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.petistasCount)).toBe(4);
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.bolsonaristasCount)).toBe(4);
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.round)).toBe(1);

  const canvas = page.locator('canvas');
  await canvas.click({ position: { x: 640, y: 360 } });
  const initialSeconds = await page.evaluate(() => window.__csbrasilPlayerState.roundSeconds);
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.roundSeconds)).toBeLessThan(initialSeconds - 0.2);

  await page.keyboard.down('Tab');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.scoreboardVisible)).toBe(true);
  await page.keyboard.up('Tab');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.scoreboardVisible)).toBe(false);
});
