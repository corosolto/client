/* Vãos puláveis medidos nas Box3 das superfícies realmente desenhadas.

   plans/10-LAJES.md limita a 1,8 m. Os dois links sul usam uma ilha intermediária;
   cada par de bordas é medido, sem aceitar o número escrito no comentário do mapa.
   A revisão visual de 11/08 acrescentou a leitura do vão: cada salto precisa de
   borda amarela de 15–20 cm nos dois lados e a cobertura precisa declarar três
   linhas de rota. Mutantes: `vao-grande` e `bordas-invisiveis`.
*/
import { THREE, bootGame, initTextures } from './harness.mjs';

const game = bootGame('fy_lajes', { textures: initTextures(), bots: 0 });
game.world.root.updateMatrixWorld(true);
const surfaces = new Map();
const edges = [], landingEdges = [], routes = [], wings = [], cables = [];
game.world.root.traverse((object) => {
  if (object.userData?.jumpSurface) surfaces.set(object.userData.jumpSurface, object);
  if (object.userData?.jumpEdge) edges.push(object);
  if (object.userData?.roofRoute) routes.push(object);
  if (object.userData?.jumpLandingEdge) landingEdges.push(object);
  if (object.userData?.lajesWing) wings.push(object);
  if (object.userData?.overheadCable) cables.push(object);
});
if (process.argv.includes('--mutante=vao-grande')) {
  const island = surfaces.get('south-west-island');
  if (island) { island.position.x += .5; island.updateMatrixWorld(true); }
}
if (process.argv.includes('--mutante=bordas-invisiveis')) for (const edge of edges) edge.visible = false;
if (process.argv.includes('--mutante=pouso-sem-borda')) for (const edge of landingEdges) edge.visible = false;
if (process.argv.includes('--mutante=alas-clonadas')) for (const wing of wings) wing.userData.lajesWing = 'same';
if (process.argv.includes('--mutante=cabo-alias')) for (const cable of cables) cable.userData.cableDiameter = .01;
const pairs = [
  ['south-west-building','south-west-island'], ['south-west-island','south-center-building'],
  ['south-center-building','south-east-island'], ['south-east-island','south-east-building'],
];
const gap = (a,b) => {
  const A = new THREE.Box3().setFromObject(a), B = new THREE.Box3().setFromObject(b);
  return Math.max(0, Math.max(B.min.x - A.max.x, A.min.x - B.max.x,
    B.min.z - A.max.z, A.min.z - B.max.z));
};
let falhas = 0;
for (const [a,b] of pairs) {
  const A = surfaces.get(a), B = surfaces.get(b), value = A && B ? gap(A,B) : Infinity;
  const ok = value <= 1.8;
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${a} ↔ ${b}: ${Number.isFinite(value) ? value.toFixed(3) : 'ausente'} m / 1,800 m`);
}
const bordasLegiveis = edges.filter((edge) => edge.visible !== false && edge.userData.jumpEdgeWidth >= .15 && edge.userData.jumpEdgeWidth <= .2);
const rotasLegiveis = new Set(routes.filter((route) => route.visible !== false).map((route) => route.userData.roofRoute));
if (bordasLegiveis.length < 8) { falhas++; console.log(`✗ bordas dos vãos: ${bordasLegiveis.length}/8 com 15–20 cm`); }
else console.log(`✓ bordas dos vãos: ${bordasLegiveis.length}/8 com 15–20 cm`);
if (rotasLegiveis.size < 3) { falhas++; console.log(`✗ linhas de rota: ${rotasLegiveis.size}/3`); }
else console.log(`✓ linhas de rota: ${rotasLegiveis.size}/3`);
const pousos = new Set(landingEdges.filter((edge) => edge.visible !== false && edge.userData.jumpEdgeWidth >= .15 && edge.userData.jumpEdgeWidth <= .2)
  .map((edge) => edge.userData.jumpLandingEdge));
if (pousos.size < pairs.length) { falhas++; console.log(`✗ bordas frontais de pouso: ${pousos.size}/${pairs.length}`); }
else console.log(`✓ bordas frontais de pouso: ${pousos.size}/${pairs.length}`);
const alas = new Set(wings.map((wing) => wing.userData.lajesWing));
const coresAlas = new Set(wings.map((wing) => wing.material?.color?.getHex?.()).filter(Number.isFinite));
if (alas.size < 3 || coresAlas.size < 3) { falhas++; console.log(`✗ identidade por ala: ${alas.size}/3 nomes · ${coresAlas.size}/3 cores`); }
else console.log(`✓ identidade por ala: ${alas.size}/3 nomes · ${coresAlas.size}/3 cores`);
if (cables.some((cable) => cable.userData.cableDiameter < .055)) { falhas++; console.log('✗ cabo aéreo abaixo de 5,5 cm'); }
else console.log(`✓ cabos aéreos: ${cables.length ? 'espessura legível' : 'removidos'}`);
if (falhas) { console.error(`LAJES-VÃOS FALHA: ${falhas}/${pairs.length + 5}`); process.exitCode = 1; }
else if (process.argv.some((arg) => arg.startsWith('--mutante='))) { console.error('MUTANTE sobreviveu'); process.exitCode = 1; }
else console.log('LAJES-VÃOS OK');
