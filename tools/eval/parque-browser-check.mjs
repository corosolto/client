#!/usr/bin/env node
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const option = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
const base = option('base', 'http://127.0.0.1:8165');
const out = option('out', 'artifacts/parque/browser');
const seconds = Number(option('seconds', '8'));
if (!(seconds >= 5 && seconds <= 60)) throw Error('--seconds deve ficar entre 5 e 60');
mkdirSync(out, { recursive: true });

const sourceFiles = [
  'public/js/map_parque.js', 'public/js/map_uv.js', 'public/js/look.js',
  'public/img/textures/sky_parque.webp',
  'public/models/props/parque_coreto.glb', 'public/models/props/roda_gigante_roda.glb',
  'public/models/props/roda_gigante_base.glb', 'public/models/props/carrossel.glb',
  'public/models/props/barraca_quermesse.glb', 'public/models/props/predio_artdeco.glb',
];
const sources = Object.fromEntries(sourceFiles.map((file) => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
const matrix = [
  { id: '5x5-3x2-med', bots: 5, quality: 'med', viewport: { width: 1536, height: 1024 } },
  { id: '8x8-16x9-low', bots: 8, quality: 'low', viewport: { width: 1600, height: 900 } },
];
const receipt = { base, sources, matrix: [], generatedAt: new Date().toISOString() };

for (const run of matrix) {
  // Chrome real, sem SwiftShader e sem mock de renderer.
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
  const context = await browser.newContext({ viewport: run.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [], failed = [], glbs = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push([response.status(), response.url()]);
    if (response.status() === 200 && response.url().includes('.glb')) glbs.push(response.url());
  });
  try {
    await page.addInitScript(({ bots, quality }) => {
      localStorage.setItem('awpbr_settings', JSON.stringify({ quality, bots, vol: 0, speech: false }));
      let seed = 1313;
      Math.random = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    }, { bots: run.bots, quality: run.quality });
    await page.goto(`${base}/?debug=1&auto=P,mst&map=parque_treta&perfilauto=0&ctf=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForTimeout(1600);
    const boot = await page.evaluate(() => {
      const g = window.__game, gl = g.renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const counts = { heroes: 0, screens: 0, cover: 0, fauna: new Set() };
      g.world.root.traverse((o) => {
        if (/^parque-(molde|coreto)/.test(o.name || '')) counts.heroes++;
        if (o.userData?.parqueRole === 'spawn-screen') counts.screens++;
        if (/^cover/.test(o.userData?.parqueRole || '')) counts.cover++;
        if (o.userData?.fauna) counts.fauna.add(o.userData.fauna);
      });
      return {
        map: g._mapId, bots: g.bots.length, quality: g.settings.quality,
        webgl2: g.renderer.capabilities.isWebGL2,
        gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.renderer.__csWebgl,
        nodes: g.world.waypoints.nodes.length, ctf: g.ctfPts?.length || 0,
        heroes: counts.heroes, screens: counts.screens, cover: counts.cover, fauna: [...counts.fauna],
      };
    });
    assert.equal(boot.map, 'parque_treta');
    assert.equal(boot.bots, run.bots * 2 - 1);
    assert.equal(boot.webgl2, true);
    assert.ok(boot.nodes >= 300); assert.equal(boot.ctf, 3);
    assert.ok(boot.heroes >= 15); assert.equal(boot.screens, 4); assert.ok(boot.cover >= 12); assert.ok(boot.fauna.length >= 3);
    for (const file of sourceFiles.filter((f) => f.endsWith('.glb'))) {
      const name = file.split('/').at(-1);
      assert.ok(glbs.some((url) => url.includes(name)), `${name} não carregou por HTTP 200`);
    }

    await page.evaluate(() => {
      const g = window.__game;
      g.player.hp = 1e9; g.timeLeft = 1e6; g.ctfMatchLeft = 1e6;
      const frames = [], start = performance.now(); let previous = start;
      g.renderer.info.autoReset = false;
      const loop = (now) => { frames.push(now - previous); previous = now; if (window.__parquePerf) requestAnimationFrame(loop); };
      window.__parquePerf = { frames, start }; requestAnimationFrame(loop);
    });
    await page.waitForTimeout(seconds * 1000);
    const perf = await page.evaluate(() => {
      const g = window.__game, m = window.__parquePerf; window.__parquePerf = null;
      const frames = m.frames.slice(2).sort((a, b) => a - b);
      g.renderer.info.reset(); g.renderer.render(g.scene, g.camera);
      return {
        elapsed: performance.now() - m.start, frames: frames.length,
        p50: frames[Math.floor(frames.length * .5)], p95: frames[Math.floor(frames.length * .95)],
        max: frames.at(-1), over100ms: frames.filter((value) => value > 100).length,
        calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles,
        textures: g.renderer.info.memory.textures, geometries: g.renderer.info.memory.geometries,
      };
    });
    assert.ok(perf.frames > 0); assert.ok(perf.p95 <= 50, `p95 ${perf.p95} ms > 50 ms`);
    assert.ok(perf.over100ms <= 1, `${perf.over100ms} frames >100 ms`);
    assert.ok(perf.calls <= 800, `${perf.calls} draw calls > 800`);
    assert.ok(perf.triangles <= 1_300_000, `${perf.triangles} triângulos > 1,3 M`);
    assert.equal(errors.length, 0, `erros de página: ${errors.join(' | ')}`);
    const staticPreviewEndpoints = new Set(['/api/geo-lang', '/api/online', '/api/map-plays', '/api/pick',
      '/audio/manifest.json', '/audio/manifest.default.json']);
    const relevantFailures = failed.filter(([, url]) => {
      const pathname = new URL(url).pathname;
      return !staticPreviewEndpoints.has(pathname) && !pathname.startsWith('/audio/menu-music/');
    });
    assert.equal(relevantFailures.length, 0, `HTTP >=400: ${relevantFailures.map((row) => row.join(' ')).join(' | ')}`);

    const views = [
      { id: 'spawn-sul', pos: [11.5, null, -38], look: [3, 1.7, -22] },
      { id: 'rota-oeste', pos: [-8, null, -18], look: [-21, 4, 0] },
      { id: 'praca-central', pos: [3, null, -11], look: [0, 4, 2] },
      { id: 'rota-leste', pos: [11, null, 10], look: [24, 2.5, 0] },
      { id: 'spawn-norte', pos: [-11.5, null, 38], look: [-3, 1.7, 22] },
      { id: 'overview', pos: [47, 35, 52], look: [0, 2, 0], aerial: true },
    ];
    const photos = [];
    for (const view of views) {
      const metrics = await page.evaluate((view) => {
        const g = window.__game; g.paused = true;
        g.player.hp = 100;
        g.el.hpNum.textContent = '100'; g.el.hpFill.style.width = '100%';
        g.el.hpNum.classList.remove('low'); g.el.hpFill.classList.remove('low');
        g.el.pause.classList.add('hidden'); g.el.banner.classList.add('hidden');
        const ground = view.pos[1] ?? g.world.groundHeightAt(view.pos[0], view.pos[2], 0);
        for (const bot of g.bots) bot.mesh.group.visible = false;
        g.camera.position.set(view.pos[0], ground + (view.aerial ? 0 : 1.62), view.pos[2]);
        g.camera.lookAt(...view.look); g.camera.updateMatrixWorld(true); g.scene.updateMatrixWorld(true);
        g.renderer.info.reset(); g.renderer.render(g.scene, g.camera);
        return { ground, calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles };
      }, view);
      const file = `${out}/${run.id}-${view.id}.png`;
      await page.screenshot({ path: file }); photos.push({ ...view, ...metrics, file });
    }
    const result = { ...run, boot, perf, errors, failed, glbs: [...new Set(glbs)], photos };
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
