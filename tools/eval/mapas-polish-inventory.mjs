import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { THREE, MAPS, initTextures, seedRandom } from './harness.mjs';
import { autorDe } from '../../public/js/mapcat.js';

const out = process.argv[2] || 'artifacts/mapas-polish/baseline';
fs.mkdirSync(out, { recursive: true });
const digest = value => createHash('sha256').update(value).digest('hex');
const registry = JSON.parse(fs.readFileSync('mint-assets.json')).assets;
const sources = fs.readdirSync('public/js').filter(f => /^map_.*\.js$/.test(f));
const ambientPaths = Object.fromEntries([...fs.readFileSync('public/js/ambientlife.js','utf8')
  .matchAll(/^\s+(\w+): '(models\/[^']+\.glb)'/gm)].map(m => [m[1], `public/${m[2]}`]));
function asset(id, file) {
  const record = Object.entries(registry).find(([, r]) => r.files?.includes(file));
  const exists = !!file && fs.existsSync(file);
  return { id, file: file || null, exists, bytes: exists ? fs.statSync(file).size : null,
    sha256: exists ? digest(fs.readFileSync(file)) : null,
    registry: record?.[0] || null, source: record?.[1].source || null,
    approval: 'not inferred from file presence' };
}
const T = await initTextures();
const rows = [];
for (const [id, definition] of Object.entries(MAPS)) {
  const file = sources.find(f => fs.readFileSync(`public/js/${f}`, 'utf8').includes(`export function ${definition.build.name}(`));
  const props = (definition.props || []).map(prop => asset(prop, `public/models/props/${prop}.glb`));
  rows.push({ id, name: definition.name, author: autorDe(id), file: file && `public/js/${file}`,
    props, ambience: (definition.ambience || []).map(id => asset(id,ambientPaths[id])), runtimeCapture: 'pending' });
}
const contracts = {};
for (const id of ['parque_treta', 'penitenciaria']) {
  seedRandom(12345);
  const scene = new THREE.Scene();
  const w = MAPS[id].build(scene, T);
  scene.updateMatrixWorld(true);
  const collisionMeshes = w.occluders.map(o => {
    const meshes = [];
    o.traverse(m => { if (m.isMesh) meshes.push({ matrix: m.matrixWorld.elements,
      positions: Array.from(m.geometry.attributes.position.array), index: m.geometry.index && Array.from(m.geometry.index.array) }); });
    return meshes;
  });
  const gameplay = { colliders: w.colliders, spawns: w.spawns, ctfPoints: w.ctfPoints,
    waypoints: w.waypoints, bounds: w.bounds, pickups: w.pickups.map(({ mesh, ...p }) => p), collisionMeshes };
  let meshes = 0, triangles = 0;
  w.root.traverse(m => { if (m.isMesh) { meshes++; triangles += (m.geometry.index?.count || m.geometry.attributes.position.count) / 3; } });
  contracts[id] = { gameplaySHA256: digest(JSON.stringify(gameplay)), meshes, triangles };
}
const report = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  generatedAt: new Date().toISOString(), limits: 'Static props are declared, not proof of placement. Harness has no loaded GLBs. Approval requires human review.', maps: rows, contracts };
fs.writeFileSync(path.join(out, 'inventory.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ out, maps: rows.map(r => ({ id:r.id, props:r.props.length, missing:r.props.filter(p=>!p.exists).length, unregistered:r.props.filter(p=>!p.registry).length })), contracts }, null, 2));
