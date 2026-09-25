#!/usr/bin/env node
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const option = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
const mode = option('mode', 'candidate');
const base = option('base', 'http://127.0.0.1:8160');
const out = option('out', `artifacts/atacadao/browser/${mode}`);
const seconds = Number(option('seconds', '8'));
const only = option('only', '');
const profileCpu = option('profile', '0') === '1';
if (!['baseline', 'candidate'].includes(mode)) throw Error('--mode deve ser baseline ou candidate');
if (!(seconds >= 5 && seconds <= 60)) throw Error('--seconds deve ficar entre 5 e 60');
mkdirSync(out, { recursive: true });

const sourceFiles = mode === 'candidate' ? [
  'public/js/map_atacadao.js',
  'public/models/props/estante_pallets.glb',
  'public/models/props/freezer.glb',
  'public/models/props/ilha_caixas.glb',
  'public/models/props/balcao_acougue.glb',
  'public/models/props/balcao_padaria.glb',
  'public/models/props/ilha_hortifruti.glb',
  'public/models/props/geladeira_bebidas.glb',
] : ['public/js/map_atacadao.js'];
const sources = Object.fromEntries(sourceFiles.map((file) => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
const matrix = [
  { id: '5x5-dm-3x2-med', bots: 5, ctf: false, quality: 'med', viewport: { width: 1536, height: 1024 } },
  { id: '5x5-ctf-3x2-med', bots: 5, ctf: true, quality: 'med', viewport: { width: 1536, height: 1024 } },
  { id: '8x8-dm-3x2-med', bots: 8, ctf: false, quality: 'med', viewport: { width: 1536, height: 1024 } },
  { id: '8x8-ctf-3x2-med', bots: 8, ctf: true, quality: 'med', viewport: { width: 1536, height: 1024 } },
  { id: '5x5-dm-16x9-low', bots: 5, ctf: false, quality: 'low', viewport: { width: 1600, height: 900 } },
  { id: '5x5-ctf-16x9-low', bots: 5, ctf: true, quality: 'low', viewport: { width: 1600, height: 900 } },
  { id: '8x8-dm-16x9-low', bots: 8, ctf: false, quality: 'low', viewport: { width: 1600, height: 900 } },
  { id: '8x8-ctf-16x9-low', bots: 8, ctf: true, quality: 'low', viewport: { width: 1600, height: 900 } },
];
const receipt = { mode, base, sources, matrix: [], generatedAt: new Date().toISOString() };

for (const run of matrix.filter((item) => !only || item.id === only)) {
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
      localStorage.setItem('awpbr_nick', 'ATACADAO-QA');
      let seed = 7474;
      Math.random = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    }, { bots: run.bots, quality: run.quality });
    await page.goto(`${base}/?debug=1&map=atacadao_treta&perfilauto=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => !document.getElementById('splash-enter')?.classList.contains('hidden'), null, { timeout: 120000 });
    await page.evaluate(() => document.getElementById('boot-splash')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForSelector('#boot-splash', { state: 'detached', timeout: 30000 });
    await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 120000 });
    await page.waitForTimeout(800);
    await page.click('.cs-item[data-act="single-player"]');
    await page.click(`.cs-item[data-act="${run.ctf ? 'ctf' : 'sp'}"]`);
    await page.waitForSelector('#map-screen:not(.hidden)', { timeout: 30000 });
    await page.click('#ms-continue');
    await page.waitForSelector('#team-select:not(.hidden)', { timeout: 30000 });
    await page.click('#btn-team-e');
    await page.waitForSelector('#char-select:not(.hidden)', { timeout: 120000 });
    await page.click('#char-list .char-row:first-child');
    await page.click('#char-confirm');
    await page.waitForSelector('#team-select:not(.hidden)', { timeout: 30000 });
    await page.click('#btn-team-b');
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForTimeout(1500);
    const boot = await page.evaluate(() => {
      const g = window.__game;
      const ext = g.renderer.getContext().getExtension('WEBGL_debug_renderer_info');
      const counts = { racks: 0, covers: 0, freezers: 0, sections: 0, checkouts: 0 };
      g.world.root.traverse((o) => {
        if (o.userData?.atacadaoRack) counts.racks++;
        if (o.userData?.atacadaoCover) counts.covers++;
        if (o.userData?.atacadaoFreezer !== undefined) counts.freezers++;
        if (o.userData?.atacadaoSecao) counts.sections++;
        if (o.userData?.atacadaoCaixa) counts.checkouts++;
      });
      return {
        map: g._mapId, bots: g.bots.length, quality: g.settings.quality, ctf: g.ctf,
        gpu: ext ? g.renderer.getContext().getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.renderer.__csWebgl,
        nodes: g.world.waypoints.nodes.length, anchors: g.world.routeAnchors?.length || 0,
        colliders: g.world.colliders.length, occluders: g.world.occluders.length,
        indexedLos: typeof g.world.rayOccluded === 'function',
        ctfPoints: g.ctfPts?.length || 0, ...counts,
      };
    });
    assert.equal(boot.map, 'atacadao_treta');
    assert.equal(boot.bots, run.bots * 2 - 1);
    assert.equal(boot.ctf, run.ctf);
    if (run.ctf) assert.equal(boot.ctfPoints, 3);
    if (mode === 'candidate') {
      assert.equal(boot.racks, 48); assert.equal(boot.covers, 12); assert.equal(boot.freezers, 6);
      assert.ok(boot.sections >= 5); assert.ok(boot.checkouts >= 6); assert.equal(boot.anchors, 3);
      for (const file of sourceFiles.slice(1)) {
        const name = file.split('/').at(-1);
        assert.ok(glbs.some((url) => url.includes(name)), `${name} não carregou por HTTP 200`);
      }
    }

    let cdp = null;
    if (profileCpu) {
      cdp = await context.newCDPSession(page);
      await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
    }
    await page.evaluate(() => {
      const g = window.__game;
      g.player.hp = 1e9; g.timeLeft = 1e6; g.ctfMatchLeft = 1e6;
      const frames = [], start = performance.now(); let previous = start;
      g.renderer.info.autoReset = false;
      const loop = (now) => { frames.push(now - previous); previous = now; if (window.__atacPerf) requestAnimationFrame(loop); };
      window.__atacPerf = { frames, start }; requestAnimationFrame(loop);
    });
    await page.waitForTimeout(seconds * 1000);
    if (cdp) {
      const { profile } = await cdp.send('Profiler.stop');
      writeFileSync(`${out}/${run.id}-cpu-profile.json`, JSON.stringify(profile));
      await cdp.detach();
    }
    const perf = await page.evaluate(() => {
      const g = window.__game, m = window.__atacPerf; window.__atacPerf = null;
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
    assert.ok(perf.frames > 0); assert.ok(perf.p95 <= 50, `p95 ${perf.p95} ms > 50 ms`); assert.equal(perf.over100ms, 0);
    assert.equal(errors.length, 0, `erros de página: ${errors.join(' | ')}`);
    // O preview estático serve o build final, mas não executa os endpoints do
    // adaptador Astro. Eles têm fallback explícito no cliente e não são assets
    // do mapa; qualquer outra falha HTTP continua derrubando a evidência.
    const staticPreviewEndpoints = new Set(['/api/geo-lang', '/api/online', '/api/map-plays', '/api/pick']);
    const relevantFailures = failed.filter(([, url]) => {
      const parsed = new URL(url);
      return !(staticPreviewEndpoints.has(parsed.pathname));
    });
    assert.equal(relevantFailures.length, 0, `HTTP >=400: ${relevantFailures.map((row) => row.join(' ')).join(' | ')}`);

    const views = [
      { id: 'spawn-estacionamento', pos: [0, null, -36], look: [0, 1.5, -10] },
      { id: 'caixas', pos: [0, null, -8], look: [0, 1.5, 4] },
      { id: 'corredor-oeste', pos: [-20.8, null, 0], look: [-20.8, 1.5, 23] },
      { id: 'corredor-centro', pos: [1.6, null, 4.8], look: [1.6, 1.5, 27] },
      // O eixo x=0,z=32 contém um fardo de cobertura; a câmera antiga nascia
      // colada nele e registrava o decal em macro em vez da rota da doca.
      { id: 'doca', pos: [6.4, null, 34.4], look: [1.6, 1.5, 18] },
      { id: 'fachada', pos: [0, 8, -55], look: [0, 3.2, -10], aerial: true },
    ];
    const photos = [];
    for (const view of views) {
      const metrics = await page.evaluate((view) => {
        const g = window.__game; g.paused = true;
        for (const smoke of (g._smokes || [])) g.scene.remove(smoke.group);
        if (g._smokes) g._smokes.length = 0;
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
    console.log(JSON.stringify({ mode, id: run.id, boot, perf }));
  } catch (error) {
    receipt.status = 'failed'; receipt.error = error.stack; process.exitCode = 1; console.error(error);
  } finally {
    await context.close(); await browser.close();
  }
}
if (!receipt.status) receipt.status = 'passed';
writeFileSync(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
