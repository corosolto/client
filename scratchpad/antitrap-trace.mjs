/* debug do grafo antitrap: reconstrói camadas+arestas e imprime o статус de
   células específicas. Uso: node scratchpad/antitrap-trace.mjs "x,z" ... */
import { THREE, bootGame, initTextures } from '../tools/eval/harness.mjs';

const STEP_H = 0.55, R = 0.38, GRID = 0.5;
const game = bootGame('fy_lajes', { textures: initTextures(), bots: 0, seed: 19082026 });
const W = game.world, B = W.bounds;
const cx = (i) => B.minX + R + (i + 0.5) * GRID, cz = (k) => B.minZ + R + (k + 0.5) * GRID;
const q = (h) => Math.round(h * 100);
const p = new THREE.Vector3();
const standable = (x, z, h) => { p.set(x, h, z); game._collide(p, R); return Math.abs(p.x - x) < 1e-3 && Math.abs(p.z - z) < 1e-3; };
const PROBES = []; for (let y = 0; y <= 6.4; y += 0.5) PROBES.push(y); PROBES.push(1e3);
const nx = Math.floor((B.maxX - B.minX - 2 * R) / GRID), nz = Math.floor((B.maxZ - B.minZ - 2 * R) / GRID);
const camadas = new Map();
for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
  const x = cx(i), z = cz(k), vistos = new Map();
  for (const y of PROBES) {
    const h = W.groundHeightAt(x, z, y);
    if (h < -0.01 || h > 6.0) continue;
    if (Math.abs(h - y) > 0.56) continue;
    vistos.set(q(h), h);
  }
  const lista = [...vistos.values()].filter((h) => standable(x, z, h));
  if (lista.length) camadas.set(`${i},${k}`, lista.map((h) => ({ h, key: q(h) })));
}
const key = (i, k, hk) => `${i},${k},${hk}`;
const nodeH = new Map();
for (const [ik, lista] of camadas) for (const c of lista) nodeH.set(key(...ik.split(','), c.key), c.h);
const SEG = 5;
const segmentoLivre = (xa, za, xb, zb, hA) => {
  for (let s = 1; s <= SEG; s++) {
    const t = s / (SEG + 1), x = xa + (xb - xa) * t, z = za + (zb - za) * t;
    const h = W.groundHeightAt(x, z, hA);
    if (Math.abs(h - hA) > STEP_H) return false;
    if (!standable(x, z, h)) return false;
  }
  return true;
};
const viz = new Map();
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
for (const [ik, lista] of camadas) {
  const [i, k] = ik.split(',').map(Number);
  for (const c of lista) {
    const a = key(i, k, c.key), out = [];
    for (const [di, dk] of DIRS) {
      const j = i + di, l = k + dk, alvo = camadas.get(`${j},${l}`);
      if (!alvo) continue;
      const hB = W.groundHeightAt(cx(j), cz(l), c.h);
      if (hB - c.h > STEP_H + 1e-6) continue;
      const destino = alvo.find((c2) => c2.key === q(hB) || Math.abs(c2.h - hB) < 0.03);
      if (!destino) continue;
      if (!segmentoLivre(cx(i), cz(k), cx(j), cz(l), c.h)) continue;
      out.push(key(j, l, destino.key));
    }
    viz.set(a, out);
  }
}
const spawnNodes = [];
for (const team of ['E', 'B']) for (const s of W.spawns[team]) {
  const i = Math.round((s.x - B.minX - R) / GRID - 0.5), k = Math.round((s.z - B.minZ - R) / GRID - 0.5);
  const lista = camadas.get(`${i},${k}`) || camadas.get(`${Math.min(nx - 1, i + 1)},${k}`) || camadas.get(`${i},${Math.min(nz - 1, k + 1)}`);
  spawnNodes.push(key(i, k, lista[lista.length - 1].key));
}
const chega = new Set(spawnNodes);
const rev = new Map();
for (const [a, ds] of viz) for (const b of ds) { if (!rev.has(b)) rev.set(b, []); rev.get(b).push(a); }
const fila = [...spawnNodes];
for (let h = 0; h < fila.length; h++) for (const de of rev.get(fila[h]) || []) if (!chega.has(de)) { chega.add(de); fila.push(de); }

const iOf = (x) => Math.round((x - B.minX - R) / GRID - 0.5), kOf = (z) => Math.round((z - B.minZ - R) / GRID - 0.5);
export function report(x, z) {
  const i = iOf(x), k = kOf(z), l = camadas.get(`${i},${k}`);
  console.log(`(${x},${z}) → célula (${i},${k}) em (${cx(i).toFixed(2)},${cz(k).toFixed(2)})`);
  if (!l) return console.log('  SEM camada');
  for (const c of l) {
    const a = key(i, k, c.key);
    console.log(`  h=${c.h.toFixed(2)} chega=${chega.has(a)} arestas→${(viz.get(a) || []).length}: ${(viz.get(a) || []).slice(0, 8).join(' ')}`);
  }
}
/* sem argumentos: resume os bolsões com as bordas de saída perdidas */
const presos = [...viz.keys()].filter((n) => !chega.has(n));
const components = [];
const visto = new Set();
for (const n0 of presos) {
  if (visto.has(n0)) continue;
  const comp = [n0]; visto.add(n0);
  for (let h = 0; h < comp.length; h++) for (const b of viz.get(comp[h]) || []) {
    const bb = b.split(',').map(Number);
    if (presos.includes(b) && !visto.has(b)) { visto.add(b); comp.push(b); }
  }
  components.push(comp);
}
for (const comp of components) {
  const xs = comp.map((n) => cx(+n.split(',')[0])), zs = comp.map((n) => cz(+n.split(',')[1]));
  console.log(`BOLSÃO ${comp.length} células x ${Math.min(...xs).toFixed(1)}..${Math.max(...xs).toFixed(1)} z ${Math.min(...zs).toFixed(1)}..${Math.max(...zs).toFixed(1)}`);
  // quais arestas do bolsão apontam PARA FORA (para nós que alcançam spawn)?
  const outer = new Set();
  for (const n of comp) for (const b of viz.get(n) || []) if (!visto.has(b) && chega.has(b)) outer.add(`${n}→${b}`);
  // e quais nós de FORA (chega) têm aresta PARA DENTRO do bolsão (falta de saída = nenhuma)?
  const inner = [];
  for (const n of comp) for (const [rev0] of [rev.get(n) || []]) { }
  for (const [b, sources] of rev) if (visto.has(b) === false && chega.has(b)) for (const s of sources) if (comp.includes(s)) inner.push(`${s}→${b}`);
  console.log('  arestas p/ fora-alcançável:', outer.size ? [...outer].slice(0, 6).join(' | ') : 'NENHUMA');
  console.log('  entradas de fora-alcançável:', inner.length ? inner.slice(0, 6).join(' | ') : 'nenhuma');
}
if (process.argv[2]) for (const arg of process.argv.slice(2)) { const [x, z] = arg.split(',').map(Number); report(x, z); }
