import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const out = process.env.OUT || 'artifacts/escadao-r6/team-size';
const base = process.env.BASE || 'http://127.0.0.1:8164';
mkdirSync(out, { recursive: true });
const mapSha256 = createHash('sha256').update(readFileSync('public/js/map_escadao.js')).digest('hex');
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--mute-audio'],
});
const receipt = { base, viewport: [1200, 800], mapSha256, cases: [] };
try {
  for (const teamSize of [5, 8]) {
    const errors = [];
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push(`PAGE ${error.message}`));
    page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
    await page.addInitScript(size => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'high', bots: size, vol: 0, speech: false })), teamSize);
    await page.goto(`${base}/?debug=1&map=escadao&auto=B,sertanejo`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });
    const state = await page.evaluate(() => {
      const g = window.__game;
      g.update = () => {}; g.el.banner.classList.add('hidden');
      g.world.ambience.reset();
      const positions = [g.player, ...g.bots].map(entity => entity.pos.toArray());
      g.camera.position.set(0, 19, -8); g.camera.fov = 72; g.camera.updateProjectionMatrix(); g.camera.lookAt(0, 3.7, 9);
      g.scene.updateMatrixWorld(true); g.renderer.render(g.scene, g.camera);
      return {
        state: g.state,
        bots: g.bots.length,
        actors: g.bots.length + 1,
        teams: { E: [g.player, ...g.bots].filter(entity => entity.team === 'E').length, B: [g.player, ...g.bots].filter(entity => entity.team === 'B').length },
        finitePositions: positions.every(position => position.every(Number.isFinite)),
      };
    });
    const photo = `${out}/${teamSize}x${teamSize}.png`;
    await page.screenshot({ path: photo });
    const criticalErrors = errors.filter(error => error.startsWith('PAGE ') || /\/js\/|\/models\/props\/escadao_/.test(error));
    const row = { teamSize, ...state, errors, criticalErrors, photo };
    receipt.cases.push(row);
    assert.equal(state.bots, teamSize * 2 - 1, `${teamSize}x${teamSize} precisa ${teamSize * 2 - 1} bots`);
    assert.equal(state.actors, teamSize * 2);
    assert.deepEqual(state.teams, { E: teamSize, B: teamSize });
    assert.ok(state.finitePositions);
    assert.equal(criticalErrors.length, 0, JSON.stringify(criticalErrors));
    await page.close();
  }
  receipt.status = 'passed';
  console.log('ESCADAO TEAM SIZE PASS: 5x5 e 8x8 no jogo servido em 1200x800');
} catch (error) {
  receipt.status = 'failed'; receipt.error = error.stack; process.exitCode = 1;
  console.error(error.message);
} finally {
  writeFileSync(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
  await browser.close();
}
