// G2-R6A: observação QUANTITATIVA dos bots por 45s — amostra posição/yaw a cada 150ms e
// mede: (1) reversões de velocidade LATERAL (zigzag "anda pro lado e pro outro"),
// (2) reversões de velocidade frontal, (3) eficiência de deslocamento (path/net),
// (4) oscilação de alvo CTF (trocas de ctfPt). + 6 screenshots. Uso:
//   node tools/eval/aposentados/g2r6-bots.mjs <mapId> <outPrefix> [segundos]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const MAP = process.argv[2] || 'praca_poderes';
const PREFIX = process.argv[3] || '/tmp/gauntlet/g2r6-bots-br';
const SECS = parseFloat(process.argv[4] || '45');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1512, height: 982 }, deviceScaleFactor: 2 });
let errors = 0;
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=${MAP}`, { waitUntil: 'load' });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 180000 });
await page.waitForTimeout(500);
// Player fora do combate (os bots não o veem nem morrem pra ele): teleporta e esconde.
await page.evaluate(() => {
  const g = window.__game;
  g.player.hp = 1e9; g.player.pos.set(0, -80, 0);
  g.__track = [];
  g.__ctfSw = [];
  g.__t0 = g.time;
  for (const b of g.bots) { b.__lastCtf = b.ctfPt; b.__ctfSwitches = 0; }
});
// sampler no page: roda no rAF do jogo
await page.evaluate(() => {
  const g = window.__game;
  g.__sampler = setInterval(() => {
    const t = g.time;
    for (const b of g.bots) {
      if (!b.alive) continue;
      g.__track.push({ id: g.bots.indexOf(b), t, x: b.pos.x, z: b.pos.z, yaw: b.yaw, tgt: !!b.target, ctf: b.ctfPt });
      if (b.ctfPt !== b.__lastCtf) { b.__ctfSwitches++; b.__lastCtf = b.ctfPt; }
    }
  }, 150);
});
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(SECS * 1000 / 6);
  await page.screenshot({ path: `${PREFIX}-${i}.png` });
}
const stats = await page.evaluate(() => {
  const g = window.__game;
  clearInterval(g.__sampler);
  const tr = g.__track, out = {};
  const byId = {};
  for (const s of tr) (byId[s.id] || (byId[s.id] = [])).push(s);
  for (const id in byId) {
    const a = byId[id];
    let latFlip = 0, fwdFlip = 0, path = 0, lastLat = 0, lastFwd = 0, tgtFrames = 0;
    for (let i = 1; i < a.length; i++) {
      const dt = a[i].t - a[i - 1].t; if (dt <= 0) continue;
      const mx = (a[i].x - a[i - 1].x) / dt, mz = (a[i].z - a[i - 1].z) / dt;
      const sy = Math.sin(a[i].yaw), cy = Math.cos(a[i].yaw);
      const fwd = mx * sy + mz * cy, lat = mx * cy - mz * sy;
      path += Math.hypot(a[i].x - a[i - 1].x, a[i].z - a[i - 1].z);
      if (Math.abs(lat) > 0.25 && Math.sign(lat) !== Math.sign(lastLat) && lastLat !== 0) latFlip++;
      if (Math.abs(lat) > 0.25) lastLat = lat;
      if (Math.abs(fwd) > 0.25 && Math.sign(fwd) !== Math.sign(lastFwd) && lastFwd !== 0) fwdFlip++;
      if (Math.abs(fwd) > 0.25) lastFwd = fwd;
      if (a[i].tgt) tgtFrames++;
    }
    const net = a.length > 1 ? Math.hypot(a[a.length - 1].x - a[0].x, a[a.length - 1].z - a[0].z) : 0;
    const dur = a.length > 1 ? a[a.length - 1].t - a[0].t : 1;
    out[id] = {
      samples: a.length, dur: +dur.toFixed(1),
      latFlipsPerMin: +(latFlip / dur * 60).toFixed(1),
      fwdFlipsPerMin: +(fwdFlip / dur * 60).toFixed(1),
      pathM: +path.toFixed(1), netM: +net.toFixed(1),
      efficiency: +(net / Math.max(path, 0.01)).toFixed(2),
      combatPct: +(tgtFrames / a.length * 100).toFixed(0),
      ctfSwitches: g.bots[id] ? g.bots[id].__ctfSwitches : -1,
    };
  }
  return { bots: out, mapTime: g.time - g.__t0, state: g.state };
});
console.log(JSON.stringify(stats, null, 1));
console.log(errors ? `FALHOU: ${errors} erro(s) de console` : '0 erros de console');
await browser.close();
process.exit(errors ? 1 : 0);
