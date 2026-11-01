/** Contrato e limites: docs/reports/GRAFITE-GATES-CONTINUATION-20261101.md. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PREFIX = 'PISCINA-BATCH ';
const PASS_LEGADO = 'Piscina batch gate: real geometry, order mutation, exclusion and physics parity passed';
const MUTANTE = 'lote-sem-permissao';
const CLAUSULA = 'authored-batch-permission';
const GATES = Object.freeze(['piscina-editorial', 'actual-final-geometry', 'colliders-parity',
  'spawns-parity', 'pickups-parity', 'shot-parity', CLAUSULA]);
const AUTORAIS = Object.freeze(['piscina_escada', 'piscina_armarios', 'piscina_banco', 'piscina_espreguicadeira']);
const LOTES_ESPERADOS = Object.freeze(AUTORAIS.map(id => 'piscina:' + id + ':batch').sort());
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SOURCES = Object.freeze(Object.fromEntries(Object.entries({
  checker: './piscina-graffiti-batch-check.mjs', map: '../../public/js/map_piscina.js',
  layout: '../../public/js/graffiti_layout.js', pass: '../../public/js/graffiti_pass.js',
  surface: '../../public/js/graffiti_surface.js', identity: '../../public/js/graffiti_art_id.js',
  harness: './harness.mjs', area: './graffiti-area-audit.mjs',
}).map(([key, path]) => [key, new URL(path, import.meta.url)])));
const sha = value => createHash('sha256').update(value).digest('hex');
const bindings = () => Object.fromEntries(Object.entries(SOURCES).map(([key, url]) => [key, sha(readFileSync(url))]));
const iguais = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function avaliarFilho(r, esperado) {
  const recusa = (reason, kind = 'InfrastructureError') => ({ ok: false, kind, reason });
  if (r.error || r.signal || !Number.isInteger(r.status)) return recusa('filho indisponível/interrompido');
  if (String(r.stderr || '').trim()) return recusa('stderr inesperado');
  const linhas = String(r.stdout || '').trimEnd().split(/\r?\n/);
  const recibos = linhas.filter(l => l.startsWith(PREFIX));
  if (recibos.length !== 1 || linhas.at(-1) !== recibos[0]) return recusa('recibo final único ausente');
  if (linhas.filter(l => l === PASS_LEGADO).length !== 1
    || linhas.some(l => l && l !== PASS_LEGADO && !l.startsWith(PREFIX) && !l.trimStart().startsWith('{')))
    return recusa('saída fora do protocolo');
  let rec, gates;
  try {
    rec = JSON.parse(recibos[0].slice(PREFIX.length));
    gates = linhas.filter(l => l.trimStart().startsWith('{')).map(l => JSON.parse(l));
  } catch { return recusa('JSON inválido'); }
  if (!rec || rec.schema !== 'cs-piscina-batch/1' || rec.nonce !== esperado.nonce || rec.mutante !== esperado.mutante)
    return recusa('identidade/nonce divergente');
  if (!iguais(rec.sourcesBefore, esperado.sources) || !iguais(rec.sourcesAfter, esperado.sources))
    return recusa('binding de fonte divergente');
  if (gates.some(g => !g || typeof g !== 'object' || Array.isArray(g))) return recusa('gate JSON não é objeto');
  if (!iguais(rec.cases, GATES) || !iguais(gates.map(g => g.gate), GATES)) return recusa('censo de gates divergente');
  if (!iguais(rec.batches, LOTES_ESPERADOS))
    return recusa('população de lotes inválida');
  if (!Array.isArray(rec.pintaveis) || new Set(rec.pintaveis).size !== rec.pintaveis.length
    || !rec.pintaveis.every(n => rec.batches.includes(n))) return recusa('lotes pintáveis inválidos');
  const a = rec.application;
  if (!a || a.target !== 'batchAuthoredProps.graffitiSupportExcluded' || a.sourceBefore !== esperado.sources.map
    || !/^[a-f0-9]{64}$/.test(a.sourceAfter)) return recusa('aplicação sem procedência');
  const mutado = esperado.mutante === MUTANTE;
  if (a.count !== (mutado ? 1 : 0) || (a.sourceAfter !== a.sourceBefore) !== mutado) return recusa('aplicação ausente/duplicada/cega');
  const failures = mutado ? [CLAUSULA] : [];
  if (r.status !== (mutado ? 1 : 0) || rec.error !== (mutado ? 'ContractViolation' : null)
    || !iguais(rec.failed, failures) || !iguais(rec.pintaveis, mutado ? LOTES_ESPERADOS : []))
    return recusa('resultado semântico inexato/survivor', 'ContractViolation');
  const medido = gates.at(-1);
  if (medido.lotes !== rec.batches.length || !iguais(medido.pintaveis, rec.pintaveis)) return recusa('recibo diverge da medição');
  return { ok: true, rec };
}

async function medir(MUT) {
  const { THREE, MAPS, initTextures, seedRandom } = await import('./harness.mjs');
  const { GRAFITE } = await import('../../public/js/graffiti_layout.js');
  const { criarSuporteGrafite, superficieGrafitavel } = await import('../../public/js/graffiti_surface.js');
  const { measureGraffitiArea } = await import('./graffiti-area-audit.mjs');
  const { identidadeArteGrafite } = await import('../../public/js/graffiti_art_id.js');
const mapURL = new URL('../../public/js/map_piscina.js', import.meta.url);
const source = readFileSync(mapURL, 'utf8');
const marker = '  batchStaticBoxes();\n';
const placement = '    grafitar({';
assert.equal(source.split(marker).length, 2, 'order mutant must identify one batch call');
assert.equal(source.split(placement).length, 2, 'order mutant must identify one graffiti call');
assert.ok(source.indexOf(marker) < source.indexOf(placement), 'actual map must batch before placement');
const lateMarker = '  return {\n    ambience,\n    root, colliders,';
assert.equal(source.split(lateMarker).length, 2, 'order mutant must identify one map return');
const mutantSource = source.replace(marker, '')
  .replace(lateMarker, '  batchStaticBoxes();\n' + lateMarker)
  .replace(/(\bfrom\s*)(['"])([^'"\n]+)\2/g, (_full, prefix, _quote, specifier) =>
    prefix + JSON.stringify(specifier.startsWith('.') ? new URL(specifier, mapURL).href : import.meta.resolve(specifier)));
let mutant;
try { mutant = await import(`data:text/javascript,${encodeURIComponent(mutantSource)}`); }
catch (error) { throw new Error(`Order mutant import failed: ${error.message.slice(0, 200)}`); }

/* Relato #1171: nenhuma peça cruza a faixa azul perimetral (plano atrás + faixa
 * à frente produziam z-fighting). Contrato 31/10: zero arte repetida no mapa
 * inteiro, manual+assado pela identidade do asset — ver docs/visual-consistency/GRAFITE-REGUA.md. */
const pecasDo = (world) => world.root.userData.graffitiPecas || [];
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
/* Mutante de runtime: guardas `usadas.has` do graffiti_pass DESLIGADOS em memória
 * (data: URL, repo intacto), mapa real construído por módulo que importa o pass
 * mutado. Cruzamento manual×assado é provado no graffiti-curation-check
 * (determinismoReal); aqui os pools manual e assado do mapa são disjuntos. */
const passURL = new URL('../../public/js/graffiti_pass.js', import.meta.url);
const passSource = readFileSync(passURL, 'utf8');
const guardas = passSource.split('usadas.has(').length - 1;
assert.ok(guardas > 0, 'mutante de repetição NÃO APLICOU: sem guardas usadas.has no pass');
const passMutante = passSource.replaceAll('usadas.has(', '(()=>false)(');
assert.ok(!passMutante.includes('usadas.has(') && passMutante !== passSource,
  'mutante de repetição NÃO APLICOU: substituição não casou');
const absoluteImports = (text, owner, overrides = {}) => text.replace(
  /(\bfrom\s*|\bimport\s*)(['"])([^'"\n]+)\2/g,
  (full, prefix, quote, specifier) => {
    const target = overrides[specifier]
      || (specifier.startsWith('.') ? new URL(specifier, owner).href : import.meta.resolve(specifier));
    return `${prefix}${JSON.stringify(target)}`;
  });
const passMutanteURL = `data:text/javascript,${encodeURIComponent(absoluteImports(passMutante, passURL))}`;
const mapaMutanteURL = `data:text/javascript,${encodeURIComponent(
  absoluteImports(source, mapURL, { './graffiti_pass.js': passMutanteURL }))}`;
const chaveDaArte = (p) => {
  const file = String(p.f || '');
  return identidadeArteGrafite(file.startsWith('poster:') ? '/posters/' + file.slice(7) : '/img/decals/' + file);
};
const chaveManual = (name) => chaveDaArte({ f: name.replace(/^(?:decal|mural):/, '') });
const duplicadasGlobais = (world) => {
  const artes = new Map();
  const conta = (key, fonte) => {
    const e = artes.get(key) || { n: 0, fontes: new Set() };
    e.n++; e.fontes.add(fonte); artes.set(key, e);
  };
  for (const p of pecasDo(world)) conta(chaveDaArte(p), 'assado');
  world.root.traverse((o) => {
    if (o.isMesh && !o.userData?.pecas && /^(?:decal:|mural:|poster:)/.test(o.name || ''))
      conta(chaveManual(o.name), 'manual');
  });
  return [...artes].filter(([, e]) => e.n > 1).map(([key, e]) => ({ key, n: e.n, fontes: [...e.fontes] }));
};
const producao = buildPiscina();
const buildMutante = (await import(mapaMutanteURL)).buildPoolDay;
seedRandom(12345);
const mundoMutante = buildMutante(new THREE.Scene(), initTextures());
mundoMutante.root.updateMatrixWorld(true);
const dupMutante = duplicadasGlobais(mundoMutante);
/* Mutante de curadoria: allowlist graffitiWhiteWall do mapa desligada em memória
 * + ganchos de colocação 'faixa' que o produto expõe — a arte manual volta à faixa. */
const allowlist = '  root.traverse(mesh => {\n    if (mesh.isMesh && !mesh.userData.graffitiWhiteWall) mesh.userData.graffitiSupportExcluded = true;\n  });\n';
assert.equal(source.split(allowlist).length, 2, 'faixa mutant must identify the allowlist traverse');
const buildFaixaMutante = (await import(`data:text/javascript,${encodeURIComponent(
  absoluteImports(source.replace(allowlist, ''), mapURL))}`)).buildPoolDay;
const envFaixa = process.env.PISCINA_GRAFFITI_MUTANT;
process.env.PISCINA_GRAFFITI_MUTANT = 'faixa';
let mutFaixa;
try {
  seedRandom(12345);
  mutFaixa = buildFaixaMutante(new THREE.Scene(), initTextures());
  mutFaixa.root.updateMatrixWorld(true);
} finally {
  if (envFaixa === undefined) delete process.env.PISCINA_GRAFFITI_MUTANT;
  else process.env.PISCINA_GRAFFITI_MUTANT = envFaixa;
}
assert.deepEqual(duplicadasGlobais(producao), [], 'produção não repete arte no mapa inteiro (manual+assado)');
assert.ok(dupMutante.length > 0, `mutante sem usadas.has reproduz arte repetida no mapa inteiro (got ${JSON.stringify(dupMutante.slice(0, 2))})`);
assert.ok(dupMutante.some((d) => d.n > 1 && d.fontes.includes('manual')),
  'mutante sem usadas.has reintroduz repetição na colocação manual do próprio mapa');
assert.equal(pecasDo(producao).filter(cruzaFaixa).length, 0, 'produção não pinta por cima da faixa azul');
assert.equal(artesNaFaixa(producao).length, 0, 'cartaz, mural ou decal manual não invade a faixa azul');
/* Arte assada na faixa não volta: layout limpo e nenhuma superfície a aceita;
 * a mordida viva do mutante é a arte MANUAL sobre a faixa. */
assert.ok(artesNaFaixa(mutFaixa).length > 0, 'mutante recoloca arte manual sobre a faixa azul');
console.log(JSON.stringify({ gate: 'piscina-editorial', pecas: pecasDo(producao).length,
  duplicadasMutante: dupMutante.length, arteManualMutante: artesNaFaixa(mutFaixa).length }));
const textures = initTextures(), savedLayout = GRAFITE.piscina_treta;
const posterFiles = [...new Set(textures.posterFiles)];
assert.ok(posterFiles.length >= 2, 'poster identity control requires two distinct real artworks');
const posterRoot = new THREE.Group(), posterMesh = new THREE.Mesh();
posterRoot.userData.graffitiPecas = [{ f: 'poster:' + posterFiles[0] }];
posterMesh.name = 'decal:poster:' + posterFiles[0];
posterRoot.add(posterMesh);
assert.deepEqual(duplicadasGlobais({ root: posterRoot }), [
  { key: '/posters/' + posterFiles[0], n: 2, fontes: ['assado', 'manual'] },
], 'same poster manual and baked must count as one repeated artwork');
posterMesh.name = 'decal:poster:' + posterFiles[1];
assert.deepEqual(duplicadasGlobais({ root: posterRoot }), [], 'distinct posters must stay distinct');
const [aliasLarga, aliasFina, decalDistinto] = ['tag-larga.png', 'tag-fina.png', 'tags-treino-02.png'];
assert.ok([aliasLarga, aliasFina, decalDistinto].every(f => textures.decalFiles.includes(f)),
  'alias identity control requires real catalog decals');
for (const [assada, manual] of [[aliasLarga, aliasFina], [aliasFina, aliasLarga]]) {
  posterRoot.userData.graffitiPecas = [{ f: assada }];
  posterMesh.name = 'decal:' + manual;
  assert.deepEqual(duplicadasGlobais({ root: posterRoot }), [
    { key: '/img/decals/tag-fina.png', n: 2, fontes: ['assado', 'manual'] },
  ], 'editorial aliases manual and baked must count as one repeated artwork');
}
posterMesh.name = 'decal:' + decalDistinto;
assert.deepEqual(duplicadasGlobais({ root: posterRoot }), [], 'distinct decals must stay distinct');
posterMesh.geometry.dispose(); posterMesh.material.dispose();
const [arteSeam, arteControle] = ['tags-treino-04.png', 'tags-treino-02.png'];
assert.ok(textures.decalFiles.includes(arteSeam) && textures.decalFiles.includes(arteControle),
  'fixture uses two real distinct artworks (uniqueness guard must not mask the order mutation)');
GRAFITE.piscina_treta = { arquivos: [arteSeam, arteControle], pecas: [
  [0, -18.03, 5.948, -12.519, -1.571, 4.8, 1.604], // crosses Float32 seam
  [1, -16.97, 5.65, -18, 1.571, 2, 2], // wholly backed by one actual wall
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
assert.equal(pieces.filter((p) => p.z === -12.519).length, 0, 'batched scene drops exactly the seam-crossing piece');
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

const { registerPropTemplate } = await import('../../public/js/mapprops.js');
const permissao = '      batch.userData.graffitiSupportExcluded = !superficieGrafitavel(first);\n';
const ancora = '      batch.userData.graffitiNomeDoAsset = !!list[0].child.userData.graffitiNomeDoAsset;\n'
  + permissao + '      batch.userData.graffitiWhiteWall = !!first.userData.graffitiWhiteWall;\n';
let texto = source, count = 0;
if (MUT) {
  if (source.split(ancora).length !== 2) throw Error('aplicação authored: âncora ausente ou duplicada');
  texto = source.replace(ancora, ancora.replace(permissao, '')); count = 1;
  if (texto === source) throw Error('aplicação authored não mudou a fonte');
}
let build = MAPS.piscina_treta.build;
if (MUT) build = (await import(`data:text/javascript,${encodeURIComponent(absoluteImports(texto, mapURL))}`)).buildPoolDay;
const geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshLambertMaterial();
let batches, pintaveis;
try {
  for (const id of AUTORAIS) { const g = new THREE.Group(); g.add(new THREE.Mesh(geometry, material)); registerPropTemplate(id, g); }
  seedRandom(12345); const world = build(new THREE.Scene(), initTextures());
  const lotes = world.root.children.filter(o => o.isInstancedMesh && /^piscina:piscina_.*:batch$/.test(o.name));
  batches = lotes.map(o => o.name).sort(); pintaveis = lotes.filter(o => superficieGrafitavel(o)).map(o => o.name).sort();
  if (!iguais(batches, LOTES_ESPERADOS)) throw Error('fixture authored não construiu os quatro lotes esperados');
} finally {
  for (const id of AUTORAIS) registerPropTemplate(id, null);
  geometry.dispose(); material.dispose();
}
console.log(JSON.stringify({ gate: CLAUSULA, lotes: batches.length, pintaveis }));
return { batches, pintaveis, application: { target: 'batchAuthoredProps.graffitiSupportExcluded', count,
  sourceBefore: sha(source), sourceAfter: sha(texto) } };
}

async function worker(mutante, nonce) {
  let sourcesBefore = null, sourcesAfter = null, measurement = {}, failed = [], error = null, exit = 0;
  try {
    sourcesBefore = bindings(); measurement = await medir(mutante); sourcesAfter = bindings();
    if (!iguais(sourcesBefore, sourcesAfter)) throw Error('fontes mudaram durante a medição');
    if (measurement.pintaveis.length) { failed = [CLAUSULA]; error = 'ContractViolation'; exit = 1; }
    else if (mutante) { error = 'BlindMutation'; exit = 1; }
  } catch (e) {
    error = e instanceof assert.AssertionError ? 'ContractViolation' : 'InfrastructureError';
    failed = error === 'ContractViolation' ? ['legacy-control'] : []; exit = error === 'ContractViolation' ? 1 : 3;
    console.error(error + ': ' + String(e.message).slice(0, 600));
  }
  console.log(PREFIX + JSON.stringify({ schema: 'cs-piscina-batch/1', nonce, mutante, cases: GATES,
    sourcesBefore, sourcesAfter, ...measurement, error, failed }));
  return exit;
}

async function main() {
  const args = process.argv.slice(2);
  if (new Set(args).size !== args.length || args.some(a => !['--verificar-mutantes', '--mutante=' + MUTANTE].includes(a))
    || args.length > 1) { console.error('CLI inválida: use --verificar-mutantes OU --mutante=' + MUTANTE); return 2; }
  const nonce = process.env.PISCINA_BATCH_NONCE || randomUUID();
  if (!/^[0-9a-f-]{36}$/.test(nonce)) { console.error('nonce de processo inválido'); return 3; }
  if (!args.includes('--verificar-mutantes')) return worker(args.length ? MUTANTE : '', nonce);
  let sources;
  try { sources = bindings(); } catch (e) { console.error('INFRA fonte: ' + e.message); return 3; }
  let baseline;
  for (const mutante of ['', MUTANTE]) {
    const requestNonce = randomUUID();
    const env = { PATH: process.env.PATH, LANG: 'C', PISCINA_BATCH_NONCE: requestNonce };
    if (process.env.TMPDIR) env.TMPDIR = process.env.TMPDIR;
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...(mutante ? ['--mutante=' + mutante] : [])],
      { cwd: ROOT, env, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
    const verdict = avaliarFilho(r, { nonce: requestNonce, mutante, sources });
    if (!verdict.ok) { console.error(verdict.kind + ': ' + verdict.reason); return verdict.kind === 'ContractViolation' ? 1 : 3; }
    if (!mutante) baseline = verdict.rec.batches;
    else if (!iguais(baseline, verdict.rec.batches)) { console.error('INFRA populações divergentes'); return 3; }
    console.log('PASS piscina-batch ' + (mutante || 'nominal') + ': resultado próprio exato');
  }
  try { if (!iguais(sources, bindings())) throw Error('binding divergente'); }
  catch (e) { console.error('INFRA fonte após filhos: ' + e.message); return 3; }
  return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = await main(); }
  catch (e) { console.error('InfrastructureError: ' + e.message); process.exitCode = 3; }
}
