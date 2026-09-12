import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

const file = 'public/models/ambient/calango.glb';
const bytes = readFileSync(file);
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength));
const binary = Buffer.from(bytes.subarray(28 + jsonLength));
const primitive = gltf.meshes[0].primitives[0];
const positionAccessor = gltf.accessors[primitive.attributes.POSITION];
const positionView = gltf.bufferViews[positionAccessor.bufferView];
const indexAccessor = gltf.accessors[primitive.indices];
const indexView = gltf.bufferViews[indexAccessor.bufferView];
const indexOffset = (indexView.byteOffset || 0) + (indexAccessor.byteOffset || 0);
const readIndex = indexAccessor.componentType === 5123 ? 'readUInt16LE' : 'readUInt32LE';
const indexBytes = indexAccessor.componentType === 5123 ? 2 : 4;
const indices = Array.from({ length: indexAccessor.count }, (_, index) => binary[readIndex](indexOffset + index * indexBytes));
const mutante = process.argv.find(arg => arg.startsWith('--mutante='))?.split('=')[1];
if (mutante && !['recoloca-triangulo', 'textura-trocada', 'cache-velho'].includes(mutante)) throw Error(`Mutante desconhecido: ${mutante}`);
if (mutante === 'recoloca-triangulo') {
  if (indices.length !== 4957 * 3) throw Error('Mutante requer derivado corrigido com 4957 triângulos');
  indices.splice(1118 * 3, 0, 1409, 1410, 1411);
}
const position = index => Array.from({ length: 3 }, (_, axis) => binary.readFloatLE((positionView.byteOffset || 0) + (positionAccessor.byteOffset || 0) + index * (positionView.byteStride || 12) + axis * 4));
const areas = [];
for (let index = 0; index < indices.length; index += 3) {
  const [a, b, c] = indices.slice(index, index + 3).map(position);
  const u = b.map((v, axis) => v - a[axis]), v = c.map((value, axis) => value - a[axis]);
  areas.push(Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2);
}
// O maior triângulo anatômico anterior mede .009191512; evidência em SERTAO-FAUNA-VOO.md.
const encodedIndices = Buffer.alloc(indices.length * 2);
indices.forEach((value, index) => encodedIndices.writeUInt16LE(value, index * 2));
const indicesSha = createHash('sha256').update(encodedIndices).digest('hex');
const surface = indicesSha === '0a0e4fad6cf364dee719467181698078cfdd4650d9879faa1dd1df4aa5b76d17' && indices.length === 4957 * 3 && Math.max(...areas) <= .009191512 * 2;
if (mutante === 'textura-trocada') {
  const image = gltf.bufferViews[gltf.images[0].bufferView]; binary[image.byteOffset] ^= 1;
}
const retained = Buffer.concat(gltf.bufferViews.filter((view, index) => index !== indexAccessor.bufferView).map(view => binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength)));
const retainedSha = createHash('sha256').update(retained).digest('hex');
const preservedStructure = structuredClone(gltf);
preservedStructure.accessors[primitive.indices].count = 14874;
const structureSha = createHash('sha256').update(JSON.stringify(preservedStructure)).digest('hex');
const unchanged = structureSha === '6e24eeb609907e16bb2ee6340fe576454da807dfebeb12a3f1fc3768bd766112' && retainedSha === 'f610f619a79e87f43a0b4860624135812e472d9f2a1880d4511bfba1cf946083';
const source = readFileSync('public/js/ambientlife.js', 'utf8');
const signature = 'export async function preloadAmbientLife';
const start = source.indexOf(signature);
const finish = source.indexOf('\n}', start) + 2;
if (start < 0 || finish < start) throw Error('Preloader real não encontrado');
let preloadSource = source.slice(start, finish).replace('export ', '');
if (mutante === 'cache-velho') {
  const changed = preloadSource.replace('?v=${revision}', '?v=${VERSION}');
  if (changed === preloadSource) throw Error('Mutante cache não aplicou');
  preloadSource = changed;
}
const urls = [];
const preload = runInNewContext(`(${preloadSource})`, {
  ASSETS: { calango: 'models/ambient/calango_quadrupede.glb', rat: 'models/ambient/rat_animated.glb' },
  FAVELA_AMBIENCE_ASSETS: [], templates: new Map(), VERSION: 'version-fixture', console,
  loadGLB: async url => { urls.push(url); return { scene: { traverse() {} }, animations: [] }; },
});
await preload(['calango', 'rat']);
const expectedRevision = createHash('sha256').update(readFileSync('public/models/ambient/calango_quadrupede.glb')).digest('hex').slice(0, 12);
const freshCache = urls.includes(`models/ambient/calango_quadrupede.glb?v=${expectedRevision}`) && urls.includes('models/ambient/rat_animated.glb?v=version-fixture');
const checks = [{ id: 'CS1', ok: surface, triangles: indices.length / 3, largestArea: Math.max(...areas), indicesSha }, { id: 'CS2', ok: unchanged, retainedSha, structureSha }, { id: 'CS3', ok: freshCache, urls, expectedRevision }];
for (const check of checks) console.log(`${check.id} ${check.ok ? 'PASSA' : 'FALHA'} ${JSON.stringify(check)}`);
const failed = checks.filter(check => !check.ok).map(check => check.id);
if (mutante) {
  const target = { 'recoloca-triangulo': 'CS1', 'textura-trocada': 'CS2', 'cache-velho': 'CS3' }[mutante];
  const isolated = failed.length === 1 && failed[0] === target;
  console.log(`MUTANTE ${mutante} ${isolated ? 'ISOLADO' : 'FALHOU'} esperado=${target} observado=${failed.join(',')}`);
  process.exitCode = isolated ? 0 : 1;
} else process.exitCode = failed.length ? 1 : 0;
