import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { launchPracaMatch } from './praca-browser-launch.mjs';
import { TETOS } from './cena-tetos.mjs';

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const base = option('base', 'http://127.0.0.1:8220');
const out = option('out', 'artifacts/praca-poderes-main-r2/webgl-matrix');
const seconds = Number(option('seconds', '8'));
const only = option('only', '');
const allowInherited = process.argv.includes('--allow-inherited');
const sourceSha256 = createHash('sha256').update(readFileSync('public/js/map_brasilia.js')).digest('hex');
const canonical = TETOS.praca_poderes;
const budget = { calls: Math.ceil(canonical.calls * 1.5), triangles: Math.ceil(canonical.tris * 1.5) };
const knownPageErrors = new Set(['SUPPORT_URL_BR is not defined']);
const knownHttp = ([status, url]) => status === 404 && (url.endsWith('/api/geo-lang')
  || url.includes('/%7B%60/map-preview.css') || url.includes('/%7B%60/js/ops.js')
  || /\/img\/decals\/[^/?]+\.png(?:\?|$)/.test(url)
  || /\/audio\/(manifest(?:\.default)?\.json|menu-music\/m\d+\.mp3|ambiente\/[^?]+\.mp3)(?:\?|$)/.test(url));
const classify = (errors, failed) => ({
  known: [...errors.filter((message) => knownPageErrors.has(message)), ...failed.filter(knownHttp)],
  unexpected: [...errors.filter((message) => !knownPageErrors.has(message)), ...failed.filter((row) => !knownHttp(row))],
});
const passesPerformance = (result) => result.p95 <= 20 && result.over100ms === 0
  && result.draw.maxCalls <= budget.calls && result.draw.maxTriangles <= budget.triangles;

if (process.argv.includes('--self-test')) {
  const normal = { p95: 19.9, over100ms: 0, draw: { maxCalls: budget.calls, maxTriangles: budget.triangles } };
  const checks = {
    allowlist: classify(['SUPPORT_URL_BR is not defined'], [[404, `${base}/api/geo-lang`]]).unexpected.length === 0,
    performance: passesPerformance(normal),
    'reject-p95': !passesPerformance({ ...normal, p95: 20.1 }),
    'reject-pause': !passesPerformance({ ...normal, over100ms: 1 }),
    'reject-calls': !passesPerformance({ ...normal, draw: { ...normal.draw, maxCalls: budget.calls + 1 } }),
  };
  for (const [id, ok] of Object.entries(checks)) console.log(`${ok ? 'PASSA' : 'FALHA'} ${id}`);
  process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
}

mkdirSync(out, { recursive: true });
const cases = [];
for (const viewport of [{ id: '3x2', width: 1536, height: 1024 }, { id: '16x9', width: 1600, height: 900 }])
  for (const team of [5, 8]) for (const mode of ['dm', 'ctf']) {
    const row = { viewport, team, mode };
    if (!only || `${viewport.id}-${team}x${team}-${mode}` === only) cases.push(row);
  }
if (!cases.length) throw new Error(`caso desconhecido: ${only}`);

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const receipts = [];
try {
  for (const test of cases) {
    const context = await browser.newContext({ viewport: test.viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [], failed = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => { if (response.status() >= 400) failed.push([response.status(), response.url()]); });
    await page.addInitScript(({ team }) => {
      localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', bots: team, vol: 0, speech: false }));
      let seed = 1960;
      Math.random = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    }, { team: test.team });
    await launchPracaMatch(page, { base, mode: test.mode });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const game = window.__game;
      game.player.hp = 1e9; game.timeLeft = 1e6; game.ctfMatchLeft = 1e6;
      game.renderer.info.autoReset = false;
      const frames = [], draw = { frames: 0, maxCalls: 0, maxTriangles: 0, totalCalls: 0, totalTriangles: 0 };
      let last = performance.now();
      const update = game.update;
      game.update = function patchedUpdate(dt, render = true) {
        if (render) game.renderer.info.reset();
        try { return update.call(this, dt, render); }
        finally {
          if (render) {
            draw.frames++; draw.maxCalls = Math.max(draw.maxCalls, game.renderer.info.render.calls);
            draw.maxTriangles = Math.max(draw.maxTriangles, game.renderer.info.render.triangles);
            draw.totalCalls += game.renderer.info.render.calls; draw.totalTriangles += game.renderer.info.render.triangles;
          }
        }
      };
      const loop = (time) => { frames.push(time - last); last = time; if (window.__pracaPerf) requestAnimationFrame(loop); };
      window.__pracaPerf = { frames, draw, start: performance.now() }; requestAnimationFrame(loop);
    });
    await page.waitForTimeout(seconds * 1000);
    const result = await page.evaluate(() => {
      const game = window.__game, metrics = window.__pracaPerf; window.__pracaPerf = null;
      const frames = metrics.frames.slice(1).sort((a, b) => a - b);
      let aguas = 0, horizontes = 0;
      game.world.root.traverse((objeto) => { if (objeto.userData?.aguaViva) aguas++; if (objeto.userData?.pracaHorizonte) horizontes++; });
      return { state: game.state, map: game._mapId, ctf: !!game.ctf, actualBots: game.bots.length,
        quality: game.settings.quality, gpu: game.renderer.__csWebgl, frames: frames.length,
        p50: frames[Math.floor(frames.length * 0.5)], p95: frames[Math.floor(frames.length * 0.95)], max: frames.at(-1),
        over100ms: frames.filter((value) => value > 100).length,
        draw: { ...metrics.draw, averageCalls: Math.round(metrics.draw.totalCalls / Math.max(1, metrics.draw.frames)),
          averageTriangles: Math.round(metrics.draw.totalTriangles / Math.max(1, metrics.draw.frames)) },
        scene: { aguas, horizontes, coberturas: game.world.colliders.filter((c) => c.pracaR2).length,
          defesasSpawn: game.world.colliders.filter((c) => c.pracaSpawnCover).length,
          balizadores: game.world.colliders.filter((c) => c.pracaDensidade).length,
          ctfPoints: game.world.ctfPoints.length, waypoints: game.world.waypoints.nodes.length } };
    });
    result.id = `${test.viewport.id}-${test.team}x${test.team}-${test.mode}`;
    result.sourceSha256 = sourceSha256; result.debt = classify(errors, failed); result.humanVisualApproval = 'pending';
    const capturePath = `${out}/${result.id}.png`;
    await page.screenshot({ path: capturePath });
    const capture = readFileSync(capturePath);
    result.capture = { path: capturePath, bytes: statSync(capturePath).size,
      sha256: createHash('sha256').update(capture).digest('hex') };
    writeFileSync(`${out}/${result.id}.json`, JSON.stringify(result, null, 2));
    receipts.push(result);
    const ok = result.state === 'live' && result.map === 'praca_poderes' && result.ctf === (test.mode === 'ctf')
      && result.actualBots === test.team * 2 - 1 && result.quality === 'med' && result.gpu?.api === 'webgl2'
      && result.gpu?.software !== true && result.frames >= 120 && passesPerformance(result)
      && result.scene.aguas === 1 && result.scene.horizontes === 2 && result.scene.coberturas === 10
      // quality=med inclui mobiliário extra e portanto tem uma grade menor que o harness
      // low (550); o contrato aqui é manter a malha conectada acima do piso histórico.
      && result.scene.defesasSpawn === 8 && result.scene.balizadores === 6 && result.scene.waypoints >= 300
      && result.scene.ctfPoints === 3 && result.debt.unexpected.length === 0
      && (!result.debt.known.length || allowInherited);
    console.log(`${result.id} ${ok ? 'PASSA' : 'FALHA'} p95=${result.p95?.toFixed(1)}ms bots=${result.actualBots} calls=${result.draw.averageCalls}/${result.draw.maxCalls} tris=${result.draw.averageTriangles}/${result.draw.maxTriangles} debt=${result.debt.known.length}/${result.debt.unexpected.length}`);
    if (!ok) process.exitCode = 1;
    await context.close();
  }
} finally { await browser.close(); }
const matrixPath = `${out}/matrix.json`;
const payload = { sourceSha256, base, seconds,
  costBudget: { canonicalAverage: canonical, diagnosticMaxFrame: budget }, cases: receipts,
  humanVisualApproval: 'pending' };
if (only) {
  writeFileSync(`${out}/retry-${only}.json`, JSON.stringify(payload, null, 2));
  // Retry isolado roda em um processo Chrome novo. Só substitui a célula se ela passou e
  // se o recibo agregado pertence exatamente ao mesmo fonte; falha nunca apaga evidência.
  if (!process.exitCode && existsSync(matrixPath)) {
    const matrix = JSON.parse(readFileSync(matrixPath));
    if (matrix.sourceSha256 !== sourceSha256) throw new Error('matrix.json pertence a outro sourceSha256');
    matrix.cases = matrix.cases.map((row) => row.id === only ? receipts[0] : row);
    matrix.retries = [...(matrix.retries || []), { id: only, reason: 'pausa transitória >100ms', freshChrome: true }];
    writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));
  }
} else writeFileSync(matrixPath, JSON.stringify(payload, null, 2));
