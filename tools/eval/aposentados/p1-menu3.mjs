// P1 — terceira passada do menu: as telas que faltaram, agora pelo FLUXO REAL.
// POR QUE: a passada 2 falhou em silêncio. O splash (#load-overlay) só cai com evento
// CONFIABLE (isTrusted) — element.click() do DOM não o dispensa —, então as 5 telas
// saíram como foto do splash. Aqui: mouse.click de verdade pra sair do splash e
// mouse.click na caixa do botão (sem a espera de "actionability" do page.click, que
// era o que dava timeout na passada 1).
// Uso: node tools/eval/p1-menu3.mjs <outDir>
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
const log = [], errs = [], http4 = [];
const W = 1600, H = 900;
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', e => errs.push('[pageerror] ' + e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });
page.on('response', r => { if (r.status() >= 400) http4.push(`${r.status()} ${r.url()}`); });
const shot = async (n) => {
  try { await page.screenshot({ path: `${OUT}/${n}.png`, timeout: 240000 }); log.push(`[ok] ${n}`); }
  catch (e) { log.push(`[FALHA] ${n}: ${e.message.split('\n')[0]}`); }
};
// clique confiável na caixa do elemento — sem a espera de actionability
async function hit(sel) {
  const b = await page.evaluate((s) => {
    const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  }, sel);
  if (!b || b.w < 1) { log.push(`[hit] ${sel} sem caixa`); return false; }
  await page.mouse.click(b.x, b.y);
  return true;
}
// qual tela está visível agora (para provar que o screenshot não é do splash)
const visivel = () => page.evaluate(() => {
  const o = document.getElementById('load-overlay');
  const splash = o && getComputedStyle(o).display !== 'none' && getComputedStyle(o).opacity !== '0' && !o.classList.contains('hidden');
  const abertas = [...document.querySelectorAll('.screen,#menu-setup')].filter(s => !s.classList.contains('hidden') && getComputedStyle(s).display !== 'none').map(s => s.id);
  return { splash: !!splash, abertas };
});

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(10000);
await page.mouse.click(W / 2, H / 2);         // confiável: é o que derruba o splash
await page.waitForTimeout(6000);
log.push('[estado pós-splash] ' + JSON.stringify(await visivel()));

for (const [act, name] of [['sp', 'menu-02-setup'], ['ctf', 'menu-07-ctf'], ['config', 'menu-04-config'], ['ranking', 'menu-06-ranking'], ['mapa', 'menu-10-mapa'], ['sobre', 'menu-05-sobre']]) {
  try {
    await page.evaluate(() => {
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      document.getElementById('menu-setup')?.classList.add('hidden');
      document.getElementById('main-menu')?.classList.remove('hidden');
    });
    await page.waitForTimeout(900);
    await hit(`.cs-item[data-act="${act}"]`);
    await page.waitForTimeout(3000);
    log.push(`[${act}] ` + JSON.stringify(await visivel()));
    await shot(name);
  } catch (e) { log.push(`[menu ${act}] ${e.message.split('\n')[0]}`); }
}

// FLUXO REAL até a escolha de personagem: sp -> (setup) -> jogar -> time -> personagem.
// A tela forçada por DOM sai vazia porque o roster só é montado ao passar pelo time.
try {
  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('main-menu')?.classList.remove('hidden');
  });
  await hit('.cs-item[data-act="sp"]');
  await page.waitForTimeout(2500);
  await hit('#btn-jogar');
  await page.waitForTimeout(3500);
  log.push('[fluxo pós-jogar] ' + JSON.stringify(await visivel()));
  await shot('menu-08b-time-fluxo');
  // escolhe a 1ª facção e fotografa a tela de personagem já populada
  const ok = await hit('#team-select .team-card button, #team-select button');
  await page.waitForTimeout(3500);
  log.push('[fluxo pós-time] ' + ok + ' ' + JSON.stringify(await visivel()));
  await shot('menu-03b-personagem-fluxo');
} catch (e) { log.push('[fluxo] ' + e.message.split('\n')[0]); }

writeFileSync(`${OUT}/_menu3-log.txt`, log.join('\n'));
writeFileSync(`${OUT}/_menu3-errs.txt`, (errs.join('\n') || 'sem erros') + '\n--- HTTP >=400 ---\n' + (http4.join('\n') || 'nenhum'));
console.log(log.join('\n'));
console.log('--- ERROS ---\n' + (errs.join('\n') || 'sem erros'));
console.log('--- HTTP>=400 ---\n' + (http4.join('\n') || 'nenhum'));
await browser.close();
