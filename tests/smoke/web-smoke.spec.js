import { test, expect } from '@playwright/test';

// ?nav=1 mede somente as transições; web-assets.spec.js cobre GLBs reais.
// SMOKE_MUTANTE=nocharselect deve reprovar a transição para char-select.

const MUTANTE = process.env.SMOKE_MUTANTE || '';

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  testInfo.setTimeout(testInfo.timeout + 10_000);
  await page.screenshot({
    path: `test-results/${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`,
    fullPage: true,
  });
});

test('menu, ranking, setup, teams, character and initial hud boot', async ({ page }, testInfo) => {
  const base = process.env.BASE_URL || 'http://127.0.0.1:4321';
  const t0 = Date.now();
  const marcas = {};
  const marcar = (nome) => { marcas[nome] = Date.now() - (marcas._ult || t0); marcas._ult = Date.now(); };

  if (MUTANTE === 'nocharselect') {
    testInfo.annotations.push({ type: 'mutação', description: 'nocharselect — remove show(\'char-select\') servido; a régua DEVE reprovar' });
    await page.route('**/js/main.js*', async (rota) => {
      const r = await rota.fetch();
      const corpo = await r.text();
      await rota.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: corpo.replace("show('char-select');", ''),
      });
    });
  }

  await page.goto(`${base}/?debug=1&nav=1`);

  await expect(page.locator('#splash-enter')).toBeVisible({ timeout: 25_000 });
  await page.keyboard.press('Enter');
  await expect(page.locator('#boot-splash')).toHaveCount(0);
  marcar('menu');

  await expect(page.locator('#main-menu')).toBeVisible();
  await page.locator('.cs-item[data-act="ranking"]').click();
  await expect(page.locator('#ranking-panel')).toBeVisible();
  await page.locator('#ranking-back').click();
  await expect(page.locator('#main-menu')).toBeVisible();

  await page.locator('.cs-item[data-act="sp"]').click();
  await expect(page.locator('#menu-setup')).toHaveClass(/open/);
  await page.locator('#btn-profile').click();
  await page.locator('#nick-input').fill('SmokeBot');
  await page.locator('#profile-ok').click();
  marcar('setup');

  await page.locator('#btn-jogar').click();
  await expect(page.locator('#team-select')).toBeVisible();
  marcar('team-select');

  await page.locator('#btn-team-e').click();
  await expect(page.locator('#char-select')).toBeVisible();
  const characters = page.locator('#char-list .char-row');
  await expect(characters.first()).toBeVisible();
  marcar('char-select');

  await page.locator('#char-confirm').click();
  await expect(page.locator('#team-select')).toHaveAttribute('data-step', 'enemy');
  await page.locator('#btn-team-b').click();
  marcar('partida');

  await expect(page.locator('#hud')).toBeVisible({ timeout: 60_000 });
  marcar('hud');

  // O artefato separa a duração por tela para localizar lentidão no runner compartilhado.
  const timings = { total_ms: Date.now() - t0, etapas: { ...marcas } };
  await testInfo.attach('navegacao-timings.json', { body: JSON.stringify(timings, null, 2), contentType: 'application/json' });
  console.log('NAVEGAÇÃO', JSON.stringify(timings));
});
