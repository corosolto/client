// Native correction by Codex after review of GLM501. An arbitrary nonzero exit is not a kill.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const menuNames = [
  'ready props release the menu while decorative fauna is still pending',
  'props pending means no fauna requested; ordering is props before fauna',
  'a failed optional fauna load does not discard ready scenery or reject entry',
  'old props and fauna cannot rebuild a newly selected map',
  'old callbacks from A cannot redraw after switching A to B and back to A',
  'callbacks cannot redraw when map changes without starting a new preload',
  'pending old props cannot redraw after A to B to A',
];

// Observed in the actual seven-case menu suite. Every cofailure must have its own identity/cause.
const oldProps = 'map equality alone must not accept old A props';
const changedMap = 'old props must not redraw after selection changes';
const oldFauna = 'map equality alone must not accept old A fauna';
export const causes = {
  'fauna-gates': { 1: 'optional fauna must not hold the splash until the failsafe', 2: 'Expected values to be strictly equal:' },
  'stale-map': { 4: 'old props must not redraw the selected map', 5: oldProps, 6: changedMap, 7: oldProps },
  'ignore-seq': { 5: oldProps, 7: oldProps },
  'ignore-map': { 6: changedMap },
  'no-late-fauna': { 1: 'late fauna must still appear', 2: 'late fauna still refines the same arena' },
  'fauna-first': { 2: 'fauna must not be requested while props are still pending', 5: oldFauna, 7: oldFauna },
};

function requireThat(ok, reason) { if (!ok) throw Error(reason); }

// Deliberately strict native TAP subset: no nested suites, skips, partial plans or unknown diagnostics.
export function parseTap(stdout, expectedNames = null) {
  requireThat(typeof stdout === 'string' && stdout.endsWith('\n'), 'TAP incomplete or missing terminal newline');
  const lines = stdout.replaceAll('\r\n', '\n').split('\n'); lines.pop();
  requireThat(lines[0] === 'TAP version 13', 'TAP header absent');
  const tests = [], markers = [], knownWarnings = [];
  let i = 1;
  // The observed Node26 worker pair is optional only directly after the TAP header.
  const localStorageWarning = /^# \(node:([1-9]\d*)\) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided\.$/.exec(lines[i] || '');
  if (localStorageWarning) {
    const pid = Number(localStorageWarning[1]);
    requireThat(Number.isSafeInteger(pid), 'Invalid native localStorage warning PID');
    requireThat(lines[i + 1] === '# (Use `node --trace-warnings ...` to show where the warning was created)', 'Incomplete native localStorage warning pair');
    knownWarnings.push({ kind: 'node-localstorage-file-unavailable', pid, lines: lines.slice(i, i + 2) });
    i += 2;
  }
  while (i < lines.length && !lines[i].startsWith('1..')) {
    if (lines[i].startsWith('# MENU_MUTANT_APPLIED ')) { markers.push(lines[i++]); continue; }
    requireThat(lines[i].startsWith('# Subtest: '), `Unknown TAP record: ${lines[i]}`);
    const name = lines[i++].slice('# Subtest: '.length), number = tests.length + 1;
    const result = lines[i++];
    const passed = result === `ok ${number} - ${name}`;
    requireThat(passed || result === `not ok ${number} - ${name}`, 'TAP result identity/order mismatch');
    requireThat(lines[i++] === '  ---', 'Native TAP diagnostic missing');
    const diagnostic = [];
    while (i < lines.length && lines[i] !== '  ...') {
      requireThat(lines[i].startsWith('  '), 'Malformed or interleaved diagnostic');
      diagnostic.push(lines[i++]);
    }
    requireThat(lines[i++] === '  ...', 'Unclosed native diagnostic');
    const body = diagnostic.join('\n');
    requireThat(diagnostic.filter(l => /^  duration_ms: [\d.e+-]+$/.test(l)).length === 1, 'Duration absent/duplicated');
    requireThat(diagnostic.filter(l => l === "  type: 'test'").length === 1, 'Non-test or duplicated native type');
    if (passed) requireThat(diagnostic.length === 2, 'Unexpected diagnostic on passing case');
    tests.push({ number, name, passed, body });
  }
  const plan = /^1\.\.(\d+)$/.exec(lines[i++] || '');
  requireThat(plan && Number(plan[1]) === tests.length && tests.length > 0, 'Plan/count incomplete');
  const counts = {};
  for (const key of ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const line = new RegExp(`^# ${key} (\\d+)$`).exec(lines[i++] || '');
    requireThat(line, `Footer missing/duplicated/out of order: ${key}`); counts[key] = Number(line[1]);
  }
  requireThat(/^# duration_ms [\d.e+-]+$/.test(lines[i++] || '') && i === lines.length, 'Unknown/trailing/incomplete footer');
  requireThat(counts.tests === tests.length && counts.suites === 0 && counts.pass === tests.filter(t => t.passed).length && counts.fail === tests.filter(t => !t.passed).length, 'Inconsistent counters');
  requireThat(counts.cancelled === 0 && counts.skipped === 0 && counts.todo === 0, 'Cancelled/skipped/todo cases are not evidence');
  requireThat(new Set(tests.map(t => t.name)).size === tests.length, 'Duplicate test identity');
  if (expectedNames) assert.deepEqual(tests.map(t => t.name), expectedNames, 'Protected cases missing or changed');
  return { tests, markers, counts, knownWarnings };
}

export function classify(result, mutant = null, expectedNames = null) {
  requireThat(result && !result.error && !result.signal && !result.killed && result.status === (mutant ? 1 : 0), 'Spawn/timeout/signal/exit is not a semantic result');
  requireThat(typeof result.stderr === 'string' && result.stderr.trim() === '', 'Unexpected stderr invalidates the arm');
  const parsed = parseTap(result.stdout, mutant ? menuNames : expectedNames);
  if (!mutant) {
    requireThat(parsed.counts.fail === 0 && parsed.markers.length === 0, 'Nominal suite is not fully green');
    return parsed;
  }
  const expected = causes[mutant]; requireThat(expected, 'Unknown mutant');
  assert.deepEqual(parsed.markers, [`# MENU_MUTANT_APPLIED ${mutant}`], 'Missing/duplicate/wrong application marker');
  const failed = parsed.tests.filter(t => !t.passed);
  assert.deepEqual(failed.map(t => t.number), Object.keys(expected).map(Number), 'Wrong or incomplete semantic failset');
  for (const item of failed) {
    const field = (literal) => item.body.split('\n').filter(l => l === literal).length === 1;
    for (const key of ['failureType', 'code', 'name', 'error', 'location']) {
      requireThat(item.body.split('\n').filter(l => l.startsWith(`  ${key}:`)).length === 1, `Duplicated/missing native field: ${key}`);
    }
    requireThat(field("  failureType: 'testCodeFailure'") && field("  code: 'ERR_ASSERTION'") && field("  name: 'AssertionError'"), 'Non-native assertion or infrastructure cofailure');
    const message = /^  error: \|[-+]?\n    ([^\n]+)/m.exec(item.body)?.[1];
    requireThat(message === expected[item.number], 'Assertion belongs to a different cause');
    requireThat(/^  location: '.*\/tests\/menu-backdrop\.test\.mjs:\d+:\d+'$/m.test(item.body), 'Assertion came from an alien source');
    requireThat(!/TypeError|ReferenceError|SyntaxError|ERR_MODULE|MODULE_NOT_FOUND|testTimeoutFailure|cancelledByParent/.test(item.body), 'Infrastructure failure in semantic block');
    if (mutant === 'fauna-gates' && item.number === 2) {
      requireThat(field('  expected: true') && field('  actual: false') && field("  operator: 'strictEqual'"), 'Unexpected secondary ready assertion');
    }
  }
  return parsed;
}

// Reserve one newline so each displayed stream body is at most 64KiB, even if truncated.
function capturedOutput(value) {
  const captured = Buffer.from(typeof value === 'string' ? value : '', 'utf8');
  let end = Math.min(captured.length, 64 * 1024 - 1);
  // Never cut an observed UTF-8 character in half.
  while (end > 0 && end < captured.length && (captured[end] & 0xc0) === 0x80) end--;
  return {
    type: value === null ? 'null' : typeof value,
    bytes: captured.length,
    shownBytes: end,
    truncated: end < captured.length,
    sha256: createHash('sha256').update(captured).digest('hex'),
    text: captured.subarray(0, end).toString('utf8'),
  };
}

export function failureDiagnostic(result, file, mutant, error) {
  return {
    schema: 1, kind: 'rejected-run-diagnostic-only', file, mutant,
    pid: result?.pid ?? null, status: result?.status ?? null,
    signal: result?.signal ?? null, killed: Boolean(result?.killed),
    spawnError: result?.error ? {
      name: String(result.error.name || 'Error'), code: result.error.code ?? null,
      message: String(result.error.message || result.error).slice(0, 2000),
    } : null,
    rejection: { name: String(error?.name || 'Error'), message: String(error?.message || error).slice(0, 2000) },
    stdout: capturedOutput(result?.stdout), stderr: capturedOutput(result?.stderr),
  };
}

function printFailureDiagnostic(diagnostic) {
  const { stdout, stderr, ...identity } = diagnostic;
  const metadata = stream => {
    const { text, ...rest } = stream;
    return rest;
  };
  console.error(`FAUNA_RUN_REJECTED:${JSON.stringify({ ...identity, stdout: metadata(stdout), stderr: metadata(stderr) })}`);
  for (const [name, stream] of [['stdout', stdout], ['stderr', stderr]]) {
    process.stderr.write(`--- rejected run ${name} (bounded diagnostic) ---\n`);
    process.stderr.write(stream.text);
    if (!stream.text.endsWith('\n')) process.stderr.write('\n');
    process.stderr.write(`--- end rejected run ${name} ---\n`);
  }
}

function run(file, mutant = null) {
  const env = { ...process.env }; delete env.MENU_BACKDROP_MUTANT;
  if (mutant) env.MENU_BACKDROP_MUTANT = mutant;
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', file], { env, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
  try {
    classify(result, mutant, file.endsWith('/menu-backdrop.test.mjs') ? menuNames : null);
  } catch (error) {
    printFailureDiagnostic(failureDiagnostic(result, file, mutant, error));
    throw error;
  }
  console.log(`${mutant ? `mutant ${mutant}` : `nominal ${file.split('/').at(-1)}`}: verified`);
}

export function main() {
  const files = ['map-fauna-curated', 'map-fauna-support', 'map-fauna-supported-maps', 'menu-backdrop'].map(name => fileURLToPath(new URL(`../../tests/${name}.test.mjs`, import.meta.url)));
  for (const file of files) run(file);
  for (const mutant of Object.keys(causes)) run(files.at(-1), mutant);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try { main(); }
  catch (error) { console.error(`Fauna gate refused: ${error.stack || error}`); process.exitCode = 1; }
}
