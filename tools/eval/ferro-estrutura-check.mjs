#!/usr/bin/env node
/* Ferro Velho: contrato estrutural próprio. Mede o mundo construído pelo jogo e oferece
   mutantes para provar que identidade, rotas, passarela, cobertura, CTF, capacidade e
   ambiência não são checks decorativos. */
import { existsSync } from 'node:fs';
import { THREE, bootGame, initTextures } from './harness.mjs';
import { rotasSeparadas } from './rotas-separadas.mjs';
import { FERRO_PROPS, FERRO_AMBIENCE } from '../../public/js/map_ferrovelho.js';

const MUTANTES = new Set(['sem-identidade', 'sem-passarela', 'rota-fechada', 'beco-fechado', 'ctf-convergente', 'spawn-apertado', 'sem-cobertura-leste', 'sem-ambiencia']);
const MUT = (process.argv.find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';
if (MUT && !MUTANTES.has(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const game = bootGame('ferro_velho', { textures: initTextures(), ctf: true, seed: 12345, bots: 8 });
const W = game.world, nodes = W.waypoints.nodes, adj = W.waypoints.adj;
const porRole = (role) => { const out = []; W.root.traverse((o) => { if (o.userData?.ferroRole === role) out.push(o); }); return out; };
const fauna = () => { const out = []; W.root.traverse((o) => { if (o.userData?.fauna) out.push(o); }); return out; };
const remove = (objects) => { for (const o of objects) if (o.parent) o.parent.remove(o); };
const cutNode = (i) => { adj[i] = []; for (let j = 0; j < adj.length; j++) adj[j] = adj[j].filter((k) => k !== i); };

if (MUT === 'sem-identidade') FERRO_PROPS.splice(0);
if (MUT === 'sem-passarela') { remove([...porRole('elevated-deck'), ...porRole('elevated-ramp'), ...porRole('elevated-rail')]); for (const n of nodes) n.y = 0; }
if (MUT === 'rota-fechada') for (let i = 0; i < nodes.length; i++) if (nodes[i].x > 25) cutNode(i);
if (MUT === 'beco-fechado') {
  for (let i = 0; i < nodes.length; i++)
    if (nodes[i].x > -21 && nodes[i].x < -18 && nodes[i].z > 3 && nodes[i].z < 8) cutNode(i);
}
if (MUT === 'ctf-convergente') W.ctfPoints.splice(0, W.ctfPoints.length,
  { id: 'A', label: 'A', x: 0, z: -18 }, { id: 'M', label: 'M', x: 0, z: 0 }, { id: 'B', label: 'B', x: 0, z: 18 });
if (MUT === 'spawn-apertado') { W.spawns.E[0].x = -5; W.spawns.E[0].z = 33.8; }
if (MUT === 'sem-cobertura-leste') remove(porRole('east-cover'));
if (MUT === 'sem-ambiencia') { remove(fauna()); W.ambience = null; W.sound = null; }
W.root.updateMatrixWorld(true);

const results = [];
const clause = (id, ok, evidence) => { results.push(ok); console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${evidence}${MUT ? ` [mutante ${MUT}]` : ''}`); };

// FVE1 — o mapa usa o acervo local já versionado, sem download novo.
const missingProps = FERRO_PROPS.filter((id) => !existsSync(new URL(`../../public/models/props/${id}.glb`, import.meta.url)));
clause('FVE1', FERRO_PROPS.length >= 14 && !missingProps.length,
  `${FERRO_PROPS.length} props locais; ausentes ${missingProps.join(',') || 'nenhum'}`);

// FVE2 — Beco Oeste mantém as duas saídas laterais diretas para o miolo.
const exits = [6.8, -10.2].map((z) => {
  const a = W.nearestWaypoint(-23.2, z), b = W.nearestWaypoint(-16.4, z), path = W.findPath(a, b);
  return { z, len: path.length, ok: path.length === 3 && path.at(-1) === b && path.some((i) => Math.abs(nodes[i].x + 19.8) < .2) };
});
clause('FVE2', exits.every((e) => e.ok), exits.map((e) => `z${e.z}: ${e.ok ? `${e.len} nós` : 'fechada'}`).join(' · '));

// FVE3 — cada spawn alcança oeste, centro e leste; o leste sobe de fato à passarela.
const choices = {
  E: [[-23, 26, -23, 10], [0, 27, 0, 13], [28.7, 30, 28.7, 18]],
  B: [[-23, -18, -23, -5], [0, -18, 0, -5], [28.7, 4, 28.7, 18]],
};
const routes = [];
for (const [team, specs] of Object.entries(choices)) {
  const s = W.spawns[team][0], start = W.nearestWaypoint(s.x, s.z);
  for (const [gx, gz, tx, tz] of specs) {
    const gate = W.nearestWaypoint(gx, gz), target = W.nearestWaypoint(tx, tz);
    const a = W.findPath(start, gate), b = W.findPath(gate, target), maxY = Math.max(...a.concat(b).map((i) => nodes[i].y || 0));
    routes.push({ team, lane: gx < -10 ? 'O' : gx > 10 ? 'L' : 'C', ok: a.length > 1 && a.at(-1) === gate && b.length > 1 && b.at(-1) === target && (gx < 10 || maxY >= 2.3), maxY });
  }
}
clause('FVE3', routes.every((r) => r.ok), routes.map((r) => `${r.team}-${r.lane} ${r.ok ? `${r.maxY.toFixed(1)}m` : 'X'}`).join(' · '));

// FVE4 — a rota alta tem duas rampas, deck e guarda-corpo; a baixa ganha três covers.
const deck = porRole('elevated-deck'), ramps = porRole('elevated-ramp'), rails = porRole('elevated-rail'), covers = porRole('east-cover');
const heights = nodes.filter((n) => n.x >= 27 && n.x <= 30.4 && n.z >= 4 && n.z <= 32).map((n) => n.y || 0);
clause('FVE4', deck.length === 1 && ramps.length === 2 && rails.length === 4 && covers.length === 3 && Math.max(...heights) >= 2.3 && Math.min(...heights) <= .5,
  `${deck.length} deck · ${ramps.length} rampas · ${rails.length} guarda-corpos · ${covers.length} covers · cotas ${Math.min(...heights).toFixed(1)}–${Math.max(...heights).toFixed(1)} m`);

// FVE5 — quatro objetivos espalhados e pelo menos duas rotas separadas por par.
const ctf = [];
for (const team of ['E', 'B']) for (const p of W.ctfPoints) {
  const s = W.spawns[team][0];
  ctf.push({ pair: `${team}→${p.label}`, routes: rotasSeparadas(nodes, adj, W.nearestWaypoint(s.x, s.z), W.nearestWaypoint(p.x, p.z)).length });
}
let minHeight = Infinity;
for (let i = 0; i < W.ctfPoints.length; i++) for (let j = i + 1; j < W.ctfPoints.length; j++) for (let k = j + 1; k < W.ctfPoints.length; k++) {
  const [a, b, c] = [W.ctfPoints[i], W.ctfPoints[j], W.ctfPoints[k]];
  const area2 = Math.abs((b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z));
  const side = Math.max(Math.hypot(b.x - a.x, b.z - a.z), Math.hypot(c.x - a.x, c.z - a.z), Math.hypot(c.x - b.x, c.z - b.z));
  minHeight = Math.min(minHeight, side ? area2 / side : 0);
}
clause('FVE5', W.ctfPoints.length === 4 && minHeight >= 4.5 && ctf.every((x) => x.routes >= 2),
  `${W.ctfPoints.length} objetivos; altura mínima ${minHeight.toFixed(2)} m; rotas ${ctf.map((x) => x.routes).join('/')}`);

// FVE6 — 8x8 usa slots únicos e preserva folga corporal e proteção distante.
const allSpawns = Object.values(W.spawns).flat();
const unique = new Set(allSpawns.map((s) => `${s.x.toFixed(2)},${s.z.toFixed(2)}`));
const relevant = W.colliders.filter((c) => c.minY < 1.5 && c.maxY > .3);
const clearance = allSpawns.map((s) => Math.min(...relevant.map((c) => Math.hypot(Math.max(c.minX - s.x, 0, s.x - c.maxX), Math.max(c.minZ - s.z, 0, s.z - c.maxZ)))));
const exposure = [];
for (const [team, list] of Object.entries(W.spawns)) {
  let seen = 0, total = 0;
  for (const s of list) for (const n of nodes) {
    if (Math.hypot(n.x - s.x, n.z - s.z) < 25) continue;
    total++; if (game._losClear(new THREE.Vector3(n.x, (n.y || 0) + 1.62, n.z), new THREE.Vector3(s.x, 1.62, s.z))) seen++;
  }
  exposure.push({ team, frac: total ? seen / total : 1 });
}
clause('FVE6', W.spawns.E.length === 8 && W.spawns.B.length === 8 && unique.size === 16 && Math.min(...clearance) >= 1.2 && Math.max(...exposure.map((x) => x.frac)) <= .36,
  `slots E/B ${W.spawns.E.length}/${W.spawns.B.length}, únicos ${unique.size}; folga ${Math.min(...clearance).toFixed(2)} m; exposição ${exposure.map((x) => `${x.team} ${(100 * x.frac).toFixed(1)}%`).join(' · ')}`);

// FVE7 — fauna local com movimento e som urbano/gravel já licenciado.
const animals = fauna(), types = new Set(animals.map((o) => o.userData.fauna)), loops = W.sound?.loops || [];
const faunaFiles = ['rat_animated.glb', 'pigeon_ground.glb', 'dog_caramelo.glb', 'barata_urbana.glb'];
const missingFauna = faunaFiles.filter((file) => !existsSync(new URL(`../../public/models/ambient/${file}`, import.meta.url)));
clause('FVE7', FERRO_AMBIENCE.length === 4 && types.size >= 4 && loops.length === 2 && !missingFauna.length,
  `${animals.length} animais (${[...types].join('/') || 'nenhum'}); ${loops.length} loops; ausentes ${missingFauna.join(',') || 'nenhum'}`);

const failures = results.filter((ok) => !ok).length;
if (MUT && failures === 0) { console.error(`MUTAÇÃO '${MUT}' não acendeu cláusula`); process.exit(2); }
if (failures) process.exit(1);
console.log('FERRO-ESTRUTURA ✓ 7 cláusulas verdes');
