/* Ciclo de vida REAL do Keyboard Lock do Game, em node puro (CPU). Pacote GLM161.
   CLI: [] prova normal · --mutantes driver (baseline 0 + 2 mutantes) · --selftest metadriver · --mutante=nome child.
   Mutante só via driver com loader confinado em memória; nada de edição em disco do Game. */
import { spawnSync } from 'node:child_process';
import { writeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AssertionError } from 'node:assert';
import assert from 'node:assert/strict';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHECK = path.join(HERE, 'ctrlw-lifecycle-check.mjs');
const LOADER = path.join(HERE, 'ctrlw-lifecycle-loader.mjs');
const MUTANTES = ['sem-posse', 'sem-resume'];
const CLAUSULA = { 'sem-posse': 'CW_OWNER', 'sem-resume': 'CW_RESUME' };
const TECLAS = ['KeyW', 'KeyT', 'KeyN', 'KeyB', 'KeyR', 'KeyI', 'Comma', 'Period', 'Digit1', 'Digit2', 'Digit3'];

/* handlers globais ANTES de qualquer import dinâmico: nada vira AssertionError por engano. */
const reporta = (err) => {
  writeSync(2, 'CTRLW_LIFECYCLE_ERROR:' + JSON.stringify({ tool: 'ctrlw-lifecycle-check', name: err?.name || String(err), mutante: process.env.CTRLW_LIFECYCLE_MUTANT || '', clause: String(err?.message ?? err) }) + '\n');
  process.exit(err instanceof AssertionError ? 1 : 2);
};
process.on('uncaughtException', reporta);
process.on('unhandledRejection', reporta);

const args = process.argv.slice(2);
const driver = args.length === 1 && args[0] === '--mutantes';
const metaOnly = args.length === 1 && args[0] === '--selftest';
const mutanteArg = args.length === 1 && args[0].startsWith('--mutante=') ? args[0].slice(10) : '';
if (args.length && !driver && !metaOnly && !MUTANTES.includes(mutanteArg)) {
  console.error('uso: ctrlw-lifecycle-check [--mutantes|--selftest|--mutante=nome]'); process.exit(2);
}
if (mutanteArg && (process.env.CTRLW_LIFECYCLE_MUTANT !== mutanteArg || !process.execArgv.includes(LOADER))) {
  console.error('setup: mutante exige driver com loader confinado'); process.exit(2);
}

function parseRun(r) {
  const stderr = r.stderr || '';
  const marks = stderr.split('\n').filter((l) => l.startsWith('CTRLW_LIFECYCLE_APPLIED:'));
  const errs = stderr.split('\n').filter((l) => l.startsWith('CTRLW_LIFECYCLE_ERROR:'));
  let record = null;
  try { if (errs.length === 1) record = JSON.parse(errs[0].slice('CTRLW_LIFECYCLE_ERROR:'.length)); } catch { /* rejeita */ }
  return { error: r.error, signal: r.signal, status: r.status, marks, errs, record,
    infra: /SyntaxError|ReferenceError|TypeError|setup:/.test(stderr) };
}
function verdict(r, nome = null) {
  if (r.error || r.signal || r.infra) return false;
  if (!nome) return r.status === 0 && r.marks.length === 0 && r.errs.length === 0;
  return r.status === 1 && r.marks.length === 1 && r.marks[0] === 'CTRLW_LIFECYCLE_APPLIED:' + nome
    && r.errs.length === 1 && r.record?.name === 'AssertionError'
    && r.record?.mutante === nome && r.record?.tool === 'ctrlw-lifecycle-check'
    && String(r.record?.clause || '').includes(CLAUSULA[nome]);
}
function metaProva() {
  const nome = MUTANTES[0];
  const record = { tool: 'ctrlw-lifecycle-check', name: 'AssertionError', mutante: nome, clause: CLAUSULA[nome] };
  const ok = { status: 1, signal: null, error: null,
    stderr: 'CTRLW_LIFECYCLE_APPLIED:' + nome + '\nCTRLW_LIFECYCLE_ERROR:' + JSON.stringify(record) + '\n' };
  assert.ok(verdict(parseRun(ok), nome), 'meta: recusou controle mutante válido');
  const falsos = [
    { ...ok, error: new Error('spawn') }, { ...ok, signal: 'SIGTERM' },
    ...[0, 2, null].map((status) => ({ ...ok, status })),
    { ...ok, stderr: ok.stderr.split('\n').slice(1).join('\n') },
    { ...ok, stderr: ok.stderr + 'CTRLW_LIFECYCLE_APPLIED:' + nome + '\n' },
    { ...ok, stderr: 'CTRLW_LIFECYCLE_APPLIED:' + nome + '\n' },
    { ...ok, stderr: ok.stderr + 'CTRLW_LIFECYCLE_ERROR:' + JSON.stringify(record) + '\n' },
    ...[{ name: 'Error' }, { mutante: 'outro' }, { tool: 'outra' }, { clause: 'CW_OUTRA' }].map((delta) => ({ ...ok,
      stderr: 'CTRLW_LIFECYCLE_APPLIED:' + nome + '\nCTRLW_LIFECYCLE_ERROR:' + JSON.stringify({ ...record, ...delta }) + '\n' })),
    { ...ok, stderr: ok.stderr + 'TypeError: preparação\n' },
  ];
  falsos.forEach((r, i) => assert.ok(!verdict(parseRun(r), nome), 'meta: falso positivo ' + i));
  const base = { status: 0, signal: null, error: null, stderr: '' };
  assert.ok(verdict(parseRun(base)), 'meta: recusou baseline válida');
  for (const r of [{ ...base, status: 1 }, { ...base, signal: 'SIGKILL' }, { ...base, error: new Error('spawn') },
    { ...base, stderr: ok.stderr }, { ...base, stderr: 'TypeError: preparação' }]) assert.ok(!verdict(parseRun(r)), 'meta: baseline falsa aceita');
}

// Somente APIs de saída são controladas; resume/pausa/descarte são do Game real.
function plantaTelaCheia({ auto = true, rejeita = false, semKeyboard = false, semFullscreenAPI = false } = {}) {
  const doc = globalThis.document, el = doc.documentElement;
  const descritores = [[doc, 'fullscreenElement'], [el, 'requestFullscreen'], [globalThis, 'navigator']]
    .map(([obj, key]) => [obj, key, Object.getOwnPropertyDescriptor(obj, key)]);
  const pedidos = [], locks = [], unlocks = [];
  let fullscreen = null;
  Object.defineProperty(doc, 'fullscreenElement', { configurable: true, get: () => fullscreen, set: (v) => { fullscreen = v; } });
  Object.defineProperty(el, 'requestFullscreen', { configurable: true, value: semFullscreenAPI ? undefined : () => {
    const d = {};
    d.promise = new Promise((res, rej) => { d.res = res; d.rej = rej; });
    pedidos.push(d);
    if (rejeita) d.rej(new Error('fullscreen negado'));
    else if (auto) { fullscreen = el; d.res(); }
    return d.promise;
  } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'node', keyboard: semKeyboard ? undefined : {
    lock: (teclas) => { locks.push(teclas); return Promise.resolve(); },
    unlock: () => { unlocks.push(1); },
  } } });
  return { doc, pedidos, locks, unlocks, restaura() {
    for (const [obj, key, descriptor] of descritores) {
      if (descriptor) Object.defineProperty(obj, key, descriptor); else delete obj[key];
    }
  } };
}
const drena = async () => { for (let i = 0; i < 3; i++) await new Promise((r) => setImmediate(r)); };
async function prova() {
  const H = await import('./harness.mjs');
  const textures = H.initTextures();
  let cenarios = 0;
  const fixture = async (opcoes, executar) => {
    const f = plantaTelaCheia(opcoes);
    let g;
    try {
      g = H.bootGame('praca_poderes', { textures, seed: 1611 });
      g.testMode = false; g.state = 'live'; g.paused = false;
      await executar(g, f);
      cenarios++;
    } finally {
      try {
        if (g) {
          if (!g._disposed) g.dispose();
          assert.equal(g._pauseArmT, null, 'CW_CLEANUP timer próprio da pausa não foi liberado');
        }
      } finally { f.restaura(); }
    }
  };
  const inicial = (g, f) => {
    f.doc.fullscreenElement = f.doc.documentElement;
    g._travaAtalhos();
    assert.equal(f.locks.length, 1, 'CW_INITIAL fullscreen inicial não armou');
    assert.deepEqual(f.locks[0], TECLAS, 'CW_INITIAL teclas fora do contrato');
    assert.ok(!f.locks[0].includes('Escape'), 'CW_INITIAL Escape foi travado');
    assert.equal(f.pedidos.length, 0, 'CW_INITIAL fullscreen existente não deve ser pedido de novo');
    f.doc.fullscreenElement = null;
    g.setPaused(true);
    assert.equal(g.paused, true, 'CW_PAUSE pausa não entrou');
    assert.equal(f.unlocks.length, 1, 'CW_PAUSE pausa não soltou atalhos');
    g.resume();
    assert.equal(g.paused, false, 'CW_RESUME resume não saiu da pausa');
    assert.equal(f.pedidos.length, 1, 'CW_RESUME consumidor resume não pediu fullscreen');
  };
  await fixture({}, async (g, f) => {
    inicial(g, f); await drena();
    assert.equal(f.locks.length, 2, 'CW_RESUME resolução válida não rearmou uma vez');
    assert.deepEqual(f.locks[1], TECLAS, 'CW_RESUME teclas de rearme divergentes');
  });
  for (const motivo of ['pause', 'dispose', 'estado', 'teste', 'sem-tela']) {
    await fixture({ auto: false }, async (g, f) => {
      inicial(g, f);
      if (motivo === 'pause') g.setPaused(true);
      if (motivo === 'dispose') g.dispose();
      if (motivo === 'estado') g.state = 'matchEnd';
      if (motivo === 'teste') g.testMode = true;
      if (motivo !== 'sem-tela') f.doc.fullscreenElement = f.doc.documentElement;
      f.pedidos[0].res(); await drena();
      assert.equal(f.locks.length, 1, 'CW_LATE callback tardio armou após ' + motivo);
    });
  }
  for (const antigoPrimeiro of [true, false]) {
    await fixture({ auto: false }, async (g, f) => {
      inicial(g, f);
      g.setPaused(true); g.resume();
      assert.equal(f.pedidos.length, 2, 'CW_OWNER nova sessão não ganhou pedido próprio');
      f.doc.fullscreenElement = f.doc.documentElement;
      if (antigoPrimeiro) {
        f.pedidos[0].res(); await drena();
        assert.equal(f.locks.length, 1, 'CW_OWNER callback antigo invadiu sessão com pedido novo pendente');
      }
      f.pedidos[1].res(); await drena();
      assert.equal(f.locks.length, 2, 'CW_OWNER pedido atual não armou exatamente uma vez');
      if (!antigoPrimeiro) {
        f.pedidos[0].res(); await drena();
        assert.equal(f.locks.length, 2, 'CW_OWNER callback antigo rearmou depois do atual');
      }
    });
  }
  for (const motivo of ['pause', 'dispose', 'estado', 'teste']) {
    await fixture({}, async (g, f) => {
      f.doc.fullscreenElement = f.doc.documentElement;
      if (motivo === 'pause') g.setPaused(true);
      if (motivo === 'dispose') g.dispose();
      if (motivo === 'estado') g.state = 'matchEnd';
      if (motivo === 'teste') g.testMode = true;
      g._travaAtalhos();
      assert.equal(f.locks.length + f.pedidos.length, 0, 'CW_GUARD fullscreen existente travou após ' + motivo);
    });
  }
  await fixture({}, async (g, f) => {
    g._tevemosTelaCheia = false; g._travaAtalhos();
    assert.equal(f.locks.length + f.pedidos.length, 0, 'CW_FIRST não deve pedir fullscreen do zero');
  });
  await fixture({ rejeita: true }, async (g, f) => {
    g._tevemosTelaCheia = true; g.resume(); await drena();
    assert.equal(f.pedidos.length, 1, 'CW_REJECT pedido ausente');
    assert.equal(f.locks.length, 0, 'CW_REJECT rejeição de fullscreen armou trava');
  });
  await fixture({ semKeyboard: true }, async (g, f) => {
    f.doc.fullscreenElement = f.doc.documentElement; g._travaAtalhos();
    assert.equal(f.pedidos.length, 0, 'CW_OPTIONAL keyboard ausente pediu fullscreen');
  });
  await fixture({ semFullscreenAPI: true }, async (g, f) => {
    g._tevemosTelaCheia = true; g.resume(); await drena();
    assert.equal(f.locks.length + f.pedidos.length, 0, 'CW_OPTIONAL API fullscreen ausente armou trava');
  });
  console.log('ctrlw-lifecycle: ' + cenarios + ' cenários do Game real, APIs de saída controladas');
}

function child(nome = '') {
  const env = { ...process.env }; delete env.CTRLW_LIFECYCLE_MUTANT;
  const argv = [CHECK];
  if (nome) { env.CTRLW_LIFECYCLE_MUTANT = nome; argv.unshift('--loader', LOADER); argv.push('--mutante=' + nome); }
  return parseRun(spawnSync(process.execPath, argv, { env, timeout: 120000, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' }));
}

metaProva();
if (metaOnly) {
  console.log('ctrlw-lifecycle metadriver: PASS');
} else if (driver) {
  const base = child();
  if (!verdict(base)) throw new Error('driver: baseline inválida ' + JSON.stringify(base).slice(0,2500));
  console.log('ctrlw-lifecycle baseline 0: PASS');
  for (const nome of MUTANTES) {
    const run = child(nome);
    if (!verdict(run, nome)) throw new Error('driver: mutante ' + nome + ' não provou cláusula própria: ' + JSON.stringify(run).slice(0,2500));
    console.log('ctrlw-lifecycle mutante ' + nome + ': MORDIDO (' + CLAUSULA[nome] + ')');
  }
} else {
  await prova();
  console.log('ctrlw-lifecycle: arm/pausa/resume/posse/rejeição + metadriver PASS');
}
