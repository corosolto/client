// Fonte única do vetor usado por coleta e inferência. Features ficam em referencial local
// e aproximadamente em [-1,1]; dimensões e ordem são parte do formato persistido.

export const STATE_DIM = 27;
export const ACTION_DIM = 7;

// ordem do one-hot de classe de arma (5 dims dentro do estado)
export const WEAPON_CATS = ['rifle', 'smg', 'pistol', 'sniper', 'shotgun'];

// escalas de normalização grosseira (constantes de projeto, não aprendidas)
const SCALE = {
  dist: 60, // alcance típico de engajamento (m); BOT_VIEW=45, sniper=82
  height: 3, // diferença de altura plausível entre andares (m)
  speed: 6, // m/s; jogador corre ~5.5, bot 4.1
  wall: 8, // alcance dos raios de parede (m)
  seen: 6, // segundos de memória de "vi o inimigo" (grace do bot é 1.2s, alerta 6s)
};

// Classe da arma a partir das flags de WEAPONS (game.js). Deriva sem tabela extra:
// pellets -> shotgun; scope/spreadScope -> sniper; sem auto e mag<=12 -> pistol;
// auto com dano baixo -> smg; resto -> rifle.
export function weaponCat(id, WEAPONS) {
  const w = (WEAPONS && WEAPONS[id]) || null;
  if (!w) return 'rifle';
  if (w.pellets) return 'shotgun';
  if (w.scope || w.spreadScope) return 'sniper';
  if (!w.auto && (w.mag || 0) <= 12) return 'pistol';
  if (w.auto && (w.dmg || 0) <= 28) return 'smg';
  return 'rifle';
}

// gira (dx,dz) do referencial do mundo para o referencial local (frente = +z local)
function toLocal(dx, dz, yaw) {
  const s = Math.sin(yaw), c = Math.cos(yaw);
  // inverso da rotação por yaw usada no jogo: xLocal aponta pra direita, zLocal pra frente
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

function clamp1(v) {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Monta o vetor de estado. Recebe SÓ escalares crus — os raycasts (LOS, paredes) e a
// busca do inimigo/aliado são feitos por quem chama (game.js tem _losClear/_collide),
// mantendo este módulo puro e testável em node.
//
// raw = {
//   yaw, pitch, hp, mag,            // do agente
//   selfVx, selfVz,                 // velocidade própria (mundo)
//   hasEnemy,                       // bool: existe alvo conhecido
//   enemyDx, enemyDz, enemyDy,      // posição do inimigo relativa (mundo)
//   enemyVx, enemyVz,               // velocidade do inimigo (mundo)
//   enemyVisible,                   // bool: LOS livre agora
//   timeSinceSeen,                  // s desde a última visão
//   weapon, WEAPONS,                // id e tabela p/ one-hot
//   wallDists,                      // array de 6 distâncias de parede (m), na ordem
//                                   //   dos 6 raios locais (frente, 60°, 120°, trás, 240°, 300°)
//   hasAlly, allyDx, allyDz,        // aliado mais próximo relativo (mundo)
// }
export function buildState(raw) {
  const out = new Float32Array(STATE_DIM);
  let i = 0;
  const yaw = raw.yaw || 0;

  // inimigo em coordenadas locais
  const eLoc = raw.hasEnemy ? toLocal(raw.enemyDx, raw.enemyDz, yaw) : { x: 0, z: 0 };
  out[i++] = raw.hasEnemy ? clamp1(eLoc.x / SCALE.dist) : 0;
  out[i++] = raw.hasEnemy ? clamp1(eLoc.z / SCALE.dist) : 0;
  out[i++] = raw.hasEnemy ? clamp1((raw.enemyDy || 0) / SCALE.height) : 0;

  const eDist = raw.hasEnemy ? Math.hypot(raw.enemyDx, raw.enemyDz) : SCALE.dist;
  out[i++] = clamp1(eDist / SCALE.dist);
  out[i++] = raw.enemyVisible ? 1 : 0;

  const evLoc = raw.hasEnemy ? toLocal(raw.enemyVx || 0, raw.enemyVz || 0, yaw) : { x: 0, z: 0 };
  out[i++] = clamp1(evLoc.x / SCALE.speed);
  out[i++] = clamp1(evLoc.z / SCALE.speed);

  const svLoc = toLocal(raw.selfVx || 0, raw.selfVz || 0, yaw);
  out[i++] = clamp1(svLoc.x / SCALE.speed);
  out[i++] = clamp1(svLoc.z / SCALE.speed);

  out[i++] = clamp1((raw.hp || 0) / 100);

  // erro de yaw até o inimigo (quanto falta girar pra encarar), em [-1,1] por PI
  const yawErr = raw.hasEnemy ? wrapAngle(Math.atan2(raw.enemyDx, raw.enemyDz) - yaw) : 0;
  out[i++] = clamp1(yawErr / Math.PI);
  out[i++] = clamp1((raw.pitch || 0) / 1.45); // pitch é clampado a ±1.45 no jogo

  out[i++] = clamp1((raw.mag || 0) / 30);
  out[i++] = clamp1((raw.timeSinceSeen ?? SCALE.seen) / SCALE.seen);

  // one-hot da classe de arma (5)
  const cat = weaponCat(raw.weapon, raw.WEAPONS);
  for (const c of WEAPON_CATS) out[i++] = cat === c ? 1 : 0;

  // 6 raios de parede
  const wd = raw.wallDists || [];
  for (let k = 0; k < 6; k++) out[i++] = clamp1((wd[k] ?? SCALE.wall) / SCALE.wall);

  // aliado mais próximo (dir local + presença embutida na magnitude)
  const aLoc = raw.hasAlly ? toLocal(raw.allyDx, raw.allyDz, yaw) : { x: 0, z: 0 };
  const aDist = raw.hasAlly ? Math.hypot(raw.allyDx, raw.allyDz) : SCALE.dist;
  out[i++] = raw.hasAlly ? clamp1(aLoc.x / SCALE.dist) : 0;
  out[i++] = raw.hasAlly ? clamp1(aLoc.z / SCALE.dist) : 0;

  // sanity: i deve fechar exatamente em STATE_DIM
  return out;
}

// Índices nomeados do vetor de AÇÃO (saída da rede / rótulo do recorder).
export const ACTION = {
  moveFwd: 0, // -1..1 (S..W)
  moveStrafe: 1, // -1..1 (A..D)
  dyaw: 2, // Δyaw do frame (rad), escalado
  dpitch: 3, // Δpitch do frame (rad), escalado
  fire: 4, // 0/1
  crouch: 5, // 0/1
  reload: 6, // 0/1
};

// escala do Δaim: um flick humano raramente passa de ~0.35 rad/frame a 60fps
const DAIM_SCALE = 0.35;

export function buildAction(raw) {
  const out = new Float32Array(ACTION_DIM);
  out[ACTION.moveFwd] = clamp1(raw.moveFwd || 0);
  out[ACTION.moveStrafe] = clamp1(raw.moveStrafe || 0);
  out[ACTION.dyaw] = clamp1((raw.dyaw || 0) / DAIM_SCALE);
  out[ACTION.dpitch] = clamp1((raw.dpitch || 0) / DAIM_SCALE);
  out[ACTION.fire] = raw.fire ? 1 : 0;
  out[ACTION.crouch] = raw.crouch ? 1 : 0;
  out[ACTION.reload] = raw.reload ? 1 : 0;
  return out;
}

// Desfaz a escala do Δaim na inferência (o brain devolve rad de verdade).
export function decodeDaim(v) {
  return (v || 0) * DAIM_SCALE;
}

export const FEATURE_SCALE = SCALE;
