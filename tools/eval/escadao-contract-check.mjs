/* Contrato específico do Escadão: flancos justos + caveirão não perfeito.

   Mede Game._losClear contra a malha/occluders reais. Os dois desembarques de beco
   não podem ver nenhum slot de spawn; quem se protege atrás do blindado ainda deve
   estar exposto por dois ângulos laterais e pelo topo.

   Varal (dono, 20/08: "so o lajes tem cordao de roupas do model"): roupa no morro não é
   enfeite de mirante. Além dos dois do topo, o mapa tem de espalhar varal pelos becos e
   lajes baixas — a cláusula cobra 5 no total e 3 FORA do mirante (base abaixo da cota do
   mirante), que é onde o jogador passa a maior parte da rota.

   Mutações: --mutante=sem-bloqueio-flanco | caveirao-perfeito | caminhao-bau
             --mutante=varal-sumiu (esconde um varal) | varal-so-no-topo (apaga os de baixo)
   Mutante desconhecido sai com código 2.
*/
import { THREE, initTextures, bootGame } from './harness.mjs';

const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const CONHECIDOS = new Set(['sem-bloqueio-flanco', 'caveirao-perfeito', 'caminhao-bau', 'varal-sumiu', 'varal-so-no-topo']);
if (mutante && !CONHECIDOS.has(mutante)) {
  console.error(`mutante desconhecido: ${mutante} (conhecidos: ${[...CONHECIDOS].join(', ')})`);
  process.exit(2);
}
const game = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
game.scene.updateMatrixWorld(true);
const world = game.world;
if (mutante === 'sem-bloqueio-flanco') world.occluders.length = 0;

const olhos = (x, z, extra = 1.62) => new THREE.Vector3(x, world.groundHeightAt(x, z) + extra, z);
const saídas = [olhos(-9, 8.5), olhos(9, 8.5)];
let visadasSpawn = 0;
for (const saída of saídas) for (const slots of Object.values(world.spawns)) for (const spawn of slots) {
  if (game._losClear(saída, olhos(spawn.x, spawn.z))) visadasSpawn++;
}

// A metade oeste do caveirão protege; a quina interna (x=0) é deliberadamente
// vazada pelos observadores laterais e do topo, portanto não vira cover perfeito.
const protegido = olhos(0, 1.5, 1.2);
if (mutante === 'caveirao-perfeito') {
  const caixa = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 10), new THREE.MeshBasicMaterial());
  caixa.position.copy(protegido); game.scene.add(caixa); world.occluders.push(caixa); game.scene.updateMatrixWorld(true);
}
const observadores = [olhos(-4, 8), olhos(4, 8), olhos(0, -12)];
// topo em z=-12: de z=-20 a visada passa 5 cm POR BAIXO do nariz do último degrau (occluder
// desde o BUG-54) — só media "limpa" atravessando o piso. A exposição real começa em z≥-15.
const angulosAbertos = observadores.filter((origem) => game._losClear(origem, protegido)).length;

let landmark = null;
const varais = [];
world.root.traverse((object) => { if (object.userData?.escadaoVaral) varais.push(object); });
/* A cota do mirante é medida no próprio mapa (groundHeightAt no meio do topo), não copiada
   do fonte. Varal com base meio metro abaixo dela está em beco ou laje baixa. */
const alturaTopo = world.groundHeightAt(0, -30);
const noMirante = (varal) => varal.position.y >= alturaTopo - 0.5;
/* `varal-sumiu` some com um varal DO MIRANTE: é ele que a cláusula original guarda. Depois
   que o mapa passou de 2 para 6 varais, sumir com um qualquer deixava as duas cláusulas
   verdes — mutante que não morde mais é régua que parou de medir. */
if (mutante === 'varal-sumiu') { const alvo = varais.find(noMirante); if (alvo) alvo.visible = false; }
if (mutante === 'varal-so-no-topo') { for (const varal of varais) if (!noMirante(varal)) varal.visible = false; }
const visiveis = varais.filter((varal) => varal.visible !== false);
const doTopo = visiveis.filter(noMirante);
const espalhados = visiveis.filter((varal) => !noMirante(varal));
world.root.traverse((object) => { if (object.userData?.landmark === 'caveirao') landmark = object; });
if (mutante === 'caminhao-bau') landmark = null;
const size = new THREE.Vector3();
if (landmark) new THREE.Box3().setFromObject(landmark).getSize(size);
const cascoOk = !!landmark && size.x >= 4.4 && size.x / size.z >= 1.65 && size.y >= 2.5 && size.y <= 3.6;

const checks = [
  ['saídas dos dois becos sem LOS de spawn', visadasSpawn === 0, `visadas=${visadasSpawn}`],
  ['caveirão exposto por 2 laterais + topo', angulosAbertos === 3, `ângulos=${angulosAbertos}/3`],
  ['casco blindado monovolume', cascoOk, `bbox=${size.toArray().map((v) => v.toFixed(2)).join('x')}`],
  ['dois varais visíveis materializam roupa no topo', doTopo.length >= 2, `varais no mirante=${doTopo.length}/2`],
  ['varal espalhado: 5 no mapa, 3 fora do mirante', visiveis.length >= 5 && espalhados.length >= 3,
    `total=${visiveis.length}/5 · fora do mirante=${espalhados.length}/3`],
];
let falhas = 0;
for (const [nome, ok, detalhe] of checks) { if (!ok) falhas++; console.log(`${ok ? '✓' : '✗'} ${nome} (${detalhe})`); }
if (falhas) {
  console.error(`ESCADÃO-CONTRATO FALHA: ${falhas}/${checks.length}${mutante ? ` (mutante ${mutante} mordido)` : ''}`);
  process.exitCode = 1;
} else if (mutante) {
  console.error(`MUTANTE ${mutante} sobreviveu.`); process.exitCode = 1;
} else console.log('ESCADÃO-CONTRATO OK');
