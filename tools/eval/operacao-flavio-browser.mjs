#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
const base = option('base', 'http://127.0.0.1:9326');
const out = option('out', 'artifacts/operacao-flavio');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [], failed = [], glbs = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400) failed.push([response.status(), response.url()]);
  if (response.status() === 200 && response.url().includes('.glb')) glbs.push(response.url());
});

const views = [
  { id: '01-escritorio', camera: [-25, 6.2, -50], target: [-3, 1.4, -34], description: 'anel do escritório, divisórias e rota inicial de Flávio' },
  { id: '02-seguranca', camera: [-24, 6.5, -10], target: [0, 1.2, 4], description: 'transição de segurança, pátio de serviço e três rotas paralelas' },
  { id: '03-hangar', camera: [-31, 8.5, 23], target: [3, 1.8, 37], description: 'hangar industrial, mezanino e bancadas quebrando a linha de tiro' },
  { id: '04-apron', camera: [30, 7.5, 42], target: [0, 2, 54], description: 'avião, escada móvel, trator e zona final no apron' },
];

try {
  await page.addInitScript(() => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', allyBots: 3, enemyBots: 4, bots: 4, vol: 0, speech: false }));
  });
  await page.goto(`${base}/?debug=1&auto=B,senador&map=operacao_flavio&perfilauto=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(1200);

  const runtime = await page.evaluate(() => {
    const g = window.__game;
    const vip = g.bots.find((bot) => bot._objectiveNpc === 'flavio');
    const gl = g.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      map: g._mapId,
      mode: g.world.mode,
      ctf: g.ctf,
      state: g.state,
      objective: !!g.objective,
      checkpoints: g.world.escortPath?.length || 0,
      vip: vip ? { char: vip.def?.id, name: vip.name, weapon: vip.weapon, team: vip.team } : null,
      nodes: g.world.waypoints.nodes.length,
      colliders: g.world.colliders.length,
      occluders: g.world.occluders.length,
      gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.renderer.__csWebgl,
      webgl2: g.renderer.capabilities.isWebGL2,
      modeLabel: document.getElementById('map-mode')?.textContent,
      objectiveLabel: document.getElementById('escort-objective')?.textContent,
    };
  });
  assert.equal(runtime.map, 'operacao_flavio');
  assert.equal(runtime.mode, 'escort');
  assert.equal(runtime.ctf, false);
  assert.equal(runtime.objective, true);
  assert.equal(runtime.checkpoints, 12);
  assert.deepEqual(runtime.vip && { char: runtime.vip.char, weapon: runtime.vip.weapon, team: runtime.vip.team }, { char: 'senador', weapon: 'knife', team: 'B' });
  assert.ok(runtime.nodes >= 500);
  assert.ok(runtime.colliders >= 35);
  assert.ok(runtime.occluders >= 35);
  assert.equal(runtime.webgl2, true);
  assert.match(runtime.gpu || '', /Apple M4 Pro|Metal/i);
  assert.match(runtime.objectiveLabel || '', /OPERAÇÃO FLÁVIO/);
  for (const file of ['aviao_executivo.glb', 'trator_bagagem.glb', 'carrinho_ferramentas.glb', 'arco_seguranca.glb', 'escada_embarque.glb', 'senador.glb']) {
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

  await page.evaluate(() => {
    const g = window.__game;
    g.paused = false;
    g.state = 'live';
    g._endRound('B');
  });
  await page.waitForTimeout(4000);
  const cinematic = await page.evaluate(() => {
    const g = window.__game;
    return {
      active: !!g.objective?.cinematic,
      winner: g.objective?.cinematic?.winner,
      duration: g.stateUntil - g.objective.cinematic.startedAt,
      planeZ: g.world.objectivePlane?.position.z,
      result: g._resultado,
    };
  });
  assert.equal(cinematic.active, true);
  assert.equal(cinematic.winner, 'B');
  assert.ok(cinematic.duration >= 8.9);
  assert.ok(cinematic.planeZ > 55);
  await page.screenshot({ path: `${out}/05-cinematica-vitoria.png` });

  assert.deepEqual(errors, [], `erros no browser: ${errors.join(' | ')}`);
  const featureFailed = failed.filter(([, url]) => /operacao_flavio|operacao_decola|senador\\.glb/.test(url));
  assert.deepEqual(featureFailed, [], `assets da operação falharam: ${JSON.stringify(featureFailed)}`);
  const receipt = { generatedAt: new Date().toISOString(), base, runtime, cinematic, views, errors, failed, glbs };
  writeFileSync(`${out}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await browser.close();
}
