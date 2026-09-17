#!/usr/bin/env node
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
const base = option('base', 'http://127.0.0.1:8175');
const out = option('out', 'artifacts/campinho-r3/browser');
const seconds = Number(option('seconds', '8'));
if (!(seconds >= 5 && seconds <= 60)) throw Error('--seconds deve ficar entre 5 e 60');
mkdirSync(out, { recursive: true });

const sourceFiles = [
  'public/js/map_quebrada.js',
  'public/js/graffiti_layout.js',
  'tools/eval/campinho-integration-foundation-check.mjs',
  'tools/eval/campinho-browser-check.mjs',
];
const sources = Object.fromEntries(sourceFiles.map((file) => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
const matrix = [
  { id: '5x5-3x2-med', bots: 5, quality: 'med', viewport: { width: 1536, height: 1024 } },
  { id: '8x8-16x9-low', bots: 8, quality: 'low', viewport: { width: 1600, height: 900 } },
];
const receipt = { base, sources, matrix: [], generatedAt: new Date().toISOString() };

for (const run of matrix) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
  const context = await browser.newContext({ viewport: run.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [], failed = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failed.push([response.status(), response.url()]); });
  try {
    await page.addInitScript(({ bots, quality }) => {
      localStorage.setItem('awpbr_settings', JSON.stringify({ quality, bots, vol: 0, speech: false }));
      let seed = 57700 + bots;
      Math.random = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    }, { bots: run.bots, quality: run.quality });
    await page.goto(`${base}/?debug=1&auto=P,mst&map=quebrada&perfilauto=0&ctf=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForTimeout(1600);
    const boot = await page.evaluate(() => {
      const g = window.__game, gl = g.renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const roles = {};
      g.world.root.traverse((object) => {
        const role = object.userData?.campinhoRole;
        if (role) roles[role] = (roles[role] || 0) + 1;
      });
      const { nodes, adj } = g.world.waypoints;
      const seen = new Set([0]), queue = [0];
      while (queue.length) for (const next of adj[queue.shift()] || []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
      return {
        map: g._mapId, bots: g.bots.length, quality: g.settings.quality,
        webgl2: g.renderer.capabilities.isWebGL2,
        gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.renderer.__csWebgl,
        nodes: nodes.length, edges: adj.reduce((sum, entries) => sum + entries.length, 0), connected: seen.size,
        ctf: g.ctfPts?.length || 0, pickups: g.world.pickups?.length || 0, roles,
        spawns: Object.fromEntries(Object.entries(g.world.spawns).map(([team, entries]) => [team, entries.length])),
      };
    });
    assert.equal(boot.map, 'quebrada');
    assert.equal(boot.bots, run.bots * 2 - 1);
    assert.equal(boot.webgl2, true);
    assert.ok(/Apple M4 Pro|Metal/i.test(boot.gpu), `renderer real inesperado: ${boot.gpu}`);
    assert.ok(boot.nodes >= 340); assert.ok(boot.edges >= 2000); assert.equal(boot.connected, boot.nodes);
    assert.equal(boot.ctf, 4); assert.equal(boot.pickups, 12); assert.deepEqual(boot.spawns, { E: 4, B: 4 });
    assert.equal(boot.roles['gate-cover'], 2); assert.equal(boot.roles['sideline-cover'], 11);
    assert.equal(boot.roles['sideline-backrest'], 2); assert.equal(boot.roles.scoreboard, 1); assert.equal(boot.roles['score-mark'], 9);

    await page.evaluate(() => {
      const g = window.__game;
      g.player.hp = 1e9; g.timeLeft = 1e6; g.ctfMatchLeft = 1e6;
      const frames = [], draw = { frames: 0, maxCalls: 0, maxTriangles: 0 }, start = performance.now(); let previous = start;
      const update = g.update; g.renderer.info.autoReset = false;
      g.update = function(dt, render = true) {
        if (render) g.renderer.info.reset();
        try { return update.call(this, dt, render); } finally {
          if (render) { draw.frames++; draw.maxCalls = Math.max(draw.maxCalls, g.renderer.info.render.calls); draw.maxTriangles = Math.max(draw.maxTriangles, g.renderer.info.render.triangles); }
        }
      };
      const loop = (now) => { frames.push(now - previous); previous = now; if (window.__campinhoPerf) requestAnimationFrame(loop); };
      window.__campinhoPerf = { frames, draw, start }; requestAnimationFrame(loop);
    });
    await page.waitForTimeout(seconds * 1000);
    const perf = await page.evaluate(() => {
      const g = window.__game, probe = window.__campinhoPerf; window.__campinhoPerf = null;
      const frames = probe.frames.slice(2).sort((a, b) => a - b);
      g.renderer.info.reset(); g.renderer.render(g.scene, g.camera);
      return {
        elapsed: performance.now() - probe.start, frames: frames.length,
        p50: frames[Math.floor(frames.length * .5)], p95: frames[Math.floor(frames.length * .95)], max: frames.at(-1),
        over100ms: frames.filter((value) => value > 100).length,
        calls: probe.draw.maxCalls, triangles: probe.draw.maxTriangles, renderedFrames: probe.draw.frames,
        textures: g.renderer.info.memory.textures, geometries: g.renderer.info.memory.geometries,
      };
    });
    assert.ok(perf.frames > 0); assert.ok(perf.p95 <= 50, `p95 ${perf.p95} ms > 50 ms`);
    assert.ok(perf.over100ms <= 1, `${perf.over100ms} frames >100 ms`);
    assert.ok(perf.calls <= 2200, `${perf.calls} draw calls > 2200`);
    assert.ok(perf.triangles <= 1_600_000, `${perf.triangles} triangulos > 1,6 M`);

    const inheritedErrors = errors.filter((message) => message === 'SUPPORT_URL_BR is not defined');
    const relevantErrors = errors.filter((message) => message !== 'SUPPORT_URL_BR is not defined');
    assert.equal(relevantErrors.length, 0, `erros de pagina proprios: ${relevantErrors.join(' | ')}`);
    const staticPreviewEndpoints = new Set(['/api/geo-lang', '/api/online', '/api/map-plays', '/api/pick',
      '/audio/manifest.json', '/audio/manifest.default.json']);
    const inheritedFailures = failed.filter(([, url]) => {
      const pathname = new URL(url).pathname;
      return pathname.startsWith('/img/decals/') || pathname.startsWith('/%7B%60/');
    });
    const relevantFailures = failed.filter(([, url]) => {
      const pathname = new URL(url).pathname;
      return !staticPreviewEndpoints.has(pathname) && !pathname.startsWith('/audio/menu-music/')
        && !pathname.startsWith('/audio/ambiente/') && !pathname.startsWith('/img/decals/')
        && !pathname.startsWith('/%7B%60/');
    });
    assert.equal(relevantFailures.length, 0, `HTTP >=400 proprios: ${relevantFailures.map((row) => row.join(' ')).join(' | ')}`);

    const views = [
      { id: 'spawn-vila', pos: [-18, null, -42], look: [-2, 1.7, -28] },
      { id: 'baile', pos: [6, null, -37], look: [-2, 1.7, -27] },
      { id: 'viela-oeste', pos: [-23, null, 17], look: [-23, 1.6, -5] },
      { id: 'comercio-miolo', pos: [-4, null, -2], look: [8, 1.7, 9] },
      { id: 'portao-oeste', pos: [-12, null, 22.5], look: [-12, 1.4, 33] },
      { id: 'campinho-lateral', pos: [-15, null, 31], look: [6, 1.2, 39] },
      { id: 'spawn-campinho', pos: [2, null, 40.5], look: [-3, 1.4, 29] },
      { id: 'overview', pos: [50, 52, 58], look: [0, 1, 0], aerial: true },
    ];
    const photos = [];
    for (const view of views) {
      const metrics = await page.evaluate((view) => {
        const g = window.__game; g.paused = true;
        g.player.hp = 100; g.el.hpNum.textContent = '100'; g.el.hpFill.style.width = '100%';
        g.el.hpNum.classList.remove('low'); g.el.hpFill.classList.remove('low');
        g.el.pause.classList.add('hidden'); g.el.banner.classList.add('hidden');
        for (const bot of g.bots) bot.mesh.group.visible = false;
        const ground = view.pos[1] ?? g.world.groundHeightAt(view.pos[0], view.pos[2], 0);
        g.camera.position.set(view.pos[0], ground + (view.aerial ? 0 : 1.62), view.pos[2]);
        g.camera.lookAt(...view.look); g.camera.updateMatrixWorld(true); g.scene.updateMatrixWorld(true);
        g.renderer.info.reset(); g.renderer.render(g.scene, g.camera);
        return { ground, calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles };
      }, view);
      const file = `${out}/${run.id}-${view.id}.png`;
      await page.screenshot({ path: file }); photos.push({ ...view, ...metrics, file });
    }
    const result = { ...run, boot, perf, errors, inheritedErrors, relevantErrors, failed, inheritedFailures, relevantFailures, photos };
    receipt.matrix.push(result); writeFileSync(`${out}/${run.id}.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ id: run.id, boot, perf }));
  } catch (error) {
    receipt.status = 'failed'; receipt.error = error.stack; process.exitCode = 1; console.error(error);
  } finally {
    await context.close(); await browser.close();
  }
}
if (!receipt.status) receipt.status = 'passed';
writeFileSync(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
