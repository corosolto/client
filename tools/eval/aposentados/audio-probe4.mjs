// Sonda 4: força o caminho SINTETIZADO de produção (pack.weaponSamples=false) e mede
// caps anti-eco (mech ≤0.12s, bounce ≤0.08s), RMS do tiro no destination e RMS de
// rajada de 8 tiros simultâneos (limiter do master não deixa explodir).
// Usage: node tools/eval/audio-probe4.mjs
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
await page.waitForTimeout(800);

const report = await page.evaluate(async () => {
  const sfx = window.__game.sfx, out = {};
  sfx.ensure();
  if (sfx.pack) sfx.pack.weaponSamples = false;   // força produção (synth)
  const ctx = sfx.ctx;

  const BS = window.AudioBufferSourceNode.prototype, obs = BS.start;
  const rec = [];
  BS.start = function (w = 0, ...r) { rec.push(w - ctx.currentTime); return obs.call(this, w, ...r); };
  out.delays = {};
  for (const [w, d] of [['awp', 0], ['shotgun', 0], ['ak', 0], ['ak', 30]]) {
    rec.length = 0;
    sfx.shotWeapon(w, d);
    await new Promise(r => setTimeout(r, 60));
    out.delays[w + (d ? '@30m' : '')] = rec.filter(x => x > 0.06).map(x => +x.toFixed(3));
    await new Promise(r => setTimeout(r, 700));
  }
  BS.start = obs;

  // RMS: 1 tiro vs rajada de 8 (limiter)
  const an = ctx.createAnalyser(); an.fftSize = 4096;
  sfx.limiter.connect(an);
  const buf = new Float32Array(an.fftSize);
  const peakRms = async (ms) => {
    let mx = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      an.getFloatTimeDomainData(buf);
      let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      mx = Math.max(mx, Math.sqrt(s / buf.length));
      await new Promise(r => setTimeout(r, 8));
    }
    return +mx.toFixed(4);
  };
  sfx.shotWeapon('ak', 0);
  out.rms1shot = await peakRms(250);
  await new Promise(r => setTimeout(r, 600));
  for (let i = 0; i < 8; i++) sfx.shotWeapon('ak', 0);
  out.rms8shots = await peakRms(250);
  out.limiterRatio = +(out.rms8shots / out.rms1shot).toFixed(2);   // sem limiter ~2.8 (8x energia ≈ +9dB RMS ≈ ×2.8)

  // reverb ON: send recebe conexão por tiro
  sfx.reverbOn = true; sfx._buildReverb();
  const before = sfx.verbSend.numberOfInputs;
  sfx.shotWeapon('ak', 20);
  out.reverbSendInputs = { before, after: sfx.verbSend.numberOfInputs };
  sfx.limiter.disconnect(an);
  return out;
});
console.log(JSON.stringify(report, null, 2));
console.log('console-errors:', errs.length ? errs : 'nenhum');
await browser.close();
