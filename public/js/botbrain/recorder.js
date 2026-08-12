// Grava estado e ação a 10 Hz somente após opt-in. O buffer é limitado e quantizado.
import { buildState, buildAction, STATE_DIM, ACTION_DIM } from './features.js';
import { sense } from './sense.js';

const SAMPLE_HZ = 10;
const MAX_FRAMES = 2400; // ~4 min a 10 Hz; teto de segurança pra memória e payload

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export class PlayerRecorder {
  constructor(game) {
    this.game = game;
    this.frames = []; // { s: Float32Array(STATE_DIM), a: Float32Array(ACTION_DIM) }
    this._mem = { target: null, lastSeenAt: -99 };
    this._acc = 0; // acumulador de tempo p/ amostrar a SAMPLE_HZ
    this._lastYaw = null;
    this._lastPitch = null;
  }

  // Chamado todo frame por game.update; amostra só quando cruza o passo de SAMPLE_HZ.
  tick(dt) {
    const g = this.game, p = g.player;
    if (!p || !p.alive || g.state !== 'live') { this._lastYaw = null; return; }
    this._acc += dt;
    const step = 1 / SAMPLE_HZ;
    if (this._acc < step) return;
    this._acc = 0;
    this._sample();
  }

  _sample() {
    const g = this.game, p = g.player;
    if (this.frames.length >= MAX_FRAMES) return;

    // Δaim desde a última amostra (o jogador mira acumulando movementX/Y no yaw/pitch)
    let dyaw = 0, dpitch = 0;
    if (this._lastYaw !== null) {
      dyaw = wrapAngle(p.yaw - this._lastYaw);
      dpitch = p.pitch - this._lastPitch;
    }
    this._lastYaw = p.yaw;
    this._lastPitch = p.pitch;

    const self = {
      pos: p.pos, vel: p.vel, yaw: p.yaw, pitch: p.pitch, hp: p.hp,
      weapon: p.weapon, mag: (p.ammo[p.weapon] && p.ammo[p.weapon].mag) || 0,
      team: p.team, isPlayer: true,
    };
    const raw = sense(g, self, g.camera.position, this._mem, g.time);
    const s = buildState(raw);

    // AÇÃO: convenção do _updatePlayer — iz = KeyS - KeyW (frente = -iz), ix = KeyD - KeyA
    const k = g.keys || {};
    const a = buildAction({
      moveFwd: (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0),
      moveStrafe: (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0),
      dyaw, dpitch,
      fire: !!g.mouseDown0,
      crouch: !!(k.ControlLeft || k.ControlRight || k.KeyC),
      reload: p.reloadUntil > g.time,
    });

    this.frames.push({ s, a });
  }

  get count() { return this.frames.length; }

  // Serializa em blob compacto: header + Int8 quantizado ([-1,1] → [-127,127]).
  // Formato: { v, dims:{s,a}, n, meta, data:base64(Int8Array de n*(S+A)) }
  flush(meta) {
    const n = this.frames.length;
    if (!n) return null;
    const S = STATE_DIM, A = ACTION_DIM;
    const buf = new Int8Array(n * (S + A));
    let o = 0;
    for (const f of this.frames) {
      for (let i = 0; i < S; i++) buf[o++] = Math.max(-127, Math.min(127, Math.round(f.s[i] * 127)));
      for (let i = 0; i < A; i++) buf[o++] = Math.max(-127, Math.min(127, Math.round(f.a[i] * 127)));
    }
    return {
      v: 1,
      dims: { s: S, a: A },
      n,
      meta: meta || {},
      data: bytesToBase64(new Uint8Array(buf.buffer)),
    };
  }

  reset() {
    this.frames.length = 0;
    this._mem = { target: null, lastSeenAt: -99 };
    this._acc = 0;
    this._lastYaw = null;
    this._lastPitch = null;
  }
}

function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
