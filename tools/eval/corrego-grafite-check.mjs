/* ============================================================================
   corrego-grafite-check.mjs — PIXO É EM PAREDE, NÃO EM LATARIA.
   ----------------------------------------------------------------------------
   Relato do dono: "tem grafites e pixacoes num carro, na kombi onde nao deveria".

   POR QUE ACONTECE: a `graffiti_pass` acha parede por RAYCAST e pinta o que o
   raio encontrar. A lateral de uma Kombi parada é uma parede perfeita para o
   teste — vertical, plana, opaca, alta o bastante. Não há nada no algoritmo que
   diga "isto anda".

   O QUE ESTA RÉGUA COBRA: zero peça de arte ancorada dentro do volume de um
   veículo. A conta de "está na lataria?" é a MESMA função `veiculoNoPonto`
   exportada pelo mapa, que também alimenta o `excluir` da passada — régua e
   passada com contas separadas divergem calado (é o BUG-02 da casa).

   ESCOPO: mede o layout ASSADO (`GRAFITE.corrego`), que é o que o jogo desenha.
   O `excluir` no `grafitar` protege as RE-ASSADAS futuras; o layout de hoje foi
   filtrado pela mesma conta.

   MUTAÇÃO (`--mutante=<id>`): reintroduz uma peça na lataria e a régua tem que
   acender.
   ============================================================================ */
import './harness.mjs';
import { CORREGO_VEICULOS, veiculoNoPonto } from '../../public/js/map_corrego.js';
import { GRAFITE } from '../../public/js/graffiti_layout.js';

const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const MUTANTES = new Set(['peca-na-kombi', 'peca-no-fusca']);
if (mutante && !MUTANTES.has(mutante)) {
  console.error(`mutante desconhecido: ${mutante} (conhecidos: ${[...MUTANTES].join(', ')})`);
  process.exit(2);
}

const c = GRAFITE.corrego;
if (!c) { console.error('sem layout assado para o córrego'); process.exit(1); }
const pecas = c.pecas.slice();

/* o mutante põe de volta uma peça no lugar exato em que ela estava antes do conserto */
if (mutante === 'peca-na-kombi') pecas.push([0, -18.34, 1.60, 0.14, 0, 0.6, 0.4]);
if (mutante === 'peca-no-fusca') pecas.push([0, -17.18, 1.30, -0.21, 0, 0.6, 0.4]);

const naLataria = pecas.filter((q) => veiculoNoPonto(q[1], q[2], q[3]));
const porVeiculo = new Map();
for (const q of naLataria) {
  let melhor = null, dist = Infinity;
  for (const [id, vx, vz] of CORREGO_VEICULOS) {
    const d = Math.hypot(q[1] - vx, q[3] - vz);
    if (d < dist) { dist = d; melhor = `${id} (${vx}, ${vz})`; }
  }
  porVeiculo.set(melhor, (porVeiculo.get(melhor) || 0) + 1);
}

console.log(`\n[corrego-grafite] ${pecas.length} peças assadas · ${CORREGO_VEICULOS.length} veículos no mapa`);
console.log(`  peças ancoradas em lataria: ${naLataria.length}`);
for (const [v, n] of porVeiculo) console.log(`    · ${v}: ${n}`);

const checks = [
  ['GRAF1 nenhuma peça de arte ancorada em veículo', naLataria.length === 0, `${naLataria.length} peça(s)`],
  ['GRAF2 o mapa ainda tem grafite (o conserto não apagou a passada)', pecas.length >= 300, `${pecas.length} peças`],
];

let vermelho = 0;
console.log('');
for (const [nome, ok, det] of checks) {
  console.log(`  ${ok ? '✓' : '✗'} ${nome}${ok ? '' : ` — ${det}`}`);
  if (!ok) vermelho++;
}
if (mutante) {
  if (vermelho === 0) { console.error(`\nMUTANTE ${mutante} NÃO FOI PEGO — a régua não morde.`); process.exit(1); }
  console.log(`\nmutante ${mutante}: ${vermelho} cláusula(s) vermelha(s) — a régua mordeu.`);
  process.exit(0);
}
if (vermelho) { console.error(`\nCÓRREGO-GRAFITE VERMELHO · ${vermelho} cláusula(s)`); process.exit(1); }
console.log('\nCÓRREGO-GRAFITE OK — a arte está em parede');
