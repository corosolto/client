/** Actual Piscina geometry must be finalized before graffiti is validated.
 * The in-memory order mutant restores batching after grafitar and reproduces
 * the real 0.596 micrometer wall seam, even after future bakes remove that tag.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
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
const invalido = (mensagem) => { console.error(mensagem); process.exit(2); };
const ARGS = process.argv.slice(2);
if (new Set(ARGS).size !== ARGS.length) invalido('argumento duplicado');
const mutanteArgs = ARGS.filter((a) => a.startsWith('--mutante='));
for (const a of ARGS) {
  if (a === '--verificar-mutantes' || a.startsWith('--mutante=')) continue;
  invalido(`argumento desconhecido ou posicional: ${a}`);
}
const DRIVER = ARGS.includes('--verificar-mutantes');
if (DRIVER && mutanteArgs.length) invalido('driver não aceita --mutante junto');
if (mutanteArgs.length > 1) invalido('mutante duplicado');
const MUT = mutanteArgs.length === 1 ? mutanteArgs[0].slice('--mutante='.length) : '';
if (mutanteArgs.length === 1 && MUT === '') invalido('mutante vazio');
if (MUT && MUT !== 'lote-sem-permissao') invalido(`mutante desconhecido: ${MUT}`);
if (DRIVER) {
  const args = ARGS.filter((a) => a !== '--verificar-mutantes');
  const executa = (mutante) => spawnSync(process.execPath,
    [fileURLToPath(import.meta.url), ...args, ...(mutante ? [`--mutante=${mutante}`] : [])],
    { encoding: 'utf8', timeout: 4800000, env: process.env });
  const leRecibo = (r, esperado) => {
    if (r.error || r.signal || r.status === null) invalido('driver: filho em erro, sinal ou status nulo');
    const linhas = `${r.stdout || ''}\n${r.stderr || ''}`.split(/\r?\n/).filter((l) => l.startsWith('PISCINA-BATCH '));
    if (linhas.length !== 1) invalido('driver: recibo ausente, duplicado ou cego');
    let rec;
    try { rec = JSON.parse(linhas[0].slice('PISCINA-BATCH '.length)); } catch { invalido('driver: recibo JSON inválido'); }
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) invalido('driver: recibo não é objeto');
    if (rec.tool !== 'piscina-graffiti-batch') invalido('driver: recibo com ID de ferramenta errado');
    if (rec.mutante !== esperado.mutante) invalido('driver: recibo com mutante errado');
    if (r.status !== esperado.status) invalido(esperado.status === 1 ? 'driver: mutante sem defeito — recibo BlindMutation' : `driver: baseline com saída ${r.status}`);
    if (rec.error !== esperado.error || rec.clausula !== 'authored-batch-permission') invalido('driver: recibo com erro ou cláusula errada');
    if (!Number.isInteger(rec.lotes) || rec.lotes <= 0) invalido('driver: recibo sem lotes inteiros positivos');
    if (!Array.isArray(rec.pintaveis)) invalido('driver: recibo sem pintaveis em array');
    if (esperado.status === 0 && rec.aplicado !== false) invalido('driver: baseline marcado como mutante');
    if (rec.pintaveis.length > rec.lotes || new Set(rec.pintaveis).size !== rec.pintaveis.length) invalido('driver: contagem ou nomes de lotes inconsistentes');
    if (esperado.status === 0 && rec.pintaveis.length) invalido('driver: baseline não pode ter lote pintável');
    if (esperado.status === 1) {
      if (rec.aplicado !== true) invalido('driver: mutante sem marca de aplicação real');
      if (!rec.pintaveis.length || !rec.pintaveis.every((n) => typeof n === 'string' && /^piscina:piscina_.*:batch$/.test(n))) invalido('driver: mutante sem lotes pintáveis instanciados');
    }
    return rec;
  };
  const baseline = leRecibo(executa(''), { status: 0, mutante: '', error: null });
  const mutado = leRecibo(executa('lote-sem-permissao'), { status: 1, mutante: 'lote-sem-permissao', error: 'ContractViolation' });
  if (baseline.lotes !== mutado.lotes) invalido('driver: populações de lotes divergentes');
  process.exit(0);
}
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
let lotes, alvoMutante = false;
try {
  let alvo = { buildPoolDay: MAPS.piscina_treta.build };
  if (MUT === 'lote-sem-permissao') {
    const alterado = source.replace(marcaLote, '      const matrix = new THREE.Matrix4();');
    assert.notEqual(alterado, source, 'authored permission mutation must apply');
    alvo = await importaMapa(alterado);
    alvoMutante = true;
  }

  seedRandom(12345); const w = alvo.buildPoolDay(new THREE.Scene(), textures);
  lotes = w.root.children.filter((o) => o.isInstancedMesh && /^piscina:piscina_.*:batch$/.test(o.name));
} finally { for (const id of AUTORAIS) registerPropTemplate(id, null); }
assert.ok(lotes.length > 0, 'authored props must batch when their GLB exists');
const pintaveis = lotes.filter((o) => superficieGrafitavel(o)).map((o) => o.name);
console.log(JSON.stringify({ gate: 'authored-batch-permission', lotes: lotes.length, pintaveis }));
assert.equal(readFileSync(mapURL, 'utf8'), source, 'production map was never patched by mutant');
if (pintaveis.length) {
  console.log(`  ✗ lote de prop autoral pintável: ${pintaveis.join(', ')}`);
  console.log('PISCINA-BATCH ' + JSON.stringify({ tool: 'piscina-graffiti-batch', mutante: MUT, error: 'ContractViolation', clausula: 'authored-batch-permission', aplicado: alvoMutante && lotes.length > 0, lotes: lotes.length, pintaveis }));
  process.exit(1);
}
if (MUT) {
  const mutacaoCega = true;
  console.log('PISCINA-BATCH ' + JSON.stringify({ tool: 'piscina-graffiti-batch', mutante: MUT, error: 'BlindMutation', clausula: 'authored-batch-permission', aplicado: alvoMutante && lotes.length > 0, lotes: lotes.length, pintaveis }));
  console.log(`  ✗ MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
  process.exit(mutacaoCega ? 2 : 0);
}

console.log('PISCINA-BATCH ' + JSON.stringify({ tool: 'piscina-graffiti-batch', mutante: MUT, error: null, clausula: 'authored-batch-permission', aplicado: false, lotes: lotes.length, pintaveis }));
console.log('Piscina batch gate: real geometry, order mutation, exclusion, authored batch permission and physics parity passed');
