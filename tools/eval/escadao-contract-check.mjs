/* Contrato específico do Escadão: flancos justos + caveirão não perfeito.

   Mede Game._losClear contra a malha/occluders reais. Os dois desembarques de beco
   não podem ver nenhum slot de spawn; quem se protege atrás do blindado ainda deve
   estar exposto por dois ângulos laterais e pelo topo.

   Mutações: --mutante=sem-bloqueio-flanco | caveirao-perfeito | caminhao-bau
*/
import { THREE, initTextures, bootGame } from './harness.mjs';

const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const game = bootGame('fy_escadao', { textures: initTextures(), ctf: true, seed: 8012 });
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
const observadores = [olhos(-4, 8), olhos(4, 8), olhos(0, -20)];
const angulosAbertos = observadores.filter((origem) => game._losClear(origem, protegido)).length;

let landmark = null;
world.root.traverse((object) => { if (object.userData?.landmark === 'caveirao') landmark = object; });
if (mutante === 'caminhao-bau') landmark = null;
const size = new THREE.Vector3();
if (landmark) new THREE.Box3().setFromObject(landmark).getSize(size);
const cascoOk = !!landmark && size.x >= 4.4 && size.x / size.z >= 1.65 && size.y >= 2.5 && size.y <= 3.6;

const checks = [
  ['saídas dos dois becos sem LOS de spawn', visadasSpawn === 0, `visadas=${visadasSpawn}`],
  ['caveirão exposto por 2 laterais + topo', angulosAbertos === 3, `ângulos=${angulosAbertos}/3`],
  ['casco blindado monovolume', cascoOk, `bbox=${size.toArray().map((v) => v.toFixed(2)).join('x')}`],
];
let falhas = 0;
for (const [nome, ok, detalhe] of checks) { if (!ok) falhas++; console.log(`${ok ? '✓' : '✗'} ${nome} (${detalhe})`); }
if (falhas) {
  console.error(`ESCADÃO-CONTRATO FALHA: ${falhas}/${checks.length}${mutante ? ` (mutante ${mutante} mordido)` : ''}`);
  process.exitCode = 1;
} else if (mutante) {
  console.error(`MUTANTE ${mutante} sobreviveu.`); process.exitCode = 1;
} else console.log('ESCADÃO-CONTRATO OK');
