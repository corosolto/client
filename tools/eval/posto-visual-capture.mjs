// Captura WebGL real do Posto em 3:2/5x5 ou 16:9/8x8, com câmeras fixas.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const globalRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${globalRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const aspect = process.env.ASPECT || '3:2';
const viewport = { '3:2': { width: 1536, height: 1024 }, '16:9': { width: 1600, height: 900 } }[aspect];
if (!viewport) throw new Error(`ASPECT inválido: ${aspect}`);
const bots = Number(process.env.BOTS || (aspect === '3:2' ? 5 : 8));
const base = process.env.BASE || 'http://127.0.0.1:8188';
const out = process.argv[2] || `artifacts/posto-tatico-r3/runtime-${aspect.replace(':', 'x')}`;
const cameras = [
  { name: 'spawn-e', pos: [-6, 1.65, -31], target: [1, 1.6, -4] },
  { name: 'loja-caixa', pos: [-10, 1.65, -2], target: [-21, 1.5, 0] },
  { name: 'bombas-cobertura', pos: [0, 1.65, -14], target: [4, 1.7, 0] },
  { name: 'rota-rodovia', pos: [22, 1.65, -17], target: [8, 1.4, 0] },
  { name: 'overview', pos: [38, 27, 46], target: [0, 1, 0] },
];

mkdirSync(out, { recursive: true });
const sourceSHA256 = createHash('sha256').update(readFileSync('public/js/map_posto.js')).digest('hex');
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--mute-audio'],
});

try {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [], failedHTTP = [], assets = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    const pathname = new URL(r.url()).pathname;
    if (/\.(glb|webp|jpg|png)$/.test(pathname)) assets.push({ path: pathname, status: r.status() });
    if (r.status() >= 400 && !pathname.startsWith('/api/') && !pathname.startsWith('/audio/')) failedHTTP.push({ path: pathname, status: r.status() });
  });
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  await page.addInitScript(({ bots }) => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', bots, vol: 0, speech: false })), { bots });
  await page.goto(`${base}/?debug=1&auto=P,mst&map=posto_treta&perfilauto=0&ctf=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live' || !document.getElementById('launch-error')?.classList.contains('hidden'), null, { timeout: 240000 });
  await page.waitForTimeout(3500);
  if (await page.locator('#launch-error').isVisible()) throw new Error('launch-error visível');

  const performanceSample = await page.evaluate(async () => {
    const samples = [];
    await new Promise((resolve) => {
      let previous = performance.now();
      const frame = (now) => { samples.push(now - previous); previous = now; samples.length >= 240 ? resolve() : requestAnimationFrame(frame); };
      requestAnimationFrame(frame);
    });
    samples.sort((a, b) => a - b);
    const at = (p) => samples[Math.min(samples.length - 1, Math.floor(samples.length * p))];
    const g = window.__game;
    return { frames: samples.length, frameMsP50: at(.5), frameMsP95: at(.95), frameMsMax: samples.at(-1), render: { ...g.renderer.info.render }, memory: { ...g.renderer.info.memory }, programs: g.renderer.info.programs.length };
  });
  const setup = await page.evaluate(() => {
    const g = window.__game, gl = g.renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const hide = (o) => { try { Object.defineProperty(o, 'visible', { get: () => false, set: () => {}, configurable: true }); } catch {} };
    for (const bot of g.bots || []) if (bot.mesh?.group) hide(bot.mesh.group);
    for (const drop of g.drops || []) if (drop.mesh) hide(drop.mesh);
    for (const smoke of g._smokes || []) g.scene.remove(smoke.group);
    for (const grenade of g._grenades || []) g.scene.remove(grenade.mesh);
    g._smokes = []; g._grenades = [];
    if (g.vmScene) g.vmScene.visible = false;
    g.update = function captureFrame() { this.scene.updateMatrixWorld(true); this.renderer.render(this.scene, this.camera); };
    return {
      map: g._mapId, state: g.state, ctf: g.ctf, teamCount: g.teamCount,
      tacticalRoutes: g.world.tacticalRoutes,
      webgl: { webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext, renderer: gl.getParameter(gl.RENDERER), unmaskedRenderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null },
    };
  });
  await page.addStyleTag({ content: '#hud,#debug-panel,#launch-error{display:none!important} astro-dev-toolbar{display:none!important}' });
  const rendered = [];
  for (const camera of cameras) {
    const stats = await page.evaluate((camera) => {
      const g = window.__game, r = g.renderer;
      g.camera.position.set(...camera.pos); g.camera.lookAt(...camera.target); g.camera.updateMatrixWorld(true);
      r.info.autoReset = false; r.info.reset(); r.render(g.scene, g.camera);
      const result = { ...r.info.render, memory: { ...r.info.memory }, programs: r.info.programs.length };
      r.info.autoReset = true; return result;
    }, camera);
    await page.waitForTimeout(250);
    const file = `${out}/${camera.name}.png`;
    await page.screenshot({ path: file });
    const bytes = readFileSync(file);
    rendered.push({ ...camera, ...stats, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const required = ['/models/props/bombas_combustivel.glb', '/models/props/loja_conveniencia.glb'];
  const absentAssets = required.filter((path) => !assets.some((a) => a.path === path && a.status >= 200 && a.status < 300));
  const software = /swiftshader|llvmpipe|software/i.test(setup.webgl.unmaskedRenderer || setup.webgl.renderer || '');
  const frameBudget = performanceSample.frameMsP95 <= 20 && performanceSample.frameMsMax <= 50;
  const receipt = { viewport: [viewport.width, viewport.height], aspect, bots, sourceSHA256, setup, performanceSample, cameras: rendered, errors, failedHTTP, absentAssets, assets };
  writeFileSync(`${out}/capture.json`, JSON.stringify(receipt, null, 2));
  const teamsReady = setup.teamCount?.E === bots && setup.teamCount?.B === bots;
  if (errors.length || absentAssets.length || !setup.webgl.webgl2 || software || setup.map !== 'posto_treta' || !teamsReady || !frameBudget) throw new Error(JSON.stringify({ errors, absentAssets, webgl: setup.webgl, map: setup.map, teamCount: setup.teamCount, performanceSample }));
  console.log(`POSTO WEBGL ${aspect} ${bots}x${bots}: ${rendered.length} câmeras · p95 ${performanceSample.frameMsP95.toFixed(2)} ms · ${out}`);
} finally {
  await browser.close();
}
