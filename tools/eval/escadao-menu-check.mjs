import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.BASE || 'http://127.0.0.1:8148';
const out = process.env.OUT || 'artifacts/escadao-visual/main-sync/menu';
const htmlFile = process.argv.find(a => a.startsWith('--html='))?.slice(7);
const unresolved = html => ['FACTIONS.map', 'String(index + 1)'].filter(s => html.includes(s));
mkdirSync(out, { recursive: true });
if (htmlFile) {
  const literals = unresolved(readFileSync(htmlFile, 'utf8'));
  writeFileSync(`${out}/template.json`, JSON.stringify({ literals }, null, 2));
  assert.equal(literals.length, 0, 'Template Astro não renderizado');
} else {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--mute-audio'],
  });
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  page.setDefaultTimeout(60000);
  const errors = [], assetFailures = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => {
    if (r.status() >= 400 && /\.(glb|webp|png|jpg|js)(\?|$)/.test(r.url())) assetFailures.push({ url: r.url(), status: r.status() });
  });
  let receipt = { status: 'incomplete', base };
  try {
    await page.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'high', vol: 0, speech: false })));
    const response = await page.goto(`${base}/?map=escadao&lang=pt&debug=1`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    assert.equal(unresolved(await response.text()).length, 0, 'Template Astro não renderizado');
    await page.waitForFunction(() => document.querySelector('#boot-splash')?.textContent.includes('100%'));
    await page.keyboard.press('Enter');
    await page.locator('#boot-splash').waitFor({ state: 'detached' });
    await page.locator('[data-act="sp"]').click();
    await page.locator('#ms-continue').click();
    await page.locator('#nick-input').fill('Teste local Escadão');
    await page.locator('#profile-ok').click();
    await page.locator('#btn-jogar').click();
    await page.locator('#team-select:not(.hidden)').waitFor();
    const factions = await page.locator('#team-select .team-card:visible').count();
    assert.ok(factions >= 2, 'Seleção precisa oferecer os dois lados da partida');
    await page.screenshot({ path: `${out}/factions.png` });
    await page.locator('#btn-team-b').click();
    await page.locator('#char-select:not(.hidden)').waitFor({ timeout: 180000 });
    await page.locator('#char-list .char-row').filter({ hasText: 'Sertanejo' }).click();
    await page.locator('#char-confirm').click();
    await page.locator('#btn-team-e').click();
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });
    const loaded = await page.evaluate(async () => {
      const g = window.__game;
      const { ESCADAO_PROPS } = await import('/js/map_escadao.js');
      const { hasProp } = await import('/js/mapprops.js');
      const { VERSION } = await import('/js/version.js');
      return { version: VERSION, map: g._mapId, state: g.state, position: g.player.pos.toArray(),
        props: ESCADAO_PROPS.map(id => ({ id, loaded: hasProp(id) })), stairs: g.world.stairs?.length };
    });
    assert.equal(loaded.map, 'escadao');
    assert.ok(loaded.props.every(p => p.loaded));
    await page.screenshot({ path: `${out}/game.png` });
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(750);
    await page.keyboard.up('KeyW');
    const end = await page.evaluate(() => window.__game.player.pos.toArray());
    assert.ok(end.every(Number.isFinite));
    assert.ok(Math.hypot(end[0] - loaded.position[0], end[2] - loaded.position[2]) > 0, 'W precisa mover o jogador');
    assert.deepEqual(errors, []);
    assert.deepEqual(assetFailures, []);
    receipt = { status: 'passed', base, factions, loaded, end, errors, assetFailures };
    console.log('MENU PASS: Astro, facções, personagem, adversário, GLBs e movimento real');
  } catch (error) {
    receipt = { ...receipt, status: 'failed', error: error.message, errors, assetFailures };
    await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
    throw error;
  } finally {
    writeFileSync(`${out}/menu.json`, JSON.stringify(receipt, null, 2));
    await browser.close();
  }
}
