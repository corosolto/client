// CAPTURA DE EVIDÊNCIA 3:2 — lajes, nível do jogador (jogo real, não mapview).
// Nasceu na rodada R27 (BUG-54): o dono aprovou o visual mas reprovou a jogabilidade;
// toda correção de Lajes precisa de antes×depois no recorte que ele recebe (3:2).
// Uso: node tools/eval/lajes-evidence-capture.mjs [outDir] [TAG]
//   BASE=http://127.0.0.1:8124 node tools/eval/lajes-evidence-capture.mjs
// Poses: spawns norte/sul, duas rotas de laje, três descidas, loop inferior,
// quatro limites, vãos de porta/janela (tiro), caixas d'água e borda de laje de perto,
// empilhamento visto do chão, circuito do cachorro.
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || 'tools/eval/asset-evidence/maps/lajes/round';
const TAG = process.argv[3] || '';
const BASE = process.env.BASE || 'http://127.0.0.1:8124';
const VW = 1500, VH = 1000;   // 3:2 — o dono joga e revisa em 3:2

// [nome, x, y, z, yaw, pitch] — forward = (-sin yaw, -cos yaw): yaw 0 = norte(-z), π = sul
const POSES = [
  ['spawn-norte', 0, 5.2, -32.3, Math.PI, -0.05],
  ['spawn-sul', 0, 5.2, 32.3, 0, -0.05],
  ['rota-laje-oeste', -11.6, 5.2, -25.6, Math.PI - 0.25, -0.06],
  ['rota-laje-leste', 11.6, 5.2, -25.6, Math.PI + 0.25, -0.06],
  ['descida-escadaria', 3.4, 0, -10, -Math.PI / 2, 0.15],
  ['descida-beco-varal', -3.4, 0, 2, Math.PI / 2, 0.15],
  ['descida-acesso-sul', 3.4, 0, 22, -Math.PI / 2, 0.15],
  ['beco-central', 0, 0, -23, Math.PI, 0.02],
  ['tunel-mirante', -3, 0, -15.2, Math.PI, 0.05],
  ['loop-inferior-ramal1', -3, 0, -10, -Math.PI / 2, 0.02],
  ['limite-oeste', -14, 0, 0, Math.PI / 2, 0.05],
  ['limite-leste', 14, 0, 0, -Math.PI / 2, 0.05],
  ['limite-norte', 0, 0, -37.5, 0, 0.05],
  ['limite-sul', 0, 0, 33.5, Math.PI, 0.03],
  ['vao-tiro-beco', 0, 0, -22, Math.PI, 0],
  ['caixa-dagua-perto', -10.9, 5.2, -23.9, 0.81, 0.05],
  ['borda-laje-perto', -10.3, 5.2, -19, -0.9, -0.3],
  ['empilhamento-do-chao', -14.2, 0, -12, -Math.PI / 2 + 0.5, 0.30],
  ['empilhamento-do-chao-2', 1.5, 0, 30.5, 0.35, 0.32],
  ['circuito-cachorro', -2, 0, 9.5, Math.PI, 0.06],
  /* Rodada da PRAÇA (dono, 25/08/2026: "por baixo tinha que ter uma praça no meio, ver os
     becos e jogar cima contra baixo"). As quatro primeiras são o antes×depois do pedido. */
  ['praca-do-chao-norte', 0, 0, 5.0, 0, 0.0],
  ['praca-do-chao-sul', 0, 0, -6.0, Math.PI, 0.0],
  ['praca-da-laje-oeste', -8.0, 5.2, 0.4, -Math.PI / 2, -0.30],
  ['praca-da-laje-leste', 8.0, 5.2, 0.4, Math.PI / 2, -0.30],
  ['descida-spawn-norte', 0, 5.2, -29.4, Math.PI, -0.22],
  ['descida-spawn-sul', 0, 5.2, 29.4, 0, -0.22],
];

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
let errors = 0;
page.on('console', (m) => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', (e) => { errors++; console.error('[pageerror]', e.message); });
for (let att = 0; att < 3; att++) {
  try { await page.goto(`${BASE}/?debug=1&auto=P,mst&map=lajes`, { waitUntil: 'domcontentloaded', timeout: 120000 }); break; } catch (e) { console.log('goto retry', att); if (att === 2) throw e; }
}
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
/* O mapa servido TEM que ser o lajes. Em 25/08/2026 esta captura rodou inteira contra um
   servidor velho de outra sessão, que ainda registrava o id ANTIGO do lajes (o do rename de
   11/08, ver ALIAS_MAPA em maps.js): `?map=lajes` caiu no DEFAULT_MAP e as 26 fotos saíram
   do mapa errado com "DONE" no fim. Evidência de mapa errado é pior que evidência nenhuma —
   aqui ela custa erro (lição 5). O id antigo não é citado literalmente porque a M1 do
   mapa-id-check varre `tools/` como código vivo. */
const mapaServido = await page.evaluate(() => window.__game._mapId);
if (mapaServido !== 'lajes') {
  await browser.close();
  throw new Error(`SERVIDOR ERRADO: ?map=lajes carregou "${mapaServido}". `
    + `Confira se ${BASE} é o SEU dev server (outra sessão pode estar segurando a porta).`);
}
await page.waitForTimeout(800);
await page.evaluate(() => {
  const g = window.__game;
  for (const b of g.bots) { b.pos.set(0, -80, 0); b.hp = 1e9; }
  g.player.hp = 1e9;
});
for (const [nome, x, y, z, yaw, pitch] of POSES) {
  await page.evaluate(([px, py, pz, yw, pt]) => {
    const g = window.__game;
    g.player.pos.set(px, py, pz);
    g.player.yaw = yw; g.player.pitch = pt;
    g.player.vel.set(0, 0, 0);
    g.player.grounded = true;
  }, [x, y, z, yaw, pitch]);
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${TAG}${nome}.png`, timeout: 90000 });
  console.log('  shot', nome);
}
console.log(`DONE -> ${OUT} | 0 erros = ${errors === 0}`);
await browser.close();
process.exit(errors ? 1 : 0);
