/* Captura das telas 08 (placar) e 09 (resultado) no MESMO enquadramento das referências
   (3:2 — 1536×1024, o que o dono usa), para comparação lado a lado com
   `references/telas/08_placar.png` e `09_resultado_partida.png`.

   Por que um script próprio e não o g2ui-verify: aquele captura o FLUXO de menus (01-06) e
   nunca chega ao placar de round nem à tela de fim. Estas duas só existem dentro de uma
   partida viva, e são justamente as duas com diferença ESTRUTURAL contra a referência.

   Uso:  node tools/eval/telas-capture.mjs           (saída em /tmp/telas/)
         OUT=/tmp/x node tools/eval/telas-capture.mjs
*/
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.env.OUT || '/tmp/telas';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
// 1536×1024 = 3:2, o enquadramento das 9 referências (512×341 é o mesmo quadro a 1/3).
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
page.on('pageerror', e => console.error('[pageerror]', e.message.slice(0, 300)));
await page.addInitScript(() => localStorage.setItem('awpbr_nick', 'ZÉ DO AWP'));

await page.goto(`${BASE}/?debug=1&lang=pt&auto=E,mst&map=awp_map`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 180000 });
await page.waitForTimeout(1500);

/* ---- 08 PLACAR ---- Números plausíveis injetados nos combatentes para que a tabela
   tenha a mesma densidade da referência (7 × 7, valores decrescentes). Sem isto todo
   mundo está 0×0 no segundo 2 e a tela não mostra a hierarquia que estamos comparando. */
await page.evaluate(() => {
  const g = window.__game;
  const k = [12, 8, 6, 5, 3, 1, 0], a = [2, 1, 3, 2, 1, 1, 0], d = [3, 4, 4, 5, 6, 6, 7];
  const byTeam = { E: 0, B: 0 };
  for (const c of g.combatants) {
    const i = Math.min(byTeam[c.team]++, 6);
    c.kills = k[i]; c.deaths = d[i]; c.assists = a[i];
  }
  g.roundNum = 4; g.roundsWon = { E: 2, B: 1 };
  g._resultadoDaRodada('PALHAÇOS LEVARAM O ROUND', 'ELIMINARAM O TIME INTEIRO');
  document.getElementById('hud').classList.add('sb-on');
});
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/08_placar.png` });
console.log('shot 08 placar');

/* ---- 09 RESULTADO ---- */
await page.evaluate(() => {
  const g = window.__game;
  g._showScoreboard(false);
  g.player.kills = 24; g.player.deaths = 8;
  g.roundsWon = { E: 3, B: 1 };
  g._endMatch();
});
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/09_resultado.png` });
console.log('shot 09 resultado');

/* ---- 08b PLACAR NO CTF ---- o DOM vigente cria duas `.sb-col.ctf`; cada linha ganha a
   quinta célula CAP. O arnês antigo ainda procurava #sb-cap-h, removido junto da tabela
   única, e por isso quebrava depois de já ter gravado 08/09. */
const ctf = await page.evaluate(() => {
  const g = window.__game;
  document.getElementById('match-end').classList.add('hidden');   // a tela 09 é .screen z-40 e taparia o placar
  g.ctf = true;   /* o modo CTF não vem por query; o que o placar lê é este campo */
  let i = 0; for (const c of g.combatants) { c.kills = 9 - i; c.deaths = i; c.captures = (i % 3); i++; }
  g.roundNum = 3; g.roundsWon = { E: 1, B: 1 };
  g._showScoreboard(true);
  const first = document.querySelector('#sb-cols .sb-col.ctf tbody tr');
  return { ctf: g.ctf, ctfCols: document.querySelectorAll('#sb-cols .sb-col.ctf').length,
           grid: first ? getComputedStyle(first).gridTemplateColumns : null,
           tds: first?.querySelectorAll('td').length || 0 };
});
console.log('ctf:', JSON.stringify(ctf));
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/08b_placar_ctf.png` });
console.log('shot 08b placar ctf');

/* ---- 08c/09c em 1280x720 ---- `#btn-jogar` sticky e `.cs-setup` de largura fixa já
   quebraram tela aqui quando alguém mexeu em tipografia sem olhar overflow. Este par prova
   que as duas telas novas cabem no menor enquadramento comum sem estouro. */
await page.setViewportSize({ width: 1280, height: 720 });
await page.waitForTimeout(400);
const over = await page.evaluate(() => {
  const g = window.__game;
  document.getElementById('match-end').classList.remove('hidden');
  const r = (el) => { const b = el.getBoundingClientRect(); return [b.left < -1, b.right > innerWidth + 1, b.bottom > innerHeight + 1]; };
  /* .me-wrap é a moldura full-bleed e pode exceder 1 px durante a animação da própria
     screen; o que pode cortar conteúdo é a coluna editorial, não o bleed decorativo. */
  return { matchContent: r(document.querySelector('.me-col')), stats: r(document.getElementById('match-stats')),
           actions: r(document.querySelector('.me-actions')),
           docOverflowX: document.documentElement.scrollWidth > innerWidth };
});
console.log('overflow 1280x720:', JSON.stringify(over));
await page.screenshot({ path: `${OUT}/09c_720.png` });
await page.evaluate(() => { document.getElementById('match-end').classList.add('hidden'); window.__game._showScoreboard(true); });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/08c_720.png` });
console.log('shot 08c/09c 720');

await browser.close();
