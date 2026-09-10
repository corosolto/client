// Captura de auditoria do Joá no jogo real: 1536x1024 (3:2), câmera fixa e sem HUD.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const globalRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${globalRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const out = process.argv[2] || 'artifacts/joa-recuperacao/runtime-3x2';
const base = process.env.BASE || 'http://127.0.0.1:4321';
const quality = process.env.QUALITY || 'med';
if (!['low', 'med', 'high'].includes(quality)) throw new Error(`QUALITY inválida: ${quality}`);
const source = readFileSync('public/js/map_mansao.js');
const sourceSHA256 = createHash('sha256').update(source).digest('hex');
const cameras = [
  { name: 'jardim-spawn', pos: [0, 1.65, 32], target: [0, 2, 4] },
  { name: 'fachada', pos: [-10, 1.65, 22], target: [1, 2.2, 1] },
  { name: 'sala', pos: [-10, 1.65, 2], target: [3, 2, -9] },
  { name: 'mezanino', pos: [8, 6.15, -11], target: [0, 5.4, -11] },
  { name: 'piscina', pos: [0, 1.65, -22], target: [0, -.2, -40] },
  { name: 'praia', pos: [15, 1.65, -34], target: [0, -.8, -49] },
  { name: 'escada-servico', pos: [17, 1.65, -5], target: [13, 3, -14] },
  { name: 'overview', pos: [30, 24, 44], target: [0, 1, -1] },
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--mute-audio'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
  const errors = [], failedHTTP = [], assets = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    const pathname = new URL(r.url()).pathname;
    if (/\.(glb|webp|jpg|png)(\?|$)/.test(r.url())) assets.push({ path: pathname, status: r.status() });
    if (r.status() >= 400 && !pathname.startsWith('/api/') && !pathname.startsWith('/audio/'))
      failedHTTP.push({ path: pathname, status: r.status() });
  });
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  await page.addInitScript((quality) => localStorage.setItem('awpbr_settings', JSON.stringify({ quality, bots: 4, vol: 0, speech: false })), quality);
  await page.goto(`${base}/?debug=1&auto=P,mst&map=mansao&perfilauto=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live' || !document.getElementById('launch-error')?.classList.contains('hidden'), null, { timeout: 240000 });
  await page.waitForTimeout(2500);
  if (await page.locator('#launch-error').isVisible()) throw new Error('captura inválida: launch-error visível');
  const performanceSample = await page.evaluate(async () => {
    const samples = [];
    await new Promise((resolve) => {
      let previous = performance.now();
      const frame = (now) => {
        samples.push(now - previous); previous = now;
        if (samples.length >= 180) resolve(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    samples.sort((a, b) => a - b);
    const percentile = (p) => samples[Math.min(samples.length - 1, Math.floor(samples.length * p))];
    const g = window.__game;
    return {
      frames: samples.length,
      frameMsP50: percentile(.50),
      frameMsP95: percentile(.95),
      frameMsMax: samples.at(-1),
      usedJSHeapSize: performance.memory?.usedJSHeapSize || null,
      renderer: { render: { ...g.renderer.info.render }, memory: { ...g.renderer.info.memory }, programs: g.renderer.info.programs.length },
    };
  });
  const gameplayFile = `${out}/gameplay-live.png`;
  await page.screenshot({ path: gameplayFile });
  const gameplayBytes = readFileSync(gameplayFile);
  const gameplay = { path: gameplayFile, bytes: gameplayBytes.length, sha256: createHash('sha256').update(gameplayBytes).digest('hex') };
  const planeBefore = await page.evaluate(() => {
    const plane = window.__game?.world?.ambience?.extraAnimals?.find((animal) => animal.type === 'plane');
    return plane ? { position: plane.root.position.toArray(), source: plane.source } : null;
  });
  await page.waitForTimeout(850);
  const plane = await page.evaluate((before) => {
    const animal = window.__game?.world?.ambience?.extraAnimals?.find((candidate) => candidate.type === 'plane');
    if (!animal) return null;
    let faixa = null;
    animal.model?.traverse((object) => { if (!faixa && object.userData?.faixaPintada) faixa = object; });
    const position = animal.root.position.toArray();
    return {
      id: animal.id,
      source: animal.source,
      position,
      moved: before ? Math.hypot(...position.map((value, index) => value - before.position[index])) : 0,
      faixaPintada: Boolean(faixa),
      faixaTexture: faixa?.material?.map?.source?.data?.currentSrc || faixa?.material?.map?.source?.data?.src || null,
    };
  }, planeBefore);
  if (!plane || plane.source !== 'gltf' || plane.moved <= 0.05 || !plane.faixaPintada)
    throw new Error(`avião/faixa sem prova de runtime: ${JSON.stringify(plane)}`);
  const setup = await page.evaluate(() => {
    const g = window.__game;
    const hide = (o) => { try { Object.defineProperty(o, 'visible', { get: () => false, set: () => {}, configurable: true }); } catch {} };
    for (const b of g.bots || []) if (b.mesh?.group) hide(b.mesh.group);
    for (const d of g.drops || []) if (d.mesh) hide(d.mesh);
    if (g.vmScene) g.vmScene.visible = false;
    g.update = function captureFrame() { this.scene.updateMatrixWorld(true); this.renderer.render(this.scene, this.camera); };
    return {
      map: g._mapId,
      state: g.state,
      ctf: g.ctf,
      teamCount: g.teamCount,
      ctfPoints: g.ctfPts.map((p) => ({ id: p.id, x: p.x, y: p.y, z: p.z })),
      renderer: g.renderer.getContext().getParameter(g.renderer.getContext().RENDERER),
    };
  });
  await page.addStyleTag({ content: '#hud,#debug-panel,#launch-error{display:none!important} astro-dev-toolbar{display:none!important}' });

  const allCameras = [...cameras, {
    name: 'aviao-faixa',
    pos: [plane.position[0] + 15, plane.position[1] + 4, plane.position[2] + 14],
    target: plane.position,
  }];
  const rendered = [];
  for (const camera of allCameras) {
    const stats = await page.evaluate((camera) => {
      const g = window.__game, r = g.renderer;
      g.camera.position.set(...camera.pos);
      g.camera.lookAt(...camera.target);
      g.camera.updateMatrixWorld(true);
      r.info.autoReset = false; r.info.reset(); r.render(g.scene, g.camera);
      const stats = { ...r.info.render, memory: { ...r.info.memory }, programs: r.info.programs.length };
      r.info.autoReset = true;
      return stats;
    }, camera);
    await page.waitForTimeout(250);
    const file = `${out}/${camera.name}.png`;
    await page.screenshot({ path: file });
    const bytes = readFileSync(file);
    rendered.push({ ...camera, ...stats, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const missingCoreAssets = failedHTTP.filter(({ path }) => /^(\/js\/|\/models\/|\/img\/textures\/|\/img\/map-previews\/mansao\.)/.test(path));
  const requiredRuntimeAssets = ['/models/props/aviao_faixa.glb', '/img/textures/faixa_aviao.webp'];
  const absentRuntimeAssets = requiredRuntimeAssets.filter((path) => !assets.some((asset) => asset.path === path && asset.status >= 200 && asset.status < 300));
  const receipt = { viewport: [1536, 1024], aspect: '3:2', quality, sourceSHA256, setup, performanceSample, gameplay, plane, cameras: rendered, errors, failedHTTP, missingCoreAssets, absentRuntimeAssets, assets };
  writeFileSync(`${out}/capture.json`, JSON.stringify(receipt, null, 2));
  if (errors.length || missingCoreAssets.length || absentRuntimeAssets.length)
    throw new Error(`${errors.length} pageerror(s), ${missingCoreAssets.length} asset(s) essencial(is) ausente(s), ${absentRuntimeAssets.length} asset(s) de runtime sem recibo`);
  console.log(`JOA CAPTURA 3:2: gameplay final + ${rendered.length} vistas · avião GLB/faixa aplicados e em movimento · p95 ${performanceSample.frameMsP95.toFixed(2)} ms · ${out} · 0 pageerror · 0 asset essencial ausente · ${failedHTTP.length} 404 herdado(s) registrado(s)`);
} finally {
  await browser.close();
}
