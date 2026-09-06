import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const base = process.env.BASE || 'http://127.0.0.1:8148';
const out = 'artifacts/escadao-visual/hover-preview';
const dest = 'public/img/map-previews';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'high' })));
  await page.goto(`${base}/mapview.html?map=escadao&hud=0&capture=1`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForFunction(() => window.MAPEVAL?.ready, null, { timeout: 120000 });
  const props = await page.evaluate(async () => {
    const { ESCADAO_PROPS } = await import('/js/map_escadao.js');
    const { hasProp } = await import('/js/mapprops.js');
    return ESCADAO_PROPS.map(id => ({ id, loaded: hasProp(id) }));
  });
  if (errors.length || props.some(p => !p.loaded)) throw Error(JSON.stringify({ errors, props }));
  await page.evaluate(() => {
    window.previewPose = t => {
      const m = window.MAPEVAL, phase = t < 3 ? t / 3 : (t - 3) / 3;
      m.cam.fov = 65; m.cam.updateProjectionMatrix();
      if (t < 3) m.pose(0, window.__gworld.groundHeightAt(0, 13.8 - phase * 1.2) + 1.62, 13.8 - phase * 1.2, 0, .25, 70);
      else m.view([-.7 + phase * 1.4, 1.8, 25 - phase * 1.5], [0, 3, 14]);
    };
    window.previewPose(0);
  });
  const poster = await page.locator('canvas').screenshot();
  writeFileSync(`${out}/poster.png`, poster);
  await sharp(poster).resize(800, 600).jpeg({ quality: 86, mozjpeg: true }).toFile(`${dest}/escadao.jpg`);
  const bytes = await page.evaluate(async () => {
    const stream = window.MAPEVAL.renderer.domElement.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 2200000 });
    const parts = [], done = new Promise(resolve => { recorder.onstop = () => resolve(new Blob(parts)); });
    recorder.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    recorder.start();
    await new Promise(resolve => {
      const start = performance.now();
      function frame(now) {
        const t = Math.min((now - start) / 1000, 5.999);
        window.previewPose(t);
        if (now - start < 6000) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
    recorder.stop();
    const blob = await done;
    stream.getTracks().forEach(track => track.stop());
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  writeFileSync(`${out}/source.webm`, Buffer.from(bytes));
  execFileSync('/opt/homebrew/bin/ffmpeg', ['-y', '-i', `${out}/source.webm`, '-an', '-vf', 'scale=640:480', '-r', '24', '-t', '6', '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', `${dest}/escadao.webm`], { stdio: 'ignore' });
  const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
  const manifest = { escadao: { poster: `/img/map-previews/escadao.jpg?v=${hash(`${dest}/escadao.jpg`).slice(0, 12)}`,
    video: `/img/map-previews/escadao.webm?v=${hash(`${dest}/escadao.webm`).slice(0, 12)}`, seconds: 6,
    assets: Object.fromEntries([...props.map(p => `public/models/props/${p.id}.glb`), 'public/models/props/escadao_cat_r4.glb'].map(file => [file, hash(file)])),
    source: hash('public/js/map_escadao.js'), home: hash('public/js/map_escadao_home.js'), details: hash('public/js/map_escadao_details.js'), layout: hash('public/js/graffiti_layout.js') } };
  writeFileSync('public/js/map_preview_assets.js', `export const MAP_PREVIEWS = ${JSON.stringify(manifest, null, 2)};\n`);
  writeFileSync(`${out}/capture.json`, JSON.stringify({ manifest, props, errors, viewport: [960, 720], fov: { stairs: 70, street: 65 }, source: 'mapview: builder e GLBs reais; câmera editorial, sem HUD' }, null, 2));
  console.log(`Preview: ${readFileSync(`${dest}/escadao.jpg`).length} bytes JPG; ${readFileSync(`${dest}/escadao.webm`).length} bytes WebM`);
} finally { await browser.close(); }
