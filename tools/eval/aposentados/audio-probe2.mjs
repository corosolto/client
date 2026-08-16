// Sonda 2 (rodada 4): força o caminho SINTETIZADO (produção, sem weaponSamples) e mede
// fontes agendadas com ATRASO por tiro (o "eco estranho"): mech/ferrolho, ground bounce,
// bolt() da AWP a +420ms. Também mede nós vivos no grafo após rajada (leak check).
// Usage: node tools/eval/audio-probe2.mjs
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const BASE = process.env.BASE || 'http://localhost:8123';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));

await page.goto(`${BASE}/?debug=1&auto=P,mst`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });
await page.waitForTimeout(1000);

const report = await page.evaluate(async () => {
  const g = window.__game, sfx = g.sfx;
  sfx.ensure();
  const ctx = sfx.ctx;
  const out = { ctxState: ctx.state, sampleRate: ctx.sampleRate, baseLatency: ctx.baseLatency };

  // força produção: synth puro (sem samples de arma)
  if (sfx.pack) sfx.pack.weaponSamples = false;

  // grava todos os starts agendados (delay relativo ao currentTime do tiro)
  const BS = window.AudioBufferSourceNode.prototype, OS = window.OscillatorNode.prototype;
  const rec = [];
  const obs = BS.start, oos = OS.start;
  const t0 = () => ctx.currentTime;
  let shotT = 0;
  BS.start = function (w = 0, ...r) { rec.push({ type: 'buf', delay: +(shotT + w - t0()).toFixed(3) }); return obs.call(this, w, ...r); };
  OS.start = function (w = 0, ...r) { rec.push({ type: 'osc', delay: +(shotT + w - t0()).toFixed(3) }); return oos.call(this, w, ...r); };

  const weapons = ['ak', 'awp', 'shotgun', 'mp5'];
  out.perWeapon = {};
  for (const w of weapons) {
    rec.length = 0;
    shotT = ctx.currentTime;
    sfx.shotWeapon(w, 0);          // 1ª pessoa
    await new Promise(r => setTimeout(r, 80));
    const delayed = rec.filter(x => x.delay > 0.06).map(x => x.delay);
    out.perWeapon[w] = { sources: rec.length, delayed };
    await new Promise(r => setTimeout(r, 700));
  }
  // tiro de bot a 30m (mix far)
  rec.length = 0; shotT = ctx.currentTime;
  sfx.shotWeapon('ak', 30);
  await new Promise(r => setTimeout(r, 80));
  out.far30m = { sources: rec.length, delayed: rec.filter(x => x.delay > 0.06).map(x => x.delay) };
  await new Promise(r => setTimeout(r, 900));

  // bolt() da AWP (setTimeout no game.js) — mede o que toca a +420ms
  rec.length = 0; shotT = ctx.currentTime;
  sfx.bolt();
  await new Promise(r => setTimeout(r, 300));
  out.bolt = { sources: rec.length, delays: rec.map(x => x.delay) };

  BS.start = obs; OS.start = oos;
  out.ctxStateAfter = ctx.state;
  return out;
});
console.log(JSON.stringify(report, null, 2));
console.log('console-errors:', errs.length ? errs : 'nenhum');
await browser.close();
