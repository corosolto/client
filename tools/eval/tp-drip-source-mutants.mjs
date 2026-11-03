#!/usr/bin/env node
// R740: sete negativos e reindexação positiva; o pai só aprova a matriz inteira.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseMeshPartsJSON } from '../character-kit/mesh-parts.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CHECKER = path.join(ROOT, 'tools/eval/tp-drip-source-check.mjs');
const LOADER = new URL('./fixtures/tp-drip-source-loader.mjs', import.meta.url).href;
const REPOSITORY = 'tools/character-kit/gloves/repository.mjs';
const IDS = Object.freeze(['F0', 'F1', 'F2', 'F3', 'F4', 'F5']);
const MAX_CAPTURE = 128 * 1024;
const PREFIX = 'CSBR_TP_DRIP_';
const sha = value => createHash('sha256').update(value).digest('hex');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const must = (ok, message) => { if (!ok) throw Error(message); };
const readJSON = file => parseMeshPartsJSON(fs.readFileSync(file, 'utf8'));
const decode = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);

export const CASES = Object.freeze([
  ['nominal-before', [], false], ['ring-id', ['F2'], true], ['cuff-id', ['F2'], true],
  ['omit57', ['F2'], true], ['swap-lr', ['F2'], true], ['curl-name', ['F3'], true],
  ['ibm', ['F3'], true], ['weight', ['F2'], true], ['reindex-control', [], true],
  ['nominal-canary', [], false],
].map(([name, red, injected]) => Object.freeze({ name, red: Object.freeze(red), injected })));

function evaluate(result, expected) {
  try {
    must(!result.error && !result.signal && result.status !== null, 'filho sem resultado completo');
    must(Buffer.isBuffer(result.stdout) && Buffer.isBuffer(result.stderr), 'captura de filho ausente');
    must(result.stdout.length <= MAX_CAPTURE && result.stderr.length === 0, 'stderr ou saída excedida');
    const payload = parseMeshPartsJSON(decode(result.stdout).trim());
    must(object(payload) && same(Object.keys(payload).sort(), ['rows', 'schema', 'scope']), 'schema de resultado inválido/INFRA');
    must(payload.schema === 'tp-drip-source-result/1' && typeof payload.scope === 'string', 'resultado não pertence ao checker');
    must(Array.isArray(payload.rows) && payload.rows.length === 6, 'censo incompleto');
    payload.rows.forEach((row, index) => {
      must(object(row) && row.id === IDS[index], 'IDs duplicados, ausentes ou fora de ordem');
      must(['PASS', 'RED'].includes(row.status) && typeof row.description === 'string', 'status/descrição inválidos');
      const fields = row.status === 'PASS' ? ['description', 'evidence', 'id', 'status'] : ['description', 'error', 'id', 'status'];
      must(same(Object.keys(row).sort(), fields), 'campos da cláusula incongruentes');
      must(row.status === 'PASS' ? object(row.evidence) : typeof row.error === 'string' && row.error.length > 0, 'evidência/erro ausente');
    });
    const red = payload.rows.filter(row => row.status === 'RED').map(row => row.id);
    must(result.status === (red.length ? 1 : 0), 'exit contradiz as cláusulas medidas');
    if (expected.red.length && red.length === 0) return { ok: false, classification: 'SURVIVOR', reason: 'mutante não acendeu cláusula', payload, red };
    must(result.status === (expected.red.length ? 1 : 0) && same(red, expected.red), 'exit/failset diferente do esperado');
    return { ok: true, classification: red.length ? 'EXPECTED_RED' : 'PASS_CONTROL', payload, red };
  } catch (error) {
    return { ok: false, classification: 'INVALID/INFRA', reason: error.message };
  }
}

function application(directory, spec, nonce, expected) {
  const loader = readJSON(path.join(directory, spec.name + '.loader.json'));
  const lines = fs.readFileSync(path.join(directory, spec.name + '.injection.jsonl'), 'utf8').trim().split('\n');
  const receipts = lines.map(line => parseMeshPartsJSON(line));
  must(loader.nonce === nonce && loader.mode === spec.name && loader.repositoryUrl === pathToFileURL(path.join(ROOT, REPOSITORY)).href, 'identidade do loader divergente');
  must(loader.originalSHA256 === expected.repositorySHA256 && /^[a-f0-9]{64}$/.test(loader.transformedSHA256)
    && loader.transformedSHA256 !== loader.originalSHA256 && loader.noWTWrite === true, 'pin do loader divergente');
  must(same(loader.anchorCounts, { cosmeticCall: 1, return: 1 }), 'anchors não aplicados uma vez');
  must(receipts.length === 3 && same(receipts.map(row => row.stage), ['default', 'selection', 'return']), 'censo de aplicação incompleto');
  must(receipts.every(row => row.nonce === nonce && row.mode === spec.name), 'recibo de outra execução');
  const [plain, selection, returned] = receipts;
  must(plain.changed === false && plain.artifacts === 58 && plain.signature === expected.defaultSignature, 'default alterado');
  const selectionCase = ['ring-id', 'cuff-id', 'omit57', 'swap-lr'].includes(spec.name);
  must(selection.changed === selectionCase && returned.mutatedContainer === !selectionCase, 'mutação/controle não aplicou na fronteira prevista');
  if (selectionCase) must(selection.originalHash !== selection.usedHash && selection.declaredRecordUnchanged === true, 'seleção usada não mudou');
  else must(returned.beforeSHA256 !== returned.afterSHA256 && object(returned.detail), 'container não mudou');
  must(returned.afterRealProducerInspector === true && returned.actualInspectorValidatedContainer === true
    && returned.manifestSerialized === true, 'container/manifest sem validação');
  must(/^[a-f0-9]{64}$/.test(returned.afterSHA256), 'digest de saída ausente');
  return { loader, receipts };
}

// Exportada para os controles focais do agregador; o CLI não aceita seleção parcial.
export function runChildCase(spec, { directory, expected = {}, childArgs = null, timeout = 90_000 } = {}) {
  must(/^[a-z][a-z0-9-]*$/.test(spec.name) && Array.isArray(spec.red) && spec.red.every(id => IDS.includes(id)), 'caso inválido');
  must(typeof spec.injected === 'boolean' && (!childArgs || spec.injected === false), 'override não serve de mutante real');
  const nonce = randomUUID(), env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith(PREFIX)) delete env[key];
  const args = childArgs ?? [...(spec.injected ? ['--import', LOADER] : []), CHECKER];
  if (spec.injected) Object.assign(env, {
    CSBR_TP_DRIP_CASE: spec.name, CSBR_TP_DRIP_NONCE: nonce,
    CSBR_TP_DRIP_RECEIPT: path.join(directory, spec.name + '.injection.jsonl'),
    CSBR_TP_DRIP_LOADER_RECEIPT: path.join(directory, spec.name + '.loader.json'),
    CSBR_TP_DRIP_REPOSITORY_SHA256: expected.repositorySHA256,
  });
  const started = performance.now();
  const result = spawnSync(process.execPath, args, { cwd: ROOT, env, timeout, maxBuffer: MAX_CAPTURE });
  for (const stream of ['stdout', 'stderr']) fs.writeFileSync(path.join(directory, spec.name + '.' + stream + '.log'), (result[stream] ?? Buffer.alloc(0)).subarray(0, MAX_CAPTURE));
  const verdict = evaluate(result, spec);
  let applied = null;
  if (spec.injected) {
    try { applied = application(directory, spec, nonce, expected); }
    catch (error) { verdict.ok = false; verdict.classification = 'INVALID/INFRA'; verdict.reason = error.message; }
  }
  const row = {
    name: spec.name, ok: verdict.ok === true, classification: verdict.classification, reason: verdict.reason ?? null,
    expectedRED: spec.red, exit: result.status, signal: result.signal, executionError: result.error?.code ?? null,
    seconds: (performance.now() - started) / 1000, red: verdict.red ?? null, result: verdict.payload ?? null,
    nonce, injected: spec.injected, args, application: applied,
  };
  fs.writeFileSync(path.join(directory, spec.name + '.result.json'), JSON.stringify(row, null, 2) + '\n');
  return row;
}

export function aggregateResults(rows, expectedCount = CASES.length) {
  const ok = rows.length === expectedCount && rows.every(row => row.ok === true);
  return { ok, exitCode: ok ? 0 : 1, expectedCases: expectedCount, measuredCases: rows.length, failed: rows.filter(row => row.ok !== true).map(row => row.name) };
}

function pin(relative) {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  return { path: relative, bytes: bytes.length, sha256: sha(bytes) };
}
function unchanged(pins) {
  return pins.every(before => { const after = pin(before.path); return before.bytes === after.bytes && before.sha256 === after.sha256; });
}
function inputs(fixture) {
  must(fixture.schema === 'tp-drip-source-oracle/1' && /^public\/models\/skins\/[^/]+\.glb$/.test(fixture.source?.path ?? ''), 'oracle/source path inválido');
  must(Array.isArray(fixture.baseline?.artifacts) && fixture.baseline.artifacts.every(row => Array.isArray(row)
    && (row[0] === 'public/data/gloves-manifest.json' || /^public\/models\/gloves\/(1p|3p)\/[^/]+\.glb$/.test(row[0]))), 'baseline artifact path inválido');
  const files = [
    REPOSITORY, 'tools/character-kit/gloves/core.mjs', 'tools/character-kit/gloves/cosmetics.mjs',
    'tools/character-kit/gloves/cosmetic-selections.json', 'tools/character-kit/gloves/selections.json',
    'tools/character-kit/mesh-parts.mjs', 'tools/character-kit/kit.mjs', 'tools/character-kit/bind-inspector.mjs',
    'tools/eval/tp-drip-source-check.mjs', 'tools/eval/fixtures/tp-drip-source.json',
    'tools/eval/tp-drip-source-mutants.mjs', 'tools/eval/fixtures/tp-drip-source-loader.mjs',
    'tools/eval/fixtures/tp-drip-source-mutations.mjs', fixture.source.path, 'public/models/skins/manifest.json',
    ...fixture.baseline.artifacts.map(row => row[0]),
  ];
  return [...new Set(files)].map(relative => {
    must(!path.isAbsolute(relative) && !relative.split('/').some(part => !part || part === '.' || part === '..'), 'input path inválido');
    return pin(relative);
  });
}

async function main() {
  if (process.argv.length !== 2) { console.error('uso: node tools/eval/tp-drip-source-mutants.mjs'); return 2; }
  must(Number(process.versions.node.split('.')[0]) >= 22, 'Node22+ necessário');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-tp-drip-'));
  const fixture = readJSON(path.join(ROOT, 'tools/eval/fixtures/tp-drip-source.json'));
  const pins = inputs(fixture), expected = {
    repositorySHA256: pins.find(row => row.path === REPOSITORY).sha256,
    defaultSignature: sha(JSON.stringify(fixture.baseline.artifacts)),
  };
  fs.writeFileSync(path.join(directory, 'inputs.json'), JSON.stringify({ root: ROOT, node: process.version, executable: process.execPath, pins, cases: CASES }, null, 2) + '\n');
  const rows = [];
  for (const spec of CASES) {
    must(unchanged(pins), 'input/source pin mudou antes do filho');
    const row = runChildCase(spec, { directory, expected });
    if (!unchanged(pins)) { row.ok = false; row.classification = 'INVALID/INFRA'; row.reason = 'input/source pin mudou após o filho'; }
    rows.push(row);
    if (!row.ok) break;
  }
  const summary = { schema: 'tp-drip-source-mutants-result/1', ...aggregateResults(rows), directory, sourcePinsUnchanged: unchanged(pins), rows: rows.map(row => ({ name: row.name, ok: row.ok, exit: row.exit, red: row.red, classification: row.classification, reason: row.reason })) };
  if (summary.sourcePinsUnchanged !== true) { summary.ok = false; summary.exitCode = 1; }
  fs.writeFileSync(path.join(directory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
  return summary.exitCode;
}

const invoked = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (invoked) {
  try { process.exitCode = await main(); }
  catch (error) { console.error(JSON.stringify({ schema: 'tp-drip-source-mutants-result/1', ok: false, status: 'INFRA', error: error.message })); process.exitCode = 3; }
}
