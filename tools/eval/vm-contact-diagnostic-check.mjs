// 2026-09-05: C teve pico de 1777 px de pente, abaixo do filtro >2000; -1 virava >192 px.
// Evidência: artifacts/viewmodels/astra-pistol/candidate-c-gauntlet/relatorio.json.
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MODULE = new URL('./lib/vm-contact-diagnostic.mjs', import.meta.url);
const frame = (pentePx, distances) => ({
  pentePx, maoComponentes: distances.map((penteDistPx) => ({ penteDistPx })),
});
const candidateC = [
  frame(806, [16]), frame(448, [24, 0]), frame(0, [-1, -1, -1, -1]),
  frame(1777, [0, 0, 168, 200]), frame(997, [0, 0, 40, 192]),
  frame(0, [-1, -1, -1]), frame(0, [-1]), frame(0, [-1]),
];

function runSuite(summarize) {
  assert.equal(typeof summarize, 'function', 'helper ausente: diagnóstico não pode ser medido');
  const results = [];
  function check(id, run) {
    try { results.push({ id, ok: true, ...run() }); }
    catch (error) { results.push({ id, ok: false, error: error.message }); }
  }
  function insufficient(result, label, { max, eligible = 0 }) {
    assert.equal(result.status, 'insufficient-sample', `${label}: ausência de amostra foi aprovada ou chamada de contato distante`);
    assert.equal(result.distancePx, null, `${label}: distância inventada onde não há amostra`);
    assert.equal(result.samples, 0, `${label}: contou distância inválida`);
    assert.equal(result.eligibleFrames, eligible, `${label}: contagem de frames elegíveis incorreta`);
    assert.equal(result.maxMagazinePx, max, `${label}: pico de visibilidade incorreto`);
    assert.equal(result.minMagazinePx, 2000, `${label}: filtro de visibilidade foi afrouxado`);
    assert.equal(typeof result.failure, 'string', `${label}: falta de amostra precisa continuar reprovando`);
    assert.match(result.failure, /amostra|evid[eê]ncia|insuficiente|inconclusiv/i,
      `${label}: mensagem precisa distinguir evidência insuficiente de distância medida`);
    assert.doesNotMatch(result.failure, />\s*192|(?:dist[aâ]ncia|longe).*192/i,
      `${label}: mensagem inventou >192 px`);
  }

  check('MCD1 C com pico 1777 permanece inconclusivo e vermelho', () => {
    const result = summarize(candidateC);
    insufficient(result, 'MCD1', { max: 1777 });
    return { status: result.status, maxMagazinePx: result.maxMagazinePx, samples: result.samples };
  });
  check('MCD2 contato real zero não vira ausência de amostra', () => {
    const result = summarize([frame(2001, [192, 0, 48])]);
    assert.equal(result.status, 'contact');
    assert.equal(result.distancePx, 0);
    assert.equal(result.samples, 2);
    assert.equal(result.eligibleFrames, 1);
    assert.equal(result.failure, null);
    return { distancePx: result.distancePx, samples: result.samples };
  });
  check('MCD3 limite de contato mantém 24 incluso e 25 reprovado', () => {
    const edge = summarize([frame(3000, [0, 24])]);
    const detached = summarize([frame(3000, [0, 25])]);
    assert.equal(edge.status, 'contact');
    assert.equal(edge.distancePx, 24);
    assert.equal(edge.failure, null);
    assert.equal(detached.status, 'detached');
    assert.equal(detached.distancePx, 25);
    assert.match(detached.failure, /25/, 'distância medida precisa acompanhar a reprovação');
    return { boundaryPx: edge.distancePx, detachedPx: detached.distancePx };
  });
  check('MCD4 filtro estrito descarta 2000 px mesmo com contato', () => {
    insufficient(summarize([frame(2000, [0, 0])]), 'MCD4', { max: 2000 });
    const result = summarize([frame(2000, [0, 0]), frame(2001, [0, 48])]);
    assert.equal(result.status, 'detached');
    assert.equal(result.distancePx, 48, 'MCD4 contato sem visibilidade não pode absolver distância elegível');
    assert.equal(result.samples, 1);
    assert.equal(result.eligibleFrames, 1);
    assert.equal(result.minMagazinePx, 2000);
    return { eligibleFrames: result.eligibleFrames, distancePx: result.distancePx };
  });
  check('MCD5 componente único não representa mão de apoio', () => {
    const result = summarize([frame(9000, [0]), frame(3000, [0, 32])]);
    assert.equal(result.status, 'detached');
    assert.equal(result.distancePx, 32);
    assert.equal(result.samples, 1);
    assert.equal(result.eligibleFrames, 1);
    assert.equal(result.maxMagazinePx, 9000);
    return { eligibleFrames: result.eligibleFrames, maxMagazinePx: result.maxMagazinePx };
  });
  check('MCD6 distância negativa ou ausente não inventa medição', () => {
    const result = summarize([frame(3000, [0, -1, undefined]), frame(3100, [0, undefined])]);
    insufficient(result, 'MCD6', { max: 3100, eligible: 2 });
    return { eligibleFrames: result.eligibleFrames, samples: result.samples };
  });
  check('MCD7 só distâncias finitas válidas participam do mínimo', () => {
    const result = summarize([frame(3000, [0, -1, undefined, NaN, Infinity, 48, 24])]);
    assert.equal(result.status, 'contact');
    assert.equal(result.distancePx, 24);
    assert.equal(result.samples, 2, 'MCD7 contou NaN/Infinity/ausente/negativo como evidência');
    assert.equal(result.failure, null);
    return { distancePx: result.distancePx, samples: result.samples };
  });
  check('MCD8 inventário vazio reprova por falta de evidência', () => {
    const result = summarize([]);
    insufficient(result, 'MCD8', { max: 0 });
    return { status: result.status, samples: result.samples };
  });
  return results;
}

const module = await import(MODULE.href);
const results = runSuite(module.summarizeMagazineSupportContact);
for (const result of results) console.log(`${result.ok ? 'PASSA' : 'FALHA'} ${result.id} — ${JSON.stringify(result)}`);
const failures = results.filter((result) => !result.ok).length;

if (process.argv.includes('--mutate')) {
  assert.equal(failures, 0, 'mutação exige versão normal verde');
  const source = await readFile(MODULE, 'utf8');
  const signature = /export function summarizeMagazineSupportContact\(/g;
  assert.equal([...source.matchAll(signature)].length, 1, 'MUTAÇÃO NÃO APLICOU: export do helper mudou');
  const renamed = source.replace(signature, 'function diagnoseBeforeMutation(');
  assert.notEqual(renamed, source, 'MUTAÇÃO NÃO APLICOU: fonte idêntica');
  const mutations = [
    { name: 'distancia-inventada', expected: /MCD1: distância inventada/,
      body: "return result.distancePx === null ? { ...result, distancePx: 193, failure: 'P4 recarga: mão de apoio fica >192px longe do pente destacado' } : result;" },
    { name: 'aprova-sem-amostra', expected: /MCD1: ausência de amostra foi aprovada/,
      body: "return result.distancePx === null ? { ...result, status: 'contact', failure: null } : result;" },
  ];
  const directory = await mkdtemp(path.join(tmpdir(), 'vm-contact-diagnostic-mutant-'));
  try {
    for (const mutation of mutations) {
      const target = path.join(directory, `${mutation.name}.mjs`);
      await writeFile(target, `${renamed}\nexport function summarizeMagazineSupportContact(frames) {\n`
        + `  const result = diagnoseBeforeMutation(frames);\n  ${mutation.body}\n}\n`);
      const mutant = await import(pathToFileURL(target).href);
      const killed = runSuite(mutant.summarizeMagazineSupportContact).filter((result) => !result.ok);
      const expected = killed.find((result) => mutation.expected.test(result.error));
      assert.ok(expected, `RÉGUA CEGA: ${mutation.name} não reprovou MCD1 pela razão esperada; ${JSON.stringify(killed)}`);
      console.log(`PASSA MUTANTE ${mutation.name} — ${killed.length}/${results.length} contratos vermelhos; ${expected.error}`);
      assert.ok(runSuite(module.summarizeMagazineSupportContact).every((result) => result.ok),
        'restauração não voltou ao verde');
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

console.log(`MCD ${results.length - failures}/${results.length} contratos; diagnóstico de evidência, sem aprovação de contato 3D.`);
process.exitCode = failures ? 1 : 0;
