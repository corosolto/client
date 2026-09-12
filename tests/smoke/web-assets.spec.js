import { test, expect } from '@playwright/test';

// Exige GLBs reais; web-smoke.spec.js cobre a navegação sem preload.
// Sem retry: uma falha de asset deve permanecer visível no gate.

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  testInfo.setTimeout(testInfo.timeout + 10_000);
  await page.screenshot({
    path: `test-results/${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`,
    fullPage: true,
  });
});

test('preload 3D real do elenco termina e renderiza GLB na vitrine', async ({ page }, testInfo) => {
  test.slow();
  const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
  const t0 = Date.now();

  await page.goto(`${base}/?debug=1&assetcheck=1`);

  await expect(page.locator('#splash-enter')).toBeVisible({ timeout: 25_000 });
  await page.keyboard.press('Enter');
  await expect(page.locator('#boot-splash')).toHaveCount(0);

  await page.locator('.cs-item[data-act="single-player"]').click();
  await page.locator('.cs-item[data-act="sp"]:visible').click();
  await expect(page.locator('#map-screen')).toBeVisible();
  await page.locator('#ms-continue').click();
  await expect(page.locator('#menu-setup')).toHaveAttribute('data-step', 'profile');
  await page.locator('#nick-input').fill('AssetBot');
  await page.locator('#profile-ok').click();
  await page.locator('#btn-jogar').click();
  await expect(page.locator('#team-select')).toBeVisible({ timeout: 30_000 });

  await page.locator('#btn-team-e').click();
  // A seleção só abre depois que o preload real do elenco termina.
  await expect(page.locator('#char-select')).toBeVisible({ timeout: 360_000 });

  const ficha = await page.evaluate(() => ({
    rows: document.querySelectorAll('#char-list .char-row').length,
    // Somente o GLB real marca data-glb; o fallback procedural não marca.
    preview_glb: document.getElementById('char-preview')?.dataset.glb === '1',
    info_name: document.getElementById('char-info-name')?.textContent || '',
  }));
  await testInfo.attach('asset-check.json', {
    body: JSON.stringify({ ...ficha, total_ms: Date.now() - t0 }, null, 2),
    contentType: 'application/json',
  });
  console.log('ASSETS', JSON.stringify(ficha));

  expect(ficha.rows).toBeGreaterThan(0);
  expect(ficha.preview_glb).toBe(true);
  expect(ficha.info_name.length).toBeGreaterThan(0);
  await expect(page.locator('#crash-overlay')).toBeHidden();

  // partida também abre com o caminho real (já com elenco/modelos batidos em cache)
  await page.locator('#char-confirm').click();
  await expect(page.locator('#team-select')).toHaveAttribute('data-step', 'enemy');
  await page.locator('#btn-team-b').click();
  await expect(page.locator('#hud')).toBeVisible({ timeout: 180_000 });
});
