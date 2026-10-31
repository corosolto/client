#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
const base = option('base', 'http://127.0.0.1:9344');
const out = option('out', 'artifacts/javaporcos');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.route(/\.astro\/eval-vite|dev-toolbar/, (route) => route.fulfill({
  contentType: 'text/javascript',
  body: 'export default {};',
}));
const errors = [], failed = [], glbs = [], consoleLog = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => consoleLog.push(`${message.type()}: ${message.text()}`));
page.on('response', (response) => {
  if (response.status() >= 400) failed.push([response.status(), response.url()]);
  if (response.status() === 200 && response.url().includes('.glb')) glbs.push(response.url());
});

const views = [
  { id: '01-bairro', camera: [-38, 8, -57], target: [0, 1.5, -37], description: 'casas, oficina, praça e portão final do bairro' },
  { id: '02-transicao', camera: [-50, 10, -2], target: [12, 2, 0], description: 'posto rural, silo, armazém e currais' },
  { id: '03-lavoura', camera: [48, 12, 18], target: [0, 1.5, 43], description: 'quatro talhões de milho cortados por trilhas de combate' },
  { id: '04-mata', camera: [-45, 8, 42], target: [5, 1.5, 55], description: 'córrego, mata ciliar e quatro entradas da horda' },
];

try {
  await page.addInitScript(() => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', allyBots: 3, enemyBots: 4, bots: 4, vol: 0, speech: false }));
  });
  await page.goto(`${base}/?debug=1&auto=E,sertanejo&map=invasao_javaporcos&perfilauto=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  try {
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 60000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      game: window.__game ? { state: window.__game.state, map: window.__game._mapId } : null,
      launch: window.__gameLaunch ? { phase: window.__gameLaunch.phase, state: window.__gameLaunch.state } : null,
      body: document.body.innerText.slice(0, 1800),
    }));
    await page.screenshot({ path: `${out}/00-falha-boot.png` });
    throw new Error(`partida rural não iniciou: ${JSON.stringify({ diagnostic, errors, consoleLog, failed })}`, { cause: error });
  }
  await page.addStyleTag({ content: '#crash-overlay,astro-dev-toolbar{display:none!important}' });
  await page.evaluate(() => { window.__game.objective.state.prepLeft = 0; });
  await page.waitForFunction(() => window.__game?.bots?.some((bot) => bot._boarId && bot._boarVisual), null, { timeout: 30000 });
  await page.waitForTimeout(3200);

  const runtime = await page.evaluate(() => {
    const g = window.__game;
    const gl = g.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const boars = g.bots.filter((bot) => bot._objectiveNpc === 'javaporco');
    return {
      map: g._mapId, mode: g.world.mode, ctf: g.ctf, state: g.state, objective: !!g.objective,
      wave: g.objective.state.wave, phase: g.objective.state.phase,
      boarSlots: boars.length,
      activeBoars: boars.filter((bot) => bot.alive && bot._boarVisual).map((bot) => ({ type: bot._boarType, z: bot.pos.z, hp: bot.hp })),
      entrances: g.world.boarEntrances.length, objectives: g.world.hordeObjectives.length,
      nodes: g.world.waypoints.nodes.length, colliders: g.world.colliders.length, occluders: g.world.occluders.length,
      gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.renderer.__csWebgl,
      webgl2: g.renderer.capabilities.isWebGL2,
      modeLabel: document.getElementById('map-mode')?.textContent,
      objectiveLabel: document.getElementById('horde-objective')?.textContent,
    };
  });
  assert.equal(runtime.map, 'invasao_javaporcos');
  assert.equal(runtime.mode, 'horde');
  assert.equal(runtime.ctf, false);
  assert.equal(runtime.objective, true);
  assert.equal(runtime.wave, 1);
  assert.ok(runtime.activeBoars.length > 0);
  assert.equal(runtime.boarSlots, 24);
  assert.equal(runtime.entrances, 4);
  assert.equal(runtime.objectives, 3);
  assert.ok(runtime.nodes >= 500);
  assert.ok(runtime.colliders >= 20);
  assert.ok(runtime.occluders >= 20);
  assert.equal(runtime.webgl2, true);
  assert.match(runtime.gpu || '', /Apple M4 Pro|Metal/i);
  assert.match(runtime.modeLabel || '', /HORDAS/);
  assert.match(runtime.objectiveLabel || '', /ONDA 1\/8/);
  for (const file of ['javali_jovem.glb', 'javaporco_adulto.glb', 'matriarca_javali.glb', 'ariete_javali.glb']) {
    assert.ok(glbs.some((url) => url.includes(file)), `${file} não carregou por HTTP 200`);
  }

  for (const view of views) {
    await page.evaluate(({ camera, target }) => {
      const g = window.__game;
      g.paused = true;
      g.camera.position.set(...camera);
      g.camera.lookAt(...target);
      g.renderer.render(g.scene, g.camera);
    }, view);
    await page.screenshot({ path: `${out}/${view.id}.png` });
  }
  const fauna = await page.evaluate(() => {
    const g = window.__game;
    const defs = [
      ['prova-jovem', 'jovem', 140],
      ['prova-adulto', 'adulto', 250],
      ['prova-matriarca', 'matriarca', 430],
      ['prova-ariete', 'ariete', 900],
    ];
    g.objective.state.alive = defs.map(([id, type, hp], entrance) => ({ id, type, hp, entrance, damage: {} }));
    g.objective.state.remaining = 0;
    g.objective.sincronizarSlots();
    g.objective.limparCadaveres(); // a troca artificial da fauna não entra na prova de um abate
    const active = g.bots.filter((bot) => bot._boarId?.startsWith('prova-'));
    active.forEach((bot, index) => {
      bot.pos.set(-7.5 + index * 5, 0, 49);
      bot.yaw = Math.PI;
      g.objective.atualizaVisual(bot);
    });
    g.camera.position.set(0, 3.2, 40);
    g.camera.lookAt(0, 1, 49);
    g.renderer.render(g.scene, g.camera);
    return active.map((bot) => bot._boarType);
  });
  assert.deepEqual(new Set(fauna), new Set(['jovem', 'adulto', 'matriarca', 'ariete']));
  await page.screenshot({ path: `${out}/05-fauna-mint.png` });

  const death = await page.evaluate(() => {
    const g = window.__game;
    const boar = g.bots.find((bot) => bot._boarId === 'prova-jovem');
    if (!boar) return { found: false };
    const animalId = boar._boarId;
    const beforeDecals = g.bloodDecals.length;
    const from = boar.pos.clone().add({ x: 0, y: .72, z: -6 });
    const target = boar.pos.clone(); target.y += .72;
    const dir = target.clone().sub(from).normalize();
    g.player.pos.copy(from); g.player.pos.y = boar.pos.y;
    boar.hp = 1;
    const animal = g.objective.state.alive.find((item) => item.id === animalId);
    if (animal) animal.hp = 1;
    g._fireHitscan(g.player, from, dir, 200, true, 'AWP', 'awp', false);
    g.time += .7;
    g.objective.atualizarCadaveres();
    g._updateBlood(.7);
    g._bloodFx?.update(.7);
    g._bloodPop?.update(.7);
    const corpse = g.objective.corpses[0];
    const corpseCenter = g.objective.deathBox.setFromObject(corpse.visual).getCenter(g.objective.deathCenter).clone();
    g.camera.position.set(boar.pos.x, boar.pos.y + 2.1, boar.pos.z - 5.5);
    g.camera.lookAt(boar.pos.x, boar.pos.y + .35, boar.pos.z);
    g.renderer.render(g.scene, g.camera);
    return {
      found: true,
      killed: !boar.alive && !g.objective.state.alive.some((item) => item.id === animalId),
      corpses: g.objective.corpses.length,
      tilt: Math.abs(corpse?.visual?.rotation?.z || 0),
      bloodDecals: g.bloodDecals.length - beforeDecals,
      corpseVisible: !!corpse?.visual?.parent,
      corpseDistance: Math.hypot(corpseCenter.x - boar.pos.x, corpseCenter.z - boar.pos.z),
    };
  });
  assert.equal(death.found, true);
  assert.equal(death.killed, true);
  assert.equal(death.corpses, 1);
  assert.ok(death.tilt > 1.3, `tombo invisível: ${death.tilt}`);
  assert.ok(death.bloodDecals >= 1, `morte sem sangue: ${death.bloodDecals}`);
  assert.equal(death.corpseVisible, true);
  assert.ok(death.corpseDistance < 1.2, `cadáver deslocado do abate: ${death.corpseDistance} m`);
  await page.screenshot({ path: `${out}/06-morte-com-sangue.png` });



  await page.evaluate(() => {
    const g = window.__game;
    g.paused = false;
    g.state = 'live';
    g.objective.state.teamBonus = 4500;
    g.objective.state.scores = { Defensor: { points: 2840, kills: 17, assists: 6, bestCombo: 4, damagePrevented: 1730 } };
    g._endRound('E');
  });
  await page.waitForTimeout(5000);
  const cinematic = await page.evaluate(() => {
    const g = window.__game;
    return {
      active: !!g.objective?.cinematic,
      winner: g.objective?.cinematic?.winner,
      duration: g.stateUntil - g.objective.cinematic.startedAt,
      result: g._resultado,
      title: g.objective?.cinemaTitle?.textContent,
      viewmodelVisible: g.vmScene?.visible,
    };
  });
  assert.equal(cinematic.active, true);
  assert.equal(cinematic.winner, 'E');
  assert.ok(cinematic.duration >= 9.9);
  assert.match(cinematic.title || '', /LORDE DO TERROR/);
  assert.equal(cinematic.viewmodelVisible, false);
  await page.screenshot({ path: `${out}/06-cinematica-vitoria.png` });
  await page.waitForTimeout(3500);
  const scoreboard = await page.evaluate(() => ({
    visible: !window.__game.el.scoreboard.classList.contains('hidden'),
    text: window.__game.el.sbCols.textContent,
  }));
  assert.equal(scoreboard.visible, true);
  assert.match(scoreboard.text || '', /DEFESA DA CIDADE/);
  assert.match(scoreboard.text || '', /Bônus coletivo/);
  await page.screenshot({ path: `${out}/07-placar-final.png` });

  assert.deepEqual(errors, [], `erros no browser: ${errors.join(' | ')}`);
  const featureFailed = failed.filter(([, url]) => /invasao_javaporcos|javaporcos|javali_/.test(url));
  assert.deepEqual(featureFailed, [], `assets da invasão falharam: ${JSON.stringify(featureFailed)}`);
  const receipt = { generatedAt: new Date().toISOString(), base, runtime, fauna, death, cinematic, scoreboard, views, errors, failed, glbs };
  writeFileSync(`${out}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await browser.close();
}
