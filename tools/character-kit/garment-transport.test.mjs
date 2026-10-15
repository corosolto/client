import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareGarment as nodePrepare} from './garment/node.mjs';
import {prepareGarment as browserPrepare} from './garment/browser-example.mjs';
import {exampleBytes, dependencies} from './garment/synthetic-profile.mjs';
import {buildRecord} from './garment/build-example-record.mjs';
import {TRUSTED_RECORD_JSON} from './garment/example-record.mjs';
const {THREE, parseGLB, clone} = await dependencies();
const r = JSON.parse(TRUSTED_RECORD_JSON);
test('record regenerates exactly and recipe pins current checked-in sources', async () => {
  assert.equal(JSON.stringify(await buildRecord()), TRUSTED_RECORD_JSON);
  for (const [name, expected] of Object.entries(r.recipe)) {
    const bytes = readFileSync(new URL('../../' + name, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, name);
  }
});
test('core and assertions preserve validated142 bytes', () => {
  for (const [name, expected] of Object.entries({'core.mjs': '7fe7f22a11cfec0227ee9cabf4da83dbc98deb7263e76ca1260bba121940b690', 'portable-assert.mjs': '5c0d507abacace3b9c794421234a63d7264df711be8134f0bae60fbe8c4d506a'}))
    assert.equal(createHash('sha256').update(readFileSync(new URL('./garment/' + name, import.meta.url))).digest('hex'), expected);
});
for (const [name, prepare] of [['node', nodePrepare], ['webcrypto', browserPrepare]]) {
  for (const asset of ['baseBytes', 'garmentBytes']) for (const mutation of ['digest', 'length']) test(`${name} rejects ${asset} ${mutation} before parse`, async () => {
    let parses = 0; const args = {THREE, baseBytes: exampleBytes(), garmentBytes: exampleBytes(true), parseGLB: async () => {parses++; throw Error('must not parse');}};
    args[asset] = Uint8Array.from(args[asset]);
    if (mutation === 'digest') args[asset][args[asset].length - 1] ^= 1; else args[asset] = args[asset].subarray(1);
    await assert.rejects(prepare(args)); assert.equal(parses, 0);
  });
  for (const key of ['contract', 'family', 'record', 'inspectBindBytes']) test(`${name} refuses caller trust ${key}`, async () => {
    let parses = 0; await assert.rejects(prepare({THREE, baseBytes: exampleBytes(), garmentBytes: exampleBytes(true), parseGLB: () => {parses++;}, [key]: {}}), /unsupported/); assert.equal(parses, 0);
  });
  test(name + ' positive parser/clone/attach and dispose', async () => {
    let parses = 0; const kit = await prepare({THREE, baseBytes: exampleBytes(), garmentBytes: exampleBytes(true), parseGLB: async bytes => {parses++; return parseGLB(bytes);}});
    assert.equal(parses, 2); const gltf = await parseGLB(exampleBytes()), model = clone(gltf.scene), group = new THREE.Group(); group.add(model);
    const handle = kit.attach({model, group, mixer: new THREE.AnimationMixer(model)}); assert.equal(handle.mesh.parent, model); handle.dispose();
  });
}
test('WebCrypto unavailable refuses before parse', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto'); let parses = 0;
  try {
    Object.defineProperty(globalThis, 'crypto', {configurable: true, value: undefined});
    await assert.rejects(browserPrepare({THREE, baseBytes: exampleBytes(), garmentBytes: exampleBytes(true), parseGLB: () => {parses++;}}), /WebCrypto unavailable/);
    assert.equal(parses, 0);
  } finally {Object.defineProperty(globalThis, 'crypto', descriptor);}
});
