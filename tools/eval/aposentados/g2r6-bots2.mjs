// G2-R6A bots v2: FAST-FORWARD da simulação (stub de renderer.render + g.update(1/60)
// em loop) — 60s de tempo de JOGO em ~10s de wall (SwiftShader roda a ~1/9 da velocidade
// real). Amostra pos/yaw dos bots a cada 9 steps (~150ms) e mede:
//   latFlips/fwdFlips por min (zigzag), eficiência (net/path — milling), ctfSwitches,
//   stuckRate (% do tempo quase parado com alvo roam longe).
// Uso: node tools/eval/aposentados/g2r6-bots2.mjs <mapId> <outPrefix> [gameSegundos]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const MAP = process.argv[2] || 'awp_map';
const PREFIX = process.argv[3] || '/tmp/gauntlet/g2r6-bots-br';
const GAME_SECS = parseFloat(process.argv[4] || '60');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1008, height: 655 }, deviceScaleFactor: 1 });
let errors = 0;
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=${MAP}`, { waitUntil: 'load', timeout: 180000 });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 180000 });
await page.waitForTimeout(500);

const stats = await page.evaluate(({ GAME_SECS }) => {
  const g = window.__game;
  g.player.hp = 1e9; g.player.pos.set(0, -80, 0);
  for (const b of g.bots) { b.__lastCtf = b.ctfPt; b.__ctfSwitches = 0; }
  const track = [];
  const rr = g.renderer.render.bind(g.renderer);
  g.renderer.render = () => {};                        // fast-forward: sem GL
  const steps = Math.round(GAME_SECS * 60);
  const t0 = g.time;
  for (let i = 0; i < steps; i++) {
    g.update(1 / 60);
    if (i % 9 === 0) {
      for (const b of g.bots) {
        if (!b.alive) continue;
        track.push({ id: g.bots.indexOf(b), t: g.time - t0, x: b.pos.x, z: b.pos.z, yaw: b.yaw, tgt: !!b.target, ctf: b.ctfPt, roam: b.roamIdx });
        if (b.ctfPt !== b.__lastCtf) { b.__ctfSwitches++; b.__lastCtf = b.ctfPt; }
      }
    }
  }
  g.renderer.render = rr;                              // restaura
  // métricas
  const byId = {};
  for (const s of track) (byId[s.id] || (byId[s.id] = [])).push(s);
  const out = {};
  for (const id in byId) {
    const a = byId[id];
    let latFlip = 0, fwdFlip = 0, path = 0, lastLat = 0, lastFwd = 0, tgtFrames = 0, stuckFrames = 0;
    for (let i = 1; i < a.length; i++) {
      const dt = a[i].t - a[i - 1].t; if (dt <= 0) continue;
      const mx = (a[i].x - a[i - 1].x) / dt, mz = (a[i].z - a[i - 1].z) / dt;
      const sy = Math.sin(a[i].yaw), cy = Math.cos(a[i].yaw);
      const fwd = mx * sy + mz * cy, lat = mx * cy - mz * sy;
      const spd = Math.hypot(mx, mz);
      path += spd * dt;
      if (Math.abs(lat) > 0.25 && Math.sign(lat) !== Math.sign(lastLat) && lastLat !== 0) latFlip++;
      if (Math.abs(lat) > 0.25) lastLat = lat;
      if (Math.abs(fwd) > 0.25 && Math.sign(fwd) !== Math.sign(lastFwd) && lastFwd !== 0) fwdFlip++;
      if (Math.abs(fwd) > 0.25) lastFwd = fwd;
      if (a[i].tgt) tgtFrames++;
      if (spd < 0.5 && !a[i].tgt) stuckFrames++;
    }
    const net = a.length > 1 ? Math.hypot(a[a.length - 1].x - a[0].x, a[a.length - 1].z - a[0].z) : 0;
    const dur = a.length > 1 ? a[a.length - 1].t - a[0].t : 1;
    out[id] = {
      dur: +dur.toFixed(1),
      latFlipsPerMin: +(latFlip / dur * 60).toFixed(1),
      fwdFlipsPerMin: +(fwdFlip / dur * 60).toFixed(1),
      pathM: +path.toFixed(1), netM: +net.toFixed(1),
      efficiency: +(net / Math.max(path, 0.01)).toFixed(2),
      combatPct: +(tgtFrames / a.length * 100).toFixed(0),
      stuckPct: +(stuckFrames / a.length * 100).toFixed(0),
      ctfSwitches: g.bots[id] ? g.bots[id].__ctfSwitches : -1,
    };
  }
  return { bots: out, simSecs: +(g.time - t0).toFixed(1), state: g.state };
}, { GAME_SECS });
// algumas capturas reais no final (render restaurado)
await page.waitForTimeout(700);
await page.screenshot({ path: `${PREFIX}-end.png` });
console.log(JSON.stringify(stats, null, 1));
console.log(errors ? `FALHOU: ${errors} erro(s) de console` : '0 erros de console');
await browser.close();
process.exit(errors ? 1 : 0);
