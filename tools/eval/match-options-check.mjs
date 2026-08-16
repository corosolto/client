/* MATCH-OPTIONS-CHECK — o seletor de rounds governa a duração real da partida.

   A tela de mapas oferece 1/3/5/7 rounds. Esta régua instancia a classe Game de produção
   nos dois modos e prova que o número escolhido é a quantidade disputada, não uma série
   "melhor de N" que termina assim que um lado alcança maioria. Os padrões históricos
   continuam 5 no mata-mata e 3 no captura quando a opção não é informada.

   A regressão visual/de-wiring é cobrada por UIR33 em redesign-check.mjs. Aqui o mutante
   `fixo` descarta a escolha antes de construir o jogo; `maioria` restaura o encerramento
   antecipado em 3 × 0 quando o jogador escolheu 5. Ambos precisam deixar a régua vermelha.

   Uso: npm run eval:matchoptions
        node tools/eval/match-options-check.mjs --mutante=fixo
        node tools/eval/match-options-check.mjs --mutante=maioria
*/
import { bootGame, initTextures } from './harness.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const textures = initTextures();
const failures = [];
const rows = [];

function expect(ok, message) {
  if (!ok) failures.push(message);
}

for (const ctf of [false, true]) {
  for (const selected of [1, 3, 5, 7]) {
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

console.log('┌─ MATCH-OPTIONS-CHECK');
for (const row of rows) console.log(`│ ${row}`);
console.log('└─');

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
console.log('\nVERDE — 1/3/5/7 são rounds disputados nos dois modos; padrões 5/3 preservados.');
