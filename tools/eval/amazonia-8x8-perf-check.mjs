/* Mede o A* real com a escala que o menu chama de 8×8 (15 bots + jogador).
 * AMAZONIA_BASELINE aponta para uma cópia temporária do mapa anterior na mesma pasta.
 */
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { MAPS, bootGame, initTextures } from './harness.mjs';

const out = process.argv.find(a => a.startsWith('--out='))?.slice(6) || '';
const source = new URL('../../public/js/map_amazonia.js', import.meta.url);
const candidateBuild = MAPS.amazonia.build;
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const run = (label, build) => {
  MAPS.amazonia.build = build;
  const game = bootGame('amazonia', { textures: initTextures(), ctf: true, seed: 13007, bots: 8 });
  const { nodes, adj } = game.world.waypoints;
  const pairs = Array.from({ length: 3600 }, (_, i) => [i % nodes.length, (i * 193 + 17) % nodes.length]);
  for (const [from, to] of pairs.slice(0, 300)) game.world.findPath(from, to);
  const samples = [];
  for (let turn = 0; turn < 7; turn++) {
    const start = performance.now();
    for (const [from, to] of pairs) game.world.findPath(from, to);
    samples.push(performance.now() - start);
  }
  const record = {
    label, bots: game.bots.length, nodes: nodes.length,
    edges: adj.reduce((total, list) => total + list.length, 0),
    colliders: game.world.colliders.length,
    pathBatchMs: +median(samples).toFixed(3), samplesMs: samples.map(n => +n.toFixed(3)),
  };
  game.dispose();
  return record;
};

const candidate = run('candidate', candidateBuild);
const receipt = {
  scope: 'Node puro, Game e findPath reais; mede custo de rota, não FPS/GPU.',
  sourceSha256: createHash('sha256').update(readFileSync(source)).digest('hex'), candidate,
};
if (process.env.AMAZONIA_BASELINE) {
  const baseline = (await import(pathToFileURL(process.env.AMAZONIA_BASELINE).href)).buildAmazonia;
  receipt.baseline = run('baseline', baseline);
  receipt.pathBatchReductionPct = +((1 - candidate.pathBatchMs / receipt.baseline.pathBatchMs) * 100).toFixed(1);
}
MAPS.amazonia.build = candidateBuild;
if (out) writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (candidate.bots !== 15 || candidate.nodes < 500 || candidate.edges < 3000) process.exitCode = 1;
