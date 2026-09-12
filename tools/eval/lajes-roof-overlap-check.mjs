// As tampas das casas não podem disputar profundidade com o piso: crítica V5/2.
import fs from 'node:fs';
import { THREE, bootGame, initTextures } from './harness.mjs';
const game = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 12345 });
const w = game.world, h = w.design.roofHeight;
if (process.argv.includes('--mutante=duplicar-piso')) {
  const source = w.root.children.find(m => m.userData.lajesPlatform);
  if (!source) throw Error('MUTANTE NÃO APLICOU');
  const clone = source.clone(); w.root.add(clone); w.occluders.push(clone);
}
w.root.updateMatrixWorld(true);
const samples = [];
for (const p of w.design.platforms) for (const along of [.23, .43, .67, .83]) {
  const x = (p.x0 + p.x1) / 2 + .21, z = p.z0 + (p.z1 - p.z0) * along;
  const hits = new THREE.Raycaster(new THREE.Vector3(x, h + .12, z), new THREE.Vector3(0, -1, 0), 0, .15)
    .intersectObjects(w.occluders, false).filter(hit => Math.abs(hit.point.y - h) < 1e-4);
  samples.push({ x, z, topFaces: hits.length, valid: hits.length === 1 });
}
const valid = samples.every(s => s.valid);
console.log(`${valid ? '✓' : '✗'} LRO1 piso visível único: ${samples.filter(s => s.valid).length}/${samples.length}`);
const output = process.argv.find(a => a.startsWith('--json='))?.slice(7);
if (output) fs.writeFileSync(output, JSON.stringify({ valid, samples }, null, 2));
if (!valid) process.exitCode = 1;
if (valid && process.argv.some(a => a.startsWith('--mutante='))) throw Error('MUTANTE SOBREVIVEU');
