/* Contratos geométricos, não nota visual: os PNG runtime/{poco,forro,aerea}.png
   mostram copas esféricas e um anel de palitos. Limites de custo: baseline 06/09
   informado na delegação (354401 / teto 368209 tris). Ver SERTAO-FLORA.md.
   Uso: node tools/eval/sertao-flora-check.mjs [--self-test|--mandacaru-only] [--json]
*/
import { THREE, MAPS, initTextures } from './harness.mjs';
import { readFileSync } from 'node:fs';

let textures;
async function build() {
  const tx = textures ??= await initTextures(), previous = globalThis.window;
  delete globalThis.window;
  try { return MAPS.velho_oeste.build(new THREE.Scene(), tx); }
  finally { globalThis.window = previous; }
}
function meshes(world) {
  const crowns = [], exterior = [];
  world.root.updateMatrixWorld(true);
  world.root.traverse(o => {
    if (o.name === 'copa-juazeiro') crowns.push(o);
    if (o.isMesh && o.name.startsWith('sertao-caatinga-')) exterior.push(o);
  });
  return { crowns, exterior };
}
function allMeshes(root) {
  const result = []; root.traverse(o => { if (o.isMesh) result.push(o); }); return result;
}
function changeSharedGeometry(objects, selected, change) {
  const original = selected?.geometry;
  if (!original) throw Error('MUTANTE NÃO APLICOU: geometria alvo ausente');
  const sharing = objects.filter(o => o.geometry === original), replacement = change(original.clone());
  if (!sharing.length || !replacement?.isBufferGeometry || replacement === original) throw Error('MUTANTE NÃO APLICOU: substituição de geometria inválida');
  for (const mesh of sharing) mesh.geometry = replacement;
}
function repeatIndices(geometry, factor) {
  if (!geometry.index || factor < 2) throw Error('MUTANTE NÃO APLICOU: índices/fator ausentes');
  const source = geometry.index.array, repeated = new Uint32Array(source.length * factor);
  for (let i = 0; i < factor; i++) repeated.set(source, i * source.length);
  geometry.setIndex(new THREE.BufferAttribute(repeated, 1)); return geometry;
}
async function mutationReport(mode, make, measure, specifications, testMutations) {
  let baseline;
  try { baseline = measure(await make()); }
  catch (error) { return { mode, baseline: {}, mutations: [], isolated: [], missingIsolated: [], pass: false, error: String(error) }; }
  const clauses = Object.keys(baseline), baselineGreen = clauses.length > 0 && Object.values(baseline).every(r => r.pass === true), results = [];
  if (testMutations) for (const [name, [expected, apply]] of Object.entries(specifications)) {
    if (!baselineGreen) { results.push({ name, expected, observed: [], status: 'INCONCLUSIVO_BASELINE' }); continue; }
    try {
      if (!expected.length || new Set(expected).size !== expected.length || expected.some(id => !clauses.includes(id))) throw Error('Alvos esperados inválidos');
      const world = await make(); apply(world); const after = measure(world);
      const observed = Object.keys(after).filter(id => after[id].pass !== true);
      const schemaChanged = Object.keys(after).sort().join('/') !== [...clauses].sort().join('/');
      const unexpected = observed.filter(id => !expected.includes(id)), missing = expected.filter(id => !observed.includes(id));
      const exact = !schemaChanged && !unexpected.length && !missing.length;
      results.push({ name, expected, observed, unexpected, missing, schemaChanged,
        status: exact ? expected.length === 1 ? 'MORDIDO_ISOLADO' : 'MORDIDO_MULTIALVO' : 'FALHOU_CONJUNTO', after });
    } catch (error) { results.push({ name, expected, observed: [], status: 'ERRO', error: String(error) }); }
  }
  const isolated = [...new Set(results.filter(r => r.status === 'MORDIDO_ISOLADO').flatMap(r => r.expected))].sort();
  const missingIsolated = testMutations ? clauses.filter(id => !isolated.includes(id)) : [];
  return { mode, baseline, mutations: results, testedMutations: testMutations, isolated, missingIsolated,
    pass: baselineGreen && !missingIsolated.length && results.every(r => ['MORDIDO_ISOLADO', 'MORDIDO_MULTIALVO'].includes(r.status)) };
}
function printReport(report) {
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    for (const [id, result] of Object.entries(report.baseline)) console.log(`${id} ${result.pass ? 'PASSA' : 'FALHA'} ${JSON.stringify(result)}`);
    for (const m of report.mutations) console.log(`MUTANTE ${m.name} ${m.status} esperado=${m.expected.join(',')} observado=${m.observed.join(',') || 'nenhum'}${m.unexpected?.length ? ` inesperados=${m.unexpected.join(',')}` : ''}${m.missing?.length ? ` ausentes=${m.missing.join(',')}` : ''}${m.error ? ` erro=${m.error}` : ''}`);
    if (report.testedMutations) console.log(`PROVA ISOLADA ${report.isolated.join(',') || 'nenhuma'}; SEM PROVA ${report.missingIsolated.join(',') || 'nenhuma'}`);
    if (report.error) console.error(report.error);
  }
  process.exit(report.pass ? 0 : 1);
}
const triangles = o => (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
function instances(mesh) {
  const result = [], matrix = new THREE.Matrix4();
  mesh.geometry.computeBoundingBox();
  for (let i = 0; i < (mesh.isInstancedMesh ? mesh.count : 1); i++) {
    if (mesh.isInstancedMesh) mesh.getMatrixAt(i, matrix); else matrix.identity();
    matrix.premultiply(mesh.matrixWorld);
    result.push(mesh.geometry.boundingBox.clone().applyMatrix4(matrix));
  }
  return result;
}
function leafComponents(mesh) {
  const p = mesh.geometry.attributes.position, ix = mesh.geometry.index;
  const vertices = [], lookup = new Map(), ids = [];
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i), key = v.toArray().join(',');
    if (!lookup.has(key)) { lookup.set(key, vertices.length); vertices.push(v); }
    ids.push(lookup.get(key));
  }
  const parent = vertices.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const faces = [];
  for (let i = 0; i < (ix?.count ?? p.count); i += 3) {
    const face = [0, 1, 2].map(j => ids[ix ? ix.getX(i + j) : i + j]);
    parent[find(face[1])] = find(face[0]); parent[find(face[2])] = find(face[0]); faces.push(face);
  }
  const groups = new Map();
  vertices.forEach((v, i) => { const root = find(i); if (!groups.has(root)) groups.set(root, []); groups.get(root).push(v); });
  let maxSpan = 0;
  const matrix = new THREE.Matrix4(), scale = new THREE.Vector3();
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld); scale.setFromMatrixScale(matrix);
    for (const vs of groups.values()) for (const a of vs) for (const b of vs) maxSpan = Math.max(maxSpan, a.clone().sub(b).multiply(scale).length());
  }
  return { leaves: groups.size, vertices: [...groups.values()].map(vs => vs.length), maxSpan,
    faces: [...groups.keys()].map(root => faces.filter(f => find(f[0]) === root).length) };
}
let lateralTips;
function measuredLateralTips() {
  if (lateralTips) return lateralTips;
  const glb = readFileSync(new URL('../../public/models/props/sertao_juazeiro.glb', import.meta.url)), jsonLength = glb.readUInt32LE(12);
  const doc = JSON.parse(glb.subarray(20, 20 + jsonLength).toString()), primitive = doc.meshes[0].primitives[0], a = doc.accessors[primitive.attributes.POSITION], view = doc.bufferViews[a.bufferView];
  if (doc.nodes.length !== 1 || doc.nodes[0].matrix || doc.nodes[0].translation || doc.nodes[0].rotation || doc.nodes[0].scale || a.componentType !== 5126 || a.type !== 'VEC3') throw Error('FL8: transformação/formato do juazeiro não suportado; não inventar medida');
  const start = 28 + jsonLength + (view.byteOffset || 0) + (a.byteOffset || 0), points = [];
  for (let i = 0; i < a.count; i++) { const k = start + i * (view.byteStride || 12); points.push(new THREE.Vector3(glb.readFloatLE(k), glb.readFloatLE(k + 4), glb.readFloatLE(k + 8))); }
  const box = new THREE.Box3().setFromPoints(points), scale = 4.6 / (box.max.y - box.min.y);
  const bins = [[], [], []];
  for (const p of points) {
    p.set(p.x * scale, (p.y - box.min.y) * scale, p.z * scale);
    if (p.y >= 2.7 && p.y <= 3.9) bins[Math.min(2, Math.floor((Math.atan2(p.z, p.x) + Math.PI) / (Math.PI * 2) * 3))].push(p);
  }
  lateralTips = bins.map(bin => {
    if (bin.length < 20) throw Error('FL8: galhos laterais ausentes na faixa examinada');
    const ends = bin.sort((a, b) => Math.hypot(b.x, b.z) - Math.hypot(a.x, a.z)).slice(0, 20);
    return ends.reduce((v, p) => v.add(p), new THREE.Vector3()).multiplyScalar(1 / ends.length);
  });
  return lateralTips;
}
function lateralContact(crowns) {
  const tips = measuredLateralTips(), matrix = new THREE.Matrix4();
  const contacts = crowns.map(crown => {
    crown.geometry.computeBoundingSphere();
    return tips.map(tip => {
      let minimum = Infinity;
      for (let i = 0; i < crown.count; i++) { crown.getMatrixAt(i, matrix); const sphere = crown.geometry.boundingSphere.clone().applyMatrix4(matrix); minimum = Math.min(minimum, sphere.center.distanceTo(tip) / sphere.radius); }
      return minimum;
    });
  });
  return { pass: crowns.length === 4 && contacts.every(ds => ds.every(d => Number.isFinite(d) && d <= 1)), measuredTips: tips.map(v => v.toArray()), distanceInSprigRadii: contacts };
}
function evaluate(world) {
  const { crowns, exterior } = meshes(world);
  const shapes = crowns.map(o => {
    o.geometry.computeBoundingBox();
    const size = o.geometry.boundingBox.getSize(new THREE.Vector3()).toArray().sort((a, b) => a - b);
    return { type: o.geometry.type, tris: triangles(o) / o.count, flatness: size[0] / size[2] };
  });
  const boxes = exterior.flatMap(instances), centers = boxes.map(b => b.getCenter(new THREE.Vector3()));
  const depths = centers.map(p => Math.max(Math.abs(p.x) - 34, Math.abs(p.z) - 46));
  const depthsPresent = [0, 1, 2].map(band => depths.filter(d => band === 0 ? d < 30 : band === 1 ? d >= 30 && d < 70 : d >= 70).length);
  const invasions = boxes.filter(b => b.min.x < 34 && b.max.x > -34 && b.min.z < 46 && b.max.z > -46).length;
  const crownTris = crowns.reduce((n, o) => n + triangles(o), 0), exteriorTris = exterior.reduce((n, o) => n + triangles(o), 0);
  const leafShapes = crowns.map(leafComponents);
  return {
    FL8: lateralContact(crowns),
    FL7: { pass: leafShapes.length === 4 && leafShapes.every(s => s.leaves > 0 && s.maxSpan <= .15 + 1e-6 && s.vertices.every(n => n === 6) && s.faces.every(n => n === 4)), leafShapes },
    FL1: { pass: shapes.length === 4 && shapes.every(s => s.tris <= 24 && s.flatness < .25), shapes },
    FL2: { pass: crowns.length === 4 && crowns.every(o => o.isInstancedMesh && !o.castShadow && !o.receiveShadow && o.material === crowns[0].material && o.geometry === crowns[0].geometry && o.material.map?.name === 'sertao-folhagem' && o.material.side === THREE.DoubleSide), crowns: crowns.length },
    FL3: { pass: depthsPresent.every(n => n > 0), depthsPresent, min: Math.min(...depths), max: Math.max(...depths) },
    FL4: { pass: boxes.length > 0 && invasions === 0, instances: boxes.length, invasions },
    FL5: { pass: crownTris > 0 && crownTris <= 19968 && exteriorTris > 0 && crownTris + exteriorTris <= 33696, crownTris, exteriorTris, total: crownTris + exteriorTris, limit: 33696 },
    FL6: { pass: exterior.length > 0 && exterior.length <= 4 && exterior.every(o => o.isInstancedMesh && !o.castShadow && !o.receiveShadow), draws: exterior.length },
  };
}
const mutations = {
  'copa-tampa-alta': [['FL8'], w => { const m = new THREE.Matrix4(), p = new THREE.Vector3(); for (const o of meshes(w).crowns) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); p.setFromMatrixPosition(m); if (p.y < 3.9) { p.y = 4.5; m.setPosition(p); o.setMatrixAt(i, m); } } }],
  'folha-papel-grande': [['FL7'], w => { const o = meshes(w).crowns[0], m = new THREE.Matrix4(); o.getMatrixAt(0, m); m.scale(new THREE.Vector3(4, 4, 4)); o.setMatrixAt(0, m); }],
  'raminho-volumetrico': [['FL1'], w => { changeSharedGeometry(allMeshes(w.root), meshes(w).crowns[0], geo => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + (Math.floor(i / 6) % 2 ? .12 : -.12)); return geo; }); }],
  'copa-esferica': [['FL1', 'FL2', 'FL5', 'FL7'], w => { meshes(w).crowns[0].geometry = new THREE.IcosahedronGeometry(1, 1); }],
  'folha-uma-face': [['FL2'], w => { meshes(w).crowns[0].material.side = THREE.FrontSide; }],
  'folha-sem-textura': [['FL2'], w => { meshes(w).crowns[0].material.map = null; }],
  'copa-ausente': [['FL1', 'FL2', 'FL7', 'FL8'], w => { const o = meshes(w).crowns[0]; o.parent.remove(o); }],
  'sombra-copa': [['FL2'], w => { meshes(w).crowns[0].castShadow = true; }],
  'anel-sem-fundo': [['FL3'], w => { const m = new THREE.Matrix4(), p = new THREE.Vector3(); for (const o of meshes(w).exterior) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); p.setFromMatrixPosition(m); p.x = (p.x < 0 ? -1 : 1) * (48 + Math.abs(p.x) % 2); p.z = Math.max(-58, Math.min(58, p.z)); m.setPosition(p); o.setMatrixAt(i, m); } }],
  'flora-na-arena': [['FL4'], w => { meshes(w).exterior[0].setMatrixAt(0, new THREE.Matrix4().makeTranslation(0, 1, 0)); }],
  'estouro-tris': [['FL5'], w => { const o = meshes(w).exterior.find(m => m.name === 'sertao-caatinga-ramos'); changeSharedGeometry(allMeshes(w.root), o, geo => repeatIndices(geo, 2)); }],
  'sombra-exterior': [['FL6'], w => { meshes(w).exterior[0].castShadow = true; }],
};
async function mandacaruCheck() {
  const { readFileSync } = await import('node:fs');
  const helper = (await import('../../public/js/map_sertao_flora.js')).mandacaruSertao;
  if (!helper) throw Error('MC0: helper mandacaruSertao ausente');
  const glb = readFileSync(new URL('../../public/models/props/sertao_mandacaru.glb', import.meta.url));
  const asset = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
  const glbTris = asset.meshes.flatMap(m => m.primitives).reduce((n, p) => n + asset.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0);
  const material = new THREE.MeshStandardMaterial({ map: new THREE.Texture() }); material.map.name = 'oeste-cactus';
  const scales = [1, .8, .7, 1, .9, 1.1, .65, .7, 1.2, .9, .75, 1, 1.05, .8, .95, .7, .85, 1, .9, .75];
  const make = () => Array.from({ length: 20 }, (_, id) => {
    const group = new THREE.Group(); group.position.set(id * 2, 0, -id); group.rotation.y = id * .13;
    helper(group, material, scales[id], id); group.updateMatrixWorld(true); return group;
  });
  const cactus = g => g.children.find(o => o.isMesh && o.name === 'cacto-ramos');
  function components(geometry) {
    const p = geometry.attributes.position, ix = geometry.index, parents = Array.from({ length: p.count }, (_, i) => i);
    const find = i => parents[i] === i ? i : (parents[i] = find(parents[i]));
    for (let i = 0; i < ix.count; i += 3) { const a = find(ix.getX(i)); parents[find(ix.getX(i + 1))] = a; parents[find(ix.getX(i + 2))] = a; }
    const bins = new Map();
    for (let i = 0; i < p.count; i++) { const k = find(i); if (!bins.has(k)) bins.set(k, []); bins.get(k).push(new THREE.Vector3().fromBufferAttribute(p, i)); }
    return [...bins.values()].map(vs => { const box = new THREE.Box3().setFromPoints(vs); return { minY: box.min.y, maxY: box.max.y, vertices: vs.length }; });
  }
  function silhouette(mesh, axis, scale) {
    const p = mesh.geometry.attributes.position, ix = mesh.geometry.index, W = 64, H = 96, mask = new Uint8Array(W * H);
    mesh.updateMatrix();
    const vs = Array.from({ length: p.count }, (_, i) => { const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrix).divideScalar(scale); return [(v[axis] + 1.5) / 3 * W, (4 - v.y) / 4 * H]; });
    const cross = (a, b, x, y) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
    for (let i = 0; i < ix.count; i += 3) {
      const t = [0, 1, 2].map(j => vs[ix.getX(i + j)]), minX = Math.max(0, Math.floor(Math.min(...t.map(v => v[0])))), maxX = Math.min(W - 1, Math.ceil(Math.max(...t.map(v => v[0]))));
      const minY = Math.max(0, Math.floor(Math.min(...t.map(v => v[1])))), maxY = Math.min(H - 1, Math.ceil(Math.max(...t.map(v => v[1]))));
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const c = t.map((v, j) => cross(v, t[(j + 1) % 3], x + .5, y + .5));
        if (c.every(n => n >= 0) || c.every(n => n <= 0)) mask[y * W + x] = 1;
      }
    }
    let asymmetry = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) asymmetry += mask[y * W + x] !== mask[y * W + W - 1 - x] ? 1 : 0;
    return { key: Buffer.from(mask).toString('hex'), asymmetry, pixels: mask.reduce((a, b) => a + b, 0) };
  }
  function measure(groups) {
    const ms = groups.map(cactus), shapes = ms.map(m => components(m.geometry));
    const silhouettes = ms.slice(0, 3).map((m, i) => [silhouette(m, 'x', scales[i]), silhouette(m, 'z', scales[i])]);
    const bounds = ms.map(m => {
      m.updateMatrix(); const p = m.geometry.attributes.position, box = new THREE.Box3(), low = new THREE.Box3();
      for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrix); box.expandByPoint(v); if (v.y < 2) low.expandByPoint(v); }
      return { minY: box.min.y, height: box.max.y, lowRadius: Math.max(Math.abs(low.min.x), Math.abs(low.max.x), Math.abs(low.min.z), Math.abs(low.max.z)) };
    });
    const total = ms.reduce((n, m) => n + triangles(m), 0);
    return {
      MC1: { pass: shapes.every(cs => cs.length >= 4 && cs.length <= 6 && cs.filter(c => c.minY > 0).length >= 3 && new Set(cs.map(c => c.maxY.toFixed(3))).size >= 3), columns: shapes.map(cs => cs.length), tops: shapes.slice(0, 3).map(cs => cs.map(c => c.maxY)) },
      MC2: { pass: new Set(shapes.slice(0, 3).map(cs => cs.length)).size === 3 && new Set(silhouettes.map(ss => ss.map(s => s.key).join('/'))).size === 3 && silhouettes.every(ss => ss.every(s => s.pixels > 0 && s.asymmetry > 0)), raster: silhouettes.map(ss => ss.map(({ pixels, asymmetry }) => ({ pixels, asymmetry }))) },
      MC3: { pass: total > 0 && total < glbTris * 20, total, replacedGlbTris: glbTris * 20 },
      MC4: { pass: groups.every((g, id) => g.position.equals(new THREE.Vector3(id * 2, 0, -id)) && g.rotation.y === id * .13 && g.scale.equals(new THREE.Vector3(1, 1, 1))) && bounds.every((b, i) => Math.abs(b.minY) < 1e-6 && Math.abs(b.height - 3.8 * scales[i]) < 1e-5 && b.lowRadius <= .38 * scales[i] + 1e-6), bounds: bounds.slice(0, 3) },
      MC5: { pass: ms.length === 20 && ms.every(m => m.material === material && m.material.map?.name === 'oeste-cactus' && !m.castShadow && !m.receiveShadow) && new Set(ms.map(m => m.geometry)).size <= new Set(scales.map((s, i) => `${i % 3}/${s}`)).size, count: ms.length, geometries: new Set(ms.map(m => m.geometry)).size },
    };
  }
  const mutants = {
    'coluna-sem-ramos': [['MC1', 'MC2', 'MC4'], gs => { const ms = gs.map(cactus); changeSharedGeometry(ms, ms[0], () => new THREE.CylinderGeometry(.3, .3, 3.8, 10)); }],
    'topos-iguais': [['MC1'], gs => { const ms = gs.map(cactus); changeSharedGeometry(ms, ms[0], geo => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 2.6) p.setY(i, 3.8); return geo; }); }],
    'bracos-espelhados': [['MC1', 'MC2'], gs => { const ms = gs.map(cactus); changeSharedGeometry(ms, ms[0], original => { const flat = original.toNonIndexed(), a = flat.attributes.position.array, merged = new Float32Array(a.length * 2); merged.set(a); merged.set(a, a.length); for (let i = a.length; i < merged.length; i += 3) merged[i] *= -1; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(merged, 3)); geo.setIndex(Array.from({ length: merged.length / 3 }, (_, i) => i)); return geo; }); }],
    // Simula id de variante constante pelo helper real; não repara nem normaliza o baseline.
    'variantes-iguais': [['MC2'], gs => { gs.forEach((g, i) => { g.remove(cactus(g)); helper(g, material, scales[i], 0); }); }],
    'custo-maior-glb': [['MC3'], gs => { const ms = gs.map(cactus), source = ms[0].geometry, current = ms.reduce((n, m) => n + triangles(m), 0), shared = ms.filter(m => m.geometry === source).reduce((n, m) => n + triangles(m), 0); const factor = Math.floor((glbTris * 20 - current) / shared) + 2; changeSharedGeometry(ms, ms[0], geo => repeatIndices(geo, factor)); }],
    'raiz-deslocada': [['MC4'], gs => { gs[0].position.x += 1; }],
    'ramo-tocavel': [['MC4'], gs => { const ms = gs.map(cactus); changeSharedGeometry(ms, ms[0], geo => { const p = geo.attributes.position; let tip = -1; for (let i = 0; i < p.count; i++) if (p.getY(i) > 2 && Math.abs(p.getX(i)) > .38 && (tip < 0 || Math.abs(p.getX(i)) > Math.abs(p.getX(tip)))) tip = i; if (tip < 0) throw Error('MUTANTE NÃO APLICOU: ramo lateral ausente'); p.setY(tip, 1.5); return geo; }); }],
    'cacto-sem-textura': [['MC5'], gs => { cactus(gs[0]).material = new THREE.MeshStandardMaterial(); }],
  };
  printReport(await mutationReport('Node-helper-mandacaru-sem-validar-integracao-ou-pixel', make, measure, mutants, true));
}
if (process.argv.includes('--mandacaru-only')) {
  try { await mandacaruCheck(); }
  catch (error) { printReport({ mode: 'Node-helper-mandacaru', baseline: {}, mutations: [], isolated: [], missingIsolated: [], pass: false, error: String(error) }); }
}
printReport(await mutationReport('Node-geometria-procedural-sem-validar-GLB-ou-pixel', build, evaluate, mutations, process.argv.includes('--self-test')));
