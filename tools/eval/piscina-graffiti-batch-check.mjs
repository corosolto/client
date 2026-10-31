/** Actual Piscina geometry must be finalized before graffiti is validated.
 * The in-memory order mutant restores batching after grafitar and reproduces
 * the real 0.596 micrometer wall seam, even after future bakes remove that tag.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { THREE, MAPS, initTextures, seedRandom } from './harness.mjs';
import { GRAFITE } from '../../public/js/graffiti_layout.js';
import { criarSuporteGrafite, superficieGrafitavel } from '../../public/js/graffiti_surface.js';
import { measureGraffitiArea } from './graffiti-area-audit.mjs';

const mapURL = new URL('../../public/js/map_piscina.js', import.meta.url);
const source = readFileSync(mapURL, 'utf8');
const marker = '  batchStaticBoxes();\n  grafitar({';
assert.equal(source.split(marker).length, 2, 'actual map must batch before placement');
const lateMarker = '  return {\n    ambience,\n    root, colliders,';
assert.equal(source.split(lateMarker).length, 2, 'order mutant must identify one map return');
const mutantSource = source.replace(marker, '  grafitar({')
  .replace(lateMarker, '  batchStaticBoxes();\n' + lateMarker)
  .replace(/(\bfrom\s*)(['"])([^'"\n]+)\2/g, (_full, prefix, _quote, specifier) =>
    prefix + JSON.stringify(specifier.startsWith('.') ? new URL(specifier, mapURL).href : import.meta.resolve(specifier)));
let mutant;
try { mutant = await import(`data:text/javascript,${encodeURIComponent(mutantSource)}`); }
catch (error) { throw new Error(`Order mutant import failed: ${error.message.slice(0, 200)}`); }

/* Relato #1171: arte idêntica não se repete lado a lado e nenhuma peça cruza a faixa
 * azul perimetral (o plano atrás + a faixa à frente produziam z-fighting). Os mutantes
 * desligam cada proteção no mesmo build real e precisam reproduzir os dois defeitos. */
const pecasDo = (world) => world.root.userData.graffitiPecas || [];
const repeticoes = (pecas, distancia = 9) => {
  let n = 0;
  for (let i = 0; i < pecas.length; i++) for (let j = 0; j < i; j++) {
    const a = pecas[i], b = pecas[j];
    if (a.f !== b.f || Math.abs(Math.cos(a.ry - b.ry)) < 0.9) continue;
    const nx = Math.sin(a.ry), nz = Math.cos(a.ry), dx = a.x - b.x, dz = a.z - b.z;
    if (Math.abs(dx * nx + dz * nz) > 0.3) continue;
    const tangente = Math.abs(dx * Math.cos(a.ry) - dz * Math.sin(a.ry));
    if (tangente < distancia) n++;
  }
  return n;
};
const cruzaFaixa = (p) => p.y - p.h / 2 < 2.6 && p.y + p.h / 2 > 2
  && (Math.abs(Math.abs(p.x) - 16.97) < 0.2
    || Math.abs(Math.abs(p.x) - 20.97) < 0.2
    || Math.abs(Math.abs(p.z) - 24.97) < 0.2);
const artesNaFaixa = (world) => {
  const nomes = [];
  world.root.traverse((o) => {
    if (!o.isMesh || o.userData?.pecas || !/^(?:decal:|mural:|poster:)/.test(o.name || '')) return;
    const box = new THREE.Box3().setFromObject(o);
    if (box.min.y < 2.6 && box.max.y > 2) nomes.push(o.name);
  });
  return nomes;
};
const buildPiscina = (mutante = '') => {
  const antes = process.env.PISCINA_GRAFFITI_MUTANT;
  if (mutante) process.env.PISCINA_GRAFFITI_MUTANT = mutante; else delete process.env.PISCINA_GRAFFITI_MUTANT;
  try {
    seedRandom(12345);
    const world = MAPS.piscina_treta.build(new THREE.Scene(), initTextures());
    world.root.updateMatrixWorld(true);
    return world;
  } finally {
    if (antes === undefined) delete process.env.PISCINA_GRAFFITI_MUTANT;
    else process.env.PISCINA_GRAFFITI_MUTANT = antes;
  }
};
const producao = buildPiscina(), mutRep = buildPiscina('repeticao'), mutFaixa = buildPiscina('faixa');
assert.equal(repeticoes(pecasDo(producao)), 0, 'produção não repete o mesmo grafite no mesmo muro a menos de 9 m');
assert.ok(repeticoes(pecasDo(mutRep)) > 0, 'mutante sem filtro reproduz grafites repetidos');
assert.equal(pecasDo(producao).filter(cruzaFaixa).length, 0, 'produção não pinta por cima da faixa azul');
assert.equal(artesNaFaixa(producao).length, 0, 'cartaz, mural ou decal manual não invade a faixa azul');
assert.ok(pecasDo(mutFaixa).filter(cruzaFaixa).length > 0, 'mutante sem exclusão reproduz z-fighting na faixa azul');
assert.ok(artesNaFaixa(mutFaixa).length > 0, 'mutante recoloca arte manual sobre a faixa azul');
console.log(JSON.stringify({ gate: 'piscina-editorial', pecas: pecasDo(producao).length,
  repeticoesMutante: repeticoes(pecasDo(mutRep)), faixaMutante: pecasDo(mutFaixa).filter(cruzaFaixa).length,
  arteManualMutante: artesNaFaixa(mutFaixa).length }));
const textures = initTextures(), savedLayout = GRAFITE.piscina_treta;
assert.ok(textures.decalFiles.includes('tags-treino-04.png'), 'fixture uses real artwork');
GRAFITE.piscina_treta = { arquivos: ['tags-treino-04.png'], pecas: [
  [0, -18.03, 5.948, -12.519, -1.571, 4.8, 1.604], // crosses Float32 seam
  [0, -16.97, 5.65, -18, 1.571, 2, 2], // wholly backed by one actual wall
], murais: [] };
window.__grafiteLive = false;
let good, old;
try {
  seedRandom(12345); good = MAPS.piscina_treta.build(new THREE.Scene(), textures);
  seedRandom(12345); old = mutant.buildPoolDay(new THREE.Scene(), textures);
} finally { GRAFITE.piscina_treta = savedLayout; }
good.root.updateMatrixWorld(true); old.root.updateMatrixWorld(true);
const pieces = good.root.userData.graffitiPecas || [], oldPieces = old.root.userData.graffitiPecas || [];
assert.equal(pieces.length, 1, 'real batched scene keeps supported control only');
assert.equal(oldPieces.length, 2, 'late-batch mutant still emits invalid seam-crossing art');
const independent = criarSuporteGrafite(good.root);
for (const p of pieces) {
  assert.ok(independent(p), 'retained art meets final production coverage');
  assert.ok((await measureGraffitiArea(good.root, p, THREE, superficieGrafitavel)).supported, 'retained art meets independent full-area coverage');
}
const invalid = oldPieces.find(p => p.z === -12.519);
const area = await measureGraffitiArea(old.root, invalid, THREE, superficieGrafitavel);
assert.equal(area.supported, false);
assert.ok(area.uncoveredArea > 9e-7 && area.uncoveredArea < 1e-6, 'mutant reproduces real Float32 gap area');
console.log(JSON.stringify({ gate: 'actual-final-geometry', retained: pieces.length, mutantRetained: oldPieces.length,
  mutantUncoveredArea: area.uncoveredArea, orderMutationDetected: true }));

const pickups = world => world.pickups.map(({ x, z, kind, weapon, readyAt }) => ({ x, z, kind, weapon, readyAt }));
for (const [name, before, after] of [['colliders', old.colliders, good.colliders], ['spawns', old.spawns, good.spawns], ['pickups', pickups(old), pickups(good)]]) {
  assert.deepEqual(after, before, `${name} unaffected by batch order`);
  console.log(JSON.stringify({ gate: `${name}-parity`, equal: true, sha256: createHash('sha256').update(JSON.stringify(after)).digest('hex') }));
}
assert.deepEqual(good.root.userData.piscinaBatch, old.root.userData.piscinaBatch);
const ray = new THREE.Raycaster(); ray.far = 100;
let rays = 0;
for (const x of [-20, -16, 0, 16, 20]) for (const z of [-23, -11, 0, 11, 23]) for (const y of [.5, 1.5, 3.5, 5.5]) for (let a = 0; a < 8; a++) {
  ray.set(new THREE.Vector3(x, y, z), new THREE.Vector3(Math.sin(a * Math.PI / 4), 0, Math.cos(a * Math.PI / 4)));
  const before = ray.intersectObjects(old.occluders, false)[0]?.distance;
  const after = ray.intersectObjects(good.occluders, false)[0]?.distance;
  assert.equal(before === undefined, after === undefined, 'same rays reach physical geometry');
  if (before !== undefined) assert.ok(Math.abs(before - after) < 1e-10, 'nearest physical hit is unchanged');
  rays++;
}
console.log(JSON.stringify({ gate: 'shot-parity', rays, divergent: 0, batch: good.root.userData.piscinaBatch }));
// Flag exclusion is for painting only; nonSolidSurface would also change physics.
const excluded = new THREE.Mesh(new THREE.BoxGeometry(4, 4, .2), new THREE.MeshLambertMaterial());
excluded.position.y = 2; excluded.userData.graffitiSupportExcluded = true;
const root = new THREE.Group(); root.add(excluded);
assert.equal(criarSuporteGrafite(root)({ x: 0, y: 2, z: .13, ry: 0, w: 2, h: 2 }), false);
assert.equal(excluded.userData.nonSolidSurface, undefined);
assert.equal(readFileSync(mapURL, 'utf8'), source, 'production map was never patched by mutant');
console.log('Piscina batch gate: real geometry, order mutation, exclusion and physics parity passed');
