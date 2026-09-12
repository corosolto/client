// BUG-141: compara consultas reais com o raycast linear e conta triângulos enviados ao Three.
import { bootGame, initTextures, THREE } from './harness.mjs';
import { writeFileSync } from 'node:fs';
import { stressLajesRaycast } from './lajes-raycast-stress.mjs';
const mutant = process.argv.find(x => x.startsWith('--mutante='))?.split('=')[1];
if (mutant && !['linear', 'sem-parede', 'sem-consulta', 'sem-parada'].includes(mutant)) throw Error('Mutante desconhecido');
const g = bootGame('lajes', { textures: initTextures(), bots: 8, seed: 4321 });
const meshes = g.world.occluders.filter(m => m.name === 'lajes-alvenaria');
const original = new Map(meshes.map(m => [m, m.raycast]));
let tested = 0;
const nativeCompute = THREE.Mesh.prototype._computeIntersections;
THREE.Mesh.prototype._computeIntersections = function(...args) {
  if (this.name === 'lajes-alvenaria') {
    const geo = this.geometry, count = geo.index?.count || geo.attributes.position.count;
    tested += Math.max(0, Math.min(count, geo.drawRange.start + geo.drawRange.count) - geo.drawRange.start) / 3;
  }
  return nativeCompute.apply(this, args);
};
const nodes = g.world.waypoints.nodes, rays = [];
for (let i = 0; i < 192; i++) {
  const a = nodes[(i * 137 + 13) % nodes.length], b = nodes[(i * 89 + 97) % nodes.length];
  const from = new THREE.Vector3(a.x, a.y + 1.5, a.z), to = new THREE.Vector3(b.x, b.y + 1.5, b.z);
  const dist = from.distanceTo(to); if (dist < .5) continue;
  rays.push({ from, dir: to.sub(from).normalize(), near: 0, far: dist - .3 });
}
const round = n => Math.round(n * 1e6) / 1e6;
const signature = h => [h.object.uuid, round(h.distance), h.faceIndex, h.face?.a, h.face?.b, h.face?.c,
  h.point.toArray().map(round), h.uv?.toArray().map(round), h.normal?.toArray().map(round)];
function sample() {
  tested = 0; const start = performance.now();
  const hits = rays.map(({ from, dir, near, far }) => {
    g.ray.set(from, dir); g.ray.near = near; g.ray.far = far;
    return g.ray.intersectObjects(g.world.occluders, false).map(signature);
  });
  return { hits, tested, ms: performance.now() - start };
}
try {
  for (const m of meshes) m.raycast = THREE.Mesh.prototype.raycast;
  const baseline = sample();
  for (const m of meshes) m.raycast = mutant === 'linear' ? THREE.Mesh.prototype.raycast : mutant === 'sem-parede' ? () => {} : original.get(m);
  const current = sample();
  const mismatches = current.hits.filter((h,i) => JSON.stringify(h) !== JSON.stringify(baseline.hits[i])).length;
  let occlusionMismatches = 0, occlusionCalls = 0, intersections = 0, afterHit = 0, blocked = false;
  const intersect = g.ray.intersectObject;
  g.ray.intersectObject = function(...args) {
    if (blocked) afterHit++;
    intersections++; const result = intersect.apply(this,args);
    if (result.length) blocked = true;
    return result;
  };
  if (mutant === 'sem-consulta') g.world.rayOccluded = undefined;
  if (mutant === 'sem-parada') g.world.rayOccluded = ray => {
    const hits = []; for (const mesh of g.world.occluders) ray.intersectObject(mesh,false,hits);
    return hits.length > 0;
  };
  const query = g.world.rayOccluded;
  if (query) g.world.rayOccluded = ray => { occlusionCalls++; return query(ray); };
  for (let i = 0; i < rays.length; i++) {
    blocked = false;
    const { from, dir, far } = rays[i];
    const clear = g._losClear(from, from.clone().addScaledVector(dir, far + .3));
    if (clear !== (baseline.hits[i].length === 0)) occlusionMismatches++;
  }
  const hitRays = baseline.hits.filter(h => h.length).length;
  const ratio = current.tested / baseline.tested;
  const stress = stressLajesRaycast(), clearIndex = baseline.hits.findIndex(h => h.length === 0);
  const clearRay = rays[clearIndex], end = clearRay.from.clone().addScaledVector(clearRay.dir, clearRay.far + .3);
  g._smokes.push({ _opaque: true, center: clearRay.from.clone().lerp(end,.5), radius: 1 });
  blocked = false;
  const smokeBlocks = !g._losClear(clearRay.from,end); g._smokes.length = 0;
  const valid = meshes.length > 0 && rays.length > 100 && hitRays > 100 && baseline.tested > 0 && mismatches === 0 && ratio <= .1 && occlusionMismatches === 0 && occlusionCalls === rays.length + 1 && intersections > 0 && afterHit === 0 && stress.valid && smokeBlocks;
  const report = { valid, mutant, rays: rays.length, hitRays, meshes: meshes.length, mismatches, occlusionMismatches, occlusionCalls, intersections, afterHit, stress, smokeBlocks,
    triangles: { baseline: baseline.tested, current: current.tested, ratio }, ms: { baseline: baseline.ms, current: current.ms } };
  const out = process.argv.find(x => x.startsWith('--out='))?.slice(6);
  if (out) writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`${valid ? '✓' : '✗'} LRP1 raycast Lajes: ${JSON.stringify(report)}`);
  if (!valid) process.exitCode = 1;
} finally { THREE.Mesh.prototype._computeIntersections = nativeCompute; g.dispose(); }
process.exit(process.exitCode || 0);
