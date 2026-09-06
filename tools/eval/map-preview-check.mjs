// Pedido do dono: prévia real, vídeo apenas no hover. Contraprovas no DOM servido,
// sem aprovar ilustração pelo nome do arquivo: recibo liga fonte, mídia e hashes.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
const base = process.env.BASE || 'http://localhost:8149';
const out = process.env.ARTIFACT_DIR || 'artifacts/sertao-astra/preview';
const mut = process.argv.find(x => x.startsWith('--mutante='))?.split('=')[1];
const expected = { ilustracao: ['PV1'], autoplay: ['PV2'], congelado: ['PV3'], 'sem-saida': ['PV4'], 'sem-pausa': ['PV4', 'PV5'], 'movimento-reduzido': ['PV5'], 'astro-cru': ['PV6'] };
if (mut && !expected[mut]) throw Error('Mutante desconhecido');
mkdirSync(out, { recursive: true });
const checks = [], sha = x => createHash('sha256').update(x).digest('hex');
const check = (id, ok, detail) => checks.push({ id, ok: !!ok, detail });
let meta;
try {
  meta = JSON.parse(readFileSync('public/img/map-previews/velho_oeste.capture.json'));
  if (mut === 'ilustracao') meta.media.poster.sha256 = 'ilustracao';
  const valid = meta.kind === 'webgl-map-capture' && meta.viewport.width / meta.viewport.height === 1.5 &&
    Object.entries(meta.sources).every(([file, hash]) => sha(readFileSync(file)) === hash) &&
    Object.values(meta.media).every(v => sha(readFileSync(v.path)) === v.sha256);
  check('PV1', valid, 'Fonte e bytes da captura real precisam corresponder ao recibo.');
} catch (e) { check('PV1', false, e.message); }
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  if (mut === 'sem-saida') await page.route('**/js/map_preview.js*', async route => {
    const response = await route.fetch(), source = await response.text();
    const body = source.replace("host.addEventListener('pointerleave', stop);", '');
    if (source === body) throw Error('Mutante não aplicou');
    await route.fulfill({ response, body });
  });
  const requests = [], errors = [];
  page.on('request', r => { if (/map-previews\/.*\.mp4/.test(r.url())) requests.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?tela=maps&map=velho_oeste&lang=pt`);
  const card = page.locator('.ms-thumb[data-id="velho_oeste"]');
  await card.waitFor({ timeout: 90000 });
  await card.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  if (mut === 'autoplay') await card.dispatchEvent('pointerenter', { pointerType: 'mouse' });
  await page.waitForTimeout(700);
  const poster = await card.locator('img').evaluate(img => ({ loaded: img.complete && img.naturalWidth > 0, src: img.currentSrc }));
  check('PV2', poster.loaded && requests.length === 0, { poster, videoRequests: requests.length });
  await card.hover();
  const video = card.locator('video');
  let started = false;
  try { await page.waitForFunction(() => {
    const v = document.querySelector('.ms-thumb[data-id="velho_oeste"] video');
    return v && !v.paused && v.currentTime > .1;
  }, null, { timeout: 8000 }); started = true; } catch {}
  if (started && mut === 'congelado') await video.evaluate(v => v.pause());
  const sample = async () => video.count().then(n => n ? video.evaluate(v => ({ time: v.currentTime, muted: v.muted, width: v.videoWidth, paused: v.paused })) : null);
  const first = await sample(); await page.waitForTimeout(400); const second = await sample();
  check('PV3', started && first?.muted && second?.time !== first?.time && second?.width > 0, { first, second });
  await page.screenshot({ path: `${out}/menu-hover${mut ? `-${mut}` : ''}.png` });
  if (started && mut === 'sem-pausa') await video.evaluate(v => { v.pause = () => {}; });
  await page.mouse.move(0, 0); await page.waitForTimeout(200);
  check('PV4', !started || await video.evaluate(v => v.paused && !v.classList.contains('playing')), await sample());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (mut === 'movimento-reduzido') await page.evaluate(() => {
    const original = window.matchMedia;
    window.matchMedia = q => q.includes('prefers-reduced-motion') ? { matches: false } : original.call(window, q);
  });
  await card.hover(); await page.waitForTimeout(500);
  check('PV5', !started || await video.evaluate(v => v.paused), await sample());
  if (mut === 'astro-cru') await page.evaluate(() => document.querySelector('#team-select').append('{FACTIONS.map((f,index) => ('));
  check('PV6', !/\{FACTIONS\.map|String\(index \+ 1\)/.test(await page.locator('#team-select').textContent()) && errors.length === 0, { errors });
} finally { await browser.close(); }
const failed = checks.filter(c => !c.ok).map(c => c.id);
writeFileSync(`${out}/report${mut ? `-${mut}` : ''}.json`, JSON.stringify({ mut, checks, failed }, null, 2));
console.log(JSON.stringify({ mut, checks, failed }, null, 2));
process.exitCode = mut ? +(JSON.stringify(failed) !== JSON.stringify(expected[mut])) : +!!failed.length;
