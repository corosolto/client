/* Relógio e buffer de interpolação dos remotos. Sem Three.js, DOM ou socket: o relógio e o
   RTT são injetáveis para que rajadas, perdas e reordenação sejam reproduzíveis na régua. */
const RELOGIO_NOVO_MS = 1000;

export class InterpolationClock {
  constructor({ snapshotHz = 20, now = () => performance.now(), ping = () => 0 } = {}) {
    this.snapshotHz = Math.max(1, Number(snapshotHz) || 20);
    this.baseDelayMs = Math.max(75, Math.min(140, 2400 / this.snapshotHz));
    this.delayMs = this.baseDelayMs;
    this.arrivalGaps = [];
    this.arrivalTimes = [];
    this.serverTimes = [];
    this.offsetMs = null;
    this._now = now;
    this._ping = ping;
  }

  snapshotTime(snap, nowMs = this._now()) {
    return Number.isFinite(snap.t) ? snap.t * 1000 : nowMs;
  }

  serverNow(nowMs = this._now()) {
    return this.offsetMs == null ? nowMs : nowMs - this.offsetMs;
  }

  updateDelay(gapMs) {
    if (!(gapMs > 0)) return;
    if (gapMs >= 1000) {
      this.arrivalGaps.length = 0;
      this.delayMs = this.baseDelayMs;
      return;
    }
    this.arrivalGaps.push(gapMs);
    if (this.arrivalGaps.length > 30) this.arrivalGaps.shift();
    if (this.arrivalGaps.length < 12) return;
    const gaps = [...this.arrivalGaps].sort((a, b) => a - b);
    const p90 = gaps[Math.floor((gaps.length - 1) * 0.9)];
    // O servidor só rebobina 250 ms; 20 ms de margem cobrem fila e assimetria do RTT.
    const rtt = Number(this._ping());
    const teto = Number.isFinite(rtt) && rtt > 0
      ? Math.max(this.baseDelayMs, Math.min(140, 230 - rtt / 2)) : 140;
    const alvo = Math.max(this.baseDelayMs, Math.min(teto, p90 + 20));
    const mudanca = alvo - this.delayMs;
    this.delayMs += Math.max(-2, Math.min(5, mudanca));
  }

  observe(snap, nowMs = this._now(), updateDelay = null) {
    this.previousServerTime = this.currentServerTime;
    this.previousArrivalTime = this.currentArrivalTime;
    this.currentServerTime = snap.t;
    this.currentArrivalTime = nowMs;
    if (this.previousArrivalTime != null) {
      const gapMs = nowMs - this.previousArrivalTime;
      if (updateDelay) updateDelay(gapMs); else this.updateDelay(gapMs);
    }
    this.arrivalTimes.push(nowMs);
    this.serverTimes.push(snap.t);
    if (this.arrivalTimes.length > 10) { this.arrivalTimes.shift(); this.serverTimes.shift(); }
    const atualOff = nowMs - snap.t * 1000;
    if (this.offsetMs != null && Math.abs(atualOff - this.offsetMs) > 1000) {
      this.offsetMs = atualOff;
      this.arrivalTimes = [nowMs];
      this.serverTimes = [snap.t];
    }
    // Offset local↔servidor = MÍNIMO da janela (atraso só aumenta chegada−t); desliza ≤ 4 ms
    // por snapshot, e salto > 1 s é relógio novo (partida nova) — BUG-118.
    let off = Infinity;
    for (let i = 0; i < this.arrivalTimes.length; i++) {
      const o = this.arrivalTimes[i] - this.serverTimes[i] * 1000;
      if (o < off) off = o;
    }
    if (this.offsetMs == null || Math.abs(off - this.offsetMs) > 1000) this.offsetMs = off;
    else this.offsetMs += Math.max(-4, Math.min(4, off - this.offsetMs));
  }

  renderTime(fallback = 0, serverNowMs = null) {
    const t = this.serverTimes;
    if (!t.length) return fallback;
    const rt = ((serverNowMs == null ? this.serverNow() : serverNowMs) - this.delayMs) / 1000;
    return Math.min(t[t.length - 1], Math.max(t[0], rt));
  }
}

function clearEntityBuffer(ent) {
  ent._bufAt.length = 0; ent._bufX.length = 0; ent._bufY.length = 0; ent._bufZ.length = 0;
  ent._bufYaw.length = 0; ent._bufPitch.length = 0; ent._bufMantle.length = 0;
}

export function ensureEntityBuffer(ent) {
  if (!ent._bufAt) {
    ent._bufAt = []; ent._bufX = []; ent._bufY = []; ent._bufZ = [];
    ent._bufYaw = []; ent._bufPitch = []; ent._bufMantle = [];
  }
}

/* Mantém os arrays planos na PRÓPRIA entidade: consumidores de apresentação continuam lendo
   os mesmos buffers, sem cópia nem objeto por amostra. */
export function pushEntitySample(ent, t, e, teleport = false, semOrdem = false) {
  ensureEntityBuffer(ent);
  const at = ent._bufAt, nb = at.length;
  // Recuo grande = partida nova; recuo curto é pacote fora de ordem (BUG-164). O gancho
  // semOrdem/__mutOrdemAntiga preserva o mutante histórico da régua de netloop.
  const recuo = semOrdem ? 0 : RELOGIO_NOVO_MS;
  if (teleport || (nb && t < at[nb - 1] - recuo)) clearEntityBuffer(ent);

  const n = at.length;
  ent._bufMantle ||= [];
  let i = n;
  if (!semOrdem) while (i > 0 && at[i - 1] > t) i--;
  if (i > 0 && at[i - 1] === t) return false;
  if (i === n) {
    at.push(t); ent._bufX.push(e.x); ent._bufY.push(e.y); ent._bufZ.push(e.z);
    ent._bufYaw.push(e.yaw); ent._bufPitch.push(e.pitch || 0);
    ent._bufMantle.push(Number.isFinite(e.mantleF) ? e.mantleF : -1);
  } else {
    at.splice(i, 0, t); ent._bufX.splice(i, 0, e.x); ent._bufY.splice(i, 0, e.y); ent._bufZ.splice(i, 0, e.z);
    ent._bufYaw.splice(i, 0, e.yaw); ent._bufPitch.splice(i, 0, e.pitch || 0);
    ent._bufMantle.splice(i, 0, Number.isFinite(e.mantleF) ? e.mantleF : -1);
  }
  if (at.length > 10) {
    at.shift(); ent._bufX.shift(); ent._bufY.shift(); ent._bufZ.shift();
    ent._bufYaw.shift(); ent._bufPitch.shift(); ent._bufMantle.shift();
  }
  return true;
}

/* Interpola sem extrapolar e devolve a velocidade do segmento em `out`, reutilizado pelo
   chamador a cada quadro. A pose fica na entidade, como antes da extração. */
export function sampleEntityBuffer(ent, renderAtMs, out) {
  const at = ent._bufAt, n = at.length;
  out.vx = 0; out.vz = 0; out.segYaw = null;
  if (!n) return out;
  let j, a = 0;
  if (renderAtMs <= at[0]) j = 0;
  else if (renderAtMs >= at[n - 1]) j = n - 1;
  else {
    j = n - 2;
    while (j > 0 && at[j] > renderAtMs) j--;
    a = (renderAtMs - at[j]) / Math.max(1, at[j + 1] - at[j]);
  }
  const k = a > 0 ? j + 1 : j;
  ent.pos.x = ent._bufX[j] + (ent._bufX[k] - ent._bufX[j]) * a;
  ent.pos.y = ent._bufY[j] + (ent._bufY[k] - ent._bufY[j]) * a;
  ent.pos.z = ent._bufZ[j] + (ent._bufZ[k] - ent._bufZ[j]) * a;
  let dy = ent._bufYaw[k] - ent._bufYaw[j];
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  ent.yaw = ent._bufYaw[j] + dy * a;
  if (ent._bufPitch) ent._netPitch = ent._bufPitch[j] + (ent._bufPitch[k] - ent._bufPitch[j]) * a;
  if (ent._bufMantle) {
    const m0 = ent._bufMantle[j], m1 = ent._bufMantle[k];
    ent.mantleF = m0 >= 0 && m1 >= 0 ? m0 + (m1 - m0) * a : (a < 0.5 ? m0 : m1);
  }
  const s = Math.min(j, n - 2);
  if (s >= 0) {
    const segS = Math.max(1, at[s + 1] - at[s]) / 1000;
    out.vx = (ent._bufX[s + 1] - ent._bufX[s]) / segS;
    out.vz = (ent._bufZ[s + 1] - ent._bufZ[s]) / segS;
    let ds = ent._bufYaw[s + 1] - ent._bufYaw[s];
    while (ds > Math.PI) ds -= Math.PI * 2;
    while (ds < -Math.PI) ds += Math.PI * 2;
    out.segYaw = ent._bufYaw[s] + ds / 2;
  }
  return out;
}
