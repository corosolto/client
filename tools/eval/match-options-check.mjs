/* MATCH-OPTIONS-CHECK — o seletor de rounds governa a duração real da partida.

   A tela de mapas oferece 1/3/5/7 rounds. Esta régua instancia a classe Game de produção
   nos dois modos e prova que o número escolhido é a quantidade disputada, não uma série
   "melhor de N" que termina assim que um lado alcança maioria. Os padrões históricos
   continuam 5 no mata-mata e 3 no captura quando a opção não é informada.

   A regressão visual/de-wiring é cobrada por UIR33 em redesign-check.mjs. Aqui o mutante
   `fixo` descarta a escolha antes de construir o jogo; `maioria` restaura o encerramento
   antecipado em 3 × 0 quando o jogador escolheu 5. Ambos precisam deixar a régua vermelha.

   MULTIPLAYER: o servidor (Room do backend) anuncia o teto da sala em `meta.roundsMax`
   (oficiais de rodadas jogam 9) e o fim chega pelo estado `matchEnd` dele. O cliente usa esse
   teto, nunca o LOCAL (senão o HUD mostra "RODADA 1 / 15" numa partida que acaba na 9ª), e
   sem o campo (nó antigo) cai no padrão do Game. Mutantes: `mp-local`, `mp-ignora-servidor`
   (o estado anterior: HUD 1/5 numa sala de 9) e `mp-sem-sanitizar`.

   Uso: npm run eval:matchoptions
        node tools/eval/match-options-check.mjs --mutante=fixo
        node tools/eval/match-options-check.mjs --mutante=maioria
        node tools/eval/match-options-check.mjs --mutante=mp-local
        node tools/eval/match-options-check.mjs --mutante=mp-ignora-servidor
        node tools/eval/match-options-check.mjs --mutante=mp-sem-sanitizar
        node tools/eval/match-options-check.mjs --mutante=modo-preferido
*/
import { readFileSync } from 'node:fs';
import { bootGame, initTextures } from './harness.mjs';
import { sanitizeRounds } from '../../public/js/game.js';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const textures = initTextures();
const failures = [];
const rows = [];

function expect(ok, message) {
  if (!ok) failures.push(message);
}

for (const ctf of [false, true]) {
  for (const selected of [1, 2, 3, 5, 7, 9, 15]) {
    const g = bootGame('praca_poderes', {
      textures,
      ctf,
      roundsMax: MUT === 'fixo' ? undefined : selected,
      seed: 29200 + selected + (ctf ? 100 : 0),
    });
    const mode = ctf ? 'ctf' : 'mata-mata';
    const maioria = Math.floor(selected / 2) + 1;

    if (MUT === 'maioria') {
      g._fimDaPartida = function fimPorMaioria() {
        return this.roundsWon.E >= this.roundsToWin || this.roundsWon.B >= this.roundsToWin
          || this.roundNum >= this.roundsMax || (this.ctf && this.ctfMatchLeft <= 0);
      };
    }

    expect(g.roundsMax === selected, `${mode}/${selected}: Game publicou roundsMax=${g.roundsMax}`);
    g.roundsWon.E = maioria;
    g.roundsWon.B = 0;
    g.roundNum = selected - 1;
    g.ctfMatchLeft = Infinity;
    expect(!g._fimDaPartida(), `${mode}/${selected}: fechou com ${maioria} vitórias antes de disputar o último round`);
    g.roundNum = selected;
    expect(g._fimDaPartida(), `${mode}/${selected}: não fechou no teto de rounds`);
    rows.push(`${mode.padEnd(10)} selecionado=${selected} maioria=${maioria} disputados=${g.roundsMax}`);
    g.dispose?.();
  }
}

for (const [ctf, expected] of [[false, 5], [true, 3]]) {
  const g = bootGame('praca_poderes', { textures, ctf, seed: 29299 + +ctf });
  expect(g.roundsMax === expected, `${ctf ? 'ctf' : 'mata-mata'} padrão=${g.roundsMax}, esperado=${expected}`);
  g.dispose?.();
}

/* MP: no online o teto vem da META do servidor (welcome/partida, backend roundsMax) e nunca do
   ajuste local; sala/nó sem o campo cai no padrão do Game. A expressão real do main.js é
   avaliada com sessões fabricadas, em vez de comparada como texto. */
{
  let main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
  const atual = /roundsMax:\s*sessao\s*\?\s*\(sanitizeRounds\(sessao\.net\.meta\.roundsMax\)\s*\|\|\s*undefined\)\s*:\s*matchRounds\(\)/;
  if (MUT === 'mp-local') main = main.replace(atual, 'roundsMax: matchRounds()');
  if (MUT === 'mp-ignora-servidor') main = main.replace(atual, 'roundsMax: sessao ? undefined : matchRounds()');
  if (MUT === 'mp-sem-sanitizar') main = main.replace(atual, 'roundsMax: sessao ? sessao.net.meta.roundsMax : matchRounds()');
  const linhas = main.match(/^\s*roundsMax:.*$/gm) || [];
  expect(linhas.length === 1, `main.js: esperado 1 roundsMax no new Game, achei ${linhas.length}`);
  const expr = (linhas[0] || '').trim().replace(/^roundsMax:\s*/, '').replace(/,\s*$/, '');
  let avaliar = () => NaN;
  try { avaliar = new Function('sessao', 'matchRounds', 'sanitizeRounds', `return (${expr});`); }
  catch (e) { expect(false, `main.js: expressão do roundsMax não avalia (${expr})`); }
  const local = () => 13;
  const sessao = (meta) => ({ net: { meta } });
  const casos = [
    [sessao({ roundsMax: 9 }), 9, 'sala oficial de 9 rodadas'],
    [sessao({ roundsMax: 3 }), 3, 'captura de 3 rodadas'],
    [sessao({}), undefined, 'nó antigo sem roundsMax (padrão do Game)'],
    [sessao({ roundsMax: 99 }), undefined, 'teto fora de 1–15 vindo da rede'],
    [null, 13, 'offline usa o ajuste local'],
  ];
  for (const [s, esperado, nome] of casos) {
    let veio;
    try { veio = avaliar(s, local, sanitizeRounds); } catch (e) { veio = `erro: ${e.message}`; }
    expect(veio === esperado, `main.js: ${nome} → roundsMax ${veio}, esperado ${esperado} (${expr})`);
  }
  rows.push(`multiplayer       roundsMax = ${expr}`);
}

/* CALLBACK REAL: init ('let matchMode ='→'const menuSetup ='), matchRounds e msRounds.onchange
   extraídos do main e executados em VM — nunca comparados como texto. Mutante modo-preferido. */
{
  let main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
  const recorte = (re, nome) => {
    const m = main.match(re);
    expect(!!m, `main.js: trecho real ${nome} não encontrado`);
    return m ? m[0] : '';
  };
  const init = recorte(/let matchMode = [\s\S]*?\n(?=const menuSetup =)/, 'init do matchMode');
  const fn = recorte(/^function matchRounds\(\) \{[\s\S]*?\n\}/m, 'function matchRounds');
  let cb = recorte(/if \(msRounds\) msRounds\.onchange = \(\) => \{[\s\S]*?\n\};/, 'callback msRounds.onchange');
  /* modo-preferido: reverte SÓ o callback para a preferência (matchMode), ignorando o mapa objetivo. */
  if (MUT === 'modo-preferido') {
    const before = "modoEfetivoAtual() === 'ctf'";
    if (cb.split(before).length !== 3) throw new Error('MUTANTE NÃO APLICOU: callback de rounds');
    cb = cb.replaceAll(before, "matchMode === 'ctf'");
    console.log('Mutação aplicada: modo-preferido');
  }
  const cenarios = [
    ['normal, pref ctf', { ctfMode: true }, 'ctfRounds', 'rounds', 3],
    ['normal, pref rounds', {}, 'rounds', 'ctfRounds', 5],
    ['objetivo, pref ctf', { objectiveMode: 'escolta', ctfMode: true }, 'rounds', 'ctfRounds', 5],
    ['objetivo, pref rounds', { objectiveMode: 'escolta' }, 'rounds', 'ctfRounds', 5],
  ];
  for (const [nome, mapa, campo, outro, invalido] of cenarios) {
    const settings = { rounds: 5, ctfRounds: 3 };
    const msRounds = { value: '9' };
    const noop = () => {};
    let liberado = null;
    try {
      liberado = new Function('settings', 'msRounds', 'MAPS', 'currentMap', 'sanitizeRounds',
        'saveSettings', 'setMapMeta', 'setMapMode', 'renderMapScreen', 'sfx',
        `${init}\n${fn}\n${cb}\nreturn { modoEfetivoAtual, matchRounds, onchange: () => msRounds.onchange() };`
      )(settings, msRounds, { mapa }, 'mapa', sanitizeRounds, noop, noop, noop, noop, { uiClick: noop });
    } catch (e) { expect(false, `${nome}: VM não executou o código real (${e.message})`); continue; }
    liberado.onchange();
    const intactos = settings[campo] === 9 && settings[outro] === (outro === 'rounds' ? 5 : 3);
    expect(intactos, `${nome}: valor 9 gravou ${campo}=${settings[campo]}, ${outro}=${settings[outro]} (esperado 9 e outro intacto)`);
    expect(liberado.matchRounds() === 9, `${nome}: matchRounds()=${liberado.matchRounds()}, esperado 9`);
    msRounds.value = '';
    liberado.onchange();
    expect(settings[campo] === invalido, `${nome}: inválido → ${campo}=${settings[campo]}, padrão esperado ${invalido}`);
    rows.push(`callback ${nome.padEnd(22)} ${campo}=9, ${outro} intacto, matchRounds=9, inválido→${invalido}`);
  }
}

console.log('┌─ MATCH-OPTIONS-CHECK');
for (const row of rows) console.log(`│ ${row}`);
console.log('└─');

if (MUT === 'modo-preferido') {
  const expected = ['objetivo, pref ctf: valor 9 gravou ', 'objetivo, pref ctf: matchRounds()='];
  const semantic = failures.length === expected.length && expected.every(prefix => failures.some(f => f.startsWith(prefix)));
  console.log(JSON.stringify({ mutant: MUT, failed: failures, semantic }));
  process.exit(semantic ? 0 : 1);
}

if (MUT) {
  if (failures.length) {
    console.log(`\n✓ mutante ${MUT}: ${failures.length} cláusulas ficaram VERMELHAS; a régua morde`);
    process.exit(0);
  }
  console.error(`\n✗ mutante ${MUT} passou; a régua não percebeu a opção descartada`);
  process.exit(1);
}

if (failures.length) {
  console.error(`\nVERMELHA (${failures.length}):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log('\nVERDE — 1–15 (incluindo pares) são rounds disputados nos dois modos; padrões 5/3 preservados.');
