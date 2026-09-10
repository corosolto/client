import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

const out = process.env.OUT || 'artifacts/escadao-r7/team-size';
const base = process.env.BASE || 'http://127.0.0.1:8164';
const mutant = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1] || null;
const mutants = ['viewport-unico', 'bots-imoveis', 'ctf-ausente'];
if (mutant && !mutants.includes(mutant)) throw new Error(`Mutante desconhecido: ${mutant}`);

mkdirSync(out, { recursive: true });
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const mapSha256 = sha256('public/js/map_escadao.js');
const cases = [
  { teamSize: 5, viewport: { width: 1200, height: 800 }, aspect: '3:2', pose: [0, 2.75, 11], look: [-1.4, 4.35, 14.2] },
  { teamSize: 8, viewport: { width: 1280, height: 720 }, aspect: '16:9', pose: [0, 7.56, -34], look: [12, 8.8, -28] },
];
if (mutant === 'viewport-unico') cases[1].viewport = { width: 1200, height: 800 };

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--mute-audio'],
});
const receipt = { base, mapSha256, mutant, cases: [] };

try {
  const servedMap = Buffer.from(await (await fetch(`${base}/js/map_escadao.js`)).arrayBuffer());
  receipt.servedMapSha256 = createHash('sha256').update(servedMap).digest('hex');
  assert.equal(receipt.servedMapSha256, mapSha256, 'Servidor não corresponde ao checkout declarado');

  for (const scenario of cases) {
    const { teamSize, viewport, aspect, pose, look } = scenario;
    const errors = [];
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push(`PAGE ${error.message}`));
    page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
    await page.addInitScript(size => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'high', bots: size, vol: 0, speech: false })), teamSize);
    await page.goto(`${base}/?debug=1&map=escadao&auto=B,sertanejo`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });

    const initial = await page.evaluate(({ mutant }) => {
      const g = window.__game;
      g.el.banner.classList.add('hidden');
      g.roundTime = 1e6;
      g._checkPace = () => {};
      g.player.alive = false;
      g.player.hp = 0;
      g.player.respawnAt = 1e12;
      g._enemyOf = () => [];
      for (const bot of g.bots) {
        bot.target = null;
        bot.hp = 1e9;
      }
      if (mutant === 'bots-imoveis') g._updateBot = () => {};
      if (mutant === 'ctf-ausente') g.ctfPts = [];
      return { positions: g.bots.map(bot => bot.pos.toArray()), gameTime: g.time };
    }, { mutant });

    await page.waitForTimeout(6000);
    const state = await page.evaluate(({ initial, pose, look }) => {
      const g = window.__game;
      const positions = [g.player, ...g.bots].map(entity => entity.pos.toArray());
      const distances = g.bots.map((bot, index) => Math.hypot(
        bot.pos.x - initial.positions[index][0], bot.pos.z - initial.positions[index][2],
      ));
      const elapsedGameTime = g.time - initial.gameTime;
      g.update = () => {};
      g.player.alive = true;
      g.player.hp = 100;
      g.el.vignette.style.setProperty('display', 'none', 'important');
      g.el.dmgDir.style.setProperty('display', 'none', 'important');
      g.el.hpNum.textContent = '100';
      g.el.hpFill.style.width = '100%';
      g.el.respawn.classList.add('hidden');
      g.player.pos.fromArray(pose);
      g.camera.position.set(pose[0], pose[1] + 1.62, pose[2]);
      g.camera.fov = 72;
      g.camera.updateProjectionMatrix();
      g.camera.lookAt(...look);
      g.scene.updateMatrixWorld(true);
      g.renderer.render(g.scene, g.camera);
      return {
        state: g.state,
        mapId: g.mapId || g._mapId,
        bots: g.bots.length,
        actors: g.bots.length + 1,
        teams: {
          E: [g.player, ...g.bots].filter(entity => entity.team === 'E').length,
          B: [g.player, ...g.bots].filter(entity => entity.team === 'B').length,
        },
        finitePositions: positions.every(position => position.every(Number.isFinite)),
        inBounds: g.bots.every(bot => bot.pos.x >= g.world.bounds.minX && bot.pos.x <= g.world.bounds.maxX && bot.pos.z >= g.world.bounds.minZ && bot.pos.z <= g.world.bounds.maxZ),
        movedBots: distances.filter(distance => distance >= .5).length,
        maxBotDistance: Math.max(...distances),
        elapsedGameTime,
        ctf: (g.ctfPts || []).map(point => ({ id: point.id, label: point.label, x: point.x, z: point.z })),
      };
    }, { initial, pose, look });

    const photo = `${out}/${teamSize}x${teamSize}-${aspect.replace(':', 'x')}.png`;
    await page.screenshot({ path: photo });
    const criticalErrors = errors.filter(error => error.startsWith('PAGE ') || /\/js\/|\/models\/props\/escadao_/.test(error));
    const row = {
      teamSize, viewport, aspect, ...state, errors, criticalErrors, photo,
      photoBytes: statSync(photo).size, photoSha256: sha256(photo),
    };
    receipt.cases.push(row);

    assert.equal(viewport.width / viewport.height, aspect === '3:2' ? 3 / 2 : 16 / 9, `${teamSize}x${teamSize} precisa viewport ${aspect}`);
    assert.equal(state.mapId, 'escadao');
    assert.equal(state.bots, teamSize * 2 - 1, `${teamSize}x${teamSize} precisa ${teamSize * 2 - 1} bots`);
    assert.equal(state.actors, teamSize * 2);
    assert.deepEqual(state.teams, { E: teamSize, B: teamSize });
    assert.ok(state.finitePositions && state.inBounds, 'Atores precisam permanecer finitos e dentro dos limites');
    assert.deepEqual(state.ctf.map(point => point.label), ['MIRANTE', 'PATAMAR 2', 'PATAMAR 1', 'RUA']);
    assert.ok(state.ctf.every(point => Number.isFinite(point.x) && Number.isFinite(point.z)), 'Objetivos CTF precisam de posições finitas');
    assert.ok(state.elapsedGameTime >= 4, `Simulação precisa avançar; medido ${state.elapsedGameTime}`);
    assert.ok(state.movedBots >= Math.ceil(state.bots / 3), `Poucos bots percorreram rotas: ${state.movedBots}/${state.bots}`);
    assert.ok(state.maxBotDistance >= 1.5, `Nenhum bot avançou por uma rota significativa: ${state.maxBotDistance}`);
    assert.equal(criticalErrors.length, 0, JSON.stringify(criticalErrors));
    await page.close();
  }

  receipt.status = 'passed';
  console.log('ESCADAO TEAM SIZE PASS: 5x5 em 3:2 e 8x8 em 16:9, bots ativos e quatro objetivos CTF');
} catch (error) {
  receipt.status = 'failed';
  receipt.error = error.stack;
  process.exitCode = 1;
  console.error(error.message);
} finally {
  writeFileSync(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
  await browser.close();
}
