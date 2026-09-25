/* Capturas recovered/parque_treta-{west,coreto}.png (07/09/2026): copas
 * opacas atravessavam a câmera de 1,70 m e escondiam o coreto. PC1 mede o
 * envelope REAL de todos os vértices, após matriz de cada instância.
 * A folga editorial proposta é um raio da copa original (1,90 m) acima
 * daquela câmera: 3,60 m. Não é norma botânica nem aprovação estética;
 * protege a correção concreta e ainda exige comparação das mesmas vistas.
 * PC2 evita obter folga apagando árvores ou encolhendo sua largura: são
 * as 55 paineiras e largura mínima de 3 m medidas na recuperação do PR440.
 * node tools/eval/parque-canopy-check.mjs [--mutante=copa-baixa]
 */
import { THREE, MAPS, initTextures } from './harness.mjs';

const mutante = process.argv.find(a => a.startsWith('--mutante='))?.slice(10);
if (mutante && mutante !== 'copa-baixa') throw new Error(`Mutante desconhecido: ${mutante}`);
const world = MAPS.parque_treta.build(new THREE.Scene(), await initTextures());
world.root.updateMatrixWorld(true);
const canopy = world.root.getObjectByName('parque-copas-paineira');
if (!canopy?.isInstancedMesh || !canopy.geometry?.attributes?.position) {
  console.error('PC0 FALHA — copa instanciada ausente; não sei medir');
  process.exit(1);
}
if (mutante) canopy.geometry = canopy.geometry.clone().translate(0, -3, 0);
const pos = canopy.geometry.attributes.position;
const instance = new THREE.Matrix4(), matrix = new THREE.Matrix4(), point = new THREE.Vector3();
const bounds = [];
for (let i = 0; i < canopy.count; i++) {
  canopy.getMatrixAt(i, instance);
  matrix.multiplyMatrices(canopy.matrixWorld, instance);
  const box = new THREE.Box3();
  for (let v = 0; v < pos.count; v++) box.expandByPoint(point.fromBufferAttribute(pos, v).applyMatrix4(matrix));
  bounds.push(box);
}
const low = Math.min(...bounds.map(b => b.min.y));
const width = Math.min(...bounds.map(b => Math.min(b.max.x - b.min.x, b.max.z - b.min.z)));
const pc1 = low >= 1.7 + 1.9;
const pc2 = canopy.count === 55 && width >= 3;
console.log(`PC1 ${pc1 ? 'PASSA' : 'FALHA'} — base mínima ${low.toFixed(3)} m; faixa editorial acima da câmera 3.600 m`);
console.log(`PC2 ${pc2 ? 'PASSA' : 'FALHA'} — ${canopy.count}/55 copas; largura mínima ${width.toFixed(3)} m (>= 3 m)`);
if (mutante) {
  const caught = !pc1 && pc2;
  console.log(caught ? 'MUTANTE MORDIDO — copa-baixa -> PC1' : 'MUTANTE INVÁLIDO OU SOBREVIVENTE');
  process.exit(caught ? 0 : 1);
}
process.exit(pc1 && pc2 ? 0 : 1);
