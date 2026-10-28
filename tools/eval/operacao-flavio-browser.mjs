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
  { id: '01-escritorio', camera: [-24, 5.8, -50], target: [-3, 1.4, -34], description: 'terminal executivo, estações de trabalho e rota inicial de Flávio' },
  { id: '02-seguranca', camera: [0, 3.4, -24], target: [0, 1.3, 3], description: 'pórtico, scanners, guaritas e filas do controle de acesso' },
  { id: '03-hangar', camera: [-10, 4.2, 17], target: [4, 2.2, 39], description: 'porta aberta, estrutura aeronáutica e eixo de taxiamento do hangar' },
  { id: '04-apron', camera: [27, 5.2, 61], target: [0, 2.2, 55], description: 'avião, balizamento, escada móvel e portão final no pátio' },
];

try {
  await page.addInitScript(() => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', allyBots: 3, enemyBots: 4, bots: 4, vol: 0, speech: false }));
  });
  await page.goto(`${base}/?debug=1&auto=B,senador&map=operacao_flavio&perfilauto=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(3200);

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
      blockedCheckpoints: (g.world.escortPath || []).slice(0, -1).flatMap((point, index) => (
        g.world.colliders.some((c) => point.x > c.minX && point.x < c.maxX && point.z > c.minZ && point.z < c.maxZ && c.minY < 1.8 && c.maxY > 0.1)
          ? [index] : []
      )),
      disconnectedRouteSegments: (g.world.escortPath || []).slice(1).flatMap((point, index) => {
        const from = g.world.nearestWaypoint(g.world.escortPath[index].x, g.world.escortPath[index].z);
        const to = g.world.nearestWaypoint(point.x, point.z);
        return from !== to && g.world.findPath(from, to).length <= 1 ? [index] : [];
      }),
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
  assert.deepEqual(runtime.blockedCheckpoints, [], `checkpoints dentro de colisores: ${runtime.blockedCheckpoints.join(', ')}`);
  assert.deepEqual(runtime.disconnectedRouteSegments, [], `trechos sem navegação: ${runtime.disconnectedRouteSegments.join(', ')}`);
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
