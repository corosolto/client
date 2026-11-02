/* ============================================================================
   javaporcos-perf.mjs — QUANTO CUSTA UM QUADRO DE HORDA, POR NÚMERO DE VIVOS

   POR QUE EXISTE
   O dono pediu "ordas gigantes". Subir `WAVE_COUNTS` e `MAX_ALIVE` é uma linha; o que
   não é uma linha é saber ONDE isso para de caber no quadro. Esta régua mede, e é dela
   que sai o número gravado em `MAX_ALIVE` (public/js/mode_javaporcos.js).

   O QUE É MEDIDO
   O custo do modo por quadro: `objective.update(dt)` + `objective.updateBot(bot, dt)`
   para TODOS os slots. Não entra render, não entra rede — é o orçamento de CPU que a
   horda tira dos outros 16,6 ms do quadro de 60 Hz.

   CONTRA QUE MUNDO
   Mundo sintético dimensionado pelo contrato FECHADO do mapa novo (MapaJava, 29/10):
   grade de waypoints de 1,5 m (~3.200 nós), ~390 colisores (cidade + mata grossa),
   `groundHeightAt` bilinear sobre Float32Array de 0,5 m, 16 foodSpots, 10 bocas de mata,
   3 objetivos. A FÍSICA É A DE VERDADE: `Game.prototype._moveEntity` e
   `Game.prototype._collide` são chamados do game.js, não reimplementados — é o
   `_collide` (varredura linear sobre `world.colliders`) que domina a conta, e medir
   contra uma imitação seria medir nada.
   O mapa placeholder de hoje (596 nós, poucos colisores) SUBESTIMARIA o custo; por isso
   o arnês não depende dele, e roda mesmo com o mapa em obras.

   PIOR CASO DE PROPÓSITO
   Fúria no teto (spawn mais rápido, bicho mais veloz), pool sempre cheio (ninguém morre,
   então o modo nunca descansa), jogador no meio da cidade (todo mundo em perseguição,
   que é o ramo caro: manada + rosnado + campo de fluxo do jogador, que invalida a cada
   0,45 s). Em jogo real metade do bando está comendo lixo, que é mais barato.

   USO
     node tools/eval/javaporcos-perf.mjs                 # varredura + veredito
     node tools/eval/javaporcos-perf.mjs --vivos=64      # um ponto só
     node tools/eval/javaporcos-perf.mjs --mutante=horda-dobrada   # tem de ficar VERMELHA
   ============================================================================ */
import assert from 'node:assert/strict';
import { PerformanceObserver } from 'node:perf_hooks';

globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.location = { search: '', href: 'http://sim/' };
globalThis.document = {
  createElement: () => ({ style: {}, textContent: '', append() {}, remove() {} }),
  querySelector: () => null, addEventListener() {}, removeEventListener() {},
};
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node' }, configurable: true });
globalThis.innerWidth = 1008; globalThis.innerHeight = 655; globalThis.devicePixelRatio = 1;

const THREE = await import('three');
const { Game } = await import('../../public/js/game.js');
const {
  MAX_ALIVE, FURIA, criarInvasaoJavaporcos, iniciarOnda, recalcularFuria,
} = await import('../../public/js/mode_javaporcos.js');

const arg = (nome) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && mutante !== 'teto-furado') throw new Error(`mutante desconhecido: ${mutante}`);
const ORCAMENTO_MS = 1.5;            // teto do modo no quadro de 16,6 ms
const HALF = 56, PASSO_WP = 1;     // grade de 1,0 m: o mapa novo (MapaJava, 29/10)

/* ------------------------------------------------------------- mundo sintético */
const GRID = 0.5, NX = Math.round(HALF * 2 / GRID) + 1;
const alturas = new Float32Array(NX * NX);
for (let i = 0; i < NX; i++) for (let k = 0; k < NX; k++) {
  const x = -HALF + i * GRID, z = -HALF + k * GRID;
  const rua = Math.abs(x % 18) < 4 || Math.abs(z % 18) < 4;
  alturas[i * NX + k] = rua ? 0 : (Math.abs(x) > 36 || Math.abs(z) > 36 ? 0.4 + Math.sin(x * .07) * .35 : 0.15);
}
function groundHeightAt(x, z) {
  const fx = Math.min(NX - 2, Math.max(0, (x + HALF) / GRID)), fz = Math.min(NX - 2, Math.max(0, (z + HALF) / GRID));
  const i = fx | 0, k = fz | 0, tx = fx - i, tz = fz - k;
  const a = alturas[i * NX + k], b = alturas[(i + 1) * NX + k], c = alturas[i * NX + k + 1], d = alturas[(i + 1) * NX + k + 1];
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
}

const colliders = [];
const caixa = (x, z, w, d, h) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, minY: 0, maxY: h });
/* Contagem FECHADA do mapa (MapaJava, 29/10): 154 cidade, 200 tronco, 111 parede = 465. */
for (let x = -32; x <= 32; x += 9) for (let z = -32; z <= 32; z += 9) caixa(x + 3, z + 3, 6, 6, 4.2);     // 64 casas
for (let i = 0; i < 90; i++) caixa(-34 + (i % 12) * 6, -34 + ((i * 7) % 12) * 6, 1.2, 2.6, 1.5);          // carros, muros, balcões
for (let i = 0; i < 200; i++) caixa(Math.cos(i) * (42 + (i % 5)), Math.sin(i * 1.7) * (42 + (i % 5)), 0.9, 0.9, 6);   // troncos
for (let i = 0; i < 111; i++) {
  const t = i / 111 * Math.PI * 2;
  caixa(Math.cos(t) * 52, Math.sin(t) * 52, 3.5, 17, 9);                                                  // parede de mata
}

const nodes = [], index = new Map();
const bloqueado = (x, z) => colliders.some((c) => x > c.minX - .5 && x < c.maxX + .5 && z > c.minZ - .5 && z < c.maxZ + .5);
for (let z = -HALF + 2; z <= HALF - 2; z += PASSO_WP) for (let x = -HALF + 2; x <= HALF - 2; x += PASSO_WP) {
  const px = Number(x.toFixed(2)), pz = Number(z.toFixed(2));
  if (bloqueado(px, pz)) continue;
  index.set(`${px},${pz}`, nodes.length);
  nodes.push({ x: px, z: pz, y: groundHeightAt(px, pz) });
}
const adj = nodes.map(() => []);
for (let i = 0; i < nodes.length; i++) for (const [dx, dz] of [[PASSO_WP, 0], [-PASSO_WP, 0], [0, PASSO_WP], [0, -PASSO_WP]]) {
  const j = index.get(`${Number((nodes[i].x + dx).toFixed(2))},${Number((nodes[i].z + dz).toFixed(2))}`);
  if (j !== undefined) adj[i].push(j);
}
/* Índice de célula: é o `nearestWaypoint` O(1) que o mapa novo entrega (MapaJava, 29/10).
   Varredura linear sobre 3 mil nós, 64 vezes por quadro, seria medir o mapa antigo. */
const celulas = new Map();
nodes.forEach((n, i) => {
  const chave = `${Math.round(n.x / PASSO_WP)},${Math.round(n.z / PASSO_WP)}`;
  (celulas.get(chave) || celulas.set(chave, []).get(chave)).push(i);
});
function nearestWaypoint(x, z) {
  const cx = Math.round(x / PASSO_WP), cz = Math.round(z / PASSO_WP);
  for (let anel = 0; anel <= 8; anel++) {
    let melhor = -1, distancia = Infinity;
    for (let i = -anel; i <= anel; i++) for (let k = -anel; k <= anel; k++) {
      if (anel && Math.max(Math.abs(i), Math.abs(k)) !== anel) continue;
      for (const idx of celulas.get(`${cx + i},${cz + k}`) || []) {
        const d = (nodes[idx].x - x) ** 2 + (nodes[idx].z - z) ** 2;
        if (d < distancia) { distancia = d; melhor = idx; }
      }
    }
    if (melhor >= 0) return melhor;
  }
  return 0;
}

const foodSpots = Array.from({ length: 16 }, (_, i) => ({
  id: `comida-${i}`, x: -30 + (i % 4) * 20, z: -30 + ((i / 4) | 0) * 20,
  hp: 90 + (i % 4) * 40, kind: ['lixo', 'feira', 'cacamba', 'racao'][i % 4], r: [0.85, 1.3, 1.9, 0.9][i % 4],
}));
const world = {
  mode: 'horde', root: new THREE.Group(), colliders, occluders: [], pickups: [],
  groundHeightAt, waypoints: { nodes, adj }, nearestWaypoint,
  findPath: (de) => [de],
  boarEntrances: Array.from({ length: 10 }, (_, i) => ({ x: Math.cos(i / 10 * Math.PI * 2) * 50, z: Math.sin(i / 10 * Math.PI * 2) * 50 })),
  hordeObjectives: [{ id: 'praca', x: -12, z: 4, hp: 1000 }, { id: 'mercado', x: 14, z: -8, hp: 1000 }, { id: 'posto', x: 2, z: 16, hp: 1000 }],
  foodSpots, foodMesh: () => null, foodCollider: () => null,
  cityBounds: { minX: -36, maxX: 36, minZ: -36, maxZ: 36 },
  bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
};

/* ------------------------------------------------------------------ jogo falso */
function montar(vivos) {
  const player = {
    isPlayer: true, team: 'E', alive: true, hp: 100, yaw: 0, crouchF: 0, grounded: true,
    def: { id: 'sertanejo' }, _playerId: 'defensor', weapon: 'knife',
    pos: new THREE.Vector3(0, groundHeightAt(0, 0), 0), vel: new THREE.Vector3(),
  };
  const slot = (i) => ({
    isPlayer: false, team: 'B', def: { id: 'javaporco' }, name: `javaporco ${i}`,
    alive: false, hp: 0, yaw: 0, crouchF: 0, grounded: true, weapon: 'knife', primary: 'knife',
    pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    mesh: { group: new THREE.Group(), isGLB: false, parts: {} }, _objectiveNpc: 'javaporco',
  });
  const bots = [slot(0)];
  const game = {
    world, scene: new THREE.Scene(), camera: { position: new THREE.Vector3() },
    time: 0, state: 'live', online: false, dedicated: false, matchSeed: 7,
    player, bots, combatants: [player, ...bots], el: {},
    sfx: { javaporco: () => true, _quiet: false, jump() {}, land() {}, step() {} },
    settings: {}, _damage() {}, _endRound() {}, _showScoreboard() {}, _objectiveEvent() {},
    _acceptInput: () => false,
    _collide: Game.prototype._collide,
    _moveEntity: Game.prototype._moveEntity,
  };
  const modo = criarInvasaoJavaporcos(game);
  while (modo.boars.length < vivos) {
    const extra = slot(modo.boars.length);
    game.bots.push(extra); game.combatants.push(extra); modo.boars.push(extra);
  }
  modo.state.maxAlive = vivos;
  return { game, modo };
}

/* O quadro que o coletor de lixo do node visita custa 10-40 ms e não é custo do laço:
   o observador marca esses quadros e eles entram numa coluna separada, em vez de virarem
   média inventada. O orçamento é cobrado na distribuição SEM GC. */
let pausaGC = 0;
new PerformanceObserver((lista) => { for (const e of lista.getEntries()) pausaGC += e.duration; })
  .observe({ entryTypes: ['gc'] });

async function medir(vivos, segundos = 8) {
  const { game, modo } = montar(vivos);
  const DT = 1 / 60;
  modo.state.wave = 7;
  iniciarOnda(modo.state);
  modo.state.kills = 600;
  recalcularFuria(modo.state);                 // pior caso: fúria no teto
  const topo = () => {
    modo.state.remaining = 9999;               // pool sempre cheio: o modo nunca descansa
    modo.state.combatLeft = 9999;
    for (const animal of modo.state.alive) animal.hp = 1e6;
    for (const bot of modo.boars) if (bot._boarId) bot.hp = 1e6;
  };
  for (let i = 0; i < 60 * 45 && modo.state.alive.length < vivos; i++) {
    game.time += DT; topo(); modo.update(DT);
    for (const bot of modo.boars) modo.updateBot(bot, DT);
  }
  const cheio = modo.state.alive.length;
  const limpos = [], sujos = [];
  const quadros = Math.round(segundos * 60);
  for (let i = 0; i < quadros; i++) {
    game.time += DT;
    topo();
    pausaGC = 0;
    const t0 = process.hrtime.bigint();
    modo.update(DT);
    for (const bot of modo.boars) modo.updateBot(bot, DT);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    /* Cede o laço de eventos: o callback do observador de GC é assíncrono e, num laço
       síncrono, nunca rodaria — era por isso que a coluna c/GC vinha zerada. */
    await new Promise((resolve) => setImmediate(resolve));
    (pausaGC > 0 ? sujos : limpos).push(ms);
  }
  limpos.sort((a, b) => a - b);
  sujos.sort((a, b) => a - b);
  const media = limpos.reduce((t, v) => t + v, 0) / Math.max(1, limpos.length);
  return {
    vivos, cheio, fury: modo.state.fury, quadros: limpos.length, comGC: sujos.length,
    media, p50: limpos[Math.floor(limpos.length * .5)] || 0,
    p95: limpos[Math.floor(limpos.length * .95)] || 0, max: limpos[limpos.length - 1] || 0,
    piorGC: sujos[sujos.length - 1] || 0,
  };
}

console.log(`mundo sintético: ${nodes.length} nós de waypoint, ${colliders.length} colisores, ${foodSpots.length} pontos de comida`);
console.log(`orçamento do modo: ${ORCAMENTO_MS.toFixed(2)} ms por quadro (9% dos 16,6 ms de 60 Hz)\n`);
const pedido = Number(arg('vivos')) || 0;
const TETO_MUTANTE = MAX_ALIVE * 4;
const serie = pedido ? [pedido] : (mutante ? [TETO_MUTANTE] : [16, 32, 48, MAX_ALIVE, 96, 128]);
const linhas = [];
for (const n of serie) linhas.push(await medir(n));
console.log('vivos  cheio  fúria  quadros  c/GC   média     p50       p95       máx       pior c/GC');
for (const l of linhas)
  console.log(`${String(l.vivos).padStart(5)}  ${String(l.cheio).padStart(5)}  ${l.fury.toFixed(2)}   ${String(l.quadros).padStart(7)}  ${String(l.comGC).padStart(4)}  ${l.media.toFixed(3)}ms  ${l.p50.toFixed(3)}ms  ${l.p95.toFixed(3)}ms  ${l.max.toFixed(3)}ms  ${l.piorGC.toFixed(1)}ms`);

const teto = linhas.find((l) => l.vivos === (mutante ? TETO_MUTANTE : MAX_ALIVE)) || linhas[linhas.length - 1];
let falhas = 0;
try {
  assert.ok(teto.quadros > 60, `amostra curta demais no teto: ${teto.quadros} quadros sem GC`);
  assert.equal(teto.cheio, teto.vivos, `o arnês só encheu ${teto.cheio} dos ${teto.vivos} vivos pedidos`);
  assert.ok(teto.p95 < ORCAMENTO_MS, `p95 de ${teto.p95.toFixed(3)} ms com ${teto.vivos} vivos estoura o orçamento de ${ORCAMENTO_MS} ms`);
  assert.ok(teto.media < ORCAMENTO_MS / 2, `média de ${teto.media.toFixed(3)} ms com ${teto.vivos} vivos é mais que metade do orçamento`);
  console.log(`\n✓ teto de ${teto.vivos} javaporcos vivos cabe: média ${teto.media.toFixed(3)} ms, p95 ${teto.p95.toFixed(3)} ms por quadro`);
} catch (erro) {
  falhas++;
  console.error(`\n✗ ${erro.message}`);
}

if (mutante) {
  assert.ok(falhas > 0, `mutante ${mutante} passou despercebido`);
  console.log(`✓ mutante ${mutante} acendeu a régua`);
  process.exit(0);
}
if (falhas) process.exit(1);
