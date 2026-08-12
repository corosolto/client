/* ============================================================================
   bot-record.mjs — DATASET BOOTSTRAP a partir dos bots roteirizados (o "professor").
   ----------------------------------------------------------------------------
   A rede aprende por imitação. Antes de existir dado de JOGADOR (Fase A no ar juntando),
   o professor é o próprio bot roteirizado: gravamos (estado→ação) dele no botsim e a rede
   clona esse comportamento. Prova o pipeline inteiro (record→train→infer→régua) HOJE, e
   quando o dado real chegar o mesmo bot-train.mjs consome os dois (o real tem prioridade).

   O estado sai de sense() (POV do bot). A ação é EXTRAÍDA dos deltas do próprio bot:
     moveFwd/strafe = velocidade local / BOT_SPEED
     dyaw           = variação de yaw na janela da amostra
     fire           = o pente diminuiu (bot atirou)
     crouch         = alvo + crouchBias (regra do próprio jogo)

   Uso: node tools/eval/bot-record.mjs [segundos] [mapId|all]
   Saída: tools/eval/data/bootstrap.ndjson (uma linha por corrida; mesmo shape do /api).
   ============================================================================ */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { initHarness } from './harness-stub.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS = path.resolve(HERE, '../../public/js');
const OUT_DIR = path.join(HERE, 'data');
const OUT = path.join(OUT_DIR, 'bootstrap.ndjson');

const BOT_SPEED = 4.1;
const SAMPLE_HZ = 10;

const h = await initHarness();
const { buildState, buildAction, STATE_DIM, ACTION_DIM } = await import(`${JS}/botbrain/features.js`);
const { sense } = await import(`${JS}/botbrain/sense.js`);

const SECS = parseFloat(process.argv[2] || '60');
const ONLY = process.argv[3] || 'all';
const MAPS_ALL = ['dust2', 'awp_map', 'fy_havan', 'piscinao'];
const MAPS = ONLY === 'all' ? MAPS_ALL : [ONLY];
const SEEDS = [1, 2, 3];

function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
function toLocal(dx, dz, yaw) { const s = Math.sin(yaw), c = Math.cos(yaw); return { x: dx * c - dz * s, z: dx * s + dz * c }; }

function runOne(mapId, textures, seed) {
  h.seedRandom(seed);
  const g = new h.Game({
    renderer: h.makeRenderer(), textures, sfx: h.sfx,
    settings: { bots: 8, quality: 'low', difficulty: 'hard', sens: 1 },
    playerCharId: h.PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'REC', mapId, ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  g.killsToWin = Infinity;
  g.start ? g.start() : g._startRound();
  // tira o jogador do caminho: queremos o duelo BOT×BOT como professor
  g.player.pos.set(0, -400, 0); g.player.hp = 1e9; g.player.alive = true;

  const mem = new Map();   // bot -> { yaw, mag, px, pz, lastSeenAt, target }
  const frames = [];
  const DT = 1 / 60;
  const stepEvery = Math.round(60 / SAMPLE_HZ);
  const sampleDt = stepEvery / 60;   // s entre amostras (p/ derivar velocidade)
  const total = Math.round(SECS * 60);

  for (let i = 0; i < total; i++) {
    g.update(DT);
    if (g.state !== 'live' || i % stepEvery !== 0) continue;
    for (const b of g.bots) {
      if (!b.alive) { mem.delete(b); continue; }
      let m = mem.get(b);
      // 1ª amostra do bot: sem histórico não há velocidade nem delta — semeia e espera
      if (!m) { mem.set(b, { yaw: b.yaw, mag: b.mag, px: b.pos.x, pz: b.pos.z, lastSeenAt: -99, target: null, lastFireT: -99 }); continue; }
      const fired = b.mag < m.mag;   // pente caiu => atirou neste intervalo
      if (fired) m.lastFireT = g.time;
      // INTENÇÃO DE FOGO (não só o frame exato do tiro): fire=1 durante a rajada/engajamento.
      // A 10 Hz o tiro cru é ~4% dos frames (sigmoid aprende a nunca atirar); a intenção
      // cobre a janela toda e é o que a inferência usa (o gate de cadência controla o ritmo).
      const firing = fired || (g.time - m.lastFireT < 0.45);
      // bots não guardam .vel — a velocidade sai do deslocamento desde a última amostra
      const vx = (b.pos.x - m.px) / sampleDt, vz = (b.pos.z - m.pz) / sampleDt;
      const vel = { x: vx, z: vz };
      const self = { pos: b.pos, vel, yaw: b.yaw, pitch: 0, hp: b.hp, weapon: b.weapon, mag: b.mag, team: b.team, isPlayer: false };
      const raw = sense(g, self, g._botEye(b), m, g.time);
      const s = buildState(raw);
      const vLoc = toLocal(vx, vz, b.yaw);
      const a = buildAction({
        moveFwd: vLoc.z / BOT_SPEED,
        moveStrafe: vLoc.x / BOT_SPEED,
        dyaw: wrapAngle(b.yaw - m.yaw),
        dpitch: 0,
        fire: firing,                           // intenção de fogo (rajada), não só o tiro cru
        crouch: !!(b.target && b.crouchBias),
        reload: b.reloadUntil > g.time,
      });
      frames.push({ s, a });
      m.yaw = b.yaw; m.mag = b.mag; m.px = b.pos.x; m.pz = b.pos.z;
    }
  }
  return frames;
}

function serialize(frames, meta) {
  const S = STATE_DIM, A = ACTION_DIM, n = frames.length;
  const buf = new Int8Array(n * (S + A));
  let o = 0;
  for (const f of frames) {
    for (let i = 0; i < S; i++) buf[o++] = Math.max(-127, Math.min(127, Math.round(f.s[i] * 127)));
    for (let i = 0; i < A; i++) buf[o++] = Math.max(-127, Math.min(127, Math.round(f.a[i] * 127)));
  }
  return { v: 1, dims: { s: S, a: A }, n, meta, data: Buffer.from(buf.buffer).toString('base64') };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const lines = [];
let grand = 0;
for (const mapId of MAPS) {
  const textures = h.initTextures(h.makeRenderer());
  for (const seed of SEEDS) {
    const frames = runOne(mapId, textures, seed);
    grand += frames.length;
    lines.push(JSON.stringify(serialize(frames, { map: mapId, seed, source: 'scripted' })));
    console.error(`  ${mapId} seed ${seed}: ${frames.length} frames`);
  }
}
fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.error(`\nDATASET: ${grand} frames em ${lines.length} lotes → ${path.relative(process.cwd(), OUT)}`);
