const { test, expect } = require('@playwright/test');

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  await page.screenshot({
    path: `test-results/${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`,
    fullPage: true,
  });
});

test('menu, ranking, team, char and initial hud boot', async ({ page }) => {
  const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
  await page.goto(`${base}/?debug=1`);

  await expect(page.locator('#main-menu')).toBeVisible();
  await expect(page.locator('#btn-jogar')).toBeVisible();

  await page.click('#btn-ranking');
  await expect(page.locator('#ranking-panel')).toBeVisible();
  await page.click('#ranking-back');
  await expect(page.locator('#main-menu')).toBeVisible();

  await page.fill('#nick-input', 'SmokeBot');
  await page.click('#btn-jogar');
  await expect(page.locator('#team-select')).toBeVisible();

  await page.click('#btn-team-p');
  await expect(page.locator('#char-select')).toBeVisible();
  await expect(page.locator('#char-list .char-row')).toHaveCount(4);

  await page.click('#char-list .char-row >> nth=0');
  await page.click('#char-confirm');

  await expect(page.locator('#hud')).toBeVisible({ timeout: 10000 });
});
