/* GOLDEN DO MOVIMENTO DO JOGADOR.
   Existe por causa do multiplayer: o servidor autoritativo precisa aplicar a MESMA física do
   jogador a um slot remoto, e para isso o movimento tem que sair de dentro do `_updatePlayer`
   (315 linhas entrelaçadas com câmera, HUD e som) e virar um `_moveEntity(ent, input, dt)`
   reusável. Extrair física de um corpo tão grande é o jeito clássico de mudar o feel sem
   perceber — então esta régua CONGELA a trajetória antes da extração.

   Como funciona: dirige o jogador com uma sequência de teclas roteirizada, em passo fixo,
   com Math.random semeado, e grava a pose a cada 10 ticks. `--write` grava o baseline;
   sem flag, compara contra ele e reprova em qualquer divergência acima de 1e-6.

   A régua só vale se ela MORDE: `--mutar=<n>` injeta uma mudança minúscula na física
   (accel do chão 92 -> 92+n). Com n pequeno a trajetória tem que divergir mesmo assim. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game, MAPS, initTextures, renderer, sfx, PCHAR, seedRandom } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASELINE = path.join(HERE, 'movimento-golden.json');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const MUT = Number((args.find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || 0);

// Roteiro de teclas: cobre andar, strafe, counter-strafe, correr, agachar, pular e parar.
// Cada entrada é [até que tick, teclas].
const ROTEIRO = [
  [60,  { KeyW: 1 }],
  [90,  { KeyW: 1, KeyD: 1 }],
  [120, { KeyD: 1, ShiftLeft: 1 }],
  [150, { KeyA: 1 }],                       // counter-strafe: inverte a direção
  [180, { KeyW: 1, Space: 1 }],             // pulo com corrida
  [210, { KeyW: 1, ControlLeft: 1 }],       // crouch andando
  [240, { KeyS: 1 }],
  [270, {}],                                // solta tudo: atrito
  [330, { KeyW: 1, KeyA: 1, Space: 1 }],
];

function rodar(mapId, seed) {
  seedRandom(seed);
  const g = new Game({
    renderer, textures: TEX, sfx, settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'GOLDEN', mapId, ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  g.start ? g.start() : g._startRound();
  g.scene.updateMatrixWorld(true); g.world.root.updateMatrixWorld(true);
  if (MUT) g.__mutAccel = MUT;   // consumido pelo _moveEntity quando existir (ver --mutar)

  const p = g.player;
  const poses = [];
  const DT = 1 / 60;
  for (let t = 0; t < 360; t++) {
    const passo = ROTEIRO.find(([ate]) => t < ate);
    g.keys = { ...(passo ? passo[1] : {}) };
    // yaw varre devagar: exercita a rotação do vetor de desejo (wish) sem depender do mouse
    p.yaw = t * 0.004;
    g.update(DT, false);
    if (t % 10 === 0) poses.push([
      +p.pos.x.toFixed(6), +p.pos.y.toFixed(6), +p.pos.z.toFixed(6),
      +p.vel.x.toFixed(6), +p.vel.y.toFixed(6), +p.vel.z.toFixed(6),
      +p.crouchF.toFixed(6), p.grounded ? 1 : 0,
    ]);
  }
  return poses;
}

const TEX = initTextures();
const CASOS = [['praca_poderes', 12345], ['piscinao_ramos', 777]];
const atual = {};
for (const [mapId, seed] of CASOS) atual[`${mapId}#${seed}`] = rodar(mapId, seed);

if (WRITE) {
  fs.writeFileSync(BASELINE, JSON.stringify(atual, null, 1));
  console.log(`[movimento-golden] baseline gravado: ${Object.keys(atual).length} casos`);
  process.exit(0);
}
if (!fs.existsSync(BASELINE)) { console.error('[movimento-golden] sem baseline — rode com --write'); process.exit(2); }
const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
let falhas = 0;
for (const k of Object.keys(base)) {
  const a = base[k], b = atual[k];
  if (!b) { console.error(`[movimento-golden] caso sumiu: ${k}`); falhas++; continue; }
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a[i].length; j++) {
      if (Math.abs(a[i][j] - b[i][j]) > 1e-6) {
        console.error(`[movimento-golden] ${k} amostra ${i} campo ${j}: ${a[i][j]} -> ${b[i][j]}`);
        if (++falhas > 12) { console.error('  (…truncado)'); i = a.length; break; }
      }
    }
  }
}
if (falhas) { console.error(`[movimento-golden] REPROVADO — ${falhas} divergência(s)`); process.exit(1); }
console.log(`[movimento-golden] OK — ${Object.keys(base).length} casos, trajetória idêntica`);
