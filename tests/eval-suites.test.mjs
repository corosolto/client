import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { SUITES, passosDaSuite } from '../tools/eval/suites.mjs';
import { selecionarPorArquivos } from '../tools/eval/selecao-pre-push.mjs';

/* Baseline congelado das duas linhas que existiam antes do manifesto. O resumo
 * cobre ordem, repetições e conteúdo; ele NÃO é derivado do manifesto atual. */
const BASELINE = {
  fast: { quantidade: 338, sha256: '05c5d2027a8229f379a4556ee991daf1bc0e9f45b04ee3515d4e458259d6bfdf' },
  deploy: { quantidade: 116, sha256: '3aea0f68ace2a6954de58bd2ae028e7ab17cd879ca9057ac002c80f92955859d' },
};
const assinatura = (passos) => createHash('sha256').update(passos.join('\n')).digest('hex');

for (const [nome, baseline] of Object.entries(BASELINE)) {
  test(`check:${nome} preserva exatamente a sequência anterior`, () => {
    assert.equal(SUITES[nome].length, baseline.quantidade);
    assert.equal(assinatura(SUITES[nome]), baseline.sha256);
  });

  test(`baseline de ${nome} detecta mutantes de perda e reordenação`, () => {
    const semPasso = SUITES[nome].filter((_, i) => i !== 17);
    assert.equal(semPasso.length, baseline.quantidade - 1);
    assert.notEqual(assinatura(semPasso), baseline.sha256);

    const reordenado = [...SUITES[nome]];
    [reordenado[3], reordenado[19]] = [reordenado[19], reordenado[3]];
    assert.notEqual(assinatura(reordenado), baseline.sha256);
  });
}

test('suites temáticas só reutilizam passos existentes, sem duplicar execução', () => {
  const conhecidos = new Set([...SUITES.fast, ...SUITES.deploy]);
  for (const nome of ['core', 'maps', 'ui', 'audio', 'browser', 'network', 'vm']) {
    assert.ok(SUITES[nome].length > 0, `${nome} vazia`);
    assert.equal(new Set(SUITES[nome]).size, SUITES[nome].length, `${nome} duplicada`);
    for (const passo of SUITES[nome]) assert.ok(conhecidos.has(passo), `${nome}: passo novo ${passo}`);
    const expandido = passosDaSuite(nome);
    assert.deepEqual(expandido, SUITES[nome]);
    expandido.pop();
    assert.equal(SUITES[nome].length > expandido.length, true, 'expansão precisa devolver uma cópia');
  }
});

test('runner rejeita suite inválida antes de executar npm', () => {
  const r = spawnSync(process.execPath, ['tools/eval/runner.mjs', '--suite=nao-existe'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /suite desconhecida: nao-existe/);
  assert.match(r.stderr, /fast, deploy, core, maps, ui, audio, browser, network, vm/);
});

test('runner expande suite e preserva duração, placar e exit 78 de não medido', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runner-suite-'));
  try {
    writeFileSync(join(dir, 'npm'), '#!/bin/sh\nexit 78\n', { mode: 0o755 });
    const r = spawnSync(process.execPath, ['tools/eval/runner.mjs', '--suite=core'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    });
    assert.equal(r.status, 78);
    assert.match(r.stdout, /PULOU/);
    assert.match(r.stdout, /\d+\.\d+s/);
    assert.match(r.stdout, new RegExp(`0/${SUITES.core.length} passaram`));
    assert.match(r.stdout, /não medido:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('sem diff ou com documentação, o pre-push mantém os checks centrais baratos', () => {
  for (const arquivos of [[], ['docs/ARCH.md']]) {
    const r = selecionarPorArquivos(arquivos);
    assert.equal(r.fallback, false);
    assert.deepEqual(r.suites, ['core']);
    for (const passo of ['syntax', 'arch:check', 'docs:check', 'travessao:check']) assert.ok(r.passos.includes(passo));
  }
});

const CASOS = [
  ['public/js/map_campo.js', 'maps', 'eval:mapcontrato'],
  ['src/components/Lobby.astro', 'ui', 'eval:ui-v3'],
  ['public/audio/manifest.json', 'audio', 'audio:check'],
  ['playwright.config.mjs', 'browser', 'eval:vm-troca-sem-legado'],
  ['public/js/transporte.js', 'network', 'eval:netcode'],
  ['tools/viewmodels/validate_paid_catalog.mjs', 'vm', 'eval:vm-presence'],
];
for (const [arquivo, suite, passo] of CASOS) {
  test(`diff de ${suite} seleciona core + ${suite}`, () => {
    const r = selecionarPorArquivos([arquivo]);
    assert.equal(r.fallback, false);
    assert.deepEqual(r.suites, ['core', suite]);
    assert.ok(r.passos.includes(passo), `${suite} perdeu ${passo}`);
    assert.ok(r.regras[0].includes(arquivo));
  });
}

test('mapa seleciona só contratos genéricos e estruturais do próprio mapa', () => {
  const r = selecionarPorArquivos(['public/js/map_campo.js']);
  assert.equal(r.fallback, false);
  assert.ok(r.passos.includes('eval:campo-contract'));
  for (const pesado of ['eval:operacao-flavio', 'eval:map-material-finish', 'eval:campo-uv', 'eval:mansao']) {
    assert.equal(r.passos.includes(pesado), false, `${pesado} pertence ao CI completo`);
  }
});

test('categorias múltiplas formam união ordenada e sem passos repetidos', () => {
  const r = selecionarPorArquivos(['public/js/map_campo.js', 'public/js/audio.js']);
  assert.equal(r.fallback, false);
  assert.deepEqual(r.suites, ['core', 'maps', 'audio']);
  assert.equal(new Set(r.passos).size, r.passos.length);
  assert.deepEqual(r.passos.slice(0, SUITES.core.length), SUITES.core);
});

test('caminho desconhecido cai no check:deploy completo e explica o fallback', () => {
  const r = selecionarPorArquivos(['src/lib/contrato-transversal.ts']);
  assert.equal(r.fallback, true);
  assert.match(r.motivo, /sem regra segura/);
  assert.deepEqual(r.passos, SUITES.deploy);
  assert.deepEqual(r.comando, ['npm', ['run', '--silent', 'check:deploy']]);
});

for (const arquivo of [
  'package.json',
  'public/js/game.js',
  'public/js/main.js',
  'public/js/bootstrap.js',
  'public/js/netgame.js',
  'tools/eval/runner.mjs',
]) {
  test(`mudança transversal em ${arquivo} força deploy completo`, () => {
    const r = selecionarPorArquivos(['public/js/map_campo.js', arquivo]);
    assert.equal(r.fallback, true);
    assert.match(r.motivo, /transversal/);
    assert.deepEqual(r.passos, SUITES.deploy);
  });
}
