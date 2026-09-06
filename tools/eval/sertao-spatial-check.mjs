/* Régua espacial do Sertão: mede o mundo Node/proxy, nunca declara GLB aprovado.
   Procedência: pedido do dono preservado em docs/reports/SERTAO-ESPACIAL.md.
   Cada mutante constrói outro mundo e altera estado real antes de medir.
   Não há fixture normalizada: alvo já vermelho torna a mutação inconclusiva.
   Uso: node tools/eval/sertao-spatial-check.mjs [--json] [--mutante=NOME|--self-test]
*/
import { THREE, MAPS, initTextures } from './harness.mjs';
import { createHash } from 'node:crypto';

const EPS = 1e-6;
const close = (a, b, eps = EPS) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= eps;
const named = (world, prefix) => {
  const objects = [];
  world.root.traverse(o => { if (o.name?.startsWith(prefix)) objects.push(o); });
  return objects;
};
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const arsenal = ['awp', 'ak', 'm4', 'shotgun', 'mp5', 'deagle', 'pistol'];
// Coordenadas congeladas do HEAD 49441895: não derivar expectativa do mundo medido.
const EXPECTED = {
  spawns: {
    E: [-12, -4, 4, 12].map(x => ({ x, z: -41, yaw: 0 })),
    B: [12, 4, -4, -12].map(x => ({ x, z: 41, yaw: Math.PI })),
  },
  pickups: [
    ...arsenal.map((kind, i) => ({ x: -12 + i * 4, z: -40, kind })),
    ...arsenal.map((kind, i) => ({ x: 12 - i * 4, z: 40, kind })),
    { x: -2, z: 0, kind: 'deagle' }, { x: 2, z: 0, kind: 'shotgun' },
  ],
  ctf: [{ id: 'E', x: -12, z: -34 }, { id: 'MID', x: 0, z: 2 }, { id: 'B', x: 12, z: 34 }],
};

async function build() {
  const textures = await initTextures();
  const savedWindow = globalThis.window;
  // O harness define window; removê-la só no build força texProcedural e proxies.
  delete globalThis.window;
  try { return MAPS.velho_oeste.build(new THREE.Scene(), textures); }
  finally { globalThis.window = savedWindow; }
}

function wallTextures(world) {
  const result = new Set();
  for (const wall of [...named(world, 'parede-'), ...named(world, 'abrigo-spawn-')]) {
    for (const mat of Array.isArray(wall.material) ? wall.material : [wall.material]) {
      if (mat?.map?.isDataTexture && mat.map.name?.startsWith('oeste-adobe')) result.add(mat.map);
    }
  }
  return [...result];
}

function alphaCheck(world) {
  const textures = wallTextures(world).map(t => {
    const { data, width, height } = t.image;
    let badAlpha = 0, nonzeroRGB = 0;
    const colors = new Set();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] !== 255) badAlpha++;
      if (data[i] || data[i + 1] || data[i + 2]) nonzeroRGB++;
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
    return { name: t.name, width, height, pixels: width * height, badAlpha,
      nonzeroRGB, colors: colors.size, rgba: t.format === THREE.RGBAFormat && data.length === width * height * 4 };
  });
  return { pass: textures.length >= 2 && textures.every(t => t.rgba && !t.badAlpha && t.nonzeroRGB === t.pixels && t.colors >= 2), textures };
}

function houseCheck(world) {
  const houses = named(world, 'sertao-casa-');
  const errors = [];
  for (const house of houses) {
    const matches = world.colliders.filter(c => c.tag === house.name);
    if (matches.length !== 1) { errors.push({ house: house.name, reason: 'tag-unica-ausente', matches: matches.length }); continue; }
    const c = matches[0], o = c.obb ?? c;
    if (!o || !['cx', 'cz', 'hx', 'hz', 'ry', 'cos', 'sin'].every(k => Number.isFinite(o[k])) || o.hx <= 0 || o.hz <= 0) {
      errors.push({ house: house.name, reason: 'obb-invalido' }); continue;
    }
    const hx = Math.abs(o.cos) * o.hx + Math.abs(o.sin) * o.hz;
    const hz = Math.abs(o.sin) * o.hx + Math.abs(o.cos) * o.hz;
    const coherent = close(o.cx, house.position.x) && close(o.cz, house.position.z)
      && close(Math.sin(o.ry - house.rotation.y), 0) && Math.cos(o.ry - house.rotation.y) > 0
      && close(o.cos, Math.cos(o.ry)) && close(o.sin, Math.sin(o.ry))
      && close(c.minX, o.cx - hx) && close(c.maxX, o.cx + hx)
      && close(c.minZ, o.cz - hz) && close(c.maxZ, o.cz + hz);
    if (!coherent) errors.push({ house: house.name, reason: 'rotacao-centro-ou-aabb-diverge' });
  }
  return { pass: houses.length === 10 && !errors.length, houses: houses.length, errors };
}

function churchCollider(world) {
  const church = named(world, 'sertao-igrejinha-')[0];
  if (!church) return null;
  const tagged = world.colliders.filter(c => c.tag === church.name);
  const candidates = tagged.length ? tagged : world.colliders.filter(c =>
    close((c.minX + c.maxX) / 2, church.position.x) && close((c.minZ + c.maxZ) / 2, church.position.z) && c.maxY >= 6);
  return candidates.length === 1 ? { church, collider: candidates[0] } : null;
}

function churchCheck(world) {
  const match = churchCollider(world);
  if (!match) return { pass: false, reason: 'colisor-unico-igreja-ausente' };
  const { church, collider: c } = match;
  // Footprint GLB medido externamente: dimensões totais 4.35 × 6.30 m.
  // Node só compara números; não carrega nem mede o GLB de novo.
  const o = c.obb ?? c;
  const half = Number.isFinite(o.hx) ? [o.hx, o.hz] : [(c.maxX - c.minX) / 2, (c.maxZ - c.minZ) / 2];
  const excess = [half[0] - 4.35 / 2, half[1] - 6.30 / 2];
  const center = [o.cx ?? (c.minX + c.maxX) / 2, o.cz ?? (c.minZ + c.maxZ) / 2];
  return { pass: excess.every(v => Number.isFinite(v) && v >= -.10 - EPS && v <= .25 + EPS)
    && close(center[0], church.position.x) && close(center[1], church.position.z),
    actualFootprintReference: [4.35, 6.30], colliderHalf: half, excessPerSide: excess, tolerance: [-.10, .25] };
}

const LANES = { oeste: p => p.x <= -12, centro: p => Math.abs(p.x) < 12, leste: p => p.x >= 12 };
function routesCheck(world) {
  const { nodes = [], adj = [] } = world.waypoints || {};
  const nearest = (x, z) => nodes.reduce((best, p, i) => best < 0 || Math.hypot(p.x - x, p.z - z) < Math.hypot(nodes[best].x - x, nodes[best].z - z) ? i : best, -1);
  const start = nearest(0, -41), end = nearest(0, 41);
  const graphValid = nodes.length >= 100 && adj.length === nodes.length && nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.z))
    && adj.every((edges, i) => Array.isArray(edges) && edges.every(j => Number.isInteger(j) && j >= 0 && j < nodes.length && j !== i));
  // Faixas só na seção central de 3.4 m. Um desvio junto à igreja/casas é
  // permitido; proibir x<12 no flanco inteiro daria um falso negativo no leste.
  const gateHalf = 1.7, interiorHalf = 30;
  let attempts = 0;
  const validAdj = graphValid ? adj.map((edges, i) => edges.filter(j => Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z) <= 5.11)) : [];
  function bfs(a, b, banned, lane) {
    const prev = new Map([[a, null]]), queue = [a];
    for (let head = 0; head < queue.length && !prev.has(b); head++) {
      const i = queue[head];
      for (const j of validAdj[i]) {
        if (prev.has(j) || banned.has(j)) continue;
        const p = nodes[i], q = nodes[j];
        let legal = true;
        for (let k = 1; k < 10; k++) {
          const t = k / 10, at = { x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t };
          if (Math.abs(at.z) < gateHalf && !lane(at)) { legal = false; break; }
        }
        if (!legal) continue;
        prev.set(j, i); queue.push(j);
      }
    }
    const path = [];
    if (prev.has(b)) for (let i = b; i !== null; i = prev.get(i)) path.unshift(i);
    return path;
  }
  function search(remaining, used, result) {
    if (!remaining.length) return result;
    for (const name of remaining) {
      const lane = LANES[name];
      const banned = new Set([...used, ...nodes.flatMap((p, i) => Math.abs(p.z) < gateHalf && !lane(p) ? [i] : [])]);
      const gates = nodes.flatMap((p, i) => Math.abs(p.z) < gateHalf && lane(p) && !banned.has(i) ? [i] : []);
      for (const gate of gates) for (const reverse of [false, true]) {
        if (++attempts > 20000) return null;
        const first = bfs(reverse ? end : start, gate, banned, lane);
        if (!first.length) continue;
        const second = bfs(gate, reverse ? start : end, new Set([...banned, ...first.slice(0, -1)]), lane);
        if (!second.length) continue;
        const path = first.concat(second.slice(1));
        if (reverse) path.reverse();
        const found = search(remaining.filter(n => n !== name),
          new Set([...used, ...path.filter(i => Math.abs(nodes[i].z) <= interiorHalf)]), { ...result, [name]: path });
        if (found) return found;
      }
    }
    return null;
  }
  const paths = graphValid ? search(Object.keys(LANES), new Set(), {}) : null;
  const sets = Object.values(paths || {}).map(path => new Set(path.filter(i => Math.abs(nodes[i].z) <= interiorHalf)));
  const disjoint = sets.length === 3 && sets.every((s, i) => sets.every((t, j) => i === j || [...s].every(n => !t.has(n))));
  const lengths = Object.fromEntries(Object.keys(LANES).map(name => [name, paths?.[name]?.length || 0]));
  const gates = Object.fromEntries(Object.entries(paths || {}).map(([name, path]) => [name, path.filter(i => Math.abs(nodes[i].z) < gateHalf).map(i => nodes[i])]));
  return { pass: graphValid && start !== end && nodes[start].z <= -38 && nodes[end].z >= 38 && disjoint
    && Object.values(paths || {}).every(p => p[0] === start && p.at(-1) === end && new Set(p).size === p.length)
    && sets.every(s => s.size >= 5),
    nodes: nodes.length, start, end, lengths, disjoint, gateHalf, interiorHalf,
    attempts, searchLimitReached: attempts > 20000, gates, interiorCounts: sets.map(s => s.size), paths: paths || {} };
}

function coordinateCheck(world, kind) {
  const expected = EXPECTED[kind];
  let actual;
  if (kind === 'spawns') actual = Object.fromEntries(Object.entries(world.spawns || {}).map(([team, ps]) => [team, ps.map(({ x, z, yaw }) => ({ x, z, yaw }))]));
  if (kind === 'pickups') actual = (world.pickups || []).map(({ x, z, kind }) => ({ x, z, kind }));
  if (kind === 'ctf') actual = (world.ctfPoints || []).map(({ id, x, z }) => ({ id, x, z }));
  const canonical = value => Array.isArray(value) ? value.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
  return { pass: JSON.stringify(canonical(actual)) === JSON.stringify(canonical(expected)), actual, expected };
}

function stableCheck(world) {
  const weeds = named(world, 'tumbleweed-').map(o => o.name);
  if (typeof world.update !== 'function') return { pass: false, weeds, reason: 'update-ausente' };
  world.update(0, 0);
  const before = JSON.parse(JSON.stringify(world.colliders));
  // Exercita toda a janela: uma animação que volta à origem em t20 também falha.
  let firstChangedAt = null;
  for (let t = .5; t <= 20; t += .5) {
    world.update(.5, t);
    if (JSON.stringify(before) !== JSON.stringify(world.colliders) && firstChangedAt === null) firstChangedAt = t;
  }
  const after = JSON.parse(JSON.stringify(world.colliders));
  return { pass: !weeds.length && firstChangedAt === null, weeds, colliders: before.length,
    firstChangedAt, t0Hash: digest(before), t20Hash: digest(after) };
}

function evaluate(world) {
  // Estrutura medida antes de update: o mutante de update só afeta SP2.
  const structural = { SP1: alphaCheck(world), SP3: houseCheck(world), SP4: routesCheck(world),
    SP5: coordinateCheck(world, 'spawns'), SP6: coordinateCheck(world, 'pickups'),
    SP7: coordinateCheck(world, 'ctf'), SP8: churchCheck(world) };
  const SP2 = stableCheck(world);
  return { SP1: structural.SP1, SP2, ...Object.fromEntries(Object.entries(structural).filter(([id]) => id !== 'SP1')) };
}

const MUTANTS = {
  'alpha-zero': { target: 'SP1', apply(w) { const t = wallTextures(w)[0]; if (!t) throw Error('parede DataTexture ausente'); t.image.data[3] = 0; } },
  'tumbleweed': { target: 'SP2', apply(w) { const o = new THREE.Group(); o.name = 'tumbleweed-mutante'; w.root.add(o); } },
  'colisor-movel': { target: 'SP2', apply(w) { const update = w.update, c = w.colliders[0]; if (!c) throw Error('colisor ausente'); const x = c.minX; w.update = (dt, t) => { update(dt, t); c.minX = x + t / 20; }; } },
  'casa-yaw': { target: 'SP3', apply(w) { const o = named(w, 'sertao-casa-')[0]; if (!o) throw Error('casa ausente'); o.rotation.y += .37; } },
  'casa-tag': { target: 'SP3', apply(w) { const c = w.colliders.find(c => c.tag?.startsWith('sertao-casa-')); if (!c) throw Error('tag ausente'); c.tag = 'mutante-sem-casa'; } },
  'casa-obb': { target: 'SP3', apply(w) { const c = w.colliders.find(c => c.tag?.startsWith('sertao-casa-')); const o = c?.obb ?? c; if (!Number.isFinite(o?.hx)) throw Error('OBB ausente'); o.hx += 1; } },
  'rota-leste': { target: 'SP4', apply(w) { const cut = new Set(w.waypoints.nodes.flatMap((p, i) => p.x >= 12 && Math.abs(p.z) <= 4 ? [i] : [])); if (!cut.size) throw Error('nós leste ausentes'); w.waypoints.adj = w.waypoints.adj.map((edges, i) => cut.has(i) ? [] : edges.filter(j => !cut.has(j))); } },
  'spawn-deslocado': { target: 'SP5', apply(w) { w.spawns.E[0].x += 1; } },
  'pickup-deslocado': { target: 'SP6', apply(w) { w.pickups[0].x += 1; } },
  'ctf-deslocado': { target: 'SP7', apply(w) { w.ctfPoints[0].z += 1; } },
  'igreja-excesso': { target: 'SP8', apply(w) { const found = churchCollider(w); if (!found) throw Error('igreja ausente'); const c = found.collider; const o = c.obb ?? c; if (Number.isFinite(o.hx)) o.hx += 1; c.minX -= 1; c.maxX += 1; } },
};

const mutation = process.argv.find(a => a.startsWith('--mutante='))?.slice('--mutante='.length);
const selfTest = process.argv.includes('--self-test');
const json = process.argv.includes('--json');
if ((mutation && !Object.hasOwn(MUTANTS, mutation)) || (mutation && selfTest)) {
  console.error(`Argumento inválido. Mutantes: ${Object.keys(MUTANTS).join(', ')}`); process.exit(2);
}
const baseline = evaluate(await build());
const selected = selfTest ? Object.keys(MUTANTS) : mutation ? [mutation] : [];
const mutations = [];
for (const name of selected) {
  const spec = MUTANTS[name];
  if (!baseline[spec.target].pass) {
    mutations.push({ name, target: spec.target, status: 'INCONCLUSIVO', reason: 'alvo-já-vermelho-no-mundo-real' }); continue;
  }
  const world = await build();
  spec.apply(world);
  const results = evaluate(world);
  const changed = Object.keys(baseline).filter(id => results[id].pass !== baseline[id].pass);
  // Isolamento é do contrato: alterar uma tag muda o hash diagnóstico SP2, mas
  // não a estabilidade temporal. Não confundir esse hash diferente com falha SP2.
  const unrelated = changed.filter(id => id !== spec.target);
  const killed = changed.length === 1 && changed[0] === spec.target && !results[spec.target].pass && !unrelated.length;
  mutations.push({ name, target: spec.target, status: killed ? 'MORDIDO' : 'FALHOU-ISOLAMENTO', changed, unrelated });
}
const report = { mode: 'Node/proxy-sem-GLB', baseline, mutations };
if (json) console.log(JSON.stringify(report, null, 2));
else {
  for (const [id, result] of Object.entries(baseline)) {
    const compact = { ...result }; delete compact.paths; delete compact.expected; delete compact.actual;
    console.log(`${id} ${result.pass ? 'PASSA' : 'FALHA'} ${JSON.stringify(compact)}`);
  }
  for (const m of mutations) console.log(`MUTANTE ${m.name} ${m.status} -> ${m.target}${m.reason ? ` (${m.reason})` : ''}${m.unrelated?.length ? ` outras=${m.unrelated}` : ''}`);
}
const green = Object.values(baseline).every(r => r.pass);
process.exit(selected.length ? (mutations.every(m => m.status === 'MORDIDO') ? 0 : mutations.some(m => m.status === 'FALHOU-ISOLAMENTO') ? 1 : 2) : green ? 0 : 1);
