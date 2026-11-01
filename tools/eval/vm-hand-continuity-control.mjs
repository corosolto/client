import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { HAND_DEBT, hashHandInputs, readHandWeaponIds } from './vm-hand-continuity-support.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const HAND_CASES = [
  { id: 'luva-por-arma', name: 'luva-por-arma', arma: 'm4' },
  { id: 'pbr-por-arma', name: 'pbr-por-arma', arma: 'm4' },
  { id: 'troca-rig-m4', name: 'troca-rig', arma: 'm4' },
  { id: 'troca-rig-knife', name: 'troca-rig', arma: 'knife' },
  { id: 'luva-crua-m4', name: 'luva-crua', arma: 'm4' },
  { id: 'divida-paga', name: 'divida-paga', arma: 'm4' },
];
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = a => [...a].sort();
const fail = (kind, message) => { const error = Error(message); error.kind = kind; throw error; };
const requireInfra = (ok, why) => { if (!ok) fail('INFRA', why); };
const requireSemantic = (ok, why) => { if (!ok) fail('RED', why); };
const keyOf = id => id.split(' ')[0];
const rowId = id => id.split(' — fora da dívida:')[0];
const routeKey = route => `${route.weapon}@${route.rota}`;
export function expectedHandMutation(nominal, spec) {
  const measured = nominal.rotas.filter(r => r.estado === 'MEDIDA' && r.weapon === spec.arma), targets = measured.map(routeKey);
  let red = [], paid = [], count = 0, routes = [];
  const synthetic = nominal.checks.filter(c => !/^(MÃO\d|RIG):/.test(c.id));
  if (spec.name === 'luva-por-arma') {
    const suffixes = ['faca e pistola usam identidade do time', 'dedos seguem direção aprovada', 'troca de time atualiza as duas armas já carregadas'];
    red = synthetic.filter(c => suffixes.some(s => c.id.endsWith(s))).map(c => c.id);
    count = synthetic.filter(c => c.id.endsWith(suffixes[0])).length; routes = [spec.name];
  } else if (spec.name === 'pbr-por-arma') {
    const suffixes = ['donor tardio não troca atlas nem acabamento por time', 'troca de time atualiza as duas armas já carregadas'];
    red = synthetic.filter(c => suffixes.some(s => c.id.endsWith(s))).map(c => c.id);
    count = synthetic.filter(c => c.id.endsWith(suffixes[0])).length; routes = [spec.name];
  } else if (spec.name === 'troca-rig') {
    red = nominal.checks.filter(c => targets.some(t => c.id.startsWith(`RIG:${t} `)
      || (spec.arma === 'knife' && c.id.startsWith(`MÃO1:${t} `)))).map(c => c.id);
    count = targets.length; routes = targets;
  } else if (spec.name === 'luva-crua') {
    red = nominal.checks.filter(c => /^MÃO[1-4]:/.test(c.id) && targets.some(t => c.id.startsWith(`${keyOf(c.id).split(':')[0]}:${t} `))).map(c => c.id);
    count = nominal.faccoes.length * measured.reduce((n, r) => n + r.handMaterialCount, 0); routes = targets;
  } else {
    paid = Object.keys(HAND_DEBT).map(key => `${key}: passou a verde — remova da DIVIDA`);
    count = 1; routes = ['pistol@pintura'];
  }
  requireInfra(Number.isSafeInteger(count) && count > 0 && (red.length > 0 || paid.length > 0), 'mutant target not measured');
  return { red: sorted(red), paid: sorted(paid), count, routes: sorted(routes) };
}
export function validateHandRun(processResult, { nonce, sources, spec = null, nominal = null, strict = false, weapons }) {
  requireInfra(!processResult.error && !processResult.signal && Number.isInteger(processResult.status), 'child process/timeout');
  let data; try { data = JSON.parse(processResult.stdout.trim()); } catch { fail('INFRA', 'child JSON missing/invalid'); }
  requireInfra(!['INFRA', 'CLI_ERROR'].includes(data.status) && ![2, 3].includes(processResult.status), `child ${data.status || processResult.status}: ${data.error || ''}`);
  requireInfra(data.schema === 'vm-hands/2' && data.nonce === nonce && equal(data.sources, sources)
    && data.mutante === (spec?.name || null) && data.arma === (spec?.arma || 'm4') && data.strict === strict, 'nonce/source/case mismatch');
  requireInfra(Array.isArray(data.checks) && data.checks.length > 0 && data.checks.every(c => typeof c.id === 'string' && typeof c.ok === 'boolean')
    && new Set(data.checks.map(c => c.id)).size === data.checks.length, 'check denominator/types');
  requireInfra(equal(data.weaponIds, weapons) && Array.isArray(data.faccoes) && data.faccoes.length > 0
    && Array.isArray(data.rotas) && equal(sorted(data.rotas.filter(r => r.rota === 'padrao').map(r => r.weapon)), sorted(weapons))
    && new Set(data.rotas.map(routeKey)).size === data.rotas.length, 'weapon/route coverage mismatch');
  requireInfra(data.rotas.every(r => ['MEDIDA', 'NAO_MEDIDA'].includes(r.estado)
    && (r.estado !== 'NAO_MEDIDA' || (!strict && r.url.startsWith('/private-assets/viewmodels/')))), 'unmeasured/IO route mismatch');
  requireInfra(['vermelhos', 'declarados', 'quitados'].every(k => Array.isArray(data[k])) && data.application
    && Number.isSafeInteger(data.application.count) && Array.isArray(data.application.routes) && typeof data.application.notApplied === 'boolean', 'signal/application types');
  const declared = data.checks.filter(c => !c.ok && Object.hasOwn(HAND_DEBT, keyOf(c.id)) && HAND_DEBT[keyOf(c.id)].rigHash === c.evidence?.rigHash);
  const red = data.checks.filter(c => !c.ok && !declared.includes(c));
  const paid = Object.keys(HAND_DEBT).flatMap(key => {
    const checks = data.checks.filter(c => keyOf(c.id) === key);
    return !checks.length ? [`${key}: não foi medida nesta corrida (rota sumiu?) — remova da DIVIDA`]
      : checks.every(c => c.ok) ? [`${key}: passou a verde — remova da DIVIDA`] : [];
  });
  requireInfra(equal(sorted(data.vermelhos.map(c => rowId(c.id))), sorted(red.map(c => c.id)))
    && equal(sorted(data.declarados.map(c => c.id)), sorted(declared.map(c => c.id))) && equal(sorted(data.quitados), sorted(paid)), 'semantic summary contradicts checks/debt');
  requireInfra(data.ok === (!red.length && !paid.length), 'ok contradicts signals');
  if (!spec) {
    requireSemantic(processResult.status === 0 && data.status === 'GREEN' && data.ok && !data.application.count && !data.application.notApplied
      && equal(sorted(declared.map(c => keyOf(c.id))), sorted(Object.keys(HAND_DEBT))), 'nominal is not valid/green with named debt');
  } else {
    requireInfra(nominal && equal(data.checks.map(c => c.id), nominal.checks.map(c => c.id)), 'mutant denominator changed');
    const inputs = packet => packet.rotas.map(({ weapon, rota, key, url, file, estado, assetSHA256 }) => ({ weapon, rota, key, url, file, estado, assetSHA256 }));
    requireInfra(equal(inputs(data), inputs(nominal)), 'mutant changed route input/availability');
    requireSemantic(!data.application.notApplied && data.application.count > 0, 'mutant not applied');
    const expected = expectedHandMutation(nominal, spec);
    requireInfra(data.application.count === expected.count && equal(sorted(data.application.routes), expected.routes), 'mutation application proof mismatch');
    requireSemantic(processResult.status === 1 && data.status === 'RED' && !data.ok, 'mutant survived or exit/verdict mismatch');
    requireSemantic(equal(sorted(red.map(c => c.id)), expected.red) && equal(sorted(paid), expected.paid), 'mutant exact failset mismatch');
  }
  return data;
}
export function runHandControl({ strict = false, invoke } = {}) {
  const report = { schema: 'vm-hands-control/1', node: process.version, sources: null, strict, runs: [], status: 'INFRA' };
  let weapons;
  const execute = spec => {
    const nonce = crypto.randomUUID();
    const argv = ['--import', './tools/eval/vm-hand-three-register.mjs', 'tools/eval/vm-hand-continuity-check.mjs', '--json', ...(strict ? ['--exigir-catalogo'] : []),
      ...(spec ? [`--mutante=${spec.name}`, `--arma=${spec.arma}`] : [])];
    const result = invoke ? invoke({ spec, nonce, argv }) : spawnSync(process.execPath, argv, { cwd: ROOT, encoding: 'utf8', timeout: 120000,
      maxBuffer: 8 * 1024 * 1024, env: { ...process.env, CSBR_VM_HANDS_NONCE: nonce } });
    const run = { case: spec?.id || 'nominal', exit: result.status, signal: result.signal, processError: result.error?.message };
    try { run.data = JSON.parse(result.stdout.trim()); } catch { run.stdout = result.stdout.slice(0, 2000); }
    report.runs.push(run);
    const data = validateHandRun(result, { nonce, sources: report.sources, spec, nominal: spec ? report.runs[0]?.data : null, strict, weapons });
    requireInfra(equal(hashHandInputs(ROOT), report.sources), 'sources changed during control');
    return data;
  };
  try {
    report.sources = hashHandInputs(ROOT); weapons = readHandWeaponIds(ROOT);
    execute(null);
    for (const spec of HAND_CASES) execute(spec);
    report.status = 'GREEN';
  } catch (error) { report.status = error.kind === 'RED' ? 'RED' : 'INFRA'; report.error = String(error.message || error); }
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let strict = false, output;
  for (const arg of process.argv.slice(2)) {
    if (arg === '--exigir-catalogo' && !strict) strict = true;
    else if (arg.startsWith('--json=') && !output && path.isAbsolute(arg.slice(7))) output = arg.slice(7);
    else { console.error('CLI inválida do controlador'); process.exit(2); }
  }
  const report = runHandControl({ strict });
  if (output) try { fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); } catch (error) { report.status = 'INFRA'; report.error = String(error); }
  console.log(JSON.stringify({ status: report.status, cases: report.runs.length, error: report.error }));
  process.exit(report.status === 'GREEN' ? 0 : report.status === 'RED' ? 1 : 3);
}
