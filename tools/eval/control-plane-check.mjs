#!/usr/bin/env node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { DatabaseSync } from 'node:sqlite';

const RAIZ = resolve(new URL('../..', import.meta.url).pathname);
const NODE = process.execPath;
const CLI = join(RAIZ, 'tools/control-plane/cli.mjs');
const SERVER = join(RAIZ, 'tools/control-plane/server.mjs');
const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutante && mutante !== 'sem-aprovacao') {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const state = mkdtempSync(join(tmpdir(), 'csbr-control-plane-'));
const port = 19000 + Math.floor(Math.random() * 1000);
const env = {
  ...process.env,
  CSBR_CONTROL_STATE_DIR: state,
  CSBR_CONTROL_REPO_ROOT: RAIZ,
  CSBR_CONTROL_PORT: String(port),
  CSBR_CONTROL_MUTANTE: mutante,
};
const erros = [];
const run = (...args) => spawnSync(NODE, [CLI, ...args], { cwd: RAIZ, env, encoding: 'utf8', timeout: 10000 });
const runAsync = (...args) => new Promise((resolveRun) => {
  const child = spawn(NODE, [CLI, ...args], { cwd: RAIZ, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', (b) => { stdout += b; }); child.stderr.on('data', (b) => { stderr += b; });
  child.on('exit', (status) => resolveRun({ status, stdout, stderr }));
});
const requestWithHost = (host) => new Promise((resolveRequest, reject) => {
  const req = request({ hostname: '127.0.0.1', port, path: '/api/snapshot', headers: { Host: host } }, (res) => {
    res.resume(); res.on('end', () => resolveRequest(res.statusCode));
  });
  req.on('error', reject); req.end();
});

const init = run('init');
if (init.status !== 0) erros.push(`CP1 init saiu ${init.status}: ${(init.stderr || init.stdout).trim()}`);

let snap = null;
const s1 = run('snapshot');
try { snap = JSON.parse(s1.stdout); } catch (e) { erros.push(`CP2 snapshot não é JSON: ${e.message}`); }
if (snap) {
  if (!Array.isArray(snap.roadmap) || snap.roadmap.length < 4) erros.push('CP3 roadmap inicial não contém as lanes autoritativas.');
  if (!Array.isArray(snap.health) || !snap.health.some((h) => h.key === 'zenith')) erros.push('CP4 saúde não mede o Zenith.');
  if (!Array.isArray(snap.worktrees)) erros.push('CP5 inventário de worktrees ausente.');
}

const fixtureDb = new DatabaseSync(join(state, 'control-plane.sqlite'));
fixtureDb.prepare("UPDATE roadmap_items SET status='needs_approval' WHERE id='CP-001'").run();
fixtureDb.close();
const forbidden = run('transition', 'CP-001', 'done', '--note=tentativa automática');
if (!mutante && forbidden.status === 0) erros.push('CP8 agente atravessou o gate de aprovação humana.');
if (mutante === 'sem-aprovacao' && forbidden.status === 0) erros.push('CP8 mutante atravessou o gate; a régua mordeu como esperado.');
if (mutante === 'sem-aprovacao' && forbidden.status !== 0) erros.push('CP8 mutante não aplicou: o bypass de aprovação continuou bloqueado.');

if (!mutante) {
  const spoof = run('transition', 'CP-001', 'done', '--actor=human', '--note=ator falsificado');
  if (spoof.status === 0) erros.push('CP12 --actor=human falsificou aprovação humana.');
  const dependency = run('transition', 'RET-001', 'ready');
  if (dependency.status === 0) erros.push('CP13 dependência pendente não impediu blocked→ready.');
  const override = run('run-start', 'VM-001', '--worktree=/Users/ruben/csbrasil/client', '--branch=main', '--role=reviewer', '--provider=codex');
  if (override.status === 0) erros.push('CP14 run-start aceitou override de checkout/branch/role/provider.');

  const direct = new DatabaseSync(join(state, 'control-plane.sqlite'));
  const insertItem = direct.prepare(`INSERT INTO roadmap_items
    (id,title,objective,acceptance_criteria,priority,risk,status,role,provider,worktree_path,branch,dependencies_json,required_gates_json,requires_approval,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertWorktree = direct.prepare(`INSERT OR REPLACE INTO worktrees
    (path,branch,head_sha,dirty,ahead,behind,present,updated_at) VALUES(?,?,?,?,?,?,?,?)`);
  const at = new Date().toISOString();
  direct.prepare(`INSERT INTO health(key,label,status,detail,updated_at) VALUES('zenith','Zenith','ok','fixture',?),('git','Git','ok','fixture',?),('codex','Codex','ok','fixture',?)
    ON CONFLICT(key) DO UPDATE SET status='ok',detail='fixture',updated_at=excluded.updated_at`).run(at, at, at);
  const add = (id, path, options = {}) => {
    const branch = options.branch || `codex/${id.toLowerCase()}`;
    insertItem.run(id, `fixture ${id}`, 'fixture', 'fixture', 1, options.risk || 'low', options.status || 'ready',
      options.role || 'implementer', options.provider || 'codex', path, branch,
      JSON.stringify(options.dependencies || []), JSON.stringify(options.gates || []), options.approval ? 1 : 0, at);
    insertWorktree.run(path, branch, 'a'.repeat(40), options.dirty || 0, 0, 0, 1, at);
  };
  add('RACE-A', '/tmp/csbr-control-race');
  add('RACE-B', '/tmp/csbr-control-race');
  add('GATE-A', '/tmp/csbr-control-gate', { gates: ['eval:fixture'] });
  add('WORK-1', '/tmp/csbr-control-worker-1');
  add('WORK-2', '/tmp/csbr-control-worker-2');
  add('WORK-3', '/tmp/csbr-control-worker-3');
  add('REVIEW-1', '/tmp/csbr-control-review-1', { role: 'reviewer' });
  add('REVIEW-2', '/tmp/csbr-control-review-2', { role: 'reviewer' });
  add('DIRTY', '/tmp/csbr-control-dirty', { dirty: 2 });
  add('HIGH', '/tmp/csbr-control-high', { risk: 'high' });
  add('ROOT', RAIZ, { branch: 'codex/root-fixture' });
  add('MAIN', '/tmp/csbr-control-main', { branch: 'main' });
  add('DEP-A', '/tmp/csbr-control-dep-a', { status: 'backlog' });
  add('DEP-B', '/tmp/csbr-control-dep-b', { dependencies: ['DEP-A'] });
  add('BROKEN-PROVIDER', '/tmp/csbr-control-provider', { provider: 'broken' });
  direct.prepare("INSERT INTO health(key,label,status,detail,updated_at) VALUES('broken','Broken','error','fixture red',?)").run(at);
  direct.close();

  for (const [id, label] of [['DIRTY', 'worktree dirty'], ['HIGH', 'high-risk'], ['ROOT', 'checkout raiz'], ['MAIN', 'branch protegida'], ['DEP-B', 'dependência'], ['BROKEN-PROVIDER', 'provider vermelho']]) {
    const denied = run('run-start', id);
    if (denied.status === 0) erros.push(`CP15 run-start não bloqueou ${label}.`);
  }

  const raced = await Promise.all([runAsync('run-start', 'RACE-A'), runAsync('run-start', 'RACE-B')]);
  if (raced.filter((r) => r.status === 0).length !== 1) erros.push(`CP15 corrida de lease teve ${raced.filter((r) => r.status === 0).length} vencedores; esperado 1.`);
  const cleanup = new DatabaseSync(join(state, 'control-plane.sqlite'));
  cleanup.exec("DELETE FROM events WHERE run_id IN (SELECT id FROM agent_runs WHERE roadmap_item_id LIKE 'RACE-%'); DELETE FROM agent_runs WHERE roadmap_item_id LIKE 'RACE-%'; UPDATE roadmap_items SET status='ready' WHERE id LIKE 'RACE-%';");
  cleanup.close();

  const gateStart = run('run-start', 'GATE-A');
  let gateRun = '';
  try { gateRun = JSON.parse(gateStart.stdout).runId; } catch {}
  if (!gateRun) erros.push(`CP16 run para gate foi recusada: ${(gateStart.stderr || gateStart.stdout).trim()}`);
  if (gateRun) {
    if (run('check', gateRun, 'eval:fixture', 'passed').status === 0) erros.push('CP17 check passed aceitou ausência de SHA.');
    const sha = 'b'.repeat(40);
    if (run('check', gateRun, 'eval:fixture', 'passed', `--sha=${sha}`).status !== 0) erros.push('CP17 check válido foi recusado.');
    if (run('run-finish', gateRun, 'technically_green', `--head=${'c'.repeat(40)}`).status === 0) erros.push('CP18 green aceitou gate de outro SHA.');
    const gateDb = new DatabaseSync(join(state, 'control-plane.sqlite'));
    gateDb.prepare("UPDATE worktrees SET head_sha=? WHERE path='/tmp/csbr-control-gate'").run(sha);
    gateDb.close();
    if (run('run-finish', gateRun, 'technically_green', `--head=${sha}`).status !== 0) erros.push('CP18 green recusou gates completos no mesmo SHA.');
    if (run('run-finish', gateRun, 'done', `--head=${sha}`).status === 0) erros.push('CP18 run-finish aceitou done sem gate humano.');
  }

  const first = run('run-start', 'WORK-1');
  if (first.status !== 0) erros.push(`CP19 primeiro worker foi recusado: ${(first.stderr || first.stdout).trim()}`);
  const second = run('run-start', 'WORK-2');
  if (second.status !== 0) erros.push(`CP19 segundo worker foi recusado: ${(second.stderr || second.stdout).trim()}`);
  const third = run('run-start', 'WORK-3');
  if (third.status === 0) erros.push('CP18 um terceiro worker atravessou o teto de concorrência.');
  const reviewer = run('run-start', 'REVIEW-1');
  if (reviewer.status !== 0) erros.push(`CP20 primeiro reviewer foi recusado: ${(reviewer.stderr || reviewer.stdout).trim()}`);
  if (run('run-start', 'REVIEW-2').status === 0) erros.push('CP20 segundo reviewer atravessou o teto de concorrência.');
}

let child = null;
if (!erros.length && !mutante) {
  child = spawn(NODE, [SERVER], { cwd: RAIZ, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let respondeu = false;
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/snapshot`);
      if (r.ok) {
        const body = await r.json(); respondeu = true;
        if (!Array.isArray(body.roadmap)) erros.push('CP9 API não entregou roadmap.');
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!respondeu) erros.push('CP9 servidor local não respondeu dentro do prazo.');
  try {
    const badHost = await requestWithHost('evil.example');
    if (badHost !== 403) erros.push(`CP10 proteção contra Host externo respondeu ${badHost}, esperado 403.`);
    const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
    for (const termo of ['Roadmap', 'Aprovações', 'Worktrees', 'Saúde']) {
      if (!html.includes(termo)) erros.push(`CP11 dashboard não expõe a superfície "${termo}".`);
    }
  } catch (e) { erros.push(`CP9 servidor local não respondeu: ${e.message}`); }
}

if (child) { child.kill('SIGTERM'); await new Promise((r) => child.once('exit', r)); }
rmSync(state, { recursive: true, force: true });

if (erros.length) {
  console.error(`CONTROL PLANE${mutante ? ` [mutante=${mutante}]` : ''}: ${erros.length} falha(s)`);
  for (const e of erros) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('CONTROL PLANE: verde — estado persiste, API é loopback e aprovação humana não pode ser atravessada por agente.');
