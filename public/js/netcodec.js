import { WEAPONS } from './data/weapons.js';

export const SNAPSHOT_PROTOCOLS = Object.freeze(['coro-snapshot-v2', 'coro-json-v1']);
export const MAX_SNAPSHOT_BYTES = 32768;
const VERSION = 2;
const KIND_SNAPSHOT = 1;
const MAX_ENTITIES = 64;
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

const integer = (value, max, name) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > max) throw new RangeError(name);
  return n;
};

export function encodeSnapshot(snapshot) {
  if (!snapshot || snapshot.type !== 'snapshot') throw new TypeError('snapshot_required');
  const ents = Array.isArray(snapshot.ents) ? snapshot.ents : [];
  if (ents.length > MAX_ENTITIES) throw new RangeError('too_many_entities');
  const w = new Writer();
  w.u8(0x43); w.u8(0x53); w.u8(0x42); w.u8(0x32); w.u8(VERSION); w.u8(KIND_SNAPSHOT);
  w.str(snapshot.room); w.u32(integer(snapshot.tick, 0xffffffff, 'tick')); w.f64(snapshot.t);
  w.str(snapshot.state); w.str(snapshot.owner); w.u8(integer(snapshot.players, 255, 'players'));
  w.u8(integer(snapshot.spectators, 255, 'spectators'));
  w.u8(integer(snapshot.livre?.E, 255, 'livre_e')); w.u8(integer(snapshot.livre?.B, 255, 'livre_b'));
  w.u16(integer(snapshot.timeLeft, 65535, 'time_left')); w.u16(integer(snapshot.roundNum, 65535, 'round'));
  w.u16(integer(snapshot.scoreE, 65535, 'score_e')); w.u16(integer(snapshot.scoreB, 65535, 'score_b'));
  w.u8(ents.length);
  for (const ent of ents) {
    if (ent.team !== 'E' && ent.team !== 'B') throw new RangeError('team');
    const weapon = ent.weapon == null ? 255 : WEAPON_INDEX.get(ent.weapon);
    if (weapon == null) throw new RangeError('weapon');
    w.u32(integer(ent.id, 0xffffffff, 'entity_id')); w.str(ent.name);
    w.u8((ent.team === 'B' ? 1 : 0) | (ent.bot ? 2 : 0) | (ent.alive ? 4 : 0) | (ent.fire ? 8 : 0));
    w.f32(ent.x); w.f32(ent.y); w.f32(ent.z); w.f32(ent.yaw); w.f32(ent.pitch);
    w.u16(integer(ent.hp, 65535, 'hp')); w.u8(weapon);
    w.u8(ent.voice === 'radio' ? 1 : ent.voice ? 2 : 0);
    w.u16(integer(ent.k, 65535, 'kills')); w.u16(integer(ent.d, 65535, 'deaths'));
    w.f32(ent.respawnIn); w.str(ent.killedBy);
  }
  return w.done();
}

export function decodeSnapshot(data) {
  const r = new Reader(data);
  if (r.u8() !== 0x43 || r.u8() !== 0x53 || r.u8() !== 0x42 || r.u8() !== 0x32) throw new TypeError('snapshot_magic');
  if (r.u8() !== VERSION || r.u8() !== KIND_SNAPSHOT) throw new TypeError('snapshot_version');
  const snapshot = {
    type: 'snapshot', room: r.str(), tick: r.u32(), t: r.f64(), state: r.str(), owner: r.str() || null,
    players: r.u8(), spectators: r.u8(), livre: { E: r.u8(), B: r.u8() },
    timeLeft: r.u16(), roundNum: r.u16(), scoreE: r.u16(), scoreB: r.u16(), ents: [],
  };
  const count = r.u8();
  if (count > MAX_ENTITIES) throw new RangeError('too_many_entities');
  for (let i = 0; i < count; i++) {
    const id = r.u32(), name = r.str(), flags = r.u8();
    const x = r.f32(), y = r.f32(), z = r.f32(), yaw = r.f32(), pitch = r.f32();
    const hp = r.u16(), weaponId = r.u8(), voiceId = r.u8(), k = r.u16(), d = r.u16();
    const respawnIn = r.f32(), killedBy = r.str();
    if (weaponId !== 255 && !WEAPON_IDS[weaponId]) throw new RangeError('weapon');
    snapshot.ents.push({
      id, name, team: flags & 1 ? 'B' : 'E', bot: flags & 2 ? 1 : 0,
      x, y, z, yaw, pitch, hp, alive: !!(flags & 4), weapon: weaponId === 255 ? null : WEAPON_IDS[weaponId],
      fire: flags & 8 ? 1 : 0, voice: voiceId === 1 ? 'radio' : voiceId === 2 ? 'voice' : 0,
      k, d, respawnIn, ...(killedBy ? { killedBy } : {}),
    });
  }
  r.finish();
  return snapshot;
}
