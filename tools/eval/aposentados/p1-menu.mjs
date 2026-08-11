// P1 — captura das TELAS DE MENU numa sessão só de browser.
// POR QUE existe (em vez de reusar gl-shots.mjs): sob SwiftShader com 2 CPUs o
// screenshot do splash estoura o timeout padrão de 30 s do Playwright e derruba o
// processo inteiro, perdendo todas as telas seguintes. Aqui cada screenshot tem
// timeout longo e é embrulhado em try/catch, então uma tela lenta não custa as outras.
// Uso: node tools/eval/p1-menu.mjs <outDir>
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/root/shots/p1';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
mkdirSync(OUT, { recursive: true });
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio', '--no-sandbox'],
});
const log = [];
const errs = [];
const W = 1600, H = 900;
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', e => errs.push('[pageerror] ' + e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });

// screenshot tolerante: nunca lança, só registra.
async function shot(name) {
  try {
    await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 240000 });
    log.push(`[ok] ${name}`);
  } catch (e) { log.push(`[FALHA] ${name}: ${e.message.split('\n')[0]}`); }
}

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(9000);
await shot('menu-00-splash');
try { await page.mouse.click(W / 2, H / 2); } catch (e) { log.push('[click] ' + e.message); }
await page.waitForTimeout(6000);
await shot('menu-01-main');

// inventário do DOM: ajuda a achar telas que mudaram de id entre rodadas
try {
  const ids = await page.evaluate(() => ({
    screens: [...document.querySelectorAll('.screen')].map(e => e.id).filter(Boolean),
    acts: [...document.querySelectorAll('[data-act]')].map(e => e.getAttribute('data-act')),
    ids: [...document.querySelectorAll('[id]')].map(e => e.id),
  }));
  writeFileSync(`${OUT}/_dom-ids.json`, JSON.stringify(ids, null, 2));
} catch (e) { log.push('[dom] ' + e.message.split('\n')[0]); }

// telas alcançadas por clique no menu principal (rota real do jogo)
for (const [act, name] of [['sp', 'menu-02-setup'], ['ctf', 'menu-07-ctf'], ['config', 'menu-04-config'], ['ranking', 'menu-06-ranking'], ['sobre', 'menu-05-sobre']]) {
  try {
    await page.evaluate(() => { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById('main-menu')?.classList.remove('hidden'); });
    await page.click(`.cs-item[data-act="${act}"]`, { timeout: 15000 });
    await page.waitForTimeout(2500);
    await shot(name);
  } catch (e) { log.push(`[menu ${act}] ${e.message.split('\n')[0]}`); }
}

// telas do fluxo forçadas via DOM (time / personagem / fim de partida)
for (const [id, name] of [['team-select', 'menu-08-time'], ['char-select', 'menu-03-personagem'], ['match-end', 'menu-09-fim'], ['end-screen', 'menu-09b-fim']]) {
  try {
    const found = await page.evaluate((i) => {
      const el = document.getElementById(i); if (!el) return false;
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      el.classList.remove('hidden'); return true;
    }, id);
    if (!found) { log.push(`[${id}] não existe no DOM`); continue; }
    await page.waitForTimeout(2500);
    await shot(name);
  } catch (e) { log.push(`[${id}] ${e.message.split('\n')[0]}`); }
}

writeFileSync(`${OUT}/_menu-log.txt`, log.join('\n'));
writeFileSync(`${OUT}/_menu-errs.txt`, errs.join('\n') || 'sem erros');
console.log(log.join('\n'));
console.log('--- ERROS ---');
console.log(errs.join('\n') || 'sem erros');
await browser.close();
