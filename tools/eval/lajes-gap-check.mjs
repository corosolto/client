/* Tábuas entre lajes medidas nas Box3 das superfícies realmente desenhadas.

   Substituiu a régua dos vãos puláveis (até 11/08 o desenho era ilha de concreto +
   salto): o dono jogou e leu "madeiras no ar sem conexão com nada", e bot não pula —
   ou seja a camada das lajes era visualmente flutuante e mecanicamente fechada.
   O desenho novo é a tábua de favela: prancha de madeira ANCORADA nos dois telhados,
   andável a pé (sem salto), com waypoints em cima para o A* dos bots.

   Esta régua cobra, por ligação declarada:
   1. a tábua existe e toca as DUAS lajes que ela diz ligar (Box3 expandida 0,3 m);
   2. o convés dela está na mesma cota andável das duas pontas (±0,30 m) — tábua
      flutuando acima ou afundada abaixo da laje reprova;
   3. cada prédio declara sua laje (`lajesRoof`), senão a âncora não tem o que medir.

   Identidade por ala (3 marcos, 3 cores) e espessura de cabo aéreo seguem cobrados.
   Mutantes: `tabua-solta` desloca uma tábua e quebra a ancoragem; `tabua-flutuante`
   sobe uma tábua 0,6 m; `alas-clonadas`; `cabo-alias`.
*/
import { THREE, bootGame, initTextures } from './harness.mjs';

const game = bootGame('fy_lajes', { textures: initTextures(), bots: 0 });
game.world.root.updateMatrixWorld(true);
const lajes = new Map(), tabuas = [];
const edges = [], routes = [], wings = [], cables = [];
game.world.root.traverse((object) => {
  if (object.userData?.lajesRoof) lajes.set(object.userData.lajesRoof, object);
  if (object.userData?.lajesTabua) tabuas.push(object);
  if (object.userData?.jumpEdge) edges.push(object);
  if (object.userData?.roofRoute) routes.push(object);
  if (object.userData?.lajesWing) wings.push(object);
  if (object.userData?.overheadCable) cables.push(object);
});
if (process.argv.includes('--mutante=tabua-solta') && tabuas[0]) {
  /* 1,5 m nas duas direções: maior que a sobreposição da tábua com qualquer laje
     (~0,4 m) + a folga da Box3 (0,3 m) — pelo menos uma ponta TEM que descolar */
  tabuas[0].position.x += 1.5; tabuas[0].position.z += 1.5; tabuas[0].updateMatrixWorld(true);
}
if (process.argv.includes('--mutante=tabua-flutuante') && tabuas[0]) {
  tabuas[0].position.y += .6; tabuas[0].updateMatrixWorld(true);
}
if (process.argv.includes('--mutante=alas-clonadas')) for (const wing of wings) wing.userData.lajesWing = 'same';
if (process.argv.includes('--mutante=cabo-alias')) for (const cable of cables) cable.userData.cableDiameter = .01;

const LIGACOES = [
  'NW-WN', 'WN-WS', 'WS-SW',           // coluna oeste, inclusive o vão do beco central
  'NE-EN', 'EN-ES', 'ES-SE',           // coluna leste
  'SW-CS', 'CS-SE',                    // fileira sul (vãos de 6 m)
  'NW-CN', 'CN-NE',                    // rampas para a laje alta do spawn A
  'WN-MN', 'MS-SE', 'CS-MS',           // mirantes laterais e retorno do spawn sul
];

const box = new Map();
for (const [nome, mesh] of lajes) box.set(nome, new THREE.Box3().setFromObject(mesh));
const toca = (t, nome) => {
  const B = box.get(nome);
  if (!B) return false;
  const E = B.clone().expandByScalar(0.3);
  return t.intersectsBox(E);
};
let falhas = 0;
for (const id of LIGACOES) {
  const [a, b] = id.split('-');
  const t = tabuas.find((m) => m.userData.lajesTabua === id);
  if (!t) { falhas++; console.log(`✗ ${id}: tábua ausente`); continue; }
  const T = new THREE.Box3().setFromObject(t);
  const ancorada = toca(T, a) && toca(T, b);
  /* o convés tem que fechar o intervalo entre as duas cotas (rampa) ou casar com
     elas (tábua plana): acima do teto mais alto + 0,3 é madeira no ar, abaixo do
     mais baixo - 0,3 é tábua afundada na laje */
  const cotas = [a, b].map((n) => box.get(n)?.max.y ?? NaN);
  const deck = T.max.y;
  const nivelada = cotas.every(Number.isFinite)
    && deck >= Math.min(...cotas) - 0.30 && deck <= Math.max(...cotas) + 0.30;
  const ok = ancorada && nivelada;
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${id}: ancorada ${ancorada ? 'sim' : 'NÃO'} · deck ${deck.toFixed(2)} · cotas ${cotas.map((c) => c.toFixed(2)).join('/')} `);
}

const alas = new Set(wings.map((wing) => wing.userData.lajesWing));
const coresAlas = new Set(wings.map((wing) => wing.material?.color?.getHex?.()).filter(Number.isFinite));
if (alas.size < 3 || coresAlas.size < 3) { falhas++; console.log(`✗ identidade por ala: ${alas.size}/3 nomes · ${coresAlas.size}/3 cores`); }
else console.log(`✓ identidade por ala: ${alas.size}/3 nomes · ${coresAlas.size}/3 cores`);
if (cables.some((cable) => cable.userData.cableDiameter < .055)) { falhas++; console.log('✗ cabo aéreo abaixo de 5,5 cm'); }
else console.log(`✓ cabos aéreos: ${cables.length ? 'espessura legível' : 'removidos'}`);
if (falhas) { console.error(`LAJES-TÁBUAS FALHA: ${falhas}/${LIGACOES.length + 2}`); process.exitCode = 1; }
else if (process.argv.some((arg) => arg.startsWith('--mutante='))) { console.error('MUTANTE sobreviveu'); process.exitCode = 1; }
else console.log('LAJES-TÁBUAS OK');
