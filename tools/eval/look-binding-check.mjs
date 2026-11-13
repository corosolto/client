/* Confere o LOOK canônico no builder real da Penitenciária: céu/fog, sol e hemi.
   Mutante corrego troca somente a chave passada a applyLook, em memória.
   Driver exige baseline verde e asserção LOOK_BINDING; infra e setup são recusados. */
import assert, { AssertionError } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const CHECK = fileURLToPath(import.meta.url);
const LOADER = fileURLToPath(new URL('./look-binding-loader.mjs', import.meta.url));
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MUTANTES = ['corrego'];
const CLAUSULA = { corrego: 'LOOK_BINDING' };
const reporta = (err) => {
  writeSync(2, 'LOOK_BINDING_ERROR:' + JSON.stringify({ tool: 'look-binding-check', name: err?.name || String(err), mutante: process.env.SIM_LOOK_MUTANTE || '', clause: String(err?.message ?? err) }) + '\n');
  process.exit(err instanceof AssertionError ? 1 : 2);
};
process.on('uncaughtException', reporta);
process.on('unhandledRejection', reporta);
const args = process.argv.slice(2);
const driver = args.length === 1 && args[0] === '--mutantes';
const metaOnly = args.length === 1 && args[0] === '--selftest';
const mutanteArg = args.length === 1 && args[0] === '--mutante=corrego' ? 'corrego' : '';
if (args.length && !driver && !metaOnly && !mutanteArg) {
  console.error('uso: look-binding-check [--mutantes|--selftest|--mutante=corrego]'); process.exit(2);
}
if ((mutanteArg || process.env.SIM_LOOK_MUTANTE) && (!mutanteArg || process.env.SIM_LOOK_MUTANTE !== mutanteArg || !process.execArgv.includes(LOADER))) {
  console.error('setup: mutante exige driver com loader confinado'); process.exit(2);
}
function parseRun(r) {
  const stderr = r.stderr || '';
  const marks = stderr.split('\n').filter((l) => l.startsWith('LOOK_BINDING_APPLIED:'));
  const errs = stderr.split('\n').filter((l) => l.startsWith('LOOK_BINDING_ERROR:'));
  let record = null;
  try { if (errs.length === 1) record = JSON.parse(errs[0].slice('LOOK_BINDING_ERROR:'.length)); } catch { /* rejeita */ }
  return { error: r.error, signal: r.signal, status: r.status, marks, errs, record,
    infra: /SyntaxError|ReferenceError|TypeError|setup:/.test(stderr) };
}
function verdict(r, nome = null) {
  if (r.error || r.signal || r.infra) return false;
  if (!nome) return r.status === 0 && r.marks.length === 0 && r.errs.length === 0;
  return r.status === 1 && r.marks.length === 1 && r.marks[0] === 'LOOK_BINDING_APPLIED:' + nome
    && r.errs.length === 1 && r.record?.name === 'AssertionError'
    && r.record?.mutante === nome && r.record?.tool === 'look-binding-check'
    && String(r.record?.clause || '').includes(CLAUSULA[nome]);
}
function metaProva() {
  const nome = MUTANTES[0];
  const record = { tool: 'look-binding-check', name: 'AssertionError', mutante: nome, clause: CLAUSULA[nome] };
  const ok = { status: 1, signal: null, error: null,
    stderr: 'LOOK_BINDING_APPLIED:' + nome + '\nLOOK_BINDING_ERROR:' + JSON.stringify(record) + '\n' };
  assert.ok(verdict(parseRun(ok), nome), 'meta: recusou controle mutante válido');
  const falsos = [
    { ...ok, error: new Error('spawn') }, { ...ok, signal: 'SIGTERM' },
    ...[0, 2, null].map((status) => ({ ...ok, status })),
    { ...ok, stderr: ok.stderr.split('\n').slice(1).join('\n') },
    { ...ok, stderr: ok.stderr + 'LOOK_BINDING_APPLIED:' + nome + '\n' },
    { ...ok, stderr: 'LOOK_BINDING_APPLIED:' + nome + '\n' },
    { ...ok, stderr: ok.stderr + 'LOOK_BINDING_ERROR:' + JSON.stringify(record) + '\n' },
    ...[{ name: 'Error' }, { mutante: 'outro' }, { tool: 'outra' }, { clause: 'LOOK_OUTRA' }].map((delta) => ({ ...ok,
      stderr: 'LOOK_BINDING_APPLIED:' + nome + '\nLOOK_BINDING_ERROR:' + JSON.stringify({ ...record, ...delta }) + '\n' })),
    { ...ok, stderr: ok.stderr + 'TypeError: preparação\n' },
  ];
  falsos.forEach((r, i) => assert.ok(!verdict(parseRun(r), nome), 'meta: falso positivo ' + i));
  const base = { status: 0, signal: null, error: null, stderr: '' };
  assert.ok(verdict(parseRun(base)), 'meta: recusou baseline válida');
  for (const r of [{ ...base, status: 1 }, { ...base, signal: 'SIGKILL' }, { ...base, error: new Error('spawn') },
    { ...base, stderr: ok.stderr }, { ...base, stderr: 'TypeError: preparação' }]) assert.ok(!verdict(parseRun(r)), 'meta: baseline falsa aceita');
}

async function provarVinculo() {
  const { bootGame, initTextures } = await import('./harness.mjs');
  const { LOOK } = await import('../../public/js/look.js');
  const L = LOOK.penitenciaria;
  const game = bootGame('penitenciaria', { textures: initTextures(), ctf: true, seed: 20261026, bots: 0 });
  try {
    const { world, scene } = game;
    assert.strictEqual(scene.userData.skyUrl, L.sky,
      `LOOK_BINDING · skyUrl usado pelo builder é o do mapa; esperado ${L.sky}, veio ${scene.userData.skyUrl}`);
    assert(scene.userData.skySource && scene.userData.skySource.kind === 'webp' && scene.userData.skySource.url === L.sky,
      `LOOK_BINDING · skySource deve declarar o webp da penitenciaria; veio ${JSON.stringify(scene.userData.skySource)}`);
    assert(scene.fog && scene.fog.color.getHex() === L.horizonte,
      `LOOK_BINDING · fog do Carandiru deve nascer do horizonte do próprio LOOK; cor 0x${scene.fog ? scene.fog.color.getHexString() : 'sem-fog'}`);
    const sun = world.sun;
    assert(sun, 'LOOK_BINDING · builder precisa devolver world.sun (applyLook)');
    assert(sun.color.getHex() === L.sol.cor && sun.intensity === L.sol.i,
      `LOOK_BINDING · sol do pátio (cor/intensidade) divergiu do LOOK: 0x${sun.color.getHexString()}/${sun.intensity}`);
    assert([sun.position.x, sun.position.y, sun.position.z].every((v, i) => v === L.sol.pos[i]),
      `LOOK_BINDING · posição do sol divergiu do LOOK: ${[sun.position.x, sun.position.y, sun.position.z]}`);
    const hemi = world.hemi;
    assert(hemi, 'LOOK_BINDING · builder precisa devolver world.hemi (applyLook)');
    assert(hemi.color.getHex() === L.hemi.ceu && hemi.groundColor.getHex() === L.hemi.chao && hemi.intensity === L.hemi.i,
      `LOOK_BINDING · hemi (céu/chão/intensidade) divergiu do LOOK: 0x${hemi.color.getHexString()}/0x${hemi.groundColor.getHexString()}/${hemi.intensity}`);
    console.log(`VERDE look-binding: penitenciaria liga o próprio LOOK (${L.sky}, fog=horizonte, sol e hemi canônicos)`);
  } finally {
    game.dispose();
  }
}

const executar = (nome = '') => spawnSync(process.execPath,
  ['--loader', LOADER, CHECK, ...(nome ? ['--mutante=' + nome] : [])],
  { cwd: ROOT, env: { ...process.env, SIM_LOOK_MUTANTE: nome }, encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
if (metaOnly) {
  metaProva(); console.log('look-binding: controles do driver verdes');
} else if (driver) {
  metaProva();
  const base = executar();
  assert.ok(verdict(parseRun(base)), 'baseline recusada: ' + String(base.stderr || '').slice(-1200));
  for (const nome of MUTANTES) {
    const run = executar(nome);
    assert.ok(verdict(parseRun(run), nome), 'mutante ' + nome + ' recusado: ' + String(run.stderr || '').slice(-1200));
    console.log('mutante ' + nome + ': asserção ' + CLAUSULA[nome] + ' detectada');
  }
  console.log('look-binding: baseline e mutante verdes');
} else await provarVinculo();
