// Sonda 5 (rodada 4, revisão): prova pan estéreo + delay de propagação + fix do headshot.
//  1) bot à ESQUERDA do player → tiro com pan < 0 (StereoPannerNode no grafo)
//  2) tiro do PLAYER → sem panner (central) e sem propDelay (starts em t+0)
//  3) bot a 20m → propDelay ≈ 20/343 ≈ 0.058s agendado nos starts
//  4) headshot NÃO-letal → hitmark toca; kill → hitmark NÃO toca (dedupe mantido)
//  5) death() de bot: panner + propDelay; death() do player: central/imediato
// Usage: node tools/eval/audio-probe5.mjs
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
  const g = window.__game, sfx = g.sfx, out = {};
  sfx.ensure();
  if (sfx.pack) sfx.pack.weaponSamples = false;   // força produção (synth)
  const ctx = sfx.ctx;
  g.player.hp = 1e9;

  // instrumenta StereoPannerNode e starts
  const pans = [], starts = [];
  const SP = window.StereoPannerNode.prototype;
  const oDesc = Object.getOwnPropertyDescriptor(SP, 'pan');
  const OS = window.AudioBufferSourceNode.prototype.start, OO = window.OscillatorNode.prototype.start;
  window.AudioBufferSourceNode.prototype.start = function (w = 0, ...r) { starts.push(w - ctx.currentTime); return OS.call(this, w, ...r); };
  window.OscillatorNode.prototype.start = function (w = 0, ...r) { starts.push(w - ctx.currentTime); return OO.call(this, w, ...r); };
  // captura pan.value no momento do connect (o node é criado, ganha valor, e conecta)
  const oConn = window.AudioNode.prototype.connect;
  window.AudioNode.prototype.connect = function (dest, ...r) {
    if (dest instanceof window.StereoPannerNode) pans.push(+dest.pan.value.toFixed(3));
    return oConn.call(this, dest, ...r);
  };
  const reset = () => { pans.length = 0; starts.length = 0; };

  // --- 1) bot à esquerda: posiciona bot a 90° esquerda do player e força tiro via game.js ---
  const bot = g.bots.find(b => b.alive && b.team !== g.playerTeam) || g.bots[0];
  const p = g.player;
  p.yaw = 0;   // olhando "pra frente" (convenção do jogo)
  bot.pos.set(p.pos.x - 20 * Math.cos(p.yaw), p.pos.y, p.pos.z + 20 * Math.sin(p.yaw));   // 20m à esquerda
  reset();
  // replica a chamada do game.js:2115-2118 (caminho real do bot)
  const _sd = Math.hypot(bot.pos.x - p.pos.x, bot.pos.z - p.pos.z);
  const _rel = Math.atan2(bot.pos.x - p.pos.x, bot.pos.z - p.pos.z) - p.yaw;
  const _pan = Math.max(-0.85, Math.min(0.85, Math.sin(_rel) * 0.8));
  const _pd = Math.min(0.25, _sd / 343);
  out.botSetup = { dist: +_sd.toFixed(1), rel: +_rel.toFixed(3), expectedPan: +_pan.toFixed(3), expectedDelay: +_pd.toFixed(3) };
  sfx.shotWeapon(bot.weapon, _sd, 1, _pan, _pd);
  await new Promise(r => setTimeout(r, 60));
  out.botShot = { pans: [...pans], maxStartDelay: starts.length ? +Math.max(...starts).toFixed(3) : 0, minStartDelay: starts.length ? +Math.min(...starts).toFixed(3) : 0 };
  await new Promise(r => setTimeout(r, 700));

  // --- 2) tiro do player: caminho real (_tryShoot) → pan=0, sem delay ---
  reset();
  p.weapon = 'ak'; p.ammo.ak.mag = 30; p.nextShotAt = 0; p.drawUntil = 0; p.reloadUntil = 0;
  g._tryShoot();
  await new Promise(r => setTimeout(r, 60));
  out.playerShot = { pans: [...pans], maxStartDelay: starts.length ? +Math.max(...starts).toFixed(3) : 0 };
  await new Promise(r => setTimeout(r, 700));

  // --- 3) headshot NÃO-letal toca hitmark; kill não toca ---
  const counts = {};
  for (const k of ['hitmark', 'killConfirm']) {
    const o = sfx[k].bind(sfx); sfx[k] = (...x) => { counts[k] = (counts[k] || 0) + 1; return o(...x); };
  }
  bot.hp = 200; bot.protUntil = 0; bot.alive = true;
  g._damage(bot, 50, g.player, 'PISTOL', true, bot.pos);        // headshot não-letal
  out.nonLethalHead = { ...counts };
  for (const k in counts) delete counts[k];
  bot.hp = 1;
  g._damage(bot, 999, g.player, 'AK-47', false, bot.pos);       // kill
  out.lethalKill = { ...counts };

  // --- 4) death() de bot com pan/delay vs death() do player ---
  reset();
  sfx.death(0.8, -0.7, 0.05);
  await new Promise(r => setTimeout(r, 60));
  out.botDeath = { pans: [...pans], minStartDelay: +Math.min(...starts).toFixed(3) };
  await new Promise(r => setTimeout(r, 900));
  reset();
  sfx.death();
  await new Promise(r => setTimeout(r, 60));
  out.playerDeath = { pans: [...pans], minStartDelay: starts.length ? +Math.min(...starts).toFixed(3) : 0 };

  window.AudioBufferSourceNode.prototype.start = OS;
  window.OscillatorNode.prototype.start = OO;
  window.AudioNode.prototype.connect = oConn;
  return out;
});
console.log(JSON.stringify(report, null, 2));
console.log('console-errors:', errs.length ? errs : 'nenhum');
await browser.close();
