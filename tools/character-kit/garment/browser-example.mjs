import assert from './portable-assert.mjs';
import {prepareLoadedGarment} from './core.mjs';
import {TRUSTED_RECORD_JSON} from './example-record.mjs';
async function sha(bytes) {
  assert.ok(globalThis.crypto?.subtle, 'WebCrypto unavailable; preparation refused');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
}
export async function prepareGarment({THREE, parseGLB, baseBytes, garmentBytes, ...unsupported}) {
  assert.equal(Object.keys(unsupported).length, 0, 'caller supplied trust/contract options unsupported');
  assert.ok(baseBytes instanceof Uint8Array && garmentBytes instanceof Uint8Array, 'Uint8Array assets required');
  baseBytes = new Uint8Array(baseBytes); garmentBytes = new Uint8Array(garmentBytes);
  const record = JSON.parse(TRUSTED_RECORD_JSON), {family, contract} = record;
  assert.equal(record.version, 'trusted-garment-inspection/1');
  assert.equal(baseBytes.byteLength, record.base.bytes, 'base byte length mismatch');
  assert.equal(garmentBytes.byteLength, record.garment.bytes, 'garment byte length mismatch');
  assert.equal(await sha(baseBytes), record.base.sha256, 'base bytes mismatch');
  assert.equal(await sha(garmentBytes), record.garment.sha256, 'garment bytes mismatch');
  const base = await parseGLB(baseBytes), source = await parseGLB(garmentBytes);
  return prepareLoadedGarment({THREE, base, source, family, contract});
}
