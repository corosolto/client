/* V6: V5 passou medindo só os becos laterais e deixou centro/spawns largos.
   A faixa de jogo e as limitações visuais estão em docs/maps/LAJES-V6-REGUA.md. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { THREE, MAPS, bootGame, initTextures } from './harness.mjs';
import { buildLajes } from '../../public/js/map_lajes_authored.js';
if (MAPS.lajes.build !== buildLajes) throw Error('Não sei medir: builder ativo divergente');
const g = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 12345 }), w = g.world;
const R = .38, EYE = 1.62, GRID = .5, MAX_RADIUS = 1.45, EPS = .001, TRANSITION = 1;
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.slice(10) || '';
if (!['', 'abrir-rua-central', 'barreira-invisivel', 'rota-bloqueada'].includes(mutant)) throw Error(`Mutante desconhecido: ${mutant}`);
const plaza = w.praca;
if (!plaza || !w.design?.routes?.length) throw Error('Não sei medir: praça ou rotas ausentes');
const insidePlaza = (x, z) => x >= plaza.x0 - TRANSITION && x <= plaza.x1 + TRANSITION && z >= plaza.z0 - TRANSITION && z <= plaza.z1 + TRANSITION;
let mutation = null;
if (mutant === 'abrir-rua-central') {
  const targets = w.colliders.filter(c => c.minY <= EYE && c.maxY >= EYE && c.minX < 5.1 && c.maxX > -5.1 && c.minZ < -9 && c.maxZ > -25);
  if (!targets.length) throw Error('MUTANTE NÃO APLICOU: sem fachadas centrais para remover');
  w.colliders = w.colliders.filter(c => !targets.includes(c));
  mutation = { kind: mutant, removed: targets.length };
}
if (mutant === 'rota-bloqueada' || mutant === 'barreira-invisivel') {
  const route = w.design.routes[0], a = route.points[0], b = route.points[1];
  const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2, p = new THREE.Vector3(x, 0, z);
  g._collide(p, R);
  if (Math.hypot(p.x - x, p.z - z) > EPS) throw Error('MUTANTE NÃO APLICOU: testemunha já bloqueada');
  const c = { minX: x - .3, maxX: x + .3, minZ: z - .3, maxZ: z + .3, minY: 0, maxY: 2.2 };
  w.colliders.push(c);
  p.set(x, 0, z);g._collide(p, R);
  if (Math.hypot(p.x - x, p.z - z) <= EPS) throw Error('MUTANTE NÃO APLICOU: corpo não foi bloqueado');
  mutation = { kind: mutant, collider: c, witness: [x, z], push: Math.hypot(p.x - x, p.z - z) };
}
const visible = o => { for (let p = o; p; p = p.parent) if (p.visible === false) return false;return true; };
w.root.updateMatrixWorld(true);
const segments = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
const instance = new THREE.Matrix4(), matrix = new THREE.Matrix4();
w.root.traverse(o => {
  if (!o.isMesh || o.userData.proxyGLB || !visible(o)) return;
  const geom = o.geometry, pos = geom?.attributes?.position;
  if (!pos) return;
  const materials = Array.isArray(o.material) ? o.material : [o.material];
  const count = geom.index ? geom.index.count : pos.count, groups = geom.groups.length ? geom.groups : [{ start: 0, count, materialIndex: 0 }];
  const instances = o.isInstancedMesh ? o.count : 1;
  for (let k = 0; k < instances; k++) {
    if (o.isInstancedMesh) { o.getMatrixAt(k, instance);matrix.multiplyMatrices(o.matrixWorld, instance); } else matrix.copy(o.matrixWorld);
    for (const group of groups) {
      const mat = materials[group.materialIndex] || materials[0];
      if (!mat || mat.visible === false || mat.opacity === 0) continue;
      for (let i = group.start; i < Math.min(count, group.start + group.count); i += 3) {
        for (const [v, j] of [[a, i], [b, i + 1], [c, i + 2]]) v.fromBufferAttribute(pos, geom.index ? geom.index.getX(j) : j).applyMatrix4(matrix);
        if (Math.min(a.y, b.y, c.y) > EYE || Math.max(a.y, b.y, c.y) < EYE) continue;
        const hits = [];
        for (const [u, v] of [[a, b], [b, c], [c, a]]) {
          if (Math.abs(v.y - u.y) < 1e-8) continue;
          const t = (EYE - u.y) / (v.y - u.y);
          if (t >= 0 && t <= 1) hits.push([u.x + t * (v.x - u.x), u.z + t * (v.z - u.z)]);
        }
        if (hits.length >= 2 && Math.hypot(hits[0][0] - hits[1][0], hits[0][1] - hits[1][1]) > EPS) segments.push([hits[0], hits[1]]);
      }
    }
  }
});
if (!segments.length) throw Error('Não sei medir: nenhuma seção visual à altura dos olhos');
const segmentDistance = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], den = dx * dx + dz * dz;
  const t = den ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / den)) : 0;
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
};
const walls = w.colliders.filter(c => c.minY <= EYE && c.maxY >= EYE);
const colliderDistance = (x, z, c) => {
  if (c.ry) {
    const dx = x - c.cx, dz = z - c.cz;
    const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
    return Math.hypot(Math.max(0, Math.abs(lx) - c.hx), Math.max(0, Math.abs(lz) - c.hz));
  }
  return Math.hypot(Math.max(c.minX - x, 0, x - c.maxX), Math.max(c.minZ - z, 0, z - c.maxZ));
};
const physicalRay = (x, z, dx, dz, c) => {
  let ox = x, oz = z, vx = dx, vz = dz, x0 = c.minX, x1 = c.maxX, z0 = c.minZ, z1 = c.maxZ;
  if (c.ry) {
    ox = (x - c.cx) * c.cos - (z - c.cz) * c.sin;oz = (x - c.cx) * c.sin + (z - c.cz) * c.cos;
    vx = dx * c.cos - dz * c.sin;vz = dx * c.sin + dz * c.cos;
    x0 = -c.hx;x1 = c.hx;z0 = -c.hz;z1 = c.hz;
  }
  let near = 0, far = Infinity;
  for (const [o, d, min, max] of [[ox, vx, x0, x1], [oz, vz, z0, z1]]) {
    if (Math.abs(d) < 1e-8) { if (o < min || o > max) return Infinity;continue; }
    const a = (min - o) / d, b = (max - o) / d;
    near = Math.max(near, Math.min(a, b));far = Math.min(far, Math.max(a, b));
    if (near > far) return Infinity;
  }
  return far >= 0 ? near : Infinity;
};
const visualRay = (x, z, dx, dz) => {
  let nearest = Infinity;
  for (const [a, b] of segments) {
    const sx = b[0] - a[0], sz = b[1] - a[1], den = dx * sz - dz * sx;
    if (Math.abs(den) < 1e-8) continue;
    const ox = a[0] - x, oz = a[1] - z, distance = (ox * sz - oz * sx) / den, along = (ox * dz - oz * dx) / den;
    if (distance >= 0 && along >= 0 && along <= 1) nearest = Math.min(nearest, distance);
  }
  return nearest;
};
const point = new THREE.Vector3(), body = (x, z) => {
  point.set(x, 0, z);g._collide(point, R);
  return { push: Math.hypot(point.x - x, point.z - z), floor: w.groundHeightAt(x, z, 0) };
};
const samples = [], excluded = { plaza: 0, blocked: 0, raised: 0 };
for (let x = w.bounds.minX + GRID / 2; x < w.bounds.maxX; x += GRID) for (let z = w.bounds.minZ + GRID / 2; z < w.bounds.maxZ; z += GRID) {
  if (insidePlaza(x, z)) { excluded.plaza++;continue; }
  const state = body(x, z);
  if (Math.abs(state.floor) > EPS) { excluded.raised++;continue; }
  if (state.push > EPS) { excluded.blocked++;continue; }
  const physicalRadius = Math.min(...walls.map(c => colliderDistance(x, z, c)));
  let visualRadius = Infinity;
  for (const [a, b] of segments) visualRadius = Math.min(visualRadius, segmentDistance(x, z, a, b));
  samples.push({ x, z, physicalRadius, visualRadius });
}
const wide = samples.filter(s => !Number.isFinite(s.physicalRadius) || !Number.isFinite(s.visualRadius) || s.physicalRadius > MAX_RADIUS + EPS || s.visualRadius > MAX_RADIUS + EPS);
const ghost = samples.filter(s => s.visualRadius > s.physicalRadius + .3);
const directionalGhost = [];let visualCuts = 0;
for (const s of samples) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  const physical = Math.min(...walls.map(c => physicalRay(s.x, s.z, dx, dz, c)));
  if (physical > 3) continue;
  const visual = visualRay(s.x, s.z, dx, dz);visualCuts++;
  if (visual > physical + .3) directionalGhost.push({ x: s.x, z: s.z, direction: [dx, dz], physical, visual });
}
const routes = [];
for (const route of w.design.routes) for (let i = 1; i < route.points.length; i++) {
  const a = route.points[i - 1], b = route.points[i], steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (R / 2)));
  for (let k = 0; k <= steps; k++) { const t = k / steps, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;routes.push({ route: route.name, x, z, ...body(x, z) }); }
}
const blocked = routes.filter(p => p.push > EPS || Math.abs(p.floor) > EPS);
const worst = [...samples].sort((a, b) => Math.max(b.physicalRadius, b.visualRadius) - Math.max(a.physicalRadius, a.visualRadius)).slice(0, 24);
const checks = [
  { id: 'LRU1', label: 'toda área térrea fora da praça tem raio livre até 1,45 m', valid: samples.length > 100 && !wide.length, evidence: { samples: samples.length, invalid: wide.length, maxPhysical: samples.length ? Math.max(...samples.map(s => s.physicalRadius)) : null, maxVisual: samples.length ? Math.max(...samples.map(s => s.visualRadius)) : null, worst: worst.slice(0, 4) } },
  { id: 'LRU2', label: 'faces físicas próximas têm geometria visual correspondente', valid: samples.length > 100 && visualCuts > 0 && !ghost.length && !directionalGhost.length, evidence: { invalid: ghost.length + directionalGhost.length, visualCuts, tolerance: .3, examples: [...ghost, ...directionalGhost].slice(0, 6) } },
  { id: 'LRU3', label: 'todas as rotas declaradas continuam térreas e livres para o corpo real', valid: w.design.routes.length === 3 && routes.length > 0 && !blocked.length, evidence: { routes: w.design.routes.length, samples: routes.length, blocked: blocked.length, examples: blocked.slice(0, 4) } },
];
const result = { builderSha256: crypto.createHash('sha256').update(fs.readFileSync(new URL('../../public/js/map_lajes_authored.js', import.meta.url))).digest('hex'), mutant, mutation, grid: GRID, bodyRadius: R, eye: EYE, maxRadius: MAX_RADIUS, plaza, transition: TRANSITION, visualSegments: segments.length, excluded, samples, worst, checks, valid: checks.every(c => c.valid) };
for (const check of checks) console.log(`${check.valid ? '✓' : '✗'} ${check.id} ${check.label}: ${JSON.stringify(check.evidence)}`);
const output = process.argv.find(a => a.startsWith('--json='))?.slice(7);
if (output) fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
if (mutant && !mutation) throw Error('MUTANTE NÃO APLICOU');
if (mutant && result.valid) console.error('MUTANTE SOBREVIVEU');
process.exitCode = result.valid && !mutant ? 0 : 1;
