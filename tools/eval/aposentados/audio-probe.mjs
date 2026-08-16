// Sonda de áudio (rodada 4): prova objetiva do grafo WebAudio em Chrome headless real.
// Mede: nº de AudioContext criados, nós conectados DIRETO no destination, disparos de SFX
// por evento (tiro / kill), transientes agendados com atraso (o "eco"), e estado do ctx.
//
// Usage: node tools/eval/audio-probe.mjs
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
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));

// instrumentação ANTES dos scripts da página: conta contexts e conexões no destination
await page.addInitScript(() => {
  window.__audioProbe = { contexts: 0, destConnections: 0, sources: [] };
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const P = AC.prototype;
  const origConnect = P.connect || null;
  // AudioNode.connect é no AudioNode, não no AudioContext — patch lá embaixo no load
  window.__patchAudioNodes = () => {
    const AN = window.AudioNode.prototype;
    const oc = AN.connect;
    AN.connect = function (dest, ...rest) {
      try {
        if (dest === window.__game?.sfx?.ctx?.destination || (dest && dest.constructor?.name === 'AudioDestinationNode'))
          window.__audioProbe.destConnections++;
      } catch {}
      return oc.call(this, dest, ...rest);
    };
    const BS = window.AudioBufferSourceNode.prototype;
    const os = BS.start;
    BS.start = function (when = 0, ...rest) {
      try {
        const ctx = window.__game?.sfx?.ctx;
        window.__audioProbe.sources.push(+(when - (ctx ? ctx.currentTime : 0)).toFixed(3));
      } catch {}
      return os.call(this, when, ...rest);
    };
  };
  const ProxyAC = new Proxy(AC, {
    construct(t, a) { window.__audioProbe.contexts++; return new t(...a); },
  });
  window.AudioContext = ProxyAC; window.webkitAudioContext = ProxyAC;
});

await page.goto(`${BASE}/?debug=1&auto=P,mst`, { waitUntil: 'load' });
await page.evaluate(() => window.__patchAudioNodes());
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });
await page.waitForTimeout(1500);

const report = await page.evaluate(async () => {
  const g = window.__game, sfx = g.sfx, P = window.__audioProbe;
  const out = { contexts: P.contexts, ctxState: sfx.ctx?.state, destBefore: P.destConnections };

  // --- 1 tiro isolado (AK do player) ---
  P.sources.length = 0; P.destConnections = 0;
  const counts = {};
  for (const k of ['_gunshot', 'hitmark', 'killConfirm', 'voice', 'general', 'death', 'step', 'explosion', 'duck'])
    { const o = sfx[k]?.bind(sfx); if (o) sfx[k] = (...a) => { counts[k] = (counts[k] || 0) + 1; return o(...a); }; }
  const _shot = sfx.shotWeapon.bind(sfx); sfx.shotWeapon = (...a) => { counts.shotWeapon = (counts.shotWeapon || 0) + 1; return _shot(...a); };
  g.player.hp = 1e9;
  g._tryShoot();
  await new Promise(r => setTimeout(r, 700));
  out.shot = { counts: { ...counts }, srcStarts: P.sources.length,
    delayed: P.sources.filter(d => d > 0.09), destConns: P.destConnections };

  // --- 1 kill isolado (player mata bot) ---
  P.sources.length = 0; P.destConnections = 0;
  for (const k in counts) delete counts[k];
  const bot = g.bots.find(b => b.alive && b.team !== g.playerTeam) || g.bots[0];
  bot.hp = 1; bot.protUntil = 0;
  g._damage(bot, 999, g.player, 'AK-47', false, bot.pos);
  await new Promise(r => setTimeout(r, 700));
  out.kill = { counts: { ...counts }, srcStarts: P.sources.length,
    delayed: P.sources.filter(d => d > 0.09), destConns: P.destConnections };

  // --- passos: força 6 steps e conta ---
  P.sources.length = 0;
  for (const k in counts) delete counts[k];
  for (let i = 0; i < 6; i++) sfx.step();
  await new Promise(r => setTimeout(r, 400));
  out.steps = { count: counts.step || 0, srcStarts: P.sources.length, sampleMode: !!sfx._cs?.('footsteps') };

  // grafo: filhos do destination (via conexões contadas desde o patch)
  out.masterChain = { vol: sfx.vol, masterGain: sfx.master?.gain?.value };
  return out;
});
console.log(JSON.stringify(report, null, 2));
console.log('console-errors:', errs.length ? errs : 'nenhum');
await browser.close();
