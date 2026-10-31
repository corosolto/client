import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const url = new URL('../../public/js/netcodec.js', import.meta.url);
let source = readFileSync(url, 'utf8');
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
if (mutant) {
  const before = source;
  if (mutant === 'sem-time-j') source = source.replace("(ent.team === 'J' ? 16 : ent.team === 'B' ? 1 : 0)", "(ent.team === 'B' ? 1 : 0)");
  else if (mutant === 'limite-64') source = source.replaceAll('version >= 8 ? 80 : MAX_ENTITIES', 'MAX_ENTITIES');
  else if (mutant === 'j-legado') source = source.replace("version >= 8 && ent.team === 'J'", "ent.team === 'J'");
  else throw new Error('mutante desconhecido');
  assert.notEqual(source, before, 'mutação precisa aplicar');
  console.log('Mutação aplicada: '+mutant);
}
source = source.replace("'./data/weapons.js'", JSON.stringify(new URL('./data/weapons.js', url).href));
const { encodeSnapshot, decodeSnapshot } = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));


// A extensão v8 inclui J e 80 entidades; v7 publicado mantém mantle e E/B.
// O contrato experimental de Javaporcos não comprova adoção de v8 pelo seu owner.
const entity = (id, team = 'E') => ({
  id, team, name: 'NPC '+id, bot: 1, alive: true,
  x: 1, y: 0, z: 2, yaw: 0, pitch: 0, hp: 100, weapon: 'knife',
  k: 0, d: 0, respawnIn: 0, fire: 0,
});
const snapshot = ents => ({
  type: 'snapshot', room: 'contract', tick: 1, t: 1, state: 'live', owner: null,
  players: 1, spectators: 0, livre: { E: 4, B: 4 }, timeLeft: 360,
  roundNum: 1, scoreE: 0, scoreB: 0, roundKillsE: 0, roundKillsB: 0,
  objective: { kind: 'escort', checkpoint: 1, escortCount: 2 }, ents,
});
// SHA256 de frames E/B no codec Flávio 8248164 anterior ao reparo.
const golden = {"2": "682f175ca0bec1c64a9f462ebae209e0d3cfccd8208738936e79e12a8b8eb72f", "3": "c6ac16ea80971181b821d5c84f5346af54c795f3f6ad424b7f0bb599fd8d7e89", "4": "7ce8289c032515867a192d17ba4e3a314240e6db094e5b512ffaa4ea6bd3cbbf", "5": "dd331a3a04e9904fa648b247c7bb47df7072cef8320a31323fa17c1bae5cf0a6", "6": "c235aefe22539cec5d926c3510a9aaf6f5cb22f97fb5abcd3e6af6d06ca6f505"};
let failures = 0;
for (const [name, check] of [
  ['v8 preserva NPC do terceiro time', () => {
    const result = decodeSnapshot(encodeSnapshot(snapshot([entity(1, 'J')]), 8));
    assert.equal(result.ents[0].team, 'J');
    assert.deepEqual(result.objective, snapshot([]).objective);
  }],
  ['v8 comporta os 80 slots do contrato comum', () => {
    const result = decodeSnapshot(encodeSnapshot(snapshot(Array.from({length: 80}, (_, i) => entity(i+1))), 8));
    assert.equal(result.ents.length, 80);
  }],
  ['formatos anteriores continuam recusando terceiro time', () => {
    for (const version of [2,3,4,5,6,7]) assert.throws(() => encodeSnapshot(snapshot([entity(1, 'J')]), version), /team/);
  }],
  ['limites hostis continuam fechados por versão', () => {
    assert.throws(() => encodeSnapshot(snapshot(Array.from({length: 81}, (_, i) => entity(i+1))), 8), /too_many_entities/);
    for (const version of [2,3,4,5,6,7]) assert.throws(() => encodeSnapshot(snapshot(Array.from({length: 65}, (_, i) => entity(i+1))), version), /too_many_entities/);
  }],
  ['formatos anteriores mantêm os mesmos bytes E/B', () => {
    for (const version of [2,3,4,5,6]) {
      const hash = createHash('sha256').update(encodeSnapshot(snapshot([entity(1, 'E'), entity(2, 'B')]), version)).digest('hex');
      assert.equal(hash, golden[version], 'bytes legados v'+version);
    }
  }],
  ['formatos anteriores mantêm os dois times', () => {
    for (const version of [2,3,4,5,6,7]) {
      const result = decodeSnapshot(encodeSnapshot(snapshot([entity(1, 'E'), entity(2, 'B')]), version));
      assert.deepEqual(result.ents.map(e => e.team), ['E','B']);
    }
  }],
]) {
  try { check(); console.log('✓ '+name); } catch (e) { failures++; console.error('✗ '+name+': '+e.message); }
}
if (failures) process.exitCode = 1;
