/* Circuito inferior e camadas de lajes — régua comprada pelo relato do dono em 16/08/2026:
   "tem um ponto que eu ficava caindo pra cima da laje de novo e depois no chao" e
   "vários becos parecem passagem e estão bloqueados".

   Sonda de 16/08 (scratchpad/sonda-lajes-terreo.mjs, harness real): groundHeightAt
   ignorava o yRef que _updatePlayer passa (game.js:4861-4878) — sob tábuas e mirantes
   devolvia 5,20 m para quem estava no chão, e o snap de gravidade teleportava o corpo
   para cima. O térreo tinha 14 componentes conexos; os pés das três escadas caíam em
   três componentes diferentes (1949 / 45 / 7 células) e o ramal 3 nascia DENTRO de um
   sólido (_collide movia 0,38 m).

   Mede no Game real (node, harness.mjs) com o _collide de produção, raio 0,38:
     LC1 groundHeightAt respeita yRef: sob tábua/mirante, yRef=0 → térreo e yRef=5,2 → laje;
     LC2 o térreo é UM circuito: componente principal cobre ≥ 92% das células livres;
     LC3 os pés das três escadas estão no componente principal;
     LC4 beco norte/meio/sul e os três ramais estão no componente principal;
     LC5 nenhum ponto de referência nasce dentro de sólido (_collide não move);
     LC6 toda aproximação ao limite para em colisor (muro visível) antes do clamp.
   Sempre grava o overlay livre/bloqueado/componente em
   tools/eval/asset-evidence/maps/lajes/terreo-overlay.png (olhe a figura).

   Mutantes:
     ignora-yref          embrulha groundHeightAt descartando o 3º argumento;
     ramal-fechado        sela o ramal 1 com um colisor;
     rota-inferior-partida sela o mapa inteiro na latitude do mirante norte;
     limite-invisivel     remove os muros de perímetro (o corpo encosta no clamp).
*/
import { THREE, bootGame, initTextures } from './harness.mjs';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
const conhecidos = new Set(['', 'ignora-yref', 'ramal-fechado', 'rota-inferior-partida', 'limite-invisivel']);
if (!conhecidos.has(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

const game = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 16082026 });
const W = game.world;

if (mutante === 'ignora-yref') {
  if (W.groundHeightAt.length < 3) throw new Error('MUTANTE NÃO APLICOU: groundHeightAt nem declara yRef — o defeito já está posto');
  const orig = W.groundHeightAt;
  W.groundHeightAt = (x, z) => orig(x, z);
}
if (mutante === 'ramal-fechado') {
  W.colliders.push({ minX: 0, maxX: 4, minY: 0, maxY: 3, minZ: -10.4, maxZ: -9.6 });
}
if (mutante === 'rota-inferior-partida') {
  W.colliders.push({ minX: -15.5, maxX: 15.5, minY: 0, maxY: 3, minZ: -11.6, maxZ: -10.4 });
}
if (mutante === 'limite-invisivel') {
  const BB = W.bounds;
  const antes = W.colliders.length;
  W.colliders = W.colliders.filter((c) => !(c.minY < 1
    && (c.minX < BB.minX + 1.2 || c.maxX > BB.maxX - 1.2 || c.minZ < BB.minZ + 1.2 || c.maxZ > BB.maxZ - 1.2)));
  if (W.colliders.length >= antes - 4) throw new Error('MUTANTE NÃO APLICOU: limite-invisivel não achou muros de perímetro');
}

/* Pontos de referência, todos medidos no mapa vigente. Os sob-cobertura são os lugares
   onde o dono caiu "pra cima da laje": tábuas WN-WS/ES-SE e os dois mirantes sobre o beco. */
const SOB_COBERTURA = [
  ['tábua WN-WS', -10.3, -5.25], ['tábua ES-SE', 10.3, 6.75],
  ['mirante norte', -3, -11.5], ['mirante sul', 1.5, 24.5],
];
const REFERENCIAS = {
  'pé ESCADARIA': [4.6, -10], 'pé BECO DO VARAL': [-4.6, 2], 'pé ACESSO SUL': [4.6, 22],
  'beco norte': [0, -23], 'beco meio': [-3, -6], 'beco sul': [-2, 16],
  'ramal 1 (leste)': [3, -10], 'ramal 2 (oeste)': [-3, 2], 'ramal 3 (leste)': [3, 22],
};

/* LC1 — camadas. Em ponto coberto andável: yRef=0 responde o térreo, yRef=ROOF responde a laje. */
const lc1Detalhe = [];
let lc1 = true;
for (const [nome, x, z] of SOB_COBERTURA) {
  const baixo = W.groundHeightAt(x, z, 0), alto = W.groundHeightAt(x, z, 5.2);
  const ok = baixo <= 0.55 && alto >= 4.65;
  if (!ok) lc1 = false;
  lc1Detalhe.push(`${nome} yRef0=${baixo.toFixed(2)} yRef5.2=${alto.toFixed(2)}`);
}

/* Flood do térreo com o _collide REAL — mesma física do jogador (game.js:4452). */
const B = W.bounds, STEP = 0.30;
const nx = Math.ceil((B.maxX - B.minX) / STEP), nz = Math.ceil((B.maxZ - B.minZ) / STEP);
const livre = new Uint8Array(nx * nz);
const p = new THREE.Vector3();
for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
  const x = B.minX + (i + 0.5) * STEP, z = B.minZ + (k + 0.5) * STEP;
  if (W.groundHeightAt(x, z, 0) > 0.55) continue;
  p.set(x, 0, z); game._collide(p, 0.38);
  if (Math.abs(p.x - x) < 1e-3 && Math.abs(p.z - z) < 1e-3) livre[i * nz + k] = 1;
}
const comp = new Int32Array(nx * nz).fill(-1);
const sizes = [];
for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
  if (!livre[i * nz + k] || comp[i * nz + k] >= 0) continue;
  let size = 0; const cid = sizes.length; const fila = [i * nz + k]; comp[i * nz + k] = cid;
  for (let h = 0; h < fila.length; h++) {
    size++; const c = fila[h], ci = (c / nz) | 0, ck = c % nz;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = ci + di, l = ck + dk;
      if (j < 0 || j >= nx || l < 0 || l >= nz) continue;
      const d = j * nz + l;
      if (livre[d] && comp[d] < 0) { comp[d] = cid; fila.push(d); }
    }
  }
  sizes.push(size);
}
const maior = sizes.length ? Math.max(...sizes) : 0;
const principal = sizes.indexOf(maior);
const total = sizes.reduce((a, b) => a + b, 0);
const cobertura = total ? maior / total : 0;

const compEm = (x, z) => {
  p.set(x, 0, z); game._collide(p, 0.38);
  if (Math.hypot(p.x - x, p.z - z) >= 1e-3) return -2;   // dentro de sólido
  const i = Math.min(nx - 1, Math.max(0, Math.floor((p.x - B.minX) / STEP)));
  const k = Math.min(nz - 1, Math.max(0, Math.floor((p.z - B.minZ) / STEP)));
  return livre[i * nz + k] ? comp[i * nz + k] : -1;
};
const resumo = {};
let lc3 = true, lc4 = true, lc5 = true;
for (const [nome, [x, z]] of Object.entries(REFERENCIAS)) {
  const c = compEm(x, z);
  resumo[nome] = c === -2 ? 'DENTRO DE SÓLIDO' : c === -1 ? 'sem célula livre' : c === principal ? 'circuito' : `ilha ${c} (${sizes[c]} cél)`;
  if (c === -2) lc5 = false;
  if (nome.startsWith('pé') && c !== principal) lc3 = false;
  if (!nome.startsWith('pé') && c !== principal) lc4 = false;
}
const lc2 = cobertura >= 0.92;

/* LC6 — limite legível: andando para fora a partir de qualquer ponto livre junto ao
   clamp, o corpo encontra um colisor (o muro de perímetro visível) ANTES da linha dos
   bounds. Medido com o _collide de produção; o pixel é coberto pelo eval:occluders. */
const lc6Detalhe = [];
let lc6 = true;
for (const [nome, x, z, dx, dz] of [
  ['oeste', -14.6, 0, -1, 0], ['leste', 14.6, 0, 1, 0], ['norte', 0, -38.2, 0, -1], ['sul', 0, 38.2, 0, 1],
  ['noroeste', -14.6, -38.2, -1, -1], ['sudeste', 14.6, 38.2, 1, 1],
]) {
  const p6 = new THREE.Vector3(x, 0, z);
  let andou = 0;
  for (let s = 0; s < 12; s++) {
    const ax = p6.x, az = p6.z;
    p6.x += dx * 0.1; p6.z += dz * 0.1;
    game._collide(p6, 0.38);
    andou = Math.hypot(p6.x - x, p6.z - z);
    if (Math.hypot(p6.x - ax, p6.z - az) < 0.05) break;   // travou num colisor
  }
  const dentro = p6.x > B.minX - 0.01 && p6.x < B.maxX + 0.01 && p6.z > B.minZ - 0.01 && p6.z < B.maxZ + 0.01;
  void dentro;
  /* o corpo tem que parar ANTES da linha do clamp (bounds - raio) — se encostou no
     clamp, o muro visível não estava lá (é o "não dá pra saber os limites" do dono). */
  const folga = 0.18;
  const ok = p6.x > B.minX + 0.38 + folga && p6.x < B.maxX - 0.38 - folga
    && p6.z > B.minZ + 0.38 + folga && p6.z < B.maxZ - 0.38 - folga;
  if (!ok) lc6 = false;
  lc6Detalhe.push(`${nome}: parou em (${p6.x.toFixed(2)},${p6.z.toFixed(2)})`);
}

/* Overlay PNG: verde = circuito principal, amarelo = ilha, vermelho = bloqueado, azul = laje acima. */
try {
  const sharp = (await import('sharp')).default;
  const px = Buffer.alloc(nx * nz * 3);
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const x = B.minX + (i + 0.5) * STEP, z = B.minZ + (k + 0.5) * STEP, o = (k * nx + i) * 3;
    if (livre[i * nz + k]) {
      const c = comp[i * nz + k];
      if (c === principal) { px[o] = 40; px[o + 1] = 160; px[o + 2] = 60; }
      else { px[o] = 220; px[o + 1] = 190; px[o + 2] = 40; }
    } else if (W.groundHeightAt(x, z, 1e3) > 4) { px[o] = 60; px[o + 1] = 80; px[o + 2] = 160; }
    else { px[o] = 170; px[o + 1] = 40; px[o + 2] = 40; }
  }
  const { mkdirSync } = await import('node:fs');
  mkdirSync('tools/eval/asset-evidence/maps/lajes', { recursive: true });
  await sharp(px, { raw: { width: nx, height: nz, channels: 3 } })
    .resize(nx * 6, nz * 6, { kernel: 'nearest' })
    .png().toFile('tools/eval/asset-evidence/maps/lajes/terreo-overlay.png');
} catch (e) {
  console.error('overlay não gravado:', e.message);
  process.exitCode = 1;
}

const checks = [
  ['LC1', 'groundHeightAt respeita yRef sob tábuas e mirantes', lc1, lc1Detalhe.join(' · ')],
  ['LC2', 'o térreo é um circuito contínuo', lc2,
    `${sizes.length} componentes · principal cobre ${(cobertura * 100).toFixed(1)}% de ${total} células livres`],
  ['LC3', 'os três acessos verticais partem do circuito', lc3,
    ['pé ESCADARIA', 'pé BECO DO VARAL', 'pé ACESSO SUL'].map((n) => `${n}: ${resumo[n]}`).join(' · ')],
  ['LC4', 'beco e ramais pertencem ao circuito', lc4,
    Object.entries(resumo).filter(([n]) => !n.startsWith('pé')).map(([n, r]) => `${n}: ${r}`).join(' · ')],
  ['LC5', 'nenhuma referência nasce dentro de sólido', lc5,
    Object.entries(resumo).filter(([, r]) => r === 'DENTRO DE SÓLIDO').map(([n]) => n).join(', ') || 'nenhuma'],
  ['LC6', 'toda aproximação ao limite para em colisor (muro visível) antes do clamp', lc6,
    lc6Detalhe.join(' · ')],
];
let falhas = 0;
for (const [id, desc, ok, evidence] of checks) {
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${id} ${desc} — ${evidence}`);
}
if (falhas) { console.error(`LAJES-CIRCUITO FALHA: ${falhas}/${checks.length}`); process.exitCode = 1; }
else if (mutante) { console.error(`MUTANTE ${mutante} sobreviveu`); process.exitCode = 1; }
else console.log('LAJES-CIRCUITO OK');
