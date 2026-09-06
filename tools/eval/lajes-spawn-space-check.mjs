import assert from 'node:assert/strict';
import { bootGame, initTextures } from './harness.mjs';
import { medirRespawnBeco } from './lajes-spawn-space.mjs';

const started = performance.now();
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.slice(10);
assert([undefined, 'slot-dentro-parede', 'slots-coincidentes', 'saida-bloqueada'].includes(mutant), 'mutante desconhecido');
const game = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 12345 }), W = game.world;
if (mutant === 'slot-dentro-parede') {
  const s = W.spawns.E[0], before = W.colliders.length;
  W.colliders.push({ minX: s.x - .38, maxX: s.x + .38, minZ: s.z - .38, maxZ: s.z + .38, minY: 0, maxY: 3 });
  assert.equal(W.colliders.length, before + 1, 'MUTANTE NÃO APLICOU');
}
if (mutant === 'slots-coincidentes') {
  assert.notDeepEqual(W.spawns.E[1], W.spawns.E[0], 'MUTANTE NÃO APLICOU');
  W.spawns.E[1] = { ...W.spawns.E[0] };
}
if (mutant === 'saida-bloqueada') {
  const before = W.colliders.length, z = (W.spawns.E[0].z + W.praca.z0) / 2;
  W.colliders.push({ minX: W.bounds.minX, maxX: W.bounds.maxX, minZ: z - .38, maxZ: z + .38, minY: 0, maxY: 3 });
  assert.equal(W.colliders.length, before + 1, 'MUTANTE NÃO APLICOU');
}
const result = medirRespawnBeco(game);
const expected = { 'slot-dentro-parede': 'terreo-livre', 'slots-coincidentes': 'separacao', 'saida-bloqueada': 'saida-terrea' }[mutant];
if (mutant) assert(result.evidence.checks.some(c => c.id === expected && !c.ok), `MUTANTE SOBREVIVEU: ${mutant}`);
for (const c of result.evidence.checks) console.log(`${c.ok ? '✓' : '✗'} ${c.id}: ${c.detail}`);
console.log(`${result.ok ? '✓' : '✗'} LSP1 respawn em beco: ${result.evidence.slots.filter(s => s.route.ok).length}/8 saídas físicas; ${result.evidence.collisionSamples ?? 0} sondas; ${(performance.now() - started).toFixed(1)}ms`);
console.log(JSON.stringify({ ...result, mutant: mutant ?? null }));
game.world.ambience?.dispose();
process.exitCode = result.ok ? 0 : 1;
