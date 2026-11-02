import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const SHA = '2ed3cf88c4cb8886cce8a2c1052cc912e1410940b078584fd9c06865d8a0cb56';
const ID = /^batente:(xneg|xpos|zneg|zpos):i([0-9]):(lateral-minus|lateral-plus|verga)$/;
const EXCLUDED = /^batente:zpos:i[678]:/;
const fail = () => { throw new Error('inventário lacrado dos batentes inválido'); };

export function withBatentes(legacy, profile) {
  if (!['original', 'r22', 'r23'].includes(profile) || legacy.profile !== profile) fail();
  const raw = readFileSync(new URL('./fixtures/campo-batentes-inventory.json', import.meta.url));
  if (createHash('sha256').update(raw).digest('hex') !== SHA) fail();
  const data = JSON.parse(raw);
  if (data.schemaVersion !== 1 || !Array.isArray(data.pieces) || data.pieces.length !== 114) fail();
  const ids = new Set();
  for (const piece of data.pieces) {
    const m = piece.id?.match(ID);
    if (!m || (m[1].startsWith('x') && +m[2] > 8) || ids.has(piece.id)
        || piece.role !== m[3] || piece.mat !== 'junta' || piece.cast !== true
        || !Array.isArray(piece.box) || piece.box.length !== 6
        || !piece.box.every(v => typeof v === 'number' && Number.isFinite(v))
        || ![0, 1, 2].every(i => piece.box[i] < piece.box[i + 3])) fail();
    ids.add(piece.id);
    Object.freeze(piece.box); Object.freeze(piece);
  }
  const extra = data.pieces.filter(p => profile === 'original' || !EXCLUDED.test(p.id));
  if (extra.length !== (profile === 'original' ? 114 : 105)
      || legacy.finish.length !== (profile === 'original' ? 202 : 224)) fail();
  const finish = Object.freeze([...legacy.finish, ...extra]);
  return Object.freeze({ ...legacy, finish,
    counts: Object.freeze({ ...legacy.counts, finish: finish.length }) });
}
