import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectBindBytes} from '../bind-inspector.mjs';
import {prepareLoadedGarment} from './core.mjs';
import {TRUSTED_RECORD_JSON} from './example-record.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export async function prepareGarment({THREE, parseGLB, baseBytes, garmentBytes, ...unsupported}) {
  assert.equal(Object.keys(unsupported).length, 0, 'caller supplied trust/contract options unsupported');
  assert.ok(baseBytes instanceof Uint8Array && garmentBytes instanceof Uint8Array, 'Uint8Array assets required');
  baseBytes = Buffer.from(baseBytes); garmentBytes = Buffer.from(garmentBytes);
  const r = JSON.parse(TRUSTED_RECORD_JSON);
  for (const [bytes, record] of [[baseBytes, r.base], [garmentBytes, r.garment]]) {
    assert.equal(bytes.length, record.bytes); assert.equal(sha(bytes), record.sha256, 'asset bytes mismatch');
    inspectBindBytes(bytes, record.sha256, Object.fromEntries(['bindFingerprintSha256', 'geometryFingerprintSha256', 'weightsFingerprintSha256'].map(k => [k, record.inspection[k]])));
  }
  const base = await parseGLB(baseBytes), source = await parseGLB(garmentBytes);
  return prepareLoadedGarment({THREE, base, source, family: r.family, contract: r.contract});
}
