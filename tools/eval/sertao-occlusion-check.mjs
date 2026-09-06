/* LOS e bala usam Game._losClear/intersectObjects(..., false).
   Contraprova 49441895: 67 Groups ignorados, raio pela igreja sem impacto.
   Probes e limites: docs/reports/SERTAO-OCLUSAO.md. Node não carrega GLBs.
   Uso: node tools/eval/sertao-occlusion-check.mjs [--self-test] [--json]
*/
import { mkdirSync, writeFileSync } from 'node:fs';
import { THREE, MAPS, initTextures, Game } from './harness.mjs';

const selfTest = process.argv.includes('--self-test');
const json = process.argv.includes('--json');
const requested = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
const decor = o => o.name === 'copa-juazeiro' || /^tecido-forro-/.test(o.name);
const walls = [2, 3, 4, 5, 6].map(id => ({
  name: `sertao-casa-paupique-${id}`, from: [1, 1.62, 4], to: [1, 1.62, 2.8],
}));
walls.push({ name: 'sertao-igrejinha-0', from: [1.4, 1.62, 3.6], to: [1.4, 1.62, 2.4] });
const openFrom = [0, 1.62, -43], openTo = [0, 1.62, -42];
let textures;
async function build() {
  textures ??= await initTextures();
  const saved = globalThis.window;
  delete globalThis.window;
  try { return MAPS.velho_oeste.build(new THREE.Scene(), textures); }
  finally { globalThis.window = saved; }
}
function probe(world, from, to) {
  const game = Object.create(Game.prototype);
  game.world = world; game.ray = new THREE.Raycaster(); game._smokes = [];
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const clear = game._losClear(a, b);
  game.ray.set(a, b.clone().sub(a).normalize()); game.ray.far = a.distanceTo(b) - .3;
  const hits = game.ray.intersectObjects(world.occluders, false);
  return { from, to, clear, hits: hits.length, first: hits[0]?.object.name || null };
}
function evaluate(world) {
  world.root.updateMatrixWorld(true);
  const list = world.occluders;
  const duplicates = list.length - new Set(list).size;
  const invalid = list.filter(o => !o.isMesh || !o.geometry?.attributes.position?.count).map(o => o.name || o.type);
  const blocked = walls.map(spec => {
    const group = world.root.getObjectByName(spec.name);
    if (!group) return { name: spec.name, missing: true, clear: true, hits: 0 };
    const from = group.localToWorld(new THREE.Vector3(...spec.from)).toArray();
    const to = group.localToWorld(new THREE.Vector3(...spec.to)).toArray();
    return { name: spec.name, ...probe(world, from, to) };
  });
  const open = probe(world, openFrom, openTo);
  const forbidden = list.filter(decor).map(o => o.name);
  return {
    OC1: { pass: list.length > 0 && duplicates === 0 && invalid.length === 0, count: list.length, duplicates, invalid },
    OC2: { pass: blocked.length === walls.length && blocked.every(p => !p.clear && p.hits > 0), probes: blocked },
    OC3: { pass: open.clear && open.hits === 0, ...open },
    OC4: { pass: forbidden.length === 0, forbidden },
  };
}
const mutations = {
  'grupo-na-lista': ['OC1', w => { const g = new THREE.Group(); g.name = 'mutante-grupo-oclusao'; w.root.add(g); w.occluders.push(g); }],
  'mesh-duplicada': ['OC1', w => { if (!w.occluders.length) throw Error('OC1 mutante não aplicou'); w.occluders.push(w.occluders[0]); }],
  'igreja-sem-oclusao': ['OC2', w => {
    const group = w.root.getObjectByName('sertao-igrejinha-0'), descendants = new Set();
    if (!group) throw Error('OC2 igreja ausente antes da mutação');
    group.traverse(o => descendants.add(o));
    const before = w.occluders.length;
    w.occluders = w.occluders.filter(o => !descendants.has(o));
    if (before === w.occluders.length) throw Error('OC2 mutante não retirou a igreja');
  }],
  'casa-sem-parede': ['OC2', w => {
    const wall = w.root.getObjectByName('parede-casa-2');
    if (!wall || !w.occluders.includes(wall)) throw Error('OC2 parede ausente antes da mutação');
    w.occluders = w.occluders.filter(o => o !== wall);
  }],
  'parede-no-trecho-aberto': ['OC3', w => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2.4, .2), new THREE.MeshBasicMaterial());
    mesh.name = 'mutante-parede-oclusao'; mesh.position.set(0, 1.2, -42.5);
    w.root.add(mesh); w.occluders.push(mesh);
  }],
  'copa-rigida': ['OC4', w => {
    const crown = w.root.getObjectByName('copa-juazeiro');
    if (!crown || w.occluders.includes(crown)) throw Error('OC4 copa ausente ou já registrada');
    w.occluders.push(crown);
  }],
  'tecido-rigido': ['OC4', w => {
    const cloth = w.root.getObjectByName('tecido-forro-0');
    if (!cloth || w.occluders.includes(cloth)) throw Error('OC4 tecido ausente ou já registrado');
    w.occluders.push(cloth);
  }],
};
if ((requested && !Object.hasOwn(mutations, requested)) || (requested && selfTest)) throw Error('Mutante desconhecido ou combinação inválida');
const baseline = evaluate(await build()), results = [];
for (const name of selfTest ? Object.keys(mutations) : requested ? [requested] : []) {
  const [target, apply] = mutations[name];
  if (!Object.values(baseline).every(c => c.pass)) { results.push({ name, target, status: 'INCONCLUSIVO', reason: 'baseline-vermelho' }); continue; }
  const world = await build(); apply(world);
  const after = evaluate(world), failed = Object.keys(after).filter(id => !after[id].pass);
  const changed = JSON.stringify(after) !== JSON.stringify(baseline);
  results.push({ name, target, status: changed && failed.length === 1 && failed[0] === target ? 'MORDIDO' : 'SOBREVIVEU/NAO-ISOLADO', failed, after });
}
const report = { mode: 'Node/proxy; Game._losClear e raycast de bala não recursivos', baseline, mutations: results };
const out = process.env.ARTIFACT_DIR || 'artifacts/sertao-astra/occlusion';
mkdirSync(out, { recursive: true }); writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
if (json) console.log(JSON.stringify(report));
else {
  for (const [id, c] of Object.entries(baseline)) console.log(`${id} ${c.pass ? 'PASSA' : 'FALHA'} ${JSON.stringify(c)}`);
  for (const m of results) console.log(`MUTANTE ${m.name} ${m.status} -> ${m.target} falhas=${m.failed?.join(',') || m.reason}`);
  console.log(`Evidência: ${out}/report.json`);
}
process.exitCode = Object.values(baseline).every(c => c.pass) && results.every(m => m.status === 'MORDIDO') ? 0 : 1;
