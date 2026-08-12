/* CRASH-WATCH — captura TODO erro que o jogo produz numa partida longa.
   Motivo: o dono reportou "o jogo tá reiniciando do nada, estava num CTF no ferro velho"
   COM VÁRIOS ERROS NO CONSOLE. Sem ler o erro real, qualquer conserto é chute.

   Captura: console (todos os tipos), pageerror (exceção não capturada) e
   unhandledrejection (promessa). Amostra o estado do jogo a cada 2 s e detecta
   TRANSIÇÃO ESPÚRIA (state -> menu, dispose, roundNum voltando a 1, hp do jogador
   pulando pra 100 sem respawn).

   Uso: node tools/eval/crash-watch.mjs [segundos] [mapa] [--ctf]
   Exige `npm run eval:serve &`.
*/
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SECS = parseFloat(process.argv[2] || '300');
const MAP = process.argv.find(a => a.startsWith('fy_') || a.startsWith('awp')) || 'ferro_velho';
const CTF = !process.argv.includes('--rounds');
const BASE = process.env.BASE || 'http://localhost:8123';

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });

const eventos = [];
const vistos = new Map();   // dedup por assinatura, com contagem
const reg = (tipo, txt, extra) => {
  const sig = `${tipo}|${String(txt).slice(0, 180)}`;
  const n = (vistos.get(sig) || 0) + 1;
  vistos.set(sig, n);
  if (n <= 3) eventos.push({ t: Date.now(), tipo, txt: String(txt), extra });
};
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') reg(m.type(), m.text(), m.location()); });
page.on('pageerror', e => reg('pageerror', `${e.message}\n${(e.stack || '').split('\n').slice(0, 6).join('\n')}`));
page.on('requestfailed', r => reg('requestfailed', `${r.url()} :: ${r.failure()?.errorText}`));
page.on('response', r => { if (r.status() >= 400) reg('http' + r.status(), r.url()); });

const url = `${BASE}/?debug=1&auto=P,mst&map=${MAP}${CTF ? '&ctf=1' : ''}`;
console.log('->', url);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });

// engancha unhandledrejection e um wrapper de erro global ANTES do jogo rodar muito
await page.addInitScript(() => {
  addEventListener('unhandledrejection', ev => console.error('[UNHANDLED-REJECTION]', ev.reason && (ev.reason.stack || ev.reason.message || ev.reason)));
});
await page.evaluate(() => {
  addEventListener('unhandledrejection', ev => console.error('[UNHANDLED-REJECTION]', ev.reason && (ev.reason.stack || ev.reason.message || ev.reason)));
  addEventListener('error', ev => console.error('[WINDOW-ERROR]', ev.message, ev.filename + ':' + ev.lineno));
  // marca toda entrada em quitToMenu/startGame para provar se houve reinício
  window.__marks = [];
});

await page.waitForFunction(() => window.__game && (window.__game.state === 'live' || window.__game.state === 'countdown'), null, { timeout: 90000 });
console.log('jogo vivo. amostrando', SECS, 's...');

const amostras = [];
let ultimo = null;
const t0 = Date.now();
while ((Date.now() - t0) / 1000 < SECS) {
  await page.waitForTimeout(2000);
  const s = await page.evaluate(() => {
    const g = window.__game;
    const menuVis = !!(document.getElementById('main-menu') && !document.getElementById('main-menu').classList.contains('hidden'));
    if (!g) return { morto: true, menuVis };
    return {
      state: g.state, round: g.roundNum, hp: g.player && +g.player.hp.toFixed(1),
      alive: g.player && g.player.alive, time: +g.time.toFixed(1),
      score: g.score && { ...g.score }, caps: g.roundCaps && { ...g.roundCaps },
      paused: g.paused, menuVis, disposed: !!g._disposed,
      hurtAt: g.player && +(g.player._hurtAt || -99).toFixed(1),
    };
  }).catch(e => ({ erroAvaliando: String(e).slice(0, 200) }));
  amostras.push(s);
  // transições que interessam
  if (ultimo) {
    if (s.menuVis && !ultimo.menuVis) reg('REINICIO', `MENU PRINCIPAL apareceu no meio da partida (round ${ultimo.round} -> ${s.round})`);
    if (s.round < ultimo.round) reg('REINICIO', `roundNum RETROCEDEU ${ultimo.round} -> ${s.round}`);
    if (s.morto && !ultimo.morto) reg('REINICIO', 'window.__game sumiu');
    if (s.hp === 100 && ultimo.hp < 100 && ultimo.alive && s.alive) {
      reg('CURA', `hp ${ultimo.hp} -> 100 SEM MORRER (t ${ultimo.time} -> ${s.time}, hurtAt ${s.hurtAt})`);
    }
  }
  ultimo = s;
  if (amostras.length % 15 === 0) console.log(`t+${Math.round((Date.now() - t0) / 1000)}s`, JSON.stringify(s));
}
await browser.close();

console.log('\n================ EVENTOS ================');
if (!eventos.length) console.log('nenhum erro, aviso ou transição espúria capturada.');
for (const e of eventos) console.log(`[${e.tipo}] ${e.txt}${e.extra ? ' @ ' + JSON.stringify(e.extra) : ''}`);
console.log('\n---- contagem por assinatura ----');
for (const [sig, n] of [...vistos].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(5)}x  ${sig}`);
console.log('\namostras:', amostras.length, '| menu apareceu:', amostras.filter(a => a.menuVis).length);
