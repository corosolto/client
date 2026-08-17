// Recorder e inferência compartilham esta percepção para manter o vetor idêntico.
import * as THREE from 'three';
import { WEAPONS } from '../data/weapons.js';

const WALL_ANGLES = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];
const WALL_FAR = 8; // alcance dos raios de parede (m); casa com FEATURE_SCALE.wall

const _dir = new THREE.Vector3();

// Distâncias de parede em 6 raios locais (frente + 60° em 60°), do olho do agente.
// Reusa game.ray e game.world.occluders (os mesmos que _losClear usa).
function probeWalls(game, eye, yaw) {
  const out = new Array(6);
  for (let k = 0; k < 6; k++) {
    const a = yaw + WALL_ANGLES[k];
    _dir.set(Math.sin(a), 0, Math.cos(a));
    game.ray.set(eye, _dir);
    game.ray.far = WALL_FAR;
    const hits = game.world.occluders.length ? game.ray.intersectObjects(game.world.occluders, false) : [];
    out[k] = hits.length ? hits[0].distance : WALL_FAR;
  }
  return out;
}

// Retorna o `raw` para features.buildState. `mem` guarda a memória de visão entre
// chamadas (mem.lastSeenAt) — espelha o "grace" de LOS do próprio bot.
// self: { pos, vel, yaw, pitch, hp, weapon, mag, team, isPlayer }
// eye:  THREE.Vector3 (olho do agente; câmera p/ jogador, _botEye p/ bot)
export function sense(game, self, eye, mem, now) {
  // Inimigo visível mais próximo; sem visão, retém apenas um alvo vivo durante o grace.
  let best = null, bd = 1e9, bestVisible = false;
  const enemies = game._enemyOf(self);
  for (const e of enemies) {
    const d = self.pos.distanceTo(e.pos);
    if (d >= bd) continue;
    const teye = e.isPlayer ? game.camera.position : game._botEye(e);
    const vis = game._losClear(eye, teye);
    if (vis) { best = e; bd = d; bestVisible = true; }
  }
  if (!best && mem && enemies.includes(mem.target) && now - (mem.lastSeenAt || -99) < 1.2) {
    best = mem.target;
  }

  if (mem) {
    if (bestVisible) { mem.target = best; mem.lastSeenAt = now; }
    else if (!best) mem.target = null;
  }
  const timeSinceSeen = mem ? now - (mem.lastSeenAt ?? now - 6) : bestVisible ? 0 : 6;

  // aliado mais próximo (mesma equipe, vivo, não o próprio)
  let ally = null, ad = 1e9;
  for (const c of game.combatants) {
    if (c === self || c.team !== self.team || !c.alive) continue;
    const d = self.pos.distanceTo(c.pos);
    if (d < ad) { ad = d; ally = c; }
  }

  const raw = {
    yaw: self.yaw || 0,
    pitch: self.pitch || 0,
    hp: self.hp || 0,
    mag: self.mag || 0,
    selfVx: self.vel ? self.vel.x : 0,
    selfVz: self.vel ? self.vel.z : 0,
    hasEnemy: !!best,
    enemyDx: best ? best.pos.x - self.pos.x : 0,
    enemyDz: best ? best.pos.z - self.pos.z : 0,
    enemyDy: best ? best.pos.y - self.pos.y : 0,
    enemyVx: best && best.vel ? best.vel.x : 0,
    enemyVz: best && best.vel ? best.vel.z : 0,
    enemyVisible: bestVisible,
    timeSinceSeen,
    weapon: self.weapon,
    WEAPONS,
    wallDists: probeWalls(game, eye, self.yaw || 0),
    hasAlly: !!ally,
    allyDx: ally ? ally.pos.x - self.pos.x : 0,
    allyDz: ally ? ally.pos.z - self.pos.z : 0,
  };
  return raw;
}
