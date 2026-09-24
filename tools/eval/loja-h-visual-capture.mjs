// Captura da Loja H no jogo real: 5x5 em 3:2 ou 8x8 em 16:9, com recibo WebGL.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const aspect = process.env.ASPECT || '3:2';
const viewport = { '3:2': { width: 1536, height: 1024 }, '16:9': { width: 1600, height: 900 } }[aspect];
if (!viewport) throw new Error(`ASPECT inválido: ${aspect}`);
const bots = Number(process.env.BOTS || (aspect === '3:2' ? 5 : 8));
const base = process.env.BASE || 'http://127.0.0.1:8195';
const out = process.argv[2] || `artifacts/loja-h-estrutura-r1/${aspect.replace(':', 'x')}-${bots}x${bots}`;
const sourceSHA256 = createHash('sha256').update(readFileSync('public/js/map_havan.js')).digest('hex');
const cameras = [
  { name: 'patio-e-fachada', pos: [0, 4.2, 43], target: [0, 1.9, -9] },
  { name: 'porta-oeste', pos: [-29, 2.2, 8], target: [-21.8, 2.1, -7] },
  { name: 'loja-e-tres-descidas', pos: [0, 1.7, -12], target: [0, 3.2, -29] },
  { name: 'spawn-e-saida-central', pos: [0, 5.0, -39], target: [0, 4.2, -30] },
  { name: 'mezanino-oeste', pos: [-12.5, 5.0, -38], target: [-8.8, 3.5, -27] },
  { name: 'overview', pos: [43, 34, 55], target: [0, 1.5, 0] },
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--mute-audio'],
});
try {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [], failedHTTP = [], assets = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    const u = new URL(r.url()), rec = { path: u.pathname, status: r.status() };
    if (/\.(glb|webp|png|jpe?g)$/.test(u.pathname)) assets.push(rec);
    if (r.status() >= 400 && !u.pathname.startsWith('/api/') && !u.pathname.startsWith('/audio/')) failedHTTP.push(rec);
  });
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(u.hostname) || u.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  await page.addInitScript(({ bots }) => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', bots, vol: 0, speech: false })), { bots });
  await page.goto(`${base}/?debug=1&auto=B,coach&map=loja_h&perfilauto=0&ctf=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live' || !document.getElementById('launch-error')?.classList.contains('hidden'), null, { timeout: 240000 });
  await page.waitForTimeout(3000);
  if (await page.locator('#launch-error').isVisible()) throw new Error('launch-error visível');

  const performanceSample = await page.evaluate(async () => {
    const values = [];
    await new Promise((resolve) => {
      let before = performance.now();
      const tick = (now) => { values.push(now - before); before = now; values.length >= 240 ? resolve() : requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    values.sort((a, b) => a - b);
    const q = (p) => values[Math.min(values.length - 1, Math.floor(values.length * p))];
    const g = window.__game, gl = g.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      frames: values.length, p50: q(.50), p95: q(.95), max: values.at(-1),
      renderer: { render: { ...g.renderer.info.render }, memory: { ...g.renderer.info.memory }, programs: g.renderer.info.programs.length },
      webgl: {
        version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(gl.RENDERER),
        unmaskedRenderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
        webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext,
      },
      state: g.state, teamCount: g.teamCount, ctfPoints: g.ctfPts.length,
    };
  });
  const gameplay = `${out}/gameplay-live.png`;
  await page.screenshot({ path: gameplay, timeout: 120000 });

  const setup = await page.evaluate(() => {
    const g = window.__game;
    for (const b of g.bots || []) if (b.mesh?.group) b.mesh.group.visible = false;
    for (const d of g.drops || []) if (d.mesh) d.mesh.visible = false;
    if (g.vmScene) g.vmScene.visible = false;
    g.update = function captureFrame() { this.scene.updateMatrixWorld(true); this.renderer.render(this.scene, this.camera); };
    return {
      map: g._mapId, state: g.state, bots: g.bots.length,
      stairs: g.world.stairs.map((s) => s.nome), doors: g.world.doors.map((d) => ({ x: d.x, z: d.z })),
      nodes: g.world.waypoints.nodes.length, ctf: g.world.ctfPoints.map((p) => p.id),
    };
  });
  await page.addStyleTag({ content: '#hud,#debug-panel,#launch-error{display:none!important} astro-dev-toolbar{display:none!important}' });
  const shots = [];
  for (const camera of cameras) {
    const render = await page.evaluate((c) => {
      const g = window.__game, r = g.renderer;
      g.camera.position.set(...c.pos); g.camera.lookAt(...c.target); g.camera.updateMatrixWorld(true);
      r.info.autoReset = false; r.info.reset(); r.render(g.scene, g.camera);
      const value = { ...r.info.render, memory: { ...r.info.memory }, programs: r.info.programs.length };
      r.info.autoReset = true; return value;
    }, camera);
    await page.waitForTimeout(180);
    const file = `${out}/${camera.name}.png`;
    await page.screenshot({ path: file, timeout: 120000 });
    const bytes = readFileSync(file);
    shots.push({ ...camera, render, path: file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const missingCoreAssets = failedHTTP.filter((r) => /^\/(js|models)\//.test(r.path)
    || /^\/img\/(textures|map-previews\/loja_h\.)/.test(r.path));
  const software = /swiftshader|llvmpipe|software/i.test(performanceSample.webgl.unmaskedRenderer || performanceSample.webgl.renderer || '');
  const receipt = { sourceSHA256, aspect, viewport, bots, base, setup, performanceSample, gameplay, cameras: shots, errors, failedHTTP, missingCoreAssets, assets };
  writeFileSync(`${out}/capture.json`, JSON.stringify(receipt, null, 2) + '\n');
  if (errors.length || missingCoreAssets.length || !performanceSample.webgl.webgl2 || software)
    throw new Error(`captura inválida: errors=${errors.length}, assets=${missingCoreAssets.length}, webgl2=${performanceSample.webgl.webgl2}, software=${software}`);
  console.log(`LOJA H ${aspect} ${bots}x${bots}: ${shots.length + 1} capturas, WebGL2 real, p50=${performanceSample.p50.toFixed(1)} p95=${performanceSample.p95.toFixed(1)} max=${performanceSample.max.toFixed(1)} ms, ${out}`);
} finally { await browser.close(); }
