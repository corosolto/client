/* lajes-antitrap-check.mjs — AT1: NENHUMA CÉLULA ANDÁVEL É ARMADILHA.
   ═══════════════════════════════════════════════════════════════════════════
   DEFEITO DE ORIGEM (dono, 17/08, plans/13): "a parte debaixo tem cantos
   intransponiveis se vc cai de cima voce nao sai nunca mais isso nao pode
   acontecer". O LAJES-CIRCUITO mede o TÉRREU contíguo (LC2 ≥92%) — as ilhas
   fora do circuito são exatamente os cantos onde o dono ficou preso, e nenhuma
   cláusula as reprovava. Aqui a pergunta é a do jogador: CAÍ NELA, EXISTE
   CAMINHO DE VOLTA A UM SPAWN?

   ONDE MEDE: no Game real (harness.mjs), com o _collide de produção (via
   índice espacial PROVADO igual — ver EQUIVALÊNCIA abaixo) e o groundHeightAt
   MULTINÍVEL do próprio mapa (x,z,yRef) — a mesma função que _updatePlayer
   usa no passo (game.js tryAxis) e no snap de gravidade. Nenhuma geometria de
   mapa é duplicada aqui: as camadas de cada célula são descobertas sondando
   groundHeightAt numa escada de yRefs.

   MODELAGEM DO CORPO (pior caso honesto — declaração, não afrouxamento):
     · só ANDAR: subida ≤ STEP_H (0,55, a constante do game.js que separa
       degrau de beirada) e queda livre de qualquer altura (gravidade). PULO
       (ápice 0,83 m) e MANTLE (até 1,95 m) NÃO contam como fuga: se o canto
       só sai pulando/escalando, o dono ainda ficou preso nele — foi o que ele
       reportou. A régua modela o jogador que anda.
     · grade 0,50 m, 8-vizinhos com VALIDAÇÃO DE SEGMENTO: a aresta A→B só
       existe se a reta A→B, amostrada a cada ~0,1 m, está livre de colisor e
       com chão a ≤ STEP_H da cota de partida. Motivo medido: a boca da tábua
       SW-CS é uma janela de ~1,2 m deslocada NA DIAGONAL entre a guarda
       horizontal (face x=−8,26) e o canto da guarda vertical (−7,5; 26,1) —
       grade 0,75 com 4-vizinhos declarava o bolso SW inteiro preso (120 cél
       falsas), grade 0,50 com 4-vizinhos também (as duas células de ponte
       caem 1 cm fora da linha de grade). O jogador real anda em curva; a
       aresta com segmento é a tradução honesta disso. Amostragem de ~0,1 m
       cobre o colisor mais fino do mapa (guarda de 0,14 m).
     · célula andável = camada h em (x,z) com groundHeightAt(x,z,h)=h e corpo
       (raio 0,38, faixa [h+0,3, h+1,5] do _collide) sem empurrão.
     · SPAWN é o alvo (não o circuito): spawns E e B estão NAS LAJES (z=±32,3,
       y=5,20) — voltar ao spawn é achar escada/tábua. É a direção da fuga que
       o dono não achava.

   EQUIVALÊNCIA collideIdx ≡ _collide: o índice espacial devolve o MESMO
   empurrão que o _collide de produção em 400 pontos aleatórios do mundo
       → verbose no início da execução; se divergir, a régua aborta (vermelho).
   "Não sei medir" custa o mesmo que estar errado.

   AT1: 100% das células andáveis (todas as camadas) alcançam algum spawn.
   Grava o overlay por camada em tools/eval/asset-evidence/maps/lajes/
   antitrap-overlay.png — OLHE A FIGURA: ilha vermelha é canto preso.

   REPRODUZ:  node tools/eval/lajes-antitrap-check.mjs
   MUTAÇÃO:   --mutante=sela-canto  sela os dois vãos da ESCADARIA (pé no térreo
              e topo na laje — a escada vira tubo fechado): as células dos
              lances e do poço ficam sem volta e a cláusula tem que ficar
              VERMELHA com exit 1. Sela um vão só NÃO pode bastar (a escada
              escapa pelo outro lado) — o mutante prova que a régua mede
              caminho, não distância. */
import { THREE, bootGame, initTextures, seedRandom } from './harness.mjs';

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';
if (mutante && mutante !== 'sela-cando' && mutante !== 'sela-canto') throw new Error(`mutante desconhecido: ${mutante}`);

const STEP_H = 0.55;          // game.js — a fronteira degrau/beirada
const R = 0.38;               // raio do corpo (game.js _collide)
const GRID = 0.50;
const ESCADA = { x0: 3.3, x1: 7.25, z: -10 };   // faixa da ESCADARIA (STAIR_CONFIGS side=1)

const game = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 19082026 });
const W = game.world;

if (mutante === 'sela-canto') {
  const antes = W.colliders.length;
  W.colliders.push({ minX: ESCADA.x0, maxX: ESCADA.x1, minY: 0, maxY: 5.2, minZ: ESCADA.z - .55, maxZ: ESCADA.z + .55 });
  W.colliders.push({ minX: ESCADA.x0 + 2.7, maxX: ESCADA.x1 + .55, minY: 5.2, maxY: 6.6, minZ: ESCADA.z - .55, maxZ: ESCADA.z + .55 });
  if (W.colliders.length !== antes + 2) throw new Error('MUTANTE NÃO APLICOU');
}

/* ---- índice espacial de colisores: mesma matemática do _collide, só com
   pré-filtro por bucket 2 m. Provado igual antes de usar (abaixo). ---- */
const BUCKET = 2;
const buckets = new Map();
const bucketKey = (bx, bz) => bx * 4096 + bz;
const colliderIdx = new Map(W.colliders.map((c, idx) => [c, idx]));
for (const c of W.colliders) {
  const bx0 = Math.floor((c.minX - R) / BUCKET), bx1 = Math.floor((c.maxX + R) / BUCKET);
  const bz0 = Math.floor((c.minZ - R) / BUCKET), bz1 = Math.floor((c.maxZ + R) / BUCKET);
  for (let bx = bx0; bx <= bx1; bx++) for (let bz = bz0; bz <= bz1; bz++) {
    const k = bucketKey(bx, bz);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(c);
  }
}
/* 3×3 buckets (o empurrão de um colisor pode levar o corpo à célula vizinha),
   dedupe e ORDEM ORIGINAL de W.colliders — pushes múltiplos são sensíveis à
   ordem, e a cópia tem que reproduzir o _collide, não se aproximar dele. */
const nearColliders = (() => {
  const seen = new Set(), out = [];
  return (x, z) => {
    seen.clear(); out.length = 0;
    const BX = Math.floor(x / BUCKET), BZ = Math.floor(z / BUCKET);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const c of buckets.get(bucketKey(BX + dx, BZ + dz)) || []) {
        if (!seen.has(c)) { seen.add(c); out.push(c); }
      }
    }
    out.sort((a, b) => colliderIdx.get(a) - colliderIdx.get(b));
    return out;
  };
})();
/* Cópia FIEL do corpo do _collide (game.js:4475) — qualquer divergência é
   detectada pela prova de equivalência e aborta a régua. */
function collideIdx(pos) {
  for (const c of nearColliders(pos.x, pos.z)) {
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx, dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < R * R && pos.y + 1.5 > c.minY && pos.y + 0.3 < c.maxY) {
      if (c.ry) { game._collideRot(pos, R, c); continue; }
      if (d2 < 1e-8) { pos.x += R; continue; }
      const d = Math.sqrt(d2), push = (R - d) / d;
      pos.x += dx * push; pos.z += dz * push;
    }
  }
  const B = W.bounds;
  pos.x = Math.max(B.minX + R, Math.min(B.maxX - R, pos.x));
  pos.z = Math.max(B.minZ + R, Math.min(B.maxZ - R, pos.z));
}
/* prova de equivalência em 400 pontos aleatórios, TODAS as alturas de interesse */
{
  seedRandom(31337);
  let divergiu = 0;
  for (let n = 0; n < 400; n++) {
    const x = W.bounds.minX + Math.random() * (W.bounds.maxX - W.bounds.minX);
    const z = W.bounds.minZ + Math.random() * (W.bounds.maxZ - W.bounds.minZ);
    const y = [0, 1.3, 2.6, 4.2, 5.2][n % 5];
    const a = new THREE.Vector3(x, y, z), b = new THREE.Vector3(x, y, z);
    game._collide(a, R); collideIdx(b);
    if (Math.abs(a.x - b.x) > 1e-6 || Math.abs(a.z - b.z) > 1e-6) divergiu++;
  }
  if (divergiu) { console.error(`índice espacial divergiu do _collide em ${divergiu}/400 pontos — régua sem instrumento`); process.exit(1); }
}

const B = W.bounds;
const nx = Math.floor((B.maxX - B.minX - 2 * R) / GRID), nz = Math.floor((B.maxZ - B.minZ - 2 * R) / GRID);
const cx = (i) => B.minX + R + (i + 0.5) * GRID, cz = (k) => B.minZ + R + (k + 0.5) * GRID;

const PROBES = [];
for (let y = 0; y <= 6.4; y += 0.5) PROBES.push(y);
PROBES.push(1e3);

const p = new THREE.Vector3();
const standable = (x, z, h) => {
  p.set(x, h, z); collideIdx(p);
  return Math.abs(p.x - x) < 1e-3 && Math.abs(p.z - z) < 1e-3;
};

/* camadas por célula: distinct(groundHeightAt(x,z,probe)) que se sustentam */
const camadas = new Map();   // "i,k" -> [{h, key}]
const q = (h) => Math.round(h * 100);
for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
  const x = cx(i), z = cz(k);
  const vistos = new Map();
  for (const y of PROBES) {
    const h = W.groundHeightAt(x, z, y);
    if (h < -0.01 || h > 6.0) continue;   // térreo (h=0) É camada: o piso-base do jogo
    if (Math.abs(h - y) > 0.56) continue;   // superfície não casa com sonda: não é camada daqui
    vistos.set(q(h), h);
  }
  const lista = [...vistos.values()].filter((h) => standable(x, z, h));
  if (lista.length) camadas.set(`${i},${k}`, lista.map((h) => ({ h, key: q(h) })));
}

/* aresta A→B: 8-vizinhos com validação de segmento (a curva real do corpo) */
const key = (i, k, hk) => `${i},${k},${hk}`;
const nodeH = new Map();
for (const [ik, lista] of camadas) for (const c of lista) nodeH.set(key(...ik.split(','), c.key), c.h);
const SEG_SAMPLES = 5;
const segmentoLivre = (xa, za, xb, zb, hA) => {
  for (let s = 1; s <= SEG_SAMPLES; s++) {
    const t = s / (SEG_SAMPLES + 1);
    const x = xa + (xb - xa) * t, z = za + (zb - za) * t;
    const h = W.groundHeightAt(x, z, hA);
    if (Math.abs(h - hA) > STEP_H) return false;   // buraco ou parede no meio do caminho
    if (!standable(x, z, h)) return false;
  }
  return true;
};
const viz = new Map();   // nó -> [nó]
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
for (const [ik, lista] of camadas) {
  const [i, k] = ik.split(',').map(Number);
  for (const c of lista) {
    const a = key(i, k, c.key), out = [];
    for (const [di, dk] of DIRS) {
      const j = i + di, l = k + dk;
      const alvo = camadas.get(`${j},${l}`);
      if (!alvo) continue;
      const hB = W.groundHeightAt(cx(j), cz(l), c.h);
      if (hB - c.h > STEP_H + 1e-6) continue;
      const destino = alvo.find((c2) => c2.key === q(hB) || Math.abs(c2.h - hB) < 0.03);
      if (!destino) continue;
      if (!segmentoLivre(cx(i), cz(k), cx(j), cz(l), c.c ?? c.h)) continue;
      out.push(key(j, l, destino.key));
    }
    viz.set(a, out);
  }
}

/* spawn: célula-camada mais alta sob cada ponto de spawn (eles nascem na laje) */
const spawnNodes = [];
for (const team of ['E', 'B']) for (const s of W.spawns[team]) {
  const i = Math.round((s.x - B.minX - R) / GRID - 0.5), k = Math.round((s.z - B.minZ - R) / GRID - 0.5);
  const lista = camadas.get(`${i},${k}`) || camadas.get(`${Math.min(nx - 1, i + 1)},${k}`) || camadas.get(`${i},${Math.min(nz - 1, k + 1)}`);
  if (!lista) throw new Error(`spawn ${team} (${s.x},${s.z}) sem célula andável — régua sem alvo`);
  const topo = lista[lista.length - 1];
  spawnNodes.push(key(i, k, topo.key));
}

/* BFS REVERSO a partir dos spawns: quem alcança spawn (a fuga é dirigida —
   cair é fácil, subir não; aresta A→B ≠ aresta B→A) */
const chega = new Set(spawnNodes);
const revIndex = new Map();
for (const [a, destinos] of viz) for (const b of destinos) {
  if (!revIndex.has(b)) revIndex.set(b, []);
  revIndex.get(b).push(a);
}
const fila = [...spawnNodes];
for (let h = 0; h < fila.length; h++) {
  for (const de of revIndex.get(fila[h]) || []) if (!chega.has(de)) { chega.add(de); fila.push(de); }
}

/* AT1 + bolsões (componentes do não-alcançado) */
const total = viz.size;
const presos = [...viz.keys()].filter((n) => !chega.has(n));
const presoSet = new Set(presos);
const bolsões = [];
const visto = new Set();
for (const n0 of presos) {
  if (visto.has(n0)) continue;
  const comp = [n0]; visto.add(n0);
  for (let h = 0; h < comp.length; h++) for (const b of viz.get(comp[h]) || []) {
    if (presoSet.has(b) && !visto.has(b)) { visto.add(b); comp.push(b); }
  }
  let xs = 0, zs = 0, hmin = 99, hmax = -99;
  for (const n of comp) {
    const [i, k] = n.split(',');
    xs += cx(+i); zs += cz(+k);
    const hh = nodeH.get(n);
    hmin = Math.min(hmin, hh); hmax = Math.max(hmax, hh);
  }
  bolsões.push({ cel: comp.length, x: xs / comp.length, z: zs / comp.length, hmin, hmax });
}
bolsões.sort((a, b) => b.cel - a.cel);

/* overlay: vermelho = preso (alguma camada), verde = fuga ok */
try {
  const sharp = (await import('sharp')).default;
  const px = Buffer.alloc(nx * nz * 3).fill(18);
  const cor = new Map();
  for (const n of viz.keys()) {
    const [i, k] = n.split(',');
    cor.set(`${i},${k}`, (cor.get(`${i},${k}`) ?? 1) && (chega.has(n) ? 1 : 2));
  }
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    const o = (k * nx + i) * 3, c = cor.get(`${i},${k}`);
    if (c === 1) { px[o] = 46; px[o + 1] = 150; px[o + 2] = 60; }
    else if (c === 2) { px[o] = 224; px[o + 1] = 42; px[o + 2] = 42; }
  }
  const { mkdirSync } = await import('node:fs');
  mkdirSync('tools/eval/asset-evidence/maps/lajes', { recursive: true });
  await sharp(px, { raw: { width: nx, height: nz, channels: 3 } })
    .resize(nx * 6, nz * 6, { kernel: 'nearest' }).png()
    .toFile('tools/eval/asset-evidence/maps/lajes/antitrap-overlay.png');
} catch (e) { console.error('overlay não gravado:', e.message); process.exitCode = 1; }

const fmt = (b) => `${b.cel} cél em (${b.x.toFixed(1)},${b.z.toFixed(1)}) h ${b.hmin.toFixed(1)}–${b.hmax.toFixed(1)}`;
console.log(`células andáveis: ${total} (grade ${GRID} m, 8-viz+segmento, todas as camadas) · spawns-alvo: ${spawnNodes.length}`);
console.log(`com volta ao spawn: ${total - presos.length} (${(100 * (total - presos.length) / total).toFixed(1)}%) · SEM VOLTA: ${presos.length} em ${bolsões.length} bolsão(ões)`);
for (const b of bolsões.slice(0, 12)) console.log(`  · ${fmt(b)}`);

const at1 = presos.length === 0;
console.log(`${at1 ? '✓' : '✗'} AT1 toda célula andável tem caminho de volta a um spawn`);
if (!at1) {
  console.error(`LAJES-ANTITRAP FALHA: ${presos.length} células sem volta — o dono cai e não sai. Abra rota de fuga (degrau/vão/rampa) nos bolsões acima.`);
  process.exitCode = 1;
} else if (mutante) {
  console.error(`MUTANTE ${mutante} sobreviveu`);
  process.exitCode = 1;
} else console.log('LAJES-ANTITRAP OK');
