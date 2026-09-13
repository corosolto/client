#!/usr/bin/env node
// Prévia de hover do Joá gravada do mapa servido: pixels do próprio jogo, sem
// geração 2D e sem HUD (captureStream sai do canvas WebGL, não da página).
// Recibo guarda câmera, hashes das fontes e SHA-256 das mídias — fonte alterada
// depois da captura fica detectável. Inspecionar o vídeo antes de aceitar.
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.BASE || 'http://127.0.0.1:4321';
const out = process.env.OUT || 'artifacts/mansao-hover';
const seconds = Number(process.env.SECONDS || 12);
const fps = 24;
const camera = { from: [26, 18, 40], target: [0, 0, -6], fov: 57, arco: 0.16, sobe: 1.4 };
const sha = data => createHash('sha256').update(data).digest('hex');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const sources = {}, errors = [], pending = [];
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => {
    const url = new URL(r.url()), file = `public${url.pathname}`;
    if (url.origin === new URL(base).origin && /\.(js|glb|webp|png|jpg)$/.test(url.pathname) && fs.existsSync(file))
      pending.push(r.finished().then(() => { sources[file] = sha(fs.readFileSync(file)); }));
  });
  await page.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', bots: 0, vol: 0, speech: false })));
  await page.goto(`${base}/?debug=1&auto=P,mst&map=mansao&perfilauto=0`);
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(3000);
  const recorded = await page.evaluate(async ({ camera, seconds, fps }) => {
    const g = window.__game;
    if (g._mapId !== 'mansao') throw Error(`Mapa errado: ${g._mapId}`);
    g.paused = true;
    if (g.vmScene) g.vmScene.visible = false;
    if (g.vm?.root) g.vm.root.visible = false;
    for (const bot of g.bots) bot.mesh.visible = false;
    if (g.player?.mesh) g.player.mesh.visible = false;
    g.renderer.setSize(960, 640, false);
    g.camera.aspect = 1.5; g.camera.fov = camera.fov; g.camera.updateProjectionMatrix();
    const raio = Math.hypot(camera.from[0], camera.from[2] - camera.target[2]);
    const base = Math.atan2(camera.from[0], camera.from[2] - camera.target[2]);
    // Arco lento e fechado: o card é pequeno, movimento grande vira tremor.
    const render = t => {
      const fase = t / seconds * Math.PI * 2, ang = base + camera.arco * Math.sin(fase);
      g.camera.position.set(
        camera.target[0] + Math.sin(ang) * raio,
        camera.from[1] + camera.sobe * (1 - Math.cos(fase)) / 2,
        camera.target[2] + Math.cos(ang) * raio,
      );
      g.camera.lookAt(...camera.target); g.camera.updateMatrixWorld(true);
      if (g.world.ambience) { g.world.ambience.paused = false; g.world.ambience.update(1 / fps, g.player.pos); }
      g.world.update?.(1 / fps, t);           // água do Joá vive aqui: sem isso a onda congela
      g.renderer.render(g.scene, g.camera);
    };
    render(0);
    const poster = g.renderer.domElement.toDataURL('image/jpeg', 0.91);
    const stream = g.renderer.domElement.captureStream(fps), chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 1600000 });
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start();
    const inicio = performance.now();
    await new Promise(resolve => {
      function frame() {
        const t = (performance.now() - inicio) / 1000;
        render(Math.min(t, seconds));
        if (t < seconds) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
    recorder.stop(); await done; stream.getTracks().forEach(t => t.stop());
    return {
      poster, video: Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())),
      map: g._mapId, quality: g.settings.quality,
      ambiencia: g.world.ambience?.debugSnapshot?.() ?? null,
    };
  }, { camera, seconds, fps });
  await Promise.all(pending);

  fs.mkdirSync('public/video/map-previews', { recursive: true });
  const video = 'public/video/map-previews/mansao.webm';
  const posterNovo = `${out}/poster-capturado.jpg`;
  fs.writeFileSync(video, Buffer.from(recorded.video));
  fs.writeFileSync(posterNovo, Buffer.from(recorded.poster.split(',')[1], 'base64'));
  if (process.env.POSTER === '1') fs.writeFileSync('public/img/map-previews/mansao.jpg', fs.readFileSync(posterNovo));
  const recibo = {
    kind: 'webgl-map-capture', map: 'mansao', capturedAt: new Date().toISOString(),
    viewport: { width: 960, height: 640 }, output: { width: 960, height: 640, fps, seconds },
    camera, quality: recorded.quality, ambiencia: recorded.ambiencia,
    command: `BASE=${base} node tools/eval/mansao-preview-capture.mjs`,
    media: { video: { path: video, bytes: recorded.video.length, sha256: sha(Buffer.from(recorded.video)) } },
    sources, errors,
  };
  fs.writeFileSync('public/video/map-previews/mansao.capture.json', JSON.stringify(recibo, null, 2) + '\n');
  console.log(JSON.stringify({ video, bytes: recorded.video.length, quality: recorded.quality, errors }));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
