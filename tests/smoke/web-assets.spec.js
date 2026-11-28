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

test('preview 3D renderiza o GLB do personagem escolhido', async ({ page }, testInfo) => {
  test.slow();
  const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
  const t0 = Date.now();

  await page.goto(`${base}/?debug=1&assetcheck=1&home=legacy&ui=legacy`);

  await expect(page.locator('#splash-enter')).toBeVisible({ timeout: 25_000 });
  await page.keyboard.press('Enter');
  await expect(page.locator('#boot-splash')).toHaveCount(0);

  await page.locator('.cs-item[data-act="single-player"]').click();
  await page.locator('.cs-item[data-act="sp"]:visible').click();
  await expect(page.locator('#map-screen')).toBeVisible();
  await page.locator('#ms-continue').click();
  await expect(page.locator('#team-select')).toBeVisible({ timeout: 30_000 });

  await page.locator('#btn-team-e').click();
  await expect(page.locator('#char-select')).toBeVisible();

  // A lista abre antes da carga. A marca pertence ao canvas já renderizado, não ao placeholder.
  const preview = page.locator('#char-preview[data-glb="1"]');
  await expect(preview).toBeVisible({ timeout: 60_000 });
  const punk = page.locator('#char-list .char-row[title="Punk"]');
  await expect(punk).toHaveAttribute('aria-selected', 'false');
  await punk.click();
  await expect(preview).toHaveAttribute('data-character', 'punk', { timeout: 60_000 });
  await expect(preview).toBeVisible();

  const ficha = await page.evaluate(() => ({
    rows: document.querySelectorAll('#char-list .char-row').length,
    preview_character: document.getElementById('char-preview')?.dataset.character,
    info_name: document.getElementById('char-info-name')?.textContent || '',
  }));
  await testInfo.attach('asset-check.json', {
    body: JSON.stringify({ ...ficha, total_ms: Date.now() - t0 }, null, 2),
    contentType: 'application/json',
  });
  console.log('ASSETS', JSON.stringify(ficha));

  expect(ficha.rows).toBeGreaterThan(0);
  expect(ficha.info_name).toBe('Punk');
  await expect(page.locator('#crash-overlay')).toBeHidden();

  // Confirmar o personagem também precisa abrir a partida com o caminho real de assets.
  await page.locator('#char-confirm').click();
  await expect(page.locator('#hud')).toBeVisible({ timeout: 180_000 });
});
