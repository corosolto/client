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
import { registerPropTemplate } from '../../public/js/mapprops.js';

const mapURL = new URL('../../public/js/map_piscina.js', import.meta.url);
const source = readFileSync(mapURL, 'utf8');
const marker = '  batchStaticBoxes();\n  grafitar({';
assert.equal(source.split(marker).length, 2, 'actual map must batch before placement');
const lateMarker = '  return {\n    ambience,\n    root, colliders,';
assert.equal(source.split(lateMarker).length, 2, 'order mutant must identify one map return');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && MUT !== 'lote-sem-permissao') { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }
async function importaMapa(texto) {
  const resolvido = texto.replace(/(\bfrom\s*)(['"])([^'"\n]+)\2/g, (_full, prefix, _quote, specifier) =>
    prefix + JSON.stringify(specifier.startsWith('.') ? new URL(specifier, mapURL).href : import.meta.resolve(specifier)));
  return import(`data:text/javascript,${encodeURIComponent(resolvido)}`);
}
let mutant;
try { mutant = await importaMapa(source.replace(marker, '  grafitar({').replace(lateMarker, '  batchStaticBoxes();\n' + lateMarker)); }
catch (error) { throw new Error(`Order mutant import failed: ${error.message.slice(0, 200)}`); }
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

/* Lote dos props autorais (#1109). `batchAuthoredProps` troca os grupos `piscina:<id>`
   por um InstancedMesh na raiz, e o grupo é quem carrega `graffitiSupportExcluded`. Sem
   repassar a permissão, os lotes viravam parede pintável e o bake da piscina ia de 475 a
   504 peças. Em node o GLB não existe e o lote saía vazio, então o template é registrado
   aqui. */
const AUTORAIS = ['piscina_escada', 'piscina_armarios', 'piscina_banco', 'piscina_espreguicadeira'];
const marcaLote = '      batch.userData.graffitiSupportExcluded = !superficieGrafitavel(first);\n      const matrix = new THREE.Matrix4();';
assert.equal(source.split(marcaLote).length, 2, 'authored batch must carry the paint permission');
const geoProp = new THREE.BoxGeometry(1, 1, 1), matProp = new THREE.MeshLambertMaterial();
for (const id of AUTORAIS) { const g = new THREE.Group(); g.add(new THREE.Mesh(geoProp, matProp)); registerPropTemplate(id, g); }
let lotes;
try {
  const alvo = MUT === 'lote-sem-permissao'
    ? await importaMapa(source.replace(marcaLote, '      const matrix = new THREE.Matrix4();'))
    : { buildPoolDay: MAPS.piscina_treta.build };
  seedRandom(12345); const w = alvo.buildPoolDay(new THREE.Scene(), textures);
  lotes = w.root.children.filter((o) => o.isInstancedMesh && /^piscina:piscina_.*:batch$/.test(o.name));
} finally { for (const id of AUTORAIS) registerPropTemplate(id, null); }
assert.ok(lotes.length > 0, 'authored props must batch when their GLB exists');
const pintaveis = lotes.filter((o) => superficieGrafitavel(o)).map((o) => o.name);
console.log(JSON.stringify({ gate: 'authored-batch-permission', lotes: lotes.length, pintaveis }));
if (pintaveis.length) {
  console.log(`  ✗ lote de prop autoral pintável: ${pintaveis.join(', ')}`);
  process.exit(1);
}
if (MUT) { console.log(`  ✗ MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`); process.exit(1); }

assert.equal(readFileSync(mapURL, 'utf8'), source, 'production map was never patched by mutant');
console.log('Piscina batch gate: real geometry, order mutation, exclusion, authored batch permission and physics parity passed');
