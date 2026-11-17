import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { SUITES, passosDaSuite } from '../tools/eval/suites.mjs';
import { selecionarPorArquivos, validarMapaWorkflows } from '../tools/eval/selecao-pre-push.mjs';

/* Baseline congelado das duas linhas que existiam antes do manifesto, legível em
 * tests/fixtures/eval-suites-baseline.json e preso ao MESMO sha256 de sempre (a lista não
 * mudou, só deixou de ser opaca). A regra é catraca: a baseline tem de ser subsequência
 * ORDENADA da suite atual e nenhum passo roda duas vezes. Perder, reordenar ou duplicar um
 * passo migrado reprova; passo novo entra em qualquer posição sem editar este arquivo.
 * Antes, cada passo novo exigia somar o nome num registro NOVOS e a contagem total batia
 * por igualdade: 19 dos 27 commits deste arquivo entre 18/10 e 17/11 eram essa soma, e 5 PRs
 * reprovaram só por esquecê-la (runs 42580952308, 42623503905, 42635380158, 42735202297,
 * 42749663123 — "339 !== 338"). */
const BASELINE_SHA256 = {
  fast: '05c5d2027a8229f379a4556ee991daf1bc0e9f45b04ee3515d4e458259d6bfdf',
  deploy: '3aea0f68ace2a6954de58bd2ae028e7ab17cd879ca9057ac002c80f92955859d',
};
const FIXTURE_BASELINE = 'tests/fixtures/eval-suites-baseline.json';
const BASELINE = JSON.parse(readFileSync(new URL(`../${FIXTURE_BASELINE}`, import.meta.url), 'utf8'));
const assinatura = (passos) => createHash('sha256').update(passos.join('\n')).digest('hex');

function violacoesDaBaseline(nome, baseline, atual) {
  const erros = [];
  const vezes = new Map();
  for (const passo of atual) vezes.set(passo, (vezes.get(passo) || 0) + 1);
  for (const [passo, n] of vezes) {
    if (n > 1) erros.push(`${passo} aparece ${n}× em check:${nome} — deixe uma só entrada em tools/eval/suites.mjs`);
  }
  let i = 0;
  for (const passo of atual) if (i < baseline.length && passo === baseline[i]) i++;
  if (i < baseline.length) {
    const passo = baseline[i];
    if (atual.includes(passo)) {
      erros.push(`${passo} saiu da ordem migrada de check:${nome} (vinha logo depois de ${baseline[i - 1] ?? '(início)'}) — devolva-o à posição em tools/eval/suites.mjs`);
    } else {
      erros.push(`${passo} sumiu de check:${nome} — devolva-o em tools/eval/suites.mjs; se a remoção é decisão, tire-o de ${FIXTURE_BASELINE} e troque BASELINE_SHA256.${nome} por ${assinatura(baseline.filter((p) => p !== passo))}`);
    }
  }
  return erros;
}

for (const nome of Object.keys(BASELINE_SHA256)) {
  test(`check:${nome}: baseline legível é a mesma congelada no sha256`, () => {
    assert.equal(assinatura(BASELINE[nome]), BASELINE_SHA256[nome], `${FIXTURE_BASELINE} foi editado sem trocar BASELINE_SHA256.${nome}`);
  });

  test(`check:${nome} preserva a sequência migrada, em ordem e sem passo repetido`, () => {
    const erros = violacoesDaBaseline(nome, BASELINE[nome], SUITES[nome]);
    assert.deepEqual(erros, [], erros.join('\n'));
  });

  test(`catraca de ${nome}: passo novo passa; perda, reordenação e duplicata reprovam`, () => {
    const base = BASELINE[nome];
    const atual = [...SUITES[nome]];
    const comNovo = [...atual];
    comNovo.splice(Math.floor(atual.length / 2), 0, 'eval:passo-novo-sem-registro');
    assert.deepEqual(violacoesDaBaseline(nome, base, comNovo), []);

    const semPasso = atual.filter((passo) => passo !== base[17]);
    assert.match(violacoesDaBaseline(nome, base, semPasso).join('\n'), new RegExp(`${base[17]} sumiu`));

    const reordenado = [...atual];
    const [a, b] = [reordenado.indexOf(base[3]), reordenado.indexOf(base[19])];
    [reordenado[a], reordenado[b]] = [reordenado[b], reordenado[a]];
    assert.match(violacoesDaBaseline(nome, base, reordenado).join('\n'), /saiu da ordem migrada/);

    assert.match(violacoesDaBaseline(nome, base, [...atual, base[5]]).join('\n'), new RegExp(`${base[5]} aparece 2×`));
  });
}

test('fast adds staging, Studio, rig checks, season-pass and production-crash checks without deleting migrated steps', () => {
  assert.ok(SUITES.fast.includes('eval:portalembed'));
  assert.ok(SUITES.fast.includes('eval:lixo'));
  assert.ok(SUITES.fast.includes('eval:envruntime'));
  assert.ok(SUITES.fast.includes('eval:servertraffic'));
  assert.ok(SUITES.fast.includes('eval:rig-census'));
  assert.ok(SUITES.fast.includes('eval:pesos-braco-perna'));
  assert.ok(SUITES.fast.includes('eval:rigmaos'));
  assert.ok(SUITES.fast.includes('eval:shareorigin'));

  assert.ok(SUITES.fast.includes('eval:vm-enquadramento-placar'));
  assert.ok(SUITES.fast.includes('eval:pintura-fabrica'));
  assert.ok(SUITES.fast.includes('eval:passe'));
  assert.ok(SUITES.fast.includes('eval:packpublish'));
  assert.ok(SUITES.fast.includes('eval:prodcrash'));
  assert.ok(SUITES.deploy.includes('eval:dispose'));
});

test('release de personagem do Studio entra na fast logo depois do characterkit', () => {
  const i = SUITES.fast.indexOf('eval:characterkit');
  assert.equal(SUITES.fast[i + 1], 'eval:studiochar');
});

test('rede3p roda uma vez no fast', () => {
  assert.equal(SUITES.fast.filter((passo) => passo === 'eval:rede3p').length, 1);
});

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

test('runner jobs=2 sobrepõe dois npm e preserva ordem, exit 78 e JSON completo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runner-paralelo-'));
  try {
    const log = join(dir, 'eventos.jsonl');
    const jsonOut = join(dir, 'relatorios', 'core.json');
    writeFileSync(log, '');
    writeFileSync(join(dir, 'npm'), `#!${process.execPath}
const fs = require('node:fs');
const passo = process.argv[process.argv.length - 1];
const inicio = Date.now();
fs.appendFileSync(process.env.FAKE_NPM_LOG, JSON.stringify({ evento: 'inicio', passo, t: inicio }) + '\\n');
let distintos = 0;
const limite = inicio + 5000;
while (Date.now() < limite) {
  const eventos = fs.readFileSync(process.env.FAKE_NPM_LOG, 'utf8').trim().split('\\n').filter(Boolean);
  distintos = new Set(eventos.map((linha) => JSON.parse(linha)).filter((e) => e.evento === 'inicio').map((e) => e.passo)).size;
  if (distintos >= 2) break;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
}
if (distintos >= 2) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
fs.appendFileSync(process.env.FAKE_NPM_LOG, JSON.stringify({ evento: 'fim', passo, t: Date.now() }) + '\\n');
console.log('saida sensivel de ' + passo);
process.exit(distintos >= 2 ? 78 : 97);
`, { mode: 0o755 });
    const r = spawnSync(process.execPath, [
      'tools/eval/runner.mjs', '--jobs=2', '--suite=core', `--json-out=${jsonOut}`,
    ], {
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FAKE_NPM_LOG: log },
    });
    assert.equal(r.status, 78, r.stderr);

    const eventos = readFileSync(log, 'utf8').trim().split('\n').map((linha) => JSON.parse(linha));
    const [a, b] = SUITES.core;
    const instante = (evento, passo) => eventos.find((e) => e.evento === evento && e.passo === passo)?.t;
    assert.ok(Number.isFinite(instante('inicio', a)) && Number.isFinite(instante('inicio', b)));
    assert.ok(Math.max(instante('inicio', a), instante('inicio', b)) < Math.min(instante('fim', a), instante('fim', b)),
      'os timestamps do npm fake precisam comprovar overlap dos dois primeiros passos');

    let posicaoAnterior = -1;
    for (const passo of SUITES.core) {
      const posicao = r.stdout.indexOf(`  ${passo} … `);
      assert.ok(posicao > posicaoAnterior, `${passo} saiu fora da ordem de entrada`);
      posicaoAnterior = posicao;
    }

    const relatorio = JSON.parse(readFileSync(jsonOut, 'utf8'));
    assert.deepEqual(relatorio.suites, ['core']);
    assert.deepEqual(relatorio.passos, SUITES.core);
    assert.equal(relatorio.exitFinal, 78);
    assert.ok(Number.isFinite(Date.parse(relatorio.inicio)) && Number.isFinite(Date.parse(relatorio.fim)));
    assert.ok(relatorio.duracaoTotal >= 0);
    assert.deepEqual(relatorio.resultados.map((resultado) => resultado.passo), SUITES.core);
    for (const resultado of relatorio.resultados) {
      assert.equal(resultado.status, 'PULOU');
      assert.equal(resultado.exit, 78);
      assert.equal(typeof resultado.duracao, 'number');
      assert.ok(Object.hasOwn(resultado, 'causa'));
      assert.equal(Object.hasOwn(resultado, 'stdout'), false);
      assert.equal(Object.hasOwn(resultado, 'saida'), false);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runner jobs=2 rejeita categoria não-core antes de executar npm', () => {
  const dir = mkdtempSync(join(tmpdir(), 'runner-rejeita-paralelo-'));
  try {
    const marca = join(dir, 'npm-executou');
    writeFileSync(join(dir, 'npm'), `#!${process.execPath}
require('node:fs').writeFileSync(process.env.FAKE_NPM_MARCA, 'executou');
`, { mode: 0o755 });
    const r = spawnSync(process.execPath, ['tools/eval/runner.mjs', '--jobs=2', '--suite=maps'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, FAKE_NPM_MARCA: marca },
    });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--jobs=2 aceita somente passos da suite core/);
    assert.equal(existsSync(marca), false, 'npm não pode ser chamado para uma seleção não-core');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('sem diff ou com documentação, o pre-push mantém os checks centrais baratos', () => {
  for (const arquivos of [[], ['docs/ARCH.md']]) {
    const r = selecionarPorArquivos(arquivos);
    assert.equal(r.fallback, false);
    assert.deepEqual(r.suites, ['core']);
    assert.deepEqual(r.comando, [process.execPath, ['tools/eval/runner.mjs', ...r.passos]]);
    for (const passo of ['syntax', 'arch:check', 'docs:check', 'travessao:check']) assert.ok(r.passos.includes(passo));
  }
});

test('skills de agente, markdown em qualquer pasta e mídia de lançamento são só core (09/11: caíam no deploy completo)', () => {
  for (const arquivo of ['.agents/skills/game-3d-assets/SKILL.md', '.claude/agents/revisor.md', 'public/docs/estado/nota.md', 'launch-media/2026-11-09/post.png', 'plans/landing-app.md', 'scripts/ci/cf_preview_comment.py']) {
    const r = selecionarPorArquivos([arquivo]);
    assert.equal(r.fallback, false, arquivo);
    assert.deepEqual(r.suites, ['core'], arquivo);
  }
});

test('contagem de borda é network, não fallback', () => {
  const r = selecionarPorArquivos(['src/lib/server-traffic.mjs', 'tools/eval/server-traffic-check.mjs']);
  assert.equal(r.fallback, false);
  assert.deepEqual(r.suites, ['core', 'network']);
});

test('as duas bordas de contagem (middleware da Vercel e do Workers) são network, não fallback', () => {
  const r = selecionarPorArquivos(['middleware.js', 'src/middleware.ts']);
  assert.equal(r.fallback, false);
  assert.deepEqual(r.suites, ['core', 'network']);
});

const CASOS = [
  ['public/js/map_campo.js', 'maps', 'eval:mapcontrato'],
  ['src/components/Lobby.astro', 'ui', 'eval:ui-v3'],
  ['public/audio/manifest.json', 'audio', 'audio:check'],
  ['playwright.config.mjs', 'browser', 'eval:vm-troca-sem-legado'],
  ['public/js/transporte.js', 'network', 'eval:netcode'],
  ['tools/eval/lib/vm-enquadramento.mjs', 'vm', 'eval:vm-enquadramento-placar'],
  ['tools/fabrica/fabrica-candidates.json', 'vm', 'eval:vm-enquadramento-placar'],
  ['public/models/viewmodels/coro/p90-hires.glb', 'vm', 'eval:vm-enquadramento-placar'],
];
for (const [arquivo, suite, passo] of CASOS) {
  test(`diff de ${suite} seleciona core + ${suite}`, () => {
    const r = selecionarPorArquivos([arquivo]);
    assert.equal(r.fallback, false);
    assert.deepEqual(r.suites, ['core', suite]);
    assert.equal(r.comando[1].includes('--jobs=2'), false);
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
  'package-lock.json',
  'yarn.lock',
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

const manifesto = (scripts, extras = {}) => ({ name: 'coro-solto', version: '1.0.0', ...extras, scripts });
const blobsPackage = (antes, depois) => new Map([['package.json', {
  antes: typeof antes === 'string' ? antes : JSON.stringify(antes),
  depois: typeof depois === 'string' ? depois : JSON.stringify(depois),
}]]);
const selecaoPackage = (antes, depois) => selecionarPorArquivos(['package.json'], blobsPackage(antes, depois));

test('package.json com um script real alterado executa core e esse passo', () => {
  const r = selecaoPackage(
    manifesto({ 'eval:release': 'node antes.mjs' }),
    manifesto({ 'eval:release': 'node depois.mjs' }),
  );
  assert.equal(r.fallback, false);
  assert.deepEqual(r.suites, ['core']);
  assert.deepEqual(r.passos, [...SUITES.core, 'eval:release']);
  assert.ok(r.passos.length > 0);
});

test('package.json com múltiplos scripts faz união deduplicada após core', () => {
  const r = selecaoPackage(
    manifesto({ syntax: 'node antes.mjs', 'eval:release': 'node antes.mjs', 'eval:edgecache': 'node mesmo.mjs' }),
    manifesto({ syntax: 'node depois.mjs', 'eval:release': 'node depois.mjs', 'eval:edgecache': 'node depois.mjs' }),
  );
  assert.equal(r.fallback, false);
  assert.deepEqual(r.suites, ['core']);
  assert.deepEqual(r.passos.slice(0, SUITES.core.length), SUITES.core);
  assert.equal(r.passos.filter((passo) => passo === 'syntax').length, 1);
  assert.ok(r.passos.includes('eval:release') && r.passos.includes('eval:edgecache'));
  assert.equal(new Set(r.passos).size, r.passos.length);
});

const PACKAGE_FULL = [
  ['dependencies', manifesto({ syntax: 'node a.mjs' }), manifesto({ syntax: 'node a.mjs' }, { dependencies: { astro: '1.0.0' } })],
  ['version', manifesto({ syntax: 'node a.mjs' }), { ...manifesto({ syntax: 'node a.mjs' }), version: '2.0.0' }],
  ['name', manifesto({ syntax: 'node a.mjs' }), { ...manifesto({ syntax: 'node a.mjs' }), name: 'outro-nome' }],
  ['agregador', manifesto({ 'check:fast': 'node antes.mjs' }), manifesto({ 'check:fast': 'node depois.mjs' })],
  ['script removido', manifesto({ 'eval:release': 'node a.mjs' }), manifesto({})],
  ['build fora das suites', manifesto({ build: 'node antes.mjs' }), manifesto({ build: 'node depois.mjs' })],
  ['nome alterado divergente', manifesto({ 'eval:release': 'node a.mjs' }), manifesto({ 'eval:edgecache': 'node a.mjs' })],
];
for (const [nome, antes, depois] of PACKAGE_FULL) {
  test(`package.json com ${nome} força deploy completo`, () => {
    const r = selecaoPackage(antes, depois);
    assert.equal(r.fallback, true);
    assert.deepEqual(r.passos, SUITES.deploy);
  });
}

test('package.json agregador dentro das suites também força deploy completo', () => {
  const r = selecaoPackage(
    manifesto({ 'eval:release': 'npm run eval:outro' }),
    manifesto({ 'eval:release': 'npm run eval:novo' }),
  );
  assert.equal(r.fallback, true);
  assert.match(r.motivo, /agregador/);
});

for (const [nome, antes, depois] of [
  ['base', '{', JSON.stringify(manifesto({}))],
  ['head', JSON.stringify(manifesto({})), '{'],
]) {
  test(`package.json com JSON inválido na ${nome} força deploy completo`, () => {
    const r = selecaoPackage(antes, depois);
    assert.equal(r.fallback, true);
    assert.match(r.motivo, /inválido/);
  });
}

test('--files=package.json sem blobs injetados falha fechado', () => {
  const r = selecionarPorArquivos(['package.json']);
  assert.equal(r.fallback, true);
  assert.match(r.motivo, /blobs antes\/depois/);
  assert.deepEqual(r.passos, SUITES.deploy);
});

test('lock real vence uma seleção segura de package.json', () => {
  const blobs = blobsPackage(
    manifesto({ 'eval:release': 'node antes.mjs' }),
    manifesto({ 'eval:release': 'node depois.mjs' }),
  );
  const r = selecionarPorArquivos(['package.json', 'package-lock.json'], blobs);
  assert.equal(r.fallback, true);
  assert.deepEqual(r.passos, SUITES.deploy);
});

const WORKFLOWS = [
  ['ci.yml', ['eval:operacao-flavio', 'eval:release']],
  ['release.yml', ['eval:release']],
  ['deploy-prod.yml', ['eval:edgecache', 'eval:release']],
  ['prod-watch.yml', ['eval:edgecache', 'eval:wfpurge']],
  ['preview-build.yml', []],
  ['preview-deploy.yml', []],
  ['preview-bot.yml', []],
  ['portao-browser.yml', []],
  ['autofix.yml', []],
];
for (const [arquivo, extras] of WORKFLOWS) {
  test(`workflow mapeado ${arquivo} seleciona core e suas réguas`, () => {
    const r = selecionarPorArquivos([`.github/workflows/${arquivo}`]);
    assert.equal(r.fallback, false);
    assert.deepEqual(r.suites, ['core']);
    assert.deepEqual(r.passos, [...new Set([...SUITES.core, ...extras])]);
    assert.ok(r.passos.length > 0);
  });
}

for (const arquivo of ['.github/workflows/issues-bot.yml', '.github/workflows/ci.yaml', '.github/CODEOWNERS']) {
  test(`arquivo GitHub sem mapa seguro ${arquivo} força deploy completo`, () => {
    const r = selecionarPorArquivos([arquivo]);
    assert.equal(r.fallback, true);
    assert.deepEqual(r.passos, SUITES.deploy);
  });
}

test('workflow e categoria temática mistos unem réguas sem duplicatas', () => {
  const r = selecionarPorArquivos(['public/js/map_campo.js', '.github/workflows/ci.yml']);
  assert.equal(r.fallback, false);
  assert.deepEqual(r.suites, ['core', 'maps']);
  for (const passo of ['eval:campo-contract', 'eval:operacao-flavio', 'eval:release']) {
    assert.ok(r.passos.includes(passo), `perdeu ${passo}`);
  }
  assert.equal(new Set(r.passos).size, r.passos.length);
});

test('transversal real sempre vence misto com workflow mapeado', () => {
  const r = selecionarPorArquivos(['.github/workflows/ci.yml', 'yarn.lock']);
  assert.equal(r.fallback, true);
  assert.deepEqual(r.passos, SUITES.deploy);
});

test('mapa de workflows rejeita passo fantasma fora de fast e deploy', () => {
  assert.throws(
    () => validarMapaWorkflows({ '.github/workflows/ci.yml': ['eval:passo-fantasma'] }),
    /passo fantasma/,
  );
});
