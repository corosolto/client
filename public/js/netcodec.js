import { WEAPONS } from './data/weapons.js';

export const SNAPSHOT_PROTOCOLS = Object.freeze(['coro-snapshot-v5', 'coro-snapshot-v4', 'coro-snapshot-v3', 'coro-snapshot-v2', 'coro-json-v1']);
export const MAX_SNAPSHOT_BYTES = 32768;
const CURRENT_VERSION = 5;
const KIND_SNAPSHOT = 1;
const MAX_ENTITIES = 64;
const MAX_CTF_POINTS = 16;
const MAX_STRING_BYTES = 64;
const WEAPON_IDS = Object.freeze(Object.keys(WEAPONS));
const WEAPON_INDEX = new Map(WEAPON_IDS.map((id, i) => [id, i]));
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

class Writer {
  constructor() { this.buffer = new ArrayBuffer(1024); this.view = new DataView(this.buffer); this.offset = 0; }
  ensure(n) {
    if (this.offset + n <= this.buffer.byteLength) return;
    let size = this.buffer.byteLength;
    while (size < this.offset + n) size *= 2;
    if (size > MAX_SNAPSHOT_BYTES) throw new RangeError('snapshot_too_large');
    const next = new ArrayBuffer(size);
    new Uint8Array(next).set(new Uint8Array(this.buffer, 0, this.offset));
    this.buffer = next; this.view = new DataView(next);
  }
  u8(v) { this.ensure(1); this.view.setUint8(this.offset, v); this.offset++; }
  u16(v) { this.ensure(2); this.view.setUint16(this.offset, v, true); this.offset += 2; }
  u32(v) { this.ensure(4); this.view.setUint32(this.offset, v, true); this.offset += 4; }
  f32(v) { if (!Number.isFinite(v)) throw new TypeError('non_finite'); this.ensure(4); this.view.setFloat32(this.offset, v, true); this.offset += 4; }
  f64(v) { if (!Number.isFinite(v)) throw new TypeError('non_finite'); this.ensure(8); this.view.setFloat64(this.offset, v, true); this.offset += 8; }
  str(value) {
    const bytes = encoder.encode(value == null ? '' : String(value));
    if (bytes.byteLength > MAX_STRING_BYTES) throw new RangeError('string_too_long');
    this.u8(bytes.byteLength); this.ensure(bytes.byteLength);
    new Uint8Array(this.buffer, this.offset, bytes.byteLength).set(bytes); this.offset += bytes.byteLength;
  }
  done() { return new Uint8Array(this.buffer.slice(0, this.offset)); }
}

class Reader {
  constructor(data) {
    if (data instanceof ArrayBuffer) this.bytes = new Uint8Array(data);
    else if (ArrayBuffer.isView(data)) this.bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    else throw new TypeError('binary_required');
    if (this.bytes.byteLength > MAX_SNAPSHOT_BYTES) throw new RangeError('snapshot_too_large');
    this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
    this.offset = 0;
  }
  take(n) { if (this.offset + n > this.bytes.byteLength) throw new RangeError('snapshot_truncated'); }
  u8() { this.take(1); return this.view.getUint8(this.offset++); }
  u16() { this.take(2); const v = this.view.getUint16(this.offset, true); this.offset += 2; return v; }
  u32() { this.take(4); const v = this.view.getUint32(this.offset, true); this.offset += 4; return v; }
  f32() { this.take(4); const v = this.view.getFloat32(this.offset, true); this.offset += 4; if (!Number.isFinite(v)) throw new TypeError('non_finite'); return v; }
  f64() { this.take(8); const v = this.view.getFloat64(this.offset, true); this.offset += 8; if (!Number.isFinite(v)) throw new TypeError('non_finite'); return v; }
  str() {
    const n = this.u8();
    if (n > MAX_STRING_BYTES) throw new RangeError('string_too_long');
    this.take(n); const value = decoder.decode(this.bytes.subarray(this.offset, this.offset + n)); this.offset += n; return value;
  }
  finish() { if (this.offset !== this.bytes.byteLength) throw new RangeError('snapshot_trailing_bytes'); }
}

/* QUANTIZAÇÃO (v5). A posição do VIZINHO é desenhada, não medida: 15,6 mm de passo é
   invisível num corpo de 1,8 m, e o servidor continua usando f64 para acertar tiro. A do DONO
   fica em f32 no reboque, porque é ela que a régua de reconciliação mede em milímetros. */
const POS_MIN = -512, POS_MAX = 512;
const ALT_MIN = -64, ALT_MAX = 192;
const q16 = (v, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new TypeError('non_finite');
  return Math.max(0, Math.min(65535, Math.round(((Math.max(min, Math.min(max, n)) - min) / (max - min)) * 65535)));
};
const d16 = (q, min, max) => min + (q / 65535) * (max - min);
const qAng = (v, amp) => q16(Math.max(-amp, Math.min(amp, Number(v) || 0)), -amp, amp);
const dAng = (q, amp) => d16(q, -amp, amp);
const TAU = Math.PI * 2;

/* REBOQUE DE UM CLIENTE SÓ (v5). `ackSeq/mag/res/reloadIn/primary/secondary` iam em TODAS as
   entidades e só eram lidos para a própria — 14 bytes × N desperdiçados por snapshot. Agora
   viajam uma vez, no fim, endereçados a quem recebe; e levam junto a posição EXATA do dono. */
export const TRAILER_V5_BYTES = 30;
export function encodeTrailerV5(priv = {}) {
  const w = new Writer();
  w.u32(integer(priv.id ?? 0, 0xffffffff, 'trailer_id'));
  w.u32(integer(priv.ackSeq ?? 0, 0xffffffff, 'ack_seq'));
  w.u16(priv.mag == null ? 65535 : integer(priv.mag, 65534, 'mag'));
  w.u16(priv.res == null ? 65535 : integer(priv.res, 65534, 'reserve'));
  w.f32(Math.max(0, Number(priv.reloadIn) || 0));
  const primary = priv.primary == null ? 255 : WEAPON_INDEX.get(priv.primary);
  const secondary = priv.secondary == null ? 255 : WEAPON_INDEX.get(priv.secondary);
  if (primary == null || secondary == null) throw new RangeError('trailer_weapon');
  w.u8(primary); w.u8(secondary);
  w.f32(Number(priv.x) || 0); w.f32(Number(priv.y) || 0); w.f32(Number(priv.z) || 0);
  return w.done();
}
export function juntarV5(comum, reboque) {
  const out = new Uint8Array(comum.byteLength + reboque.byteLength);
  out.set(comum, 0); out.set(reboque, comum.byteLength);
  return out;
}

const integer = (value, max, name) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > max) throw new RangeError(name);
  return n;
};

export function encodeSnapshot(snapshot, version = CURRENT_VERSION) {
  if (!snapshot || snapshot.type !== 'snapshot') throw new TypeError('snapshot_required');
  if (version < 2 || version > 5) throw new TypeError('snapshot_version');
  const ents = Array.isArray(snapshot.ents) ? snapshot.ents : [];
  if (ents.length > MAX_ENTITIES) throw new RangeError('too_many_entities');
  const w = new Writer();
  w.u8(0x43); w.u8(0x53); w.u8(0x42); w.u8(0x32); w.u8(version); w.u8(KIND_SNAPSHOT);
  w.str(snapshot.room); w.u32(integer(snapshot.tick, 0xffffffff, 'tick')); w.f64(snapshot.t);
  w.str(snapshot.state); w.str(snapshot.owner); w.u8(integer(snapshot.players, 255, 'players'));
  w.u8(integer(snapshot.spectators, 255, 'spectators'));
  w.u8(integer(snapshot.livre?.E, 255, 'livre_e')); w.u8(integer(snapshot.livre?.B, 255, 'livre_b'));
  w.u16(integer(snapshot.timeLeft, 65535, 'time_left')); w.u16(integer(snapshot.roundNum, 65535, 'round'));
  w.u16(integer(snapshot.scoreE, 65535, 'score_e')); w.u16(integer(snapshot.scoreB, 65535, 'score_b'));
  /* v3 acrescenta somente o estado autoritativo de captura. v2 fica byte-a-byte no formato
     antigo para permitir rollout servidor-primeiro sem expulsar clientes já conectados. */
  if (version >= 3) {
    const ctf = snapshot.ctf;
    w.u8(ctf ? 1 : 0);
    if (ctf) {
      const points = Array.isArray(ctf.points) ? ctf.points : [];
      if (points.length > MAX_CTF_POINTS) throw new RangeError('too_many_ctf_points');
      w.u16(integer(ctf.capsE, 65535, 'ctf_caps_e')); w.u16(integer(ctf.capsB, 65535, 'ctf_caps_b'));
      w.u16(integer(ctf.roundCapsE, 65535, 'ctf_round_caps_e')); w.u16(integer(ctf.roundCapsB, 65535, 'ctf_round_caps_b'));
      w.u16(integer(ctf.capsToWin, 65535, 'ctf_caps_to_win')); w.f32(ctf.matchLeft);
      w.u8(points.length);
      for (const point of points) {
        const owner = point.owner === 'E' ? 1 : point.owner === 'B' ? 2 : 0;
        const capTeam = point.capTeam === 'E' ? 4 : point.capTeam === 'B' ? 8 : 0;
        w.u8(owner | capTeam | (point.contested ? 16 : 0));
        w.f32(point.prog || 0);
      }
    }
  }
  w.u8(ents.length);
  for (const ent of ents) {
    if (ent.team !== 'E' && ent.team !== 'B') throw new RangeError('team');
    const weapon = ent.weapon == null ? 255 : WEAPON_INDEX.get(ent.weapon);
    const primary = ent.primary == null ? 255 : WEAPON_INDEX.get(ent.primary);
    const secondary = ent.secondary == null ? 255 : WEAPON_INDEX.get(ent.secondary);
    if (weapon == null) throw new RangeError('weapon');
    if (primary == null) throw new RangeError('primary');
    if (secondary == null) throw new RangeError('secondary');
    if (version >= 5) {
      /* v5: posição do vizinho quantizada, `fire` e `voice` viram CONTADOR (bandeira de um
         snapshot só some quando o pacote se perde), e o bloco privado saiu daqui. */
      w.u32(integer(ent.id, 0xffffffff, 'entity_id')); w.str(ent.name);
      w.u8((ent.team === 'B' ? 1 : 0) | (ent.bot ? 2 : 0) | (ent.alive ? 4 : 0));
      w.u16(q16(ent.x, POS_MIN, POS_MAX)); w.u16(q16(ent.y, ALT_MIN, ALT_MAX)); w.u16(q16(ent.z, POS_MIN, POS_MAX));
      w.u16(qAng(ent.yaw > Math.PI || ent.yaw < -Math.PI ? Math.atan2(Math.sin(ent.yaw), Math.cos(ent.yaw)) : ent.yaw, Math.PI));
      w.u16(qAng(ent.pitch || 0, Math.PI / 2));
      w.u8(Math.max(0, Math.min(255, Math.round(Number(ent.hp) || 0)))); w.u8(weapon);
      w.u8(integer(ent.fireN ?? ent.fire ?? 0, 255, 'fire') & 255);
      const vt = ent.voice === 'radio' ? 1 : ent.voice ? 2 : 0;
      w.u8((vt & 3) | ((integer(ent.voiceN ?? 0, 63, 'voice_n') & 63) << 2));
      w.u16(integer(ent.k, 65535, 'kills')); w.u16(integer(ent.d, 65535, 'deaths'));
      w.u8(Math.max(0, Math.min(255, Math.round((Number(ent.respawnIn) || 0) * 10))));
      w.str(ent.killedBy);
      continue;
    }
    w.u32(integer(ent.id, 0xffffffff, 'entity_id')); w.str(ent.name);
    w.u8((ent.team === 'B' ? 1 : 0) | (ent.bot ? 2 : 0) | (ent.alive ? 4 : 0) | (ent.fire ? 8 : 0));
    w.f32(ent.x); w.f32(ent.y); w.f32(ent.z); w.f32(ent.yaw); w.f32(ent.pitch);
    w.u16(integer(ent.hp, 65535, 'hp')); w.u8(weapon);
    w.u8(ent.voice === 'radio' ? 1 : ent.voice ? 2 : 0);
    w.u16(integer(ent.k, 65535, 'kills')); w.u16(integer(ent.d, 65535, 'deaths'));
    w.f32(ent.respawnIn); w.str(ent.killedBy);
    /* v4 fecha a segunda cópia de estado do slot no navegador. O ack é da mesma entidade
       que todos já recebem; munição/slots ausentes usam 65535/255 para bots e fallbacks. */
    if (version >= 4) {
      w.u32(integer(ent.ackSeq ?? 0, 0xffffffff, 'ack_seq'));
      w.u16(ent.mag == null ? 65535 : integer(ent.mag, 65534, 'mag'));
      w.u16(ent.res == null ? 65535 : integer(ent.res, 65534, 'reserve'));
      w.f32(Math.max(0, Number(ent.reloadIn) || 0));
      w.u8(primary); w.u8(secondary);
    }
  }
  return w.done();
}

export function decodeSnapshot(data) {
  const r = new Reader(data);
  if (r.u8() !== 0x43 || r.u8() !== 0x53 || r.u8() !== 0x42 || r.u8() !== 0x32) throw new TypeError('snapshot_magic');
  const version = r.u8();
  if (version < 2 || version > 5 || r.u8() !== KIND_SNAPSHOT) throw new TypeError('snapshot_version');
  const snapshot = {
    type: 'snapshot', room: r.str(), tick: r.u32(), t: r.f64(), state: r.str(), owner: r.str() || null,
    players: r.u8(), spectators: r.u8(), livre: { E: r.u8(), B: r.u8() },
    timeLeft: r.u16(), roundNum: r.u16(), scoreE: r.u16(), scoreB: r.u16(), ents: [],
  };
  if (version >= 3 && r.u8()) {
    snapshot.ctf = {
      capsE: r.u16(), capsB: r.u16(), roundCapsE: r.u16(), roundCapsB: r.u16(),
      capsToWin: r.u16(), matchLeft: r.f32(), points: [],
    };
    const ctfCount = r.u8();
    if (ctfCount > MAX_CTF_POINTS) throw new RangeError('too_many_ctf_points');
    for (let i = 0; i < ctfCount; i++) {
      const flags = r.u8();
      snapshot.ctf.points.push({
        owner: flags & 1 ? 'E' : flags & 2 ? 'B' : null,
        capTeam: flags & 4 ? 'E' : flags & 8 ? 'B' : null,
        contested: !!(flags & 16), prog: r.f32(),
      });
    }
  }
  const count = r.u8();
  if (count > MAX_ENTITIES) throw new RangeError('too_many_entities');
  for (let i = 0; i < count; i++) {
    if (version >= 5) {
      const id = r.u32(), name = r.str(), flags = r.u8();
      const x = d16(r.u16(), POS_MIN, POS_MAX), y = d16(r.u16(), ALT_MIN, ALT_MAX), z = d16(r.u16(), POS_MIN, POS_MAX);
      const yaw = dAng(r.u16(), Math.PI), pitch = dAng(r.u16(), Math.PI / 2);
      const hp = r.u8(), weaponId = r.u8(), fireN = r.u8(), voiceByte = r.u8();
      const k = r.u16(), d = r.u16(), respawnIn = r.u8() / 10, killedBy = r.str();
      if (weaponId !== 255 && !WEAPON_IDS[weaponId]) throw new RangeError('weapon');
      const vt = voiceByte & 3;
      snapshot.ents.push({
        id, name, team: flags & 1 ? 'B' : 'E', bot: flags & 2 ? 1 : 0,
        x, y, z, yaw, pitch, hp, alive: !!(flags & 4),
        weapon: weaponId === 255 ? null : WEAPON_IDS[weaponId],
        fireN, voice: vt === 1 ? 'radio' : vt === 2 ? 'voice' : 0, voiceN: voiceByte >> 2,
        k, d, respawnIn, ...(killedBy ? { killedBy } : {}),
      });
      continue;
    }
    const id = r.u32(), name = r.str(), flags = r.u8();
    const x = r.f32(), y = r.f32(), z = r.f32(), yaw = r.f32(), pitch = r.f32();
    const hp = r.u16(), weaponId = r.u8(), voiceId = r.u8(), k = r.u16(), d = r.u16();
    const respawnIn = r.f32(), killedBy = r.str();
    if (weaponId !== 255 && !WEAPON_IDS[weaponId]) throw new RangeError('weapon');
    const ent = {
      id, name, team: flags & 1 ? 'B' : 'E', bot: flags & 2 ? 1 : 0,
      x, y, z, yaw, pitch, hp, alive: !!(flags & 4), weapon: weaponId === 255 ? null : WEAPON_IDS[weaponId],
      fire: flags & 8 ? 1 : 0, voice: voiceId === 1 ? 'radio' : voiceId === 2 ? 'voice' : 0,
      k, d, respawnIn, ...(killedBy ? { killedBy } : {}),
    };
    if (version >= 4) {
      const ackSeq = r.u32(), mag = r.u16(), res = r.u16(), reloadIn = r.f32();
      const primaryId = r.u8(), secondaryId = r.u8();
      if (primaryId !== 255 && !WEAPON_IDS[primaryId]) throw new RangeError('primary');
      if (secondaryId !== 255 && !WEAPON_IDS[secondaryId]) throw new RangeError('secondary');
      Object.assign(ent, {
        ackSeq,
        mag: mag === 65535 ? null : mag,
        res: res === 65535 ? null : res,
        reloadIn,
        primary: primaryId === 255 ? null : WEAPON_IDS[primaryId],
        secondary: secondaryId === 255 ? null : WEAPON_IDS[secondaryId],
      });
    }
    snapshot.ents.push(ent);
  }
  /* REBOQUE v5: o bloco privado de QUEM RECEBE. Ele é remontado dentro da própria entidade,
     então quem consome o snapshot não precisa saber que o formato mudou. */
  // reboque AUSENTE é legítimo: espectador não tem bloco privado, e o decoder não pode exigir
  // do formato o que o remetente não tem para dar
  if (version >= 5 && r.offset < r.bytes.byteLength) {
    const id = r.u32(), ackSeq = r.u32(), mag = r.u16(), res = r.u16(), reloadIn = r.f32();
    const primaryId = r.u8(), secondaryId = r.u8();
    if (primaryId !== 255 && !WEAPON_IDS[primaryId]) throw new RangeError('primary');
    if (secondaryId !== 255 && !WEAPON_IDS[secondaryId]) throw new RangeError('secondary');
    const x = r.f32(), y = r.f32(), z = r.f32();
    const meu = {
      id, ackSeq, mag: mag === 65535 ? null : mag, res: res === 65535 ? null : res, reloadIn,
      primary: primaryId === 255 ? null : WEAPON_IDS[primaryId],
      secondary: secondaryId === 255 ? null : WEAPON_IDS[secondaryId],
      x, y, z,
    };
    snapshot.meu = meu;
    const dono = id ? snapshot.ents.find((e) => e.id === id) : null;
    // posição do dono volta em f32: é ela que a régua de reconciliação mede em milímetros
    if (dono) Object.assign(dono, meu);
  }
  r.finish();
  return snapshot;
}
