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
import { identidadeArteGrafite } from '../../public/js/graffiti_art_id.js';

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
