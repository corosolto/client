#!/usr/bin/env node
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const option = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
const base = option('base', 'http://127.0.0.1:8156');
const out = option('out', 'artifacts/obras-prefeitura/browser');
const seconds = Number(option('seconds', '8'));
if (!(seconds >= 5 && seconds <= 60)) throw Error('--seconds deve ficar entre 5 e 60');
mkdirSync(out, { recursive: true });

const sources = Object.fromEntries([
  'public/js/map_obras.js',
  'public/models/props/andaime.glb',
  'public/models/props/container_escritorio.glb',
].map((file) => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
const matrix = [
  { id: '5x5-3x2', bots: 5, viewport: { width: 1536, height: 1024 } },
  { id: '8x8-16x9', bots: 8, viewport: { width: 1600, height: 900 } },
];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const receipt = { base, sources, matrix: [], generatedAt: new Date().toISOString() };
try {
  for (const run of matrix) {
    const context = await browser.newContext({ viewport: run.viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [], failed = [], glbs = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) failed.push([response.status(), response.url()]);
      if (response.status() === 200 && response.url().includes('.glb')) glbs.push(response.url());
    });
    await page.addInitScript(({ bots }) => {
      localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', bots, vol: 0, speech: false }));
      let seed = 6262;
      Math.random = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    }, { bots: run.bots });
    await page.goto(`${base}/?debug=1&auto=P,mst&map=obras_prefeitura&perfilauto=0&ctf=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForTimeout(1500);
    const boot = await page.evaluate(() => {
      const g = window.__game;
      const ext = g.renderer.getContext().getExtension('WEBGL_debug_renderer_info');
      return {
        map: g._mapId, bots: g.bots.length, quality: g.settings.quality,
        gpu: ext ? g.renderer.getContext().getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.renderer.__csWebgl,
        towers: g.world.root.children.filter((o) => o.name.startsWith('obras-torre-andaime-')).length,
        bunkers: g.world.root.children.filter((o) => o.name.startsWith('obras-bunker-')).length,
        nodes: g.world.waypoints.nodes.length,
      };
    });
    assert.equal(boot.map, 'obras_prefeitura');
    assert.equal(boot.bots, run.bots * 2 - 1);
    assert.equal(boot.towers, 2);
    assert.equal(boot.bunkers, 4);
    assert.ok(glbs.some((url) => url.includes('andaime.glb')), 'andaime.glb não carregou por HTTP 200');
    assert.ok(glbs.some((url) => url.includes('container_escritorio.glb')), 'container_escritorio.glb não carregou por HTTP 200');

    await page.evaluate(() => {
      const g = window.__game;
      g.player.hp = 1e9; g.timeLeft = 1e6; g.ctfMatchLeft = 1e6;
      const frames = [], start = performance.now(); let previous = start;
      g.renderer.info.autoReset = false;
      const loop = (now) => { frames.push(now - previous); previous = now; if (window.__obrasPerf) requestAnimationFrame(loop); };
      window.__obrasPerf = { frames, start };
      requestAnimationFrame(loop);
    });
    await page.waitForTimeout(seconds * 1000);
    const perf = await page.evaluate(() => {
      const g = window.__game, m = window.__obrasPerf; window.__obrasPerf = null;
      const frames = m.frames.slice(1).sort((a, b) => a - b);
      g.renderer.info.reset(); g.renderer.render(g.scene, g.camera);
      return {
        elapsed: performance.now() - m.start, frames: frames.length,
        p50: frames[Math.floor(frames.length * .5)], p95: frames[Math.floor(frames.length * .95)],
        max: frames.at(-1), over100ms: frames.filter((value) => value > 100).length,
        calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles,
        textures: g.renderer.info.memory.textures, geometries: g.renderer.info.memory.geometries,
      };
    });
    assert.ok(perf.frames > 0);
    assert.equal(errors.length, 0, `erros de página: ${errors.join(' | ')}`);
    assert.equal(failed.length, 0, `HTTP >=400: ${failed.map((row) => row.join(' ')).join(' | ')}`);

    const views = [
      { id: 'spawn-sul', pos: [4, null, -27], look: [0, 2, -5] },
      { id: 'rotas-sul', pos: [0, null, -21], look: [0, 2, -2] },
      { id: 'torre-sul', pos: [-18, 5.6, -11], look: [0, 2, 0] },
      { id: 'spawn-norte', pos: [4, null, 27], look: [0, 2, 5] },
      { id: 'overview', pos: [35, 26, 38], look: [0, 1, 0], aerial: true },
    ];
    const photos = [];
    for (const view of views) {
      const metrics = await page.evaluate((view) => {
        const g = window.__game;
        g.paused = true; g.el.pause.classList.add('hidden'); g.el.banner.classList.add('hidden');
        const ground = view.pos[1] ?? g.world.groundHeightAt(view.pos[0], view.pos[2], 0);
        for (const bot of g.bots) bot.mesh.group.visible = false;
        g.camera.position.set(view.pos[0], ground + (view.aerial ? 0 : 1.62), view.pos[2]);
        g.camera.lookAt(...view.look); g.camera.updateMatrixWorld(true); g.scene.updateMatrixWorld(true);
        g.renderer.info.reset(); g.renderer.render(g.scene, g.camera);
        return { ground, calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles };
      }, view);
      const file = `${out}/${run.id}-${view.id}.png`;
      await page.screenshot({ path: file });
      photos.push({ ...view, ...metrics, file });
    }
    const result = { ...run, boot, perf, errors, failed, glbs: [...new Set(glbs)], photos };
    receipt.matrix.push(result);
    writeFileSync(`${out}/${run.id}.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ id: run.id, boot, perf }));
    await context.close();
  }
  receipt.status = 'passed';
} catch (error) {
  receipt.status = 'failed'; receipt.error = error.stack; process.exitCode = 1; console.error(error);
} finally {
  writeFileSync(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
  await browser.close();
}
