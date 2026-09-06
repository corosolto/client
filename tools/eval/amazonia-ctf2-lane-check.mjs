/* Prova offline da faixa B: cada aresta explicitamente adicionada percorre a física real. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { bootGame, initTextures } from './harness.mjs';

const out = process.argv.find(a => a.startsWith('--out='))?.slice(6) || '';
const sourceSha = createHash('sha256').update(readFileSync(new URL('../../public/js/map_amazonia.js', import.meta.url))).digest('hex');
const game = bootGame('amazonia', { textures: initTextures(), ctf: true, seed: 43017, bots: 2 });
const lane = game.world.amazonia.rotaLateralB;
const nodes = game.world.waypoints.nodes, adj = game.world.waypoints.adj;
const length = ([a, b]) => Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z);
const walkExactly = (from, to) => {
  const sim = { x: from.x, y: from.y, z: from.z };
  const dx = to.x - sim.x, dz = to.z - sim.z, d = Math.hypot(dx, dz);
  const steps = Math.min(24, Math.ceil(d / .3));
  for (let i = 0; i < steps; i++) {
    sim.x += dx / d * .3; sim.z += dz / d * .3;
    game._collide(sim, .38);
    sim.y = game.world.groundHeightAt(sim.x, sim.z, sim.y);
  }
  return { horizontalResidual: Math.hypot(to.x - sim.x, to.z - sim.z), verticalResidual: Math.abs(to.y - sim.y), end: sim };
};
const checks = lane.links.map(([a, b]) => ({
  a, b, meters: length([a, b]),
  forward: adj[a].includes(b) && game._walkReach({ pos: nodes[a] }, nodes[b], .45),
  backward: adj[b].includes(a) && game._walkReach({ pos: nodes[b] }, nodes[a], .45),
  forwardWalk: walkExactly(nodes[a], nodes[b]), backwardWalk: walkExactly(nodes[b], nodes[a]),
  from: nodes[a], to: nodes[b],
}));
const automaticContacts = lane.nodes.flatMap(a => adj[a].filter(b => !lane.nodes.includes(b)).map(b => [a, b]));
const explicitContacts = lane.links.filter(([a, b]) => lane.nodes.includes(a) !== lane.nodes.includes(b));
const failed = checks.filter(c => !c.forward || !c.backward || c.meters > 3.2 || c.forwardWalk.horizontalResidual > .45 || c.backwardWalk.horizontalResidual > .45 || c.forwardWalk.verticalResidual > .55 || c.backwardWalk.verticalResidual > .55);
const receipt = {
  scope: 'Game._collide + groundHeightAt reais por segmento, sem browser, render ou recuperação. Limite 3,2 m impede atalho além do passo da grade original.',
  sourceSha, laneNodes: lane.nodes.length, forcedLinks: checks.length, automaticContacts, explicitContacts, maxMeters: Math.max(...checks.map(c => c.meters)), failed, checks,
};
if (out) writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ pass: lane.nodes.length === 24 && checks.length === 25 && automaticContacts.length === 2 && explicitContacts.length === 2 && failed.length === 0, laneNodes: lane.nodes.length, forcedLinks: checks.length, automaticContacts, explicitContacts, maxMeters: receipt.maxMeters, failed, output: out || null }, null, 2));
game.dispose();
if (lane.nodes.length !== 24 || checks.length !== 25 || automaticContacts.length !== 2 || explicitContacts.length !== 2 || failed.length) process.exitCode = 1;
