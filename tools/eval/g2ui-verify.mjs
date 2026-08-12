// G2-R2 (MENUS/UI) — verificação end-to-end dos menus no Chrome headless real:
//   01 menu principal · 02 setup (perfil preenchido, VOLTAR no lugar, thumb de mapa)
//   03 seletor de time com previews 3D · 04 seletor de personagem
//   05 pause → SAIR PRO MENU → 06 home limpa (fluxo!) · 07 killfeed com ícones novos
// Falha (exit 1) em qualquer erro de console/pageerror ou assert quebrado.
// Uso: node tools/eval/g2ui-verify.mjs
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = '/tmp/gauntlet';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
let errors = 0, failures = 0;
const fail = (msg) => { failures++; console.error('[ASSERT-FAIL]', msg); };
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text().slice(0, 240)); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message.slice(0, 400)); });
page.on('response', r => { if (r.status() >= 400) console.error('[http-' + r.status() + ']', r.url().slice(0, 140)); });
await page.addInitScript(() => {
  localStorage.setItem('awpbr_nick', 'ZÉ DO AWP');   // perfil preenchido no setup
});

/* ---------- 01 menu principal ---------- */
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'load' });
await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 30000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/g2ui-01-menu.png` });
console.log('shot 01 menu');

/* ---------- 02 setup (perfil + partida, docado à direita) ---------- */
await page.click('.cs-item[data-act="ctf"]');
await page.waitForSelector('#menu-setup.open', { timeout: 5000 });
await page.waitForTimeout(900);
const setup = await page.evaluate(() => {
  const nick = document.getElementById('nick-input').value;
  const back = document.getElementById('setup-back').getBoundingClientRect();
  const title = document.querySelector('#menu-setup .pc-title').getBoundingClientRect();
  const thumb = document.getElementById('map-thumb');
  const overlap = !(back.bottom <= title.top || back.top >= title.bottom || back.right <= title.left || back.left >= title.right);
  return { nick, overlap, thumbVisible: thumb && thumb.style.opacity !== '0', thumbSrc: thumb?.src || '' };
});
if (setup.nick !== 'ZÉ DO AWP') fail(`nick não carregou no perfil: "${setup.nick}"`);
if (setup.overlap) fail('VOLTAR ainda sobreposto ao título SEU PERFIL');
if (!setup.thumbVisible) fail('thumbnail do mapa não visível');
console.log('setup:', JSON.stringify(setup));
await page.screenshot({ path: `${OUT}/g2ui-02-setup.png` });
console.log('shot 02 setup');

/* ---------- 03 seletor de time com previews ---------- */
await page.click('#btn-jogar');
await page.waitForSelector('#team-select:not(.hidden)', { timeout: 5000 });
await page.waitForFunction(() =>
  document.querySelectorAll('#team-select .team-chars img').length >= 12, null, { timeout: 60000 })
  .catch(() => fail('previews 3D dos times não renderizaram (12 imgs esperadas)'));
await page.waitForTimeout(400);
const nPrev = await page.evaluate(() => document.querySelectorAll('#team-select .team-chars img').length);
console.log('team previews:', nPrev);
await page.screenshot({ path: `${OUT}/g2ui-03-teams.png` });
console.log('shot 03 teams');

/* ---------- 04 seletor de personagem ---------- */
await page.click('#btn-team-p');
await page.waitForSelector('#char-select:not(.hidden)', { timeout: 5000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/g2ui-04-char.png` });
console.log('shot 04 char');

/* ---------- 05/06 pause → SAIR PRO MENU → home ---------- */
await page.goto(`${BASE}/?debug=1&auto=E,mst&map=piscina_treta`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 180000 });
await page.waitForTimeout(600);
await page.evaluate(() => {
  const g = window.__game;
  g.testMode = false;             // reproduz o caminho do dono (mousedown global ativo)
  g.setPaused(true);
});
await page.waitForSelector('#pause-menu:not(.hidden)', { timeout: 5000 });
await page.screenshot({ path: `${OUT}/g2ui-05-pause.png` });
console.log('shot 05 pause');
await page.click('#btn-quit');
await page.waitForTimeout(1200);
const home = await page.evaluate(() => ({
  menuVisible: !document.getElementById('main-menu').classList.contains('hidden'),
  pauseVisible: !document.getElementById('pause-menu').classList.contains('hidden'),
  gameGone: !window.__game,
  setupClosed: !document.getElementById('menu-setup').classList.contains('open'),
}));
if (!home.menuVisible) fail('SAIR PRO MENU não voltou pro menu principal');
if (home.pauseVisible) fail('pause menu ficou visível depois de sair');
if (!home.gameGone) fail('estado zumbi: __game ainda existe depois de sair');
console.log('home:', JSON.stringify(home));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/g2ui-06-home.png` });
console.log('shot 06 home');

/* ---------- 07 killfeed com ícones novos ---------- */
await page.goto(`${BASE}/?debug=1&auto=E,mst&map=piscina_treta`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 180000 });
await page.evaluate(() => {
  const g = window.__game;
  const bot = (name, team) => ({ name, team, isPlayer: false });
  const me = { name: 'VOCÊ', team: 'E', isPlayer: true };
  // ordem no feed (prepend): última linha em cima — manda na ordem inversa de leitura
  g._feed(bot('Funkeiro', 'B'), bot('Sindicalista', 'E'), 'FRAG');
  g._feed(bot('Metaleiro', 'U'), bot('Caminhoneiro', 'B'), 'FACA');
  g._feed(bot('Doutora', 'E'), bot('Sertanejo', 'B'), 'DE');
  g._feed(bot('Emo', 'U'), bot('Mst', 'E'), 'P90');
  g._feed(bot('Coach', 'B'), bot('Punk', 'U'), 'AWP', true);
  g._feed(me, bot('Rapper', 'U'), 'AK', true);
  g._feed(bot('Clubber', 'U'), me, 'MP5');
  g._feed(bot('Skatista', 'U'), bot('Farialimer', 'B'), 'M3');
});
await page.waitForTimeout(350);
await page.screenshot({ path: `${OUT}/g2ui-07-killfeed.png`, clip: { x: 1600 - 560, y: 50, width: 545, height: 400 } });
console.log('shot 07 killfeed');

console.log(errors ? `FALHOU: ${errors} erro(s) de console` : '0 erros de console');
console.log(failures ? `FALHOU: ${failures} assert(s)` : 'todos os asserts ok');
await browser.close();
process.exit(errors || failures ? 1 : 0);
