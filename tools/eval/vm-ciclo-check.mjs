/* RÉGUA DO CICLO DE ARSENAL — `[` e `]` andam pelas 26 armas dentro do jogo?
 *
 * Conferir viewmodel era um reload por arma, e o arsenal tem 26. Com `?debug=1`
 * as teclas `[` e `]` percorrem o `WEAPON_IDS` sem recarregar a página
 * (`public/js/game.js`, `_qaCicloArma`). Esta régua prova três coisas, porque
 * atalho de QA que só parece funcionar é pior que atalho nenhum:
 *
 *   1. a tecla troca a arma DE FATO (`player.weapon` muda a cada passo);
 *   2. o ciclo dá a volta inteira sem repetir nem travar;
 *   3. nenhuma arma derruba a página no caminho (é onde mora o defeito real:
 *      um viewmodel que estoura ao ser montado).
 *
 * Mutações:
 *   --mutante=semdebug   entra sem `?debug=1`  → a tecla não faz nada, VERMELHO
 *   --mutante=semtecla   não aperta nada       → 1 arma visitada, VERMELHO
 *
 *   node tools/eval/vm-ciclo-check.mjs --porta=4361
 */
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`)
  .split('=').slice(1).join('=');
const PORTA = arg('porta', '4361');
const MAPA = arg('map', 'brasilia');
const MUTANTE = arg('mutante', '');
const PASSOS = +arg('passos', 26);

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: 1200, height: 800 } });
const erros = [];
pag.on('pageerror', (e) => erros.push(String(e).split('\n')[0].slice(0, 140)));

const q = new URLSearchParams({ auto: 'E', map: MAPA, armaslazy: '0' });
if (MUTANTE !== 'semdebug') q.set('debug', '1');
await pag.goto(`http://localhost:${PORTA}/?${q}`, { waitUntil: 'load', timeout: 180000 });
await pag.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
await pag.waitForTimeout(2000);

const visitadas = [];
const quebrou = [];
let arma = await pag.evaluate(() => window.__game.player.weapon);
visitadas.push(arma);

for (let i = 0; i < (MUTANTE === 'semtecla' ? 0 : PASSOS); i += 1) {
  const antes = arma;
  const nErros = erros.length;
  await pag.keyboard.press('BracketRight');
  await pag.waitForTimeout(320);
  arma = await pag.evaluate(() => window.__game.player.weapon);
  if (arma === antes) break;                       // o ciclo parou de andar
  if (erros.length > nErros) quebrou.push(`${arma}: ${erros[erros.length - 1]}`);
  if (visitadas.includes(arma)) break;             // deu a volta
  visitadas.push(arma);
}

await nav.close();

const ok = visitadas.length >= 20 && quebrou.length === 0;
console.log(`\n  ${visitadas.length} armas visitadas com \`]\` sem recarregar a página`);
console.log(`  ${visitadas.join(' → ')}`);
if (quebrou.length) console.log(`\n  ARMAS QUE DERRUBARAM A PÁGINA:\n    ${quebrou.join('\n    ')}`);
else if (erros.length) console.log(`  erros de página (fora do ciclo): ${[...new Set(erros)].slice(0, 3).join(' | ')}`);
console.log(ok ? '\n  VERDE — o ciclo de arsenal anda e nenhuma arma quebra\n'
               : '\n  VERMELHO — o ciclo não serve para conferir o arsenal\n');
process.exit(ok ? 0 : 1);
