/* BUG-91: "não passa junto às carroças". Régua da folga real em torno das carroças
   do velho_oeste com a cápsula do jogador (r=0,38) e o _collide de produção.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O wagon() empurrava um AABB conservador (meia-largura 2,3×3,2) no lugar da
   carroceria visível (1,9 × corpo 1,1 + rodas até 1,71 em z), mais um colisor de
   lança SOBREPOSTO ao primeiro. Resultado: parede invisível de ~1,5 m na traseira,
   cantos inflamados pela rotação e corredor carroça↔igrejinha fechado para a
   cápsula. IN7 (varredura de bolsões) não via esse defeito: o excesso não cria
   bolsa, só estreita corredores que continuam conectados por outro caminho.

   O QUE ELA MEDE (mundo Node/proxy, mesmo lugar das demais réguas do Sertão)
     WA1  excesso invisível: nenhuma amostra pode ser bloqueada pelos colisores
          da carroça estando a mais de 0,44 m (cápsula 0,38 + tolerância 0,06) da
          geometria visível (carroceria+rodas e lança). Amostra sobreposta a outro
          colisor visível é justificada — o defeito medido é da carroça.
     WA2  corredor lateral junto à carroça: em cada carroça, ao menos um dos flancos
          precisa ter faixa contínua de ponta a ponta da lança (pz local -5,0 a
          +1,7) a distância de abraço ≤ 3,3 m do eixo (visível 1,9 + cápsula 0,38
          + 1,02). Os dois flancos são medidos; o outro pode estar legitimamente
          fechado por obstáculo VISÍVEL (barris, casa).
     WA3  travessia traseira: atrás de cada carroça (pz local 2,21 = rodas 1,71 +
          cápsula 0,38 + 0,12) precisa existir vão contínuo ≥ 3,0 m no cx do eixo.
     WA4  passagem contínua spawns→praça: todos os 8 spawns reais conectados ao
          centro da praça na malha livre da cápsula (passo 0,25 m). Cláusula de
          regressão das mudanças de casario — no HEAD ela passa; quem a derruba é
          o mutante barreira-spawn.

   PROCEDÊNCIA
   Colocações das carroças congeladas do fonte (map_velho_oeste.js, wagon()):
   (-6,-20,π+.18 — espelhada na BUG-91, lança fora da platibanda-0), (7,2,-2.7), (-14.2,25.4,2.9). Geometria visível: caixa 3,8×0,65×2,2
   a y 0,925–1,575; rodas raio .72+tube .09 em x ±1,7, z ±0,9 (ocupam z até ±1,71,
   dentro da largura 1,9); lança 0,18 de largura, z local -4,8 a -0,05.
   No HEAD (sem tag carroca) os colisores são identificados casando a AABB
   conservadora exata derivada da fórmula do fonte; depois do conserto, pela tag.
   Teto de abraço 3,3: medido — é o maior desvio que ainda deixa o jogador "junto"
   (um corpo de distância da carroceria); acima disso é contorno, não corredor.

   MUTANTES
     aabb-conservador . devolve o AABB 2,3×3,2 de fábrica  -> WA1 (WA2/WA3 caem juntas)
     barreira-spawn ... muro de ponta a ponta em z=0       -> WA4
   Uso: node tools/eval/sertao-wagon-check.mjs [--mutante=NOME] [--json]
*/
import { THREE, MAPS, initTextures, Game } from './harness.mjs';

const mutant = process.argv.find(a => a.startsWith('--mutante='))?.slice(10);
const json = process.argv.includes('--json');
const targets = { 'aabb-conservador': 'WA1', 'barreira-spawn': 'WA4' };
if (mutant && !targets[mutant]) throw Error(`Mutante desconhecido: ${mutant}`);

const EPS = 1e-6, R = .38;
// Congeladas do fonte; não derivar do mundo medido.
const WAGONS = [{ x: -6, z: -19.6, ry: Math.PI + .18 }, { x: 7, z: 2, ry: -2.7 }, { x: -14.2, z: 25.4, ry: 2.9 }];
// Carroceria visível (meia-largura, meia-profundidade com rodas) e lança, em local.
const BODY_HW = 1.9, BODY_HD = 1.71, SHAFT_HW = .09, SHAFT_Z = [-4.8, -.05];
const HUG_MAX = 3.3, LANE_PZ = [-5.0, 1.7], CROSS_PZ = 2.21, CROSS_SPAN_MIN = 3.0;

const world = MAPS.velho_oeste.build(new THREE.Scene(), await initTextures());
const probe = Object.create(Game.prototype); probe.world = world;
const l2w = (w, px, pz) => [w.x + Math.cos(w.ry) * px + Math.sin(w.ry) * pz, w.z - Math.sin(w.ry) * px + Math.cos(w.ry) * pz];
const w2l = (w, wx, wz) => {
  const dx = wx - w.x, dz = wz - w.z;
  return [Math.cos(w.ry) * dx - Math.sin(w.ry) * dz, Math.sin(w.ry) * dx + Math.cos(w.ry) * dz];
};

/* Colisores da carroça: por tag (pós-conserto/mutante) ou casando a AABB
   conservadora exata do HEAD (fórmula do fonte) — sem tag, sem chute. */
function wagonColliders(w) {
  const tagged = world.colliders.filter(c => c.tag === 'carroca-corpo' || c.tag === 'carroca-lanca' || c.tag === 'mutante-carroca-aabb'
    ? Math.hypot((c.cx ?? (c.minX + c.maxX) / 2) - w.x, (c.cz ?? (c.minZ + c.maxZ) / 2) - w.z) < 5.5 : false);
  if (tagged.length) return tagged;
  const cos = Math.cos(w.ry), sin = Math.sin(w.ry);
  const hx = Math.abs(cos) * 2.3 + Math.abs(sin) * 3.2, hz = Math.abs(sin) * 2.3 + Math.abs(cos) * 3.2;
  const lx = w.x - 2.3 * sin, lz = w.z - 2.3 * cos;
  const shx = Math.abs(cos) * .14 + Math.abs(sin) * 2.55, shz = Math.abs(sin) * .14 + Math.abs(cos) * 2.55;
  const close = (a, b) => Math.abs(a - b) <= EPS;
  const match = world.colliders.filter(c =>
    (close(c.minX, w.x - hx) && close(c.maxX, w.x + hx) && close(c.minZ, w.z - hz) && close(c.maxZ, w.z + hz) && c.maxY === 2)
    || (close(c.minX, lx - shx) && close(c.maxX, lx + shx) && close(c.minZ, lz - shz) && close(c.maxZ, lz + shz) && c.maxY === 1.1));
  if (match.length !== 2) throw Error(`Identificação dos colisores da carroça (${w.x},${w.ry}) falhou: ${match.length} casamentos — a régua não sabe o que mede.`);
  return match;
}
const wagonSets = WAGONS.map(wagonColliders);

if (mutant === 'aabb-conservador') {
  for (const w of WAGONS) {
    const cos = Math.cos(w.ry), sin = Math.sin(w.ry);
    const hx = Math.abs(cos) * 2.3 + Math.abs(sin) * 3.2, hz = Math.abs(sin) * 2.3 + Math.abs(cos) * 3.2;
    world.colliders.push({ minX: w.x - hx, maxX: w.x + hx, minY: 0, maxY: 2, minZ: w.z - hz, maxZ: w.z + hz, tag: 'mutante-carroca-aabb' });
  }
} else if (mutant === 'barreira-spawn') {
  world.colliders.push({ minX: -34, maxX: 34, minY: 0, maxY: 4, minZ: -.5, maxZ: .5, tag: 'mutante-barreira-spawn' });
}
// Re-identifica depois do mutante (o aabb-conservador entra com tag).
const colliders = mutant === 'aabb-conservador' ? WAGONS.map(wagonColliders) : wagonSets;

function displaced(p, set) {
  const local = Object.create(Game.prototype);
  local.world = { ...world, colliders: set ?? world.colliders };
  const v = new THREE.Vector3(p[0], 0, p[1]), original = v.clone();
  local._collide(v, R);
  return v.distanceTo(original) > EPS;
}
const nearVisual = (w, wx, wz) => {
  const [px, pz] = w2l(w, wx, wz);
  return (Math.abs(px) <= BODY_HW + R + .06 && Math.abs(pz) <= BODY_HD + R + .06)
    || (Math.abs(px) <= SHAFT_HW + R + .06 && pz >= SHAFT_Z[0] - R - .06 && pz <= SHAFT_Z[1] + R + .06);
};
const overOtherCollider = (wx, wz, own) => world.colliders.some(c => !own.includes(c)
  && wx > c.minX - R && wx < c.maxX + R && wz > c.minZ - R && wz < c.maxZ + R && c.minY < 1.5 && c.maxY > .3);

/* WA1 — excesso invisível por carroça. */
const excess = WAGONS.map((w, i) => {
  let bad = 0;
  for (let px = -3.6; px <= 3.6 + EPS; px += .15) for (let pz = -6.0; pz <= 3.6 + EPS; pz += .15) {
    const [wx, wz] = l2w(w, px, pz);
    if (!displaced([wx, wz], colliders[i])) continue;
    if (nearVisual(w, wx, wz) || overOtherCollider(wx, wz, colliders[i])) continue;
    bad++;
  }
  return { wagon: `(${w.x},${w.z})`, samples: bad, area: Number((bad * .15 * .15).toFixed(2)) };
});

/* WA2 — corredor lateral de ponta a ponta, abraçando a carroça. */
function hugLane(w, side, offset) {
  const steps = Math.ceil((LANE_PZ[1] - LANE_PZ[0]) / .05);
  for (let i = 0; i <= steps; i++) {
    const pz = LANE_PZ[0] + (LANE_PZ[1] - LANE_PZ[0]) * i / steps;
    if (displaced(l2w(w, side * offset, pz))) return false;
  }
  return true;
}
const lanes = WAGONS.map((w, i) => {
  void colliders[i];
  const sides = [-1, 1].map(side => {
    for (let o = BODY_HW + R + .07; o <= HUG_MAX + EPS; o += .05) if (hugLane(w, side, o)) return { side, offset: Number(o.toFixed(2)) };
    return null;
  });
  return { wagon: `(${w.x},${w.z})`, west: sides[0], east: sides[1] };
});

/* WA3 — vão contínuo de travessia atrás da carroça. */
function rearSpan(w) {
  const samples = [];
  for (let px = -2.4; px <= 2.4 + EPS; px += .1) samples.push({ px, clear: !displaced(l2w(w, px, CROSS_PZ)) });
  let best = 0, run = 0;
  for (const s of samples) { run = s.clear ? run + .1 : 0; best = Math.max(best, run); }
  return Number(best.toFixed(2));
}
const rears = WAGONS.map(w => ({ wagon: `(${w.x},${w.z})`, span: rearSpan(w) }));

/* WA4 — todos os spawns reais conectados à praça na malha da cápsula. */
const SWEEP = .25;
const connectivity = (() => {
  const b = world.bounds, nx = Math.round((b.maxX - b.minX) / SWEEP) + 1, nz = Math.round((b.maxZ - b.minZ) / SWEEP) + 1;
  const free = new Uint8Array(nx * nz), v = new THREE.Vector3(), at = (i, j) => i * nz + j;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    v.set(b.minX + i * SWEEP, 0, b.minZ + j * SWEEP); probe._collide(v, R);
    if (Math.hypot(v.x - (b.minX + i * SWEEP), v.z - (b.minZ + j * SWEEP)) <= EPS) free[at(i, j)] = 1;
  }
  const cell = (x, z) => at(Math.round((x - b.minX) / SWEEP), Math.round((z - b.minZ) / SWEEP));
  const start = cell(0, 2);
  if (!free[start]) return { praçaFree: false, spawns: [] };
  const seen = new Uint8Array(nx * nz), queue = [start]; seen[start] = 1;
  for (let h = 0; h < queue.length; h++) {
    const i = Math.floor(queue[h] / nz), j = queue[h] % nz;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, e = j + dj; if (a < 0 || e < 0 || a >= nx || e >= nz) continue;
      const k = at(a, e); if (free[k] && !seen[k]) { seen[k] = 1; queue.push(k); }
    }
  }
  const spawns = [...world.spawns.E, ...world.spawns.B].map((s, idx) => ({ idx, x: s.x, z: s.z, free: !!free[cell(s.x, s.z)], connected: !!seen[cell(s.x, s.z)] }));
  return { praçaFree: true, spawns };
})();

const checks = {
  WA1: excess.every(e => e.samples === 0),
  WA2: lanes.every(l => l.west || l.east),
  WA3: rears.every(r => r.span >= CROSS_SPAN_MIN),
  WA4: connectivity.praçaFree && connectivity.spawns.length === 8 && connectivity.spawns.every(s => s.free && s.connected),
};
const report = { checks, radius: R, excess, lanes, rears, rearSpanMin: CROSS_SPAN_MIN, connectivity: { praçaFree: connectivity.praçaFree, spawns: connectivity.spawns }, mutation: mutant || null };
if (json) console.log(JSON.stringify(report, null, 2));
else {
  for (const [id, ok] of Object.entries(checks)) console.log(`${id} ${ok ? 'PASSA' : 'FALHA'}`);
  console.log(JSON.stringify({ excess, lanes, rears, spawns: connectivity.spawns.map(s => `${s.x},${s.z}:${s.free ? 'livre' : 'PRESO'}${s.connected ? '' : '/DESCONECTADO'}`) }));
}
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
process.exitCode = mutant ? (failed.includes(targets[mutant]) ? 0 : 1) : (failed.length ? 1 : 0);
