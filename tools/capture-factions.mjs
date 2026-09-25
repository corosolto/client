// Captura e mede a tela real de faccoes no aspecto 3:2 usado pelo dono.
// Uso: BASE=http://localhost:4321 OUT=/tmp/faccoes.png node tools/capture-factions.mjs
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:4321';
const OUT = process.env.OUT || '/tmp/faccoes-todas.png';
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
// Esta regua e de HTML/CSS. O loop WebGL atras da tela nao muda um pixel dos cards e
// pode bloquear screenshot em SwiftShader; os dados continuam vindo dos modulos reais.
await page.route('**/js/main.js*', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.addInitScript(() => localStorage.setItem('cs_lang', 'pt'));
await page.goto(`${BASE}/?debug=1&capture=factions&glb=0&bloom=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForSelector('#team-select', { state: 'attached', timeout: 30000 });
await page.evaluate(async () => {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.add('hidden'));
  document.getElementById('team-select')?.classList.remove('hidden');
  const splash = document.getElementById('boot-splash'); if (splash) splash.style.display = 'none';
  const game = document.getElementById('game-container'); if (game) game.style.display = 'none';
  const { CHARACTERS } = await import(`/js/characters.js?capture=${Date.now()}`);
  document.querySelectorAll('.team-card[data-faction]').forEach((card) => {
    const n = CHARACTERS.filter((character) => character.team === card.dataset.faction).length;
    card.setAttribute('aria-disabled', String(card.dataset.ready !== '1' || n === 0));
    const chip = document.createElement('span'); chip.className = 'team-count';
    chip.textContent = n ? `${n} PERSONAGENS` : 'INDISPONÍVEL';
    card.appendChild(chip);
  });
});
await page.evaluate(() => document.fonts?.ready);
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const splash = document.getElementById('boot-splash'); if (splash) splash.style.display = 'none';
  document.getElementById('team-select')?.classList.remove('hidden');
});
const audit = await page.evaluate(() => {
  const viewport = { width: innerWidth, height: innerHeight };
  const screen = document.getElementById('team-select');
  const cards = [...document.querySelectorAll('.team-card[data-faction]')]
    .filter((card) => getComputedStyle(card).display !== 'none' && getComputedStyle(card).visibility !== 'hidden')
    .map((card) => {
      const r = card.getBoundingClientRect();
      return { id: card.dataset.faction, x: r.x, y: r.y, width: r.width, height: r.height,
        inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight };
    });
  const rows = new Set(cards.map((card) => Math.round(card.y))).size;
  return {
    viewport,
    visibleCards: cards.length,
    rows,
    allInside: cards.every((card) => card.inside),
    documentScroll: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth,
    screenScroll: !!screen && (screen.scrollHeight > screen.clientHeight || screen.scrollWidth > screen.clientWidth),
    cards,
  };
});
await page.screenshot({ path: OUT, timeout: 120000 });
console.log(JSON.stringify(audit, null, 2));
console.log(`captura: ${OUT}`);
await browser.close();
if (audit.visibleCards !== 10 || audit.rows !== 2 || !audit.allInside || audit.documentScroll || audit.screenScroll) {
  throw new Error('FACVIEW1: os dez cards nao cabem inteiros em duas linhas sem scroll');
}
