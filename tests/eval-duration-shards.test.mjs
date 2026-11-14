import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  IDADE_MAXIMA_MANIFESTO_MS,
  carregarDuracoes,
  criarManifestoDuracoes,
  planejarShards,
} from '../tools/eval/lib/duration-shards.mjs';

const AGORA = Date.parse('2026-11-10T12:00:00.000Z');
const CHAVE_CACHE_DURACOES = "eval-durations-v1-${{ hashFiles('tools/eval/out/durations.json') }}";
const PREFIXO_CACHE_CONSUMIDOR = 'eval-durations-v1-';
const WORKFLOW_PRODUTOR = readFileSync(new URL('../.github/workflows/eval-duration-calibration.yml', import.meta.url), 'utf8');
const WORKFLOW_CONSUMIDOR = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const relatorio = (resultados) => ({ resultados });
const ok = (passo, duracao) => ({ passo, duracao, status: 'ok' });

function validarChavesCache(workflow, esperada) {
  const chaves = [...workflow.matchAll(/^\s+key:\s*(eval-durations[^\n]*)$/gm)].map((match) => match[1]);
  assert.ok(chaves.length, 'workflow precisa declarar a chave do manifesto');
  for (const chave of chaves) {
    assert.doesNotMatch(chave, /github\.run_(?:id|attempt)/);
    assert.equal(chave, esperada);
  }
  return chaves;
}

function manifesto(dir, duracoes, geradoEm = new Date().toISOString()) {
  const caminho = join(dir, 'durations.json');
  const entradas = Object.fromEntries(Object.entries(duracoes)
    .map(([passo, segundos]) => [passo, { segundos, amostras: 1 }]));
  writeFileSync(caminho, JSON.stringify({ versao: 1, geradoEm, duracoes: entradas }));
  return caminho;
}

function npmFake(dir) {
  const log = join(dir, 'npm.jsonl');
  writeFileSync(join(dir, 'npm'), `#!${process.execPath}
require('node:fs').appendFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(process.argv.at(-1)) + '\\n');
`, { mode: 0o755 });
  return log;
}

function rodarRunner(dir, args, log) {
  return spawnSync(process.execPath, ['tools/eval/runner.mjs', ...args], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FAKE_NPM_LOG: log },
  });
}

test('agregação usa mediana de sucessos, ordena fontes e ignora falhas', () => {
  const entradas = [
    { fonte: 'run-z/tempos.json', relatorio: relatorio([
      ok('eval:a', 12), { ...ok('eval:b', 999), status: 'FALHOU' }, ok('eval:c', 4),
    ]) },
    { fonte: 'run-a/tempos.json', relatorio: relatorio([ok('eval:a', 10), ok('eval:b', 8)]) },
  ];
  const manifestoAgregado = criarManifestoDuracoes(entradas, { geradoEm: new Date(AGORA) });
  assert.deepEqual(manifestoAgregado.fontes, ['run-a/tempos.json', 'run-z/tempos.json']);
  assert.deepEqual(manifestoAgregado.duracoes, {
    'eval:a': { segundos: 11, amostras: 2 },
    'eval:b': { segundos: 8, amostras: 1 },
    'eval:c': { segundos: 4, amostras: 1 },
  });
  assert.deepEqual(criarManifestoDuracoes([...entradas].reverse(), { geradoEm: new Date(AGORA) }), manifestoAgregado);
  assert.throws(() => criarManifestoDuracoes([
    { fonte: 'ruim.json', relatorio: relatorio([ok('eval:a', -1)]) },
  ]), /resultado ok inválido/);
});

test('CLI de calibração é byte-determinístico para os mesmos artefatos', () => {
  const dir = mkdtempSync(join(tmpdir(), 'duration-calibration-'));
  try {
    const input = join(dir, 'artifacts');
    mkdirSync(join(input, '200', 'job-b'), { recursive: true });
    mkdirSync(join(input, '100', 'job-a'), { recursive: true });
    writeFileSync(join(input, '200', 'job-b', 'times.json'), JSON.stringify(relatorio([ok('b', 7), ok('a', 12)])));
    writeFileSync(join(input, '100', 'job-a', 'times.json'), JSON.stringify(relatorio([ok('a', 10)])));
    const outputs = [join(dir, 'one.json'), join(dir, 'two.json')];
    for (const output of outputs) {
      const r = spawnSync(process.execPath, [
        'tools/eval/calibrate-durations.mjs', `--input=${input}`, `--output=${output}`,
        '--generated-at=2026-11-10T12:00:00.000Z',
      ], { encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
    }
    assert.equal(readFileSync(outputs[0], 'utf8'), readFileSync(outputs[1], 'utf8'));
    const agregado = JSON.parse(readFileSync(outputs[0], 'utf8'));
    assert.deepEqual(agregado.fontes, ['100/job-a/times.json', '200/job-b/times.json']);
    assert.equal(agregado.duracoes.a.segundos, 11);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('produtor grava por conteúdo e consumidor aceita qualquer match do prefixo', () => {
  validarChavesCache(WORKFLOW_PRODUTOR, CHAVE_CACHE_DURACOES);
  validarChavesCache(WORKFLOW_CONSUMIDOR, PREFIXO_CACHE_CONSUMIDOR);
  assert.match(WORKFLOW_PRODUTOR, /permissions:\n\s+actions: write\n\s+contents: read/);
  assert.match(WORKFLOW_PRODUTOR, /actions\/cache\/save@0057852bfaa89a56745cba8c7296529d2fc39830/);
  assert.match(WORKFLOW_CONSUMIDOR, /actions\/cache\/restore@0057852bfaa89a56745cba8c7296529d2fc39830/);
  assert.match(WORKFLOW_CONSUMIDOR, /restore-keys:\s*\|\n\s+eval-durations-v1-\n/);
  assert.match(WORKFLOW_CONSUMIDOR, /cache-matched-key == ''/);

  const inicio = WORKFLOW_CONSUMIDOR.indexOf('  contratos-visuais-personagens-camera:');
  const fim = WORKFLOW_CONSUMIDOR.indexOf('\n  contratos-visuais-ferro-balcao:', inicio);
  assert.ok(inicio >= 0 && fim > inicio);
  const job = WORKFLOW_CONSUMIDOR.slice(inicio, fim);
  assert.doesNotMatch(job, /cache-hit != 'true'/);
  const restore = job.indexOf('Restore calibrated duration manifest');
  const shard = job.indexOf('--shard=${{ matrix.shard }}/3');
  assert.ok(restore >= 0 && shard > restore, 'cache precisa ser restaurado antes do passo shardado');
  assert.match(job, /matrix:\n\s+shard: \[1, 2, 3\]/);
  assert.doesNotMatch(job, /--shard=off/);
});

test('contrato do cache rejeita chave exclusiva de run_id e run_attempt', () => {
  const runIdOnly = 'eval-durations-${{ github.run_id }}-${{ github.run_attempt }}';
  const mutante = WORKFLOW_PRODUTOR.replace(CHAVE_CACHE_DURACOES, runIdOnly);
  assert.notEqual(mutante, WORKFLOW_PRODUTOR);
  assert.throws(() => validarChavesCache(mutante, CHAVE_CACHE_DURACOES));
});

test('balanceamento guloso cobre cada passo uma vez e reage à mutação de duração', () => {
  const passos = ['a', 'b', 'c', 'd', 'e', 'f'];
  const duracoes = { a: 10, b: 9, c: 8, d: 7, e: 6, f: 5 };
  const shards = planejarShards(passos, duracoes, 3);
  assert.deepEqual(shards, [['a', 'f'], ['b', 'e'], ['c', 'd']]);
  assert.deepEqual(shards.flat().sort(), [...passos].sort());
  assert.equal(new Set(shards.flat()).size, passos.length);
  assert.notDeepEqual(planejarShards(passos, { ...duracoes, f: 50 }, 3), shards);
});

test('planejamento falha fechado para lacuna, duplicata, excesso de shards e índice inválido', () => {
  assert.throws(() => planejarShards(['a', 'b'], { a: 1 }, 2), /sem duração válida para: b/);
  assert.throws(() => planejarShards(['a', 'a'], { a: 1 }, 1), /sem duplicatas/);
  assert.throws(() => planejarShards(['a'], { a: 1 }, 2), /excedem os passos/);
  assert.throws(() => planejarShards(['a'], { a: 1 }, 0), /inteiro positivo/);
});

test('manifesto válido carrega durações; ausente, velho, futuro ou malformado é recusado', () => {
  const dir = mkdtempSync(join(tmpdir(), 'duration-load-'));
  try {
    const caminho = manifesto(dir, { a: 2, b: 3 }, new Date(AGORA).toISOString());
    assert.deepEqual(carregarDuracoes(caminho, { agora: AGORA }), { a: 2, b: 3 });
    assert.throws(() => carregarDuracoes(join(dir, 'ausente.json'), { agora: AGORA }), /não foi possível ler/);
    const velho = manifesto(dir, { a: 2 }, new Date(AGORA - IDADE_MAXIMA_MANIFESTO_MS - 1).toISOString());
    assert.throws(() => carregarDuracoes(velho, { agora: AGORA }), /velho ou futuro/);
    const futuro = manifesto(dir, { a: 2 }, new Date(AGORA + 6 * 60 * 1000).toISOString());
    assert.throws(() => carregarDuracoes(futuro, { agora: AGORA }), /velho ou futuro/);
    writeFileSync(caminho, JSON.stringify({ versao: 1, geradoEm: new Date(AGORA).toISOString(), duracoes: { a: { segundos: 2, amostras: 0 } } }));
    assert.throws(() => carregarDuracoes(caminho, { agora: AGORA }), /duração inválida para a/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runner distribui shards sem perda ou duplicata e preserva o JSON por shard', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runner-shards-'));
  try {
    const log = npmFake(dir);
    const passos = ['alpha', 'beta', 'gamma', 'delta'];
    const duracoes = { alpha: 8, beta: 7, gamma: 6, delta: 5 };
    const caminho = manifesto(dir, duracoes);
    const esperado = planejarShards(passos, duracoes, 2);
    for (let indice = 1; indice <= 2; indice++) {
      const jsonOut = join(dir, `shard-${indice}.json`);
      const r = rodarRunner(dir, [...passos, `--shard=${indice}/2`, `--durations=${caminho}`, `--json-out=${jsonOut}`], log);
      assert.equal(r.status, 0, r.stderr);
      const saida = JSON.parse(readFileSync(jsonOut, 'utf8'));
      assert.deepEqual(saida.passos, esperado[indice - 1]);
      assert.deepEqual(saida.resultados.map((resultado) => resultado.passo), esperado[indice - 1]);
      assert.equal(saida.exitFinal, 0);
      assert.ok(saida.resultados.every((resultado) => resultado.status === 'ok' && Number.isFinite(resultado.duracao)));
    }
    const executados = readFileSync(log, 'utf8').trim().split('\n').map((linha) => JSON.parse(linha));
    assert.deepEqual(executados.sort(), [...passos].sort());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runner preserva --jobs=2 depois do shard', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runner-shard-jobs-'));
  try {
    const log = npmFake(dir);
    const passos = ['syntax', 'arch:check', 'docs:check', 'media:check'];
    const duracoes = Object.fromEntries(passos.map((passo) => [passo, 1]));
    const caminho = manifesto(dir, duracoes);
    const jsonOut = join(dir, 'jobs.json');
    const r = rodarRunner(dir, [...passos, '--jobs=2', '--shard=2/2', `--durations=${caminho}`, `--json-out=${jsonOut}`], log);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(readFileSync(jsonOut, 'utf8')).passos, planejarShards(passos, duracoes, 2)[1]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runner não executa npm com manifesto ausente, vencido, inválido ou passo sem histórico', () => {
  for (const caso of ['ausente', 'vencido', 'invalido', 'incompleto']) {
    const dir = mkdtempSync(join(tmpdir(), `runner-shard-${caso}-`));
    try {
      const log = npmFake(dir);
      const caminho = caso === 'ausente' ? join(dir, 'missing.json')
        : caso === 'invalido' ? join(dir, 'invalido.json')
          : manifesto(dir, caso === 'incompleto' ? { alpha: 1 } : { alpha: 1, beta: 1 },
            caso === 'vencido' ? new Date(Date.now() - IDADE_MAXIMA_MANIFESTO_MS - 60000).toISOString() : undefined);
      if (caso === 'invalido') writeFileSync(caminho, '{');
      const r = rodarRunner(dir, ['alpha', 'beta', '--shard=1/2', `--durations=${caminho}`], log);
      assert.equal(r.status, 2, caso);
      assert.match(r.stderr, {
        ausente: /não foi possível ler manifesto/,
        vencido: /velho ou futuro/,
        invalido: /não foi possível ler manifesto/,
        incompleto: /sem duração válida para: beta/,
      }[caso]);
      assert.match(r.stderr, /--shard=off/);
      assert.equal(existsSync(log), false, `${caso}: npm não pode executar`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('--shard=off escapa do manifesto e executa a seleção completa', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runner-shard-off-'));
  try {
    const log = npmFake(dir);
    const jsonOut = join(dir, 'off.json');
    const r = rodarRunner(dir, ['alpha', 'beta', '--shard=off', '--durations=/nao/existe.json', `--json-out=${jsonOut}`], log);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(readFileSync(jsonOut, 'utf8')).passos, ['alpha', 'beta']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runner rejeita índice fora do intervalo antes de executar npm', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runner-shard-index-'));
  try {
    const log = npmFake(dir);
    const caminho = manifesto(dir, { alpha: 1, beta: 1 });
    const r = rodarRunner(dir, ['alpha', 'beta', '--shard=3/2', `--durations=${caminho}`], log);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /índice de shard/);
    assert.equal(existsSync(log), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
