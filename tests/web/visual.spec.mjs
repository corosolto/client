import { expect, test } from '@playwright/test';

test('renders deterministic procedural arena and character content', async ({ page }) => {
  await page.goto('/?auto=P,esquerdomacho');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.arenaSignature), {
    timeout: 15_000,
  }).toContain('2026:');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.arenaGeometryCount)).toBeGreaterThanOrEqual(45);
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.visualSignatureCount)).toBe(7);
  const geometryCount = await page.evaluate(() => window.__csbrasilPlayerState.arenaGeometryCount);
  const materialCount = await page.evaluate(() => window.__csbrasilPlayerState.proceduralMaterialCount);
  expect(materialCount).toBeLessThan(geometryCount);

  const screenshot = await page.screenshot();
  expect(screenshot.byteLength).toBeGreaterThan(20_000);
});
