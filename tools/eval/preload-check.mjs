/* ============================================================================
   preload-check.mjs — A PARTIDA CARREGA O ROSTER SORTEADO, NÃO O ELENCO INTEIRO
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Em 20/08/2026 o painel de desempenho mostrava 98% das sessões abaixo de 30 FPS
   e o funil perdia 80% dos jogadores na splash. O diagnóstico (Emerson, confirmado
   lendo main.js:1004): o clique em JOGAR baixava os ~44 GLBs de personagem de uma
   vez (`preloadCharacterAssets([...GLB_CHARS])`) — pico de VRAM e main thread
   compilando shader por segundos em GPU integrada/Windows. O #368 cortou para as
   2 facções da partida (~18 GLBs); esta régua guarda o passo seguinte: carregar
   só o ROSTER sorteado (teamSize×2 ≈ 8).

   MEDIDO (20/08/2026, ?debug&auto=P,mst, cache off, GLBs de personagem distintos até
   `state === 'live'`): 17 antes → 9 depois (8 do roster + 1 da tela de carregamento).

   O QUE ELA MEDE
   (a) main.js sorteia o roster ANTES do preload e carrega só esses ids;
   (b) o Game honra o roster recebido (não re-sorteia outro elenco por cima);
   (c) a troca de time (M) não materializa GLB fora do carregado sem fallback.
   Uma partida usa ~8 personagens; qualquer coisa além disso é peso morto no boot
   mais lento do funil inteiro.

   Mutantes: elenco-inteiro (volta o spread de GLB_CHARS) e sem-roster (o Game
   para de receber o roster) devem acender PL1.

   Uso: node tools/eval/preload-check.mjs [--mutante=elenco-inteiro|sem-roster]
   ============================================================================ */
import { readFileSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
let main = readFileSync('public/js/main.js', 'utf8');
let game = readFileSync('public/js/game.js', 'utf8');

if (MUT === 'elenco-inteiro') main = main.replace(/preloadCharacterAssets\([^)]*\)/, 'preloadCharacterAssets([...GLB_CHARS])');
if (MUT === 'sem-roster') main = main.replace(/,\s*matchRoster,/, ',');

const falhas = [];

// PL1a — o sorteio acontece antes do preload e alimenta a lista de carga.
if (!/matchRoster\s*=\s*pickMatchRoster\(/.test(main))
  falhas.push('PL1 main.js não sorteia pickMatchRoster antes do preload');
/* Percorre TODOS os call sites do preload (menu, preview, partida) e segue a CADEIA de definição
   do argumento: prender a régua ao nome `_charsToLoad` cegava o mutante quando ele mudava. */
const _derivaDoRoster = (expr) => {
  const vistos = new Set();
  let atual = expr.trim();
  for (let i = 0; i < 4 && atual && !vistos.has(atual); i++) {
    if (/matchRoster/.test(atual)) return true;
    vistos.add(atual);
    const def = main.match(new RegExp(`(?:const|let|var)\\s+${atual.replace(/[^\w$]/g, '')}\\s*=([\\s\\S]{0,400}?);`));
    if (!def) return false;
    if (/matchRoster/.test(def[1])) return true;
    atual = (def[1].match(/[_$\w]+/g) || []).find((t) => new RegExp(`(?:const|let|var)\\s+${t}\\s*=`).test(main)) || '';
  }
  return false;
};
/* Só o PRIMEIRO argumento: a chamada ganhou um 2º (a lista de armas da partida), e seguir a
   cadeia do texto inteiro dava a lista errada. Vírgula de topo, sem entrar em {...} nem (...). */
const _primeiro = (txt) => {
  let prof = 0;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if ('([{'.includes(c)) prof++;
    else if (')]}'.includes(c)) prof--;
    else if (c === ',' && prof === 0) return txt.slice(0, i);
  }
  return txt;
};
const _chamadas = [...main.matchAll(/preloadCharacterAssets\(([\s\S]*?)\)[,;\s]/g)].map((m) => _primeiro(m[1]));
if (!_chamadas.length) falhas.push('PL1 nenhum preload de personagem no main.js');
if (_chamadas.some((a) => /GLB_CHARS/.test(a)))
  falhas.push('PL1 preload voltou a subir o elenco inteiro (44 GLBs no boot da partida)');
if (!_chamadas.some(_derivaDoRoster))
  falhas.push('PL1 preload não carrega a lista derivada do roster');
if (!/new Game\(\{[\s\S]{0,900}?matchRoster/.test(main))
  falhas.push('PL1 main.js não entrega o roster ao Game (o Game re-sorteia = GLB fora do preload)');

// PL1b — o Game recebe o roster e NÃO re-sorteia quando ele vem de fora.
if (!/matchRoster\s*=\s*null/.test(game) || !/matchRoster \|\| pickMatchRoster\(/.test(game))
  falhas.push('PL1 game.js não honra o roster recebido (re-sorteio = GLB fora do preload = procedural)');
if (!/pickMatchRoster\(playerFaction, enemyFaction/.test(game) || !/export function pickMatchRoster/.test(game))
  falhas.push('PL1 pickMatchRoster não existe exportada no game.js');

// PL1c — a troca de time prefere personagem já carregado (sem GLB novo no meio da partida).
if (!/hasModel\(c\.id\)/.test(game))
  falhas.push('PL1 _switchTeam não prefere hasModel no swap do bot (cai em procedural ou pede GLB novo)');

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m PL1 preload da partida = roster sorteado (~8 GLBs), Game honra, M não materializa fora do carregado');
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
  falhas.push('mutacao-cega');   // prova que não morde é vermelho, não aviso
}
process.exit(falhas.length ? 1 : 0);
