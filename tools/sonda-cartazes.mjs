/* sonda-cartazes.mjs — QUEM acorda cada cartaz/mural durante o boot.
   Descartável: existe para o relatório de 25/10 dizer o nome do chamador em vez de
   "alguém lê o pool". Injeta um stack no getter de `T.posterImgs[i]` e nos murais. */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'https://www.csbrasil.online';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript(() => {
    try { localStorage.setItem('cs_privacy', JSON.stringify({ version: 'corosolto-analytics-v1', analytics: false, updatedAt: new Date(0).toISOString() })); } catch {}
    window.__cartazes = [];
  });
  const corpo = readFileSync(new URL('../public/js/textures.js', import.meta.url), 'utf8');
  const marcado = corpo
    .replace('        const t = _cartaz(f);', '        try { window.__cartazes.push({ arquivo: f, pilha: new Error().stack.split("\\n").slice(2, 6).join(" | ") }); } catch {}\n        const t = _cartaz(f);')
    .replace('        const t = _cartaz(arquivo);', '        try { window.__cartazes.push({ arquivo, pilha: new Error().stack.split("\\n").slice(2, 6).join(" | ") }); } catch {}\n        const t = _cartaz(arquivo);');
  if (marcado === corpo) throw new Error('não achei os getters de cartaz para instrumentar');
  await context.route('**/js/textures.js*', async (rota) => {
    const r = await rota.fetch();
    await rota.fulfill({ response: r, body: marcado });
  });
  await context.route('**/js/main.js*', async (rota) => {
    const r = await rota.fetch();
    await rota.fulfill({ response: r, body: readFileSync(new URL('../public/js/main.js', import.meta.url), 'utf8') });
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => {
    const se = document.getElementById('splash-enter');
    return !!se && !se.classList.contains('hidden');
  }, null, { timeout: 180000, polling: 150 });
  const lista = await page.evaluate(() => window.__cartazes);
  console.log(`${lista.length} cartaz(es) acordados antes da splash liberar\n`);
  const porPilha = new Map();
  for (const x of lista) {
    const chave = x.pilha.replace(/https?:\/\/[^/]+/g, '').replace(/\?v=[^:)\s]+/g, '');
    if (!porPilha.has(chave)) porPilha.set(chave, []);
    porPilha.get(chave).push(x.arquivo);
  }
  for (const [pilha, arquivos] of [...porPilha.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`── ${arquivos.length} arquivo(s)\n   ${pilha}\n   ${arquivos.join(', ')}\n`);
  }
} finally {
  await browser.close().catch(() => {});
}
