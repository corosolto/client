/* Mantle de gameplay: atravessa uma beirada real do Córrego em vários quadros.
   A régua impede regressão para teleporte: subida antecede o avanço, a distância por
   quadro é limitada e o pouso termina exatamente no apoio aprovado por _mantleTarget. */
import assert from 'node:assert/strict';
import { writeSync } from 'node:fs';
import { THREE, bootGame, initTextures } from './harness.mjs';

const TOOL = 'mantle-fluidez-check.mjs';
const pedidos = process.argv.slice(2).filter((a) => a.startsWith('--mutante='));
if (pedidos.length > 1
  || process.argv.slice(2).length !== pedidos.length
  || pedidos.some((a) => a.slice(10) !== 'teleporte')) {
  console.error(`uso: node tools/eval/${TOOL} [--mutante=teleporte]`);
  process.exit(2);
}
const mutante = pedidos.length === 1 ? pedidos[0].slice(10) : null;
let applied = false;
const clausula = (tag, corpo) => {
  try { corpo(); } catch (e) {
    if (e instanceof assert.AssertionError) e.clausula = tag;
    throw e;
  }
};
const reporta = (e) => {
  writeSync(2, 'FLUIDEZ_RESULT:' + JSON.stringify({ tool: TOOL, mutante, applied,
    tipo: e?.name || 'Error', clausula: e?.clausula || '' }) + '\n');
  console.error(e?.stack ?? e);
  process.exit(e instanceof assert.AssertionError ? 1 : 2);
};
process.on('uncaughtException', reporta);
process.on('unhandledRejection', reporta);

const game = bootGame('fy_corrego', { textures: initTextures(), ctf: true, seed: 12345 });
const player = game.player;
assert(game._mAlc, 'grade global de território foi adiada para o primeiro quadro jogável');
const start = new THREE.Vector3(-4.1, -1.53, -27.8);
const dir = { x: 0, z: 1 };
const target = game._mantleTarget(start, dir.x, dir.z);
clausula('MF_FIXTURE', () => assert(target, 'fixture perdeu a beirada escalável do canal'));
const candidatos = game._mantleColliders(start.x, start.z);
clausula('MF_FIXTURE', () => assert(candidatos.length < game.world.colliders.length,
  `broadphase local não reduziu colisores (${candidatos.length}/${game.world.colliders.length})`));

const sonda = player, alvoReal = game._mantleTarget.bind(game), tempoReal = game.time;
let scans = 0;
game._mantleTarget = () => { scans++; return null; };
sonda._spaceHeld = false; sonda._mantleScanAt = 0; sonda.crouchF = 0; sonda.grounded = true;
for (let frame = 0; frame < 12; frame++) {
  game.time = tempoReal + frame / 60;
  game._moveEntity(sonda, { ax: 0, az: -1, crouch: false, shift: false, jump: true }, 1 / 60);
}
game._mantleTarget = alvoReal;
game.time = tempoReal;
clausula('MF_ESCAN', () => assert(scans >= 3 && scans <= 4, `Espaço segurado escaneou ${scans} vezes em 12 quadros; esperado 20 Hz`));

player.pos.copy(start);
player.vel.set(0, 0, 0);
player.yaw = Math.PI;
player.grounded = true;
player.crouchF = 0;
player._spaceHeld = false;
player.jumpBufferedUntil = 0;
player.coyoteUntil = 0;
player._mantleScanAt = 0;

if (mutante === 'teleporte') {
  game._stepMantle = (p) => {
    const mantle = p.mantle;
    if (!mantle) return false;
    p.pos.set(mantle.x1, mantle.y1, mantle.z1);
    p.vel.set(0, 0, 0);
    p.grounded = true;
    p.mantle = null;
    p.mantleF = 0;
    return true;
  };
  applied = true;
  writeSync(2, `POST ${TOOL} mutante=${mutante} aplicado _stepMantle teleporte\n`);
}

const pontos = [];
let iniciou = false;
let maxPasso = 0;
for (let frame = 0; frame < 60; frame++) {
  const antes = player.pos.clone();
  game._moveEntity(player, {
    ax: 0,
    az: -1,
    crouch: false,
    shift: false,
    jump: frame === 0,
  }, 1 / 60);
  maxPasso = Math.max(maxPasso, player.pos.distanceTo(antes));
  if (player.mantle) iniciou = true;
  if (iniciou) pontos.push(player.pos.clone());
  if (iniciou && !player.mantle) break;
}

clausula('MF_TRAJ', () => assert(iniciou, 'Espaço + frente não iniciou mantle numa beirada aprovada'));
clausula('MF_TRAJ', () => assert(pontos.length >= 18 && pontos.length <= 28,
  `travessia deve durar 18 a 28 quadros a 60 Hz, durou ${pontos.length}`));
clausula('MF_TRAJ', () => assert(maxPasso <= 0.18, `deslocamento de ${maxPasso.toFixed(3)} m em um quadro lê como teleporte`));

const cedo = pontos[Math.floor(pontos.length * 0.30)];
const subida = (cedo.y - start.y) / (target.y - start.y);
const avanco = Math.hypot(cedo.x - start.x, cedo.z - start.z)
  / Math.hypot(target.x - start.x, target.z - start.z);
clausula('MF_SUBIDA', () => assert(subida >= avanco + 0.15,
  `corpo deve subir antes de cruzar a borda (subida ${subida.toFixed(2)}, avanço ${avanco.toFixed(2)})`));
clausula('MF_POUSO', () => assert(player.pos.distanceTo(new THREE.Vector3(target.x, target.y, target.z)) < 1e-6,
  'pouso divergiu do apoio aprovado por _mantleTarget'));
clausula('MF_CHAO', () => assert.equal(player.grounded, true, 'mantle terminou sem devolver o corpo ao chão'));
clausula('MF_ESTADO', () => assert.equal(player.mantle, null, 'estado de mantle vazou depois do pouso'));

console.log(`VERDE mantle-fluidez: ${pontos.length} quadros, passo máx ${maxPasso.toFixed(3)} m, subida/avanço ${subida.toFixed(2)}/${avanco.toFixed(2)}`);
