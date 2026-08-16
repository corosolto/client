// Sonda de metricas GL — mede calls/triangles REAIS por frame (soma de todos os passes
// do composer, que zera info.render a cada renderer.render()), + memoria e heap.
// Uso: node tools/eval/gl-metrics.mjs <outJson>   (ONLY=<mapa,mapa> filtra)
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/root/shots/r2/_metrics-draw.json';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio', '--no-sandbox'],
});
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const MAPS = [
  ['praca_poderes', 'P,mst'],
  ['piscina_treta', 'P,mst'],
  ['loja_h', 'B,bozo'],
  ['ferro_velho', 'B,bozo'],
].filter(x => !ONLY || ONLY.includes(x[0]));

const out = [];
for (const [map, auto] of MAPS) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push('[pageerror] ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
  const t0 = Date.now();
  let rec = { map, errs: [] };
  try {
    await page.goto(`${BASE}/?debug=1&map=${map}&auto=${auto}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 900000 });
    rec.tLive = +((Date.now() - t0) / 1000).toFixed(1);
    await page.waitForTimeout(30000);   // 30s de jogo
    const m = await page.evaluate(() => new Promise((res) => {
      const g = window.__game, r = g && g.renderer;
      if (!r) return res({ err: 'sem renderer' });
      const F = 10;
      r.info.autoReset = false;
      r.info.reset();
      let n = 0;
      const t = performance.now();
      (function tick() {
        if (++n >= F) {
          const i = r.info, ms = (performance.now() - t) / F;
          const o = {
            calls: Math.round(i.render.calls / F),
            tris: Math.round(i.render.triangles / F),
            textures: i.memory.textures,
            geometries: i.memory.geometries,
            programs: i.programs ? i.programs.length : null,
            fps: +(1000 / ms).toFixed(1),
            heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
            state: g.state,
          };
          r.info.autoReset = true;
          return res(o);
        }
        requestAnimationFrame(tick);
      })();
    }));
    Object.assign(rec, m);
    // SHOTS=<dir> reaproveita a carga pra preencher capturas 169 que faltaram na bateria
    if (process.env.SHOTS) {
      for (let i = 0; i <= 3; i++) {
        if (i) {
          await page.evaluate((k) => { const g = window.__game; if (g && g.player) { g.player.yaw = (g.player.yaw || 0) + k * 1.6; } }, i);
          await page.waitForTimeout(1500);
        }
        await page.screenshot({ path: `${process.env.SHOTS}/game-${map}-169-${'abcd'[i]}.png`, timeout: 120000 });
      }
    }
  } catch (e) { rec.fatal = e.message.split('\n')[0]; }
  rec.errs = errs;
  out.push(rec);
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log('[draw] ' + JSON.stringify({ ...rec, errs: errs.length }));
  await page.close();
}
await browser.close();
