#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const option = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const baseline = JSON.parse(readFileSync(option('baseline') || 'artifacts/atacadao/browser/baseline/receipt.json'));
const candidate = JSON.parse(readFileSync(option('candidate') || 'artifacts/atacadao/browser/candidate/receipt.json'));
assert.equal(baseline.status, 'passed'); assert.equal(candidate.status, 'passed');
assert.equal(baseline.matrix.length, candidate.matrix.length);
for (const after of candidate.matrix) {
  const before = baseline.matrix.find((run) => run.id === after.id);
  assert.ok(before, `baseline ausente para ${after.id}`);
  const ratio = after.perf.p95 / before.perf.p95;
  assert.ok(ratio <= 1.10, `${after.id}: p95 subiu ${((ratio - 1) * 100).toFixed(1)}% (>10%)`);
  assert.equal(after.perf.over100ms, 0);
  console.log(`${after.id} p95 ${before.perf.p95.toFixed(1)}→${after.perf.p95.toFixed(1)} ms (${((ratio - 1) * 100).toFixed(1)}%) · calls ${before.perf.calls}→${after.perf.calls} · tris ${before.perf.triangles}→${after.perf.triangles}`);
}
console.log('ATACADAO WEBGL A/B ✓ p95 da candidata dentro de +10% e zero frame >100 ms');
