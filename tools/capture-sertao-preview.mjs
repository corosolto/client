// Prévia feita no mapa servido: PNGs reais, sem geração 2D. Recibo detecta fonte
// alterada depois da captura. Inspecionar frames e card antes de aceitar.
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import sharp from 'sharp';
const base = process.env.BASE || 'http://localhost:8149';
const out = 'artifacts/sertao-astra/preview-capture';
const dest = 'public/img/map-previews';
const frames = 144, fps = 24;
const sha = data => createHash('sha256').update(data).digest('hex');
mkdirSync(`${out}/frames`, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const sources = {}, errors = [], pending = [];
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => {
    const url = new URL(r.url()), file = `public${url.pathname}`;
    if (url.origin === new URL(base).origin && /\.(js|glb|webp|png|jpg)$/.test(url.pathname) && existsSync(file))
      pending.push(r.finished().then(() => { sources[file] = sha(readFileSync(file)); }));
  });
  await page.goto(`${base}/mapview.html?map=velho_oeste&hud=0&capture=1`);
  await page.waitForFunction(() => window.MAPEVAL?.ready && window.__gworld?.ambience?.ready, null, { timeout: 90000 });
  await page.waitForTimeout(6500);
  await page.evaluate(() => { __gworld.ambience.reset(); __gworld.faunaFlight?.reset(); });
  for (let i = 0; i < frames; i++) {
    await page.evaluate(({ i, frames, fps }) => {
      const t = i / fps, phase = i / frames * Math.PI * 2;
      __gworld.ambience.update(1 / fps, null);
      __gworld.update?.(1 / fps, t);
      MAPEVAL.cam.fov = 58; MAPEVAL.cam.updateProjectionMatrix();
      MAPEVAL.view([11 + Math.sin(phase) * 2, 6.5, 23 + (1 - Math.cos(phase)) * .65], [-3, 2.5, -10]);
    }, { i, frames, fps });
    await page.screenshot({ path: `${out}/frames/${String(i).padStart(4, '0')}.png` });
    if (i % 48 === 0) console.log(`frame ${i}/${frames}`);
  }
  await Promise.all(pending);
  if (errors.length) throw Error(errors.join('\n'));
} finally { await browser.close(); }
const poster = `${dest}/velho_oeste.jpg`, video = `${dest}/velho_oeste.mp4`;
if (existsSync(poster) && !existsSync(`${out}/before.jpg`)) copyFileSync(poster, `${out}/before.jpg`);
await sharp(`${out}/frames/0000.png`).resize(960, 640).jpeg({ quality: 88 }).toFile(poster);
execFileSync(process.env.FFMPEG || 'ffmpeg', ['-y', '-framerate', String(fps), '-i', `${out}/frames/%04d.png`, '-vf', 'scale=960:640', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', video], { stdio: ['ignore', 'ignore', 'pipe'] });
const media = Object.fromEntries(Object.entries({ poster, video }).map(([key, path]) => [key, { path, bytes: readFileSync(path).length, sha256: sha(readFileSync(path)) }]));
const receipt = { kind: 'webgl-map-capture', map: 'velho_oeste', capturedAt: new Date().toISOString(), viewport: { width: 1536, height: 1024 }, output: { width: 960, height: 640, fps, frames, seconds: frames / fps }, camera: { fov: 58, from: [11, 6.5, 23], look: [-3, 2.5, -10], motion: 'small closed orbit, radiusX 2m/radiusZ .65m' }, command: 'BASE=http://localhost:8149 node tools/capture-sertao-preview.mjs', sources, media, errors };
writeFileSync(`${dest}/velho_oeste.capture.json`, JSON.stringify(receipt, null, 2) + '\n');
writeFileSync('public/js/sertao_preview_media.js', `export const SERTAO_PREVIEW = Object.freeze(${JSON.stringify({ poster: media.poster.sha256.slice(0, 12), video: media.video.sha256.slice(0, 12) })});\n`);
console.log(JSON.stringify(media));
