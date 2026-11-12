#!/usr/bin/env node
/* Arte do card e da história do Flávio: captura REAL da cinemática de embarque no Chrome com GPU.
     BASE=http://127.0.0.1:9316 node tools/eval/lobby-flavio-captura.mjs
   Renderiza 2560×1440 com câmera fixa no meio da subida da escada e grava os dois webp
   referenciados por public/js/tp/flavio.js (a URL leva o hash do conteúdo via assetUrl). */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://127.0.0.1:9316';
const RAIZ = join(import.meta.dirname, '../..');
const DESTINO = join(RAIZ, 'public/img/mode-announcements');
const BRUTO = process.env.BRUTO || '/tmp/lobby-flavio/embarque-bruto.png';
const W = 2560, H = 1440;
/* câmera baixa à direita da escada: Flávio entra na porta a ~70% da largura */
const CAMERA = { p: [5, 1.4, 47.5], l: [3.2, 2.4, 52.2], fov: 48 };
const MEIO_DA_SUBIDA = 3.7;   // s da cinemática: WALK_END (flavio-boarding.js) é 5,4

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
try {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.route(/\.astro\/eval-vite|dev-toolbar/, (r) => r.fulfill({ contentType: 'text/javascript', body: 'export default {};' }));
  await page.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'high', allyBots: 5, enemyBots: 6, bots: 6, vol: 0, speech: false })));
  await page.goto(`${BASE}/?debug=1&auto=B,deputado&map=operacao_flavio&perfilauto=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(4000);
  const gpu = await page.evaluate(() => { const gl = window.__game.renderer.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info'); return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : '?'; });
  if (!/Apple|Metal/.test(gpu)) throw new Error(`perfil sem GPU Apple/Metal: ${gpu}`);
  /* vitória da escolta = cinemática "FLÁVIO FUGIU PROS EUA", o mesmo atalho de operacao-flavio-browser.mjs */
  await page.evaluate(() => { const g = window.__game; g._startRound(); g.state = 'live'; g.paused = false; g._endRound('B'); });
  await page.waitForFunction((t) => window.__game?.objective?._elapsedCinematic?.() >= t, MEIO_DA_SUBIDA, { timeout: 15000 });
  const r = await page.evaluate(({ c, W, H }) => {
    const g = window.__game, cam = g.camera, ren = g.renderer, ator = g.objective._boarding?.session?.actor;
    if (!ator?.group.visible) return { erro: 'Flávio da cinemática não está em cena' };
    const antes = { p: cam.position.clone(), q: cam.quaternion.clone(), aspect: cam.aspect, fov: cam.fov, pr: ren.getPixelRatio(), w: ren.domElement.clientWidth, h: ren.domElement.clientHeight };
    ren.setPixelRatio(1); ren.setSize(W, H, false);
    cam.position.set(...c.p); cam.fov = c.fov; cam.aspect = W / H; cam.updateProjectionMatrix(); cam.lookAt(...c.l);
    ren.render(g.scene, cam);
    const png = ren.domElement.toDataURL('image/png');
    ren.setPixelRatio(antes.pr); ren.setSize(antes.w, antes.h, false);
    cam.position.copy(antes.p); cam.quaternion.copy(antes.q); cam.aspect = antes.aspect; cam.fov = antes.fov; cam.updateProjectionMatrix();
    return { png, t: g.objective._elapsedCinematic(), ator: ator.group.getWorldPosition(ator.group.position.clone()).toArray() };
  }, { c: CAMERA, W, H });
  if (r.erro) throw new Error(r.erro);
  const bruto = Buffer.from(r.png.split(',')[1], 'base64');
  mkdirSync(join(BRUTO, '..'), { recursive: true });
  writeFileSync(BRUTO, bruto);
  /* gradação leve: contraste e cor um pouco acima, sem mexer na cena */
  const base = sharp(bruto).modulate({ saturation: 1.12, brightness: 1.02 }).linear(1.06, -6);
  await base.clone().resize(1920, 1080).webp({ quality: 82, effort: 6 }).toFile(join(DESTINO, 'flavio-embarque.webp'));
  console.log(`GPU ${gpu} · cinemática em ${r.t.toFixed(2)} s · Flávio em ${r.ator.map((n) => n.toFixed(2)).join(', ')} · bruto ${BRUTO}`);
} finally {
  await browser.close();
}
