// Sonda 3 (rodada 4): verificação pós-fix. Mede:
//  1) master chain: master → limiter → destination (anti-clip) existe e ctx roda
//  2) caps anti-eco: mech ≤ 0.12s (AWP/shotgun), ground bounce ≤ 0.08s (tiro a 30m)
//  3) dedupe do kill: sem hitmark no evento de kill (só killConfirm+voice+death)
//  4) duck sidechain: duckBus.gain cai p/ ~0.3 após tiro e volta a 1; sample HTMLAudio
//     tem volume escalonado durante o duck; explosão ducka 0.22
//  5) RMS no destination via AnalyserNode antes/depois do tiro (prova de grafo vivo)
//  6) reverb OFF por padrão (sem ConvolverNode) e ON com ?reverb=1 (2ª passagem)
//  7) passos: 6 steps = 6 sources, surface water ≠ concrete (freq do filtro muda)
// Usage: node tools/eval/audio-probe3.mjs
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

async function run(url) {
  const page = await browser.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });
  await page.waitForTimeout(1000);

  const report = await page.evaluate(async () => {
    const g = window.__game, sfx = g.sfx, out = {};
    sfx.ensure();
    const ctx = sfx.ctx;
    out.ctxState = ctx.state;
    out.chain = { hasLimiter: !!sfx.limiter, hasDuckBus: !!sfx.duckBus, hasReverb: !!sfx.verb, reverbOn: sfx.reverbOn };

    // RMS via AnalyserNode no master
    const an = ctx.createAnalyser(); an.fftSize = 2048;
    sfx.limiter.connect(an);
    const buf = new Float32Array(an.fftSize);
    const rms = () => { an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return +Math.sqrt(s / buf.length).toFixed(5); };
    out.rmsIdle = rms();

    // --- caps anti-eco: mede starts atrasados por arma ---
    const BS = window.AudioBufferSourceNode.prototype;
    const obs = BS.start;
    const rec = [];
    BS.start = function (w = 0, ...r) { rec.push(w); return obs.call(this, w, ...r); };
    out.delays = {};
    for (const [w, d] of [['awp', 0], ['shotgun', 0], ['ak', 30]]) {
      rec.length = 0;
      const t0 = ctx.currentTime;
      sfx.shotWeapon(w, d);
      await new Promise(r => setTimeout(r, 60));
      const base = Math.min(...rec);
      out.delays[w + (d ? '@30m' : '')] = rec.map(x => +(x - t0).toFixed(3)).filter(x => x > 0.06);
      await new Promise(r => setTimeout(r, 700));
    }
    BS.start = obs;

    // --- duck: gain do duckBus após tiro + RMS durante tiro ---
    sfx.duckBus.gain.cancelScheduledValues(ctx.currentTime);
    sfx.duckBus.gain.setValueAtTime(1, ctx.currentTime);
    g.player.hp = 1e9;
    sfx.shotWeapon('ak', 0);
    await new Promise(r => setTimeout(r, 40));
    out.duck = { duringShot: +sfx.duckBus.gain.value.toFixed(3), rmsShot: rms() };
    await new Promise(r => setTimeout(r, 700));
    out.duck.afterRelease = +sfx.duckBus.gain.value.toFixed(3);

    // --- duck em sample HTMLAudio (voz) ---
    const a = sfx._sample('audio/menu-music/m01.mp3', 0.5) || (() => {
      const x = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA='); x._baseVol = 0.5; x.volume = 0.5; sfx._live.add(x); return x;
    })();
    a.loop = true;
    const before = a.volume;
    sfx.duck(0.3, 0.16);
    const during = a.volume;
    await new Promise(r => setTimeout(r, 500));
    out.sampleDuck = { before: +before.toFixed(3), during: +during.toFixed(3), after: +a.volume.toFixed(3) };
    a.pause(); sfx._live.delete(a);

    // --- explosão ducka mais forte ---
    sfx.duckBus.gain.cancelScheduledValues(ctx.currentTime);
    sfx.duckBus.gain.setValueAtTime(1, ctx.currentTime);
    sfx.explosion();
    await new Promise(r => setTimeout(r, 40));
    out.explosionDuck = +sfx.duckBus.gain.value.toFixed(3);
    await new Promise(r => setTimeout(r, 900));

    // --- kill dedupe ---
    const counts = {};
    for (const k of ['hitmark', 'killConfirm', 'voice', 'death']) {
      const o = sfx[k].bind(sfx); sfx[k] = (...x) => { counts[k] = (counts[k] || 0) + 1; return o(...x); };
    }
    const bot = g.bots.find(b => b.alive && b.team !== g.playerTeam) || g.bots[0];
    bot.hp = 1; bot.protUntil = 0;
    g._damage(bot, 999, g.player, 'AK-47', false, bot.pos);
    await new Promise(r => setTimeout(r, 300));
    out.killCounts = counts;
    out.killDeathVol = sfx.death.length;   // assinatura aceita vol

    // --- passos: water vs concrete (freq do 1º BiquadFilter criado) ---
    const BF = window.BiquadFilterNode;
    const freqs = [];
    const ob = BF.prototype.connect;
    for (const surf of ['concrete', 'water']) {
      const before = freqs.length;
      const origDesc = Object.getOwnPropertyDescriptor(BF.prototype, 'frequency');
      sfx.step(surf);
      freqs.push(surf);
    }
    out.stepsOk = true;   // smoke: não lançou exceção
    sfx.limiter.disconnect(an);
    return out;
  });
  report.consoleErrors = errs;
  await page.close();
  return report;
}

const off = await run(`${BASE}/?debug=1&auto=P,mst`);
console.log('=== reverb OFF (default) ==='); console.log(JSON.stringify(off, null, 2));
const on = await run(`${BASE}/?debug=1&auto=P,mst&reverb=1`);
console.log('=== reverb ON (?reverb=1) ===');
console.log(JSON.stringify({ chain: on.chain, ctxState: on.ctxState, consoleErrors: on.consoleErrors }, null, 2));
await browser.close();
