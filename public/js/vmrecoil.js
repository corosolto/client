// Recuo procedural do viewmodel autorado (BUG-75 M5): curva do pack × amplitude
// sorteada, resíduo de rajada por mola, atenuação de ADS e pivô — recoil.json.
const DEG = Math.PI / 180;

// P90 vem sem RecoilAnimData no pack; herda o perfil da família irmã.
const FALLBACK = Object.freeze({ p90: 'smg', grenade: 'pistol' });

const sampleTrack = (track, t) => {
  if (!track || !track.values.length || track.duration <= 0) return 0;
  if (t >= track.duration) return 0;
  const x = (t / track.duration) * (track.values.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = track.values[i];
  const b = track.values[Math.min(track.values.length - 1, i + 1)];
  return a + (b - a) * f;
};

const rand = (min, max) => min + Math.random() * (max - min);
const randRange2 = (r) => rand(r[0], r[1]);
// roll/yaw vêm como [min1,max1,min2,max2]: sorteia o LADO e depois o valor.
const randRange4 = (r) => (Math.random() < 0.5 ? rand(r[0], r[1]) : rand(r[2], r[3]));

export class VmRecoil {
  constructor() {
    this.params = null;
    this.scale = 1;
    this.t = Infinity;
    this.auto = false;
    this.lastShot = -Infinity;
    this.amp = { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 };
    this.residual = { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0 };
    this.out = { rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, pivot: [0, 0, 0] };
  }

  setFamily(allParams, family, scale = 1) {
    this.params = allParams?.[family] || allParams?.[FALLBACK[family]] || allParams?.ar || null;
    this.scale = scale;
    this.t = Infinity;
    for (const key of Object.keys(this.residual)) this.residual[key] = 0;
  }

  shoot(now) {
    const p = this.params;
    if (!p) return false;
    // O tiro novo herda o que a mola ainda não devolveu — é o buildup da rajada.
    for (const key of Object.keys(this.residual)) this.residual[key] = this.out[key] ?? 0;
    this.auto = now - this.lastShot < 0.3;
    this.lastShot = now;
    this.t = 0;
    const s = this.scale;
    // Pitch do Unity é negativo para levantar o cano; em three, +X levanta.
    this.amp = {
      rx: -randRange2(p.pitch) * DEG * s,
      ry: randRange4(p.yaw) * DEG * s,
      rz: randRange4(p.roll) * DEG * s,
      px: randRange2(p.kickRight) * s,
      py: randRange2(p.kickUp) * s,
      pz: randRange2(p.kickback) * s,
    };
    return true;
  }

  // Saída em radianos/metros no espaço do mount (câmera): rx/ry/rz + px/py/pz e
  // o pivô (mistura hip/aim pelo blend de ADS) para girar a arma no lugar certo.
  update(dt, ads = 0) {
    const p = this.params;
    const out = this.out;
    if (!p) { out.rx = out.ry = out.rz = out.px = out.py = out.pz = 0; return out; }
    this.t += dt * (p.playRate || 1);
    const rotCurve = this.auto ? p.curves.autoRot : p.curves.semiRot;
    const locCurve = this.auto ? p.curves.autoLoc : p.curves.semiLoc;
    const aimR = p.aimRot;
    const aimL = p.aimLoc;
    const att = (base, aim) => 1 + (aim - 1) * ads;
    // smoothRot/Loc do pack é velocidade de interpolação; 0 = SEM suavização
    // (o resíduo morre já) — não confundir com mola lenta.
    const decay = (value, speed) => value * Math.exp(-(speed > 0 ? speed : 60) * dt);
    this.residual.rx = decay(this.residual.rx, p.smoothRot[0]);
    this.residual.ry = decay(this.residual.ry, p.smoothRot[1]);
    this.residual.rz = decay(this.residual.rz, p.smoothRot[2]);
    this.residual.px = decay(this.residual.px, p.smoothLoc[0]);
    this.residual.py = decay(this.residual.py, p.smoothLoc[1]);
    this.residual.pz = decay(this.residual.pz, p.smoothLoc[2]);
    out.rx = sampleTrack(rotCurve.x, this.t) * this.amp.rx * att(1, aimR[0]) + this.residual.rx;
    out.ry = sampleTrack(rotCurve.y, this.t) * this.amp.ry * att(1, aimR[1]) + this.residual.ry;
    out.rz = sampleTrack(rotCurve.z, this.t) * this.amp.rz * att(1, aimR[2]) + this.residual.rz;
    out.px = sampleTrack(locCurve.x, this.t) * this.amp.px * att(1, aimL[0]) + this.residual.px;
    out.py = sampleTrack(locCurve.y, this.t) * this.amp.py * att(1, aimL[1]) + this.residual.py;
    // Kickback do Unity é negativo "para o atirador": +Z no espaço da câmera.
    out.pz = -(sampleTrack(locCurve.z, this.t) * this.amp.pz * att(1, aimL[2]) + this.residual.pz);
    const hip = p.hipPivotOffset;
    const aim = p.aimPivotOffset;
    out.pivot[0] = hip[0] + (aim[0] - hip[0]) * ads;
    out.pivot[1] = hip[1] + (aim[1] - hip[1]) * ads;
    out.pivot[2] = hip[2] + (aim[2] - hip[2]) * ads;
    return out;
  }
}
