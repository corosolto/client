// Executa a decisão real do boot-orcamento-check pós-r844 (veredito + aceitaMutante):
// falha alheia, crash e mutação ausente não são detecção. Os mutantes atacam a FONTE
// REAL da decisão; cada um precisa virar pelo menos um cenário (prova semântica).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { aceitaMutante } from './boot-overlay.mjs';
import { lazyPosterSubset } from './boot-poster-intent.mjs';

let source = readFileSync(new URL('./boot-orcamento-check.mjs', import.meta.url), 'utf8');
const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10);
const MUTANTES = {
  // aceitaria qualquer conjunto de falhas: mutante sem falha e falha alheia virariam "capturado".
  'aceita-tudo': ['if (aceitaMutante(MUTANTE,falhas))', 'if (true)', 'mutação ausente não é detecção'],
  // silenciaria o cartaz vermelho do nominal: baseline estourado sairia verde.
  'nominal-cego': ["if (!Object.values(nomOk).every(Boolean)) console.error('RED nominal; mutante não aplicado');", "if (false) console.error('RED nominal; mutante não aplicado');", 'nominal rejeita ORC2 faltante'],
  // READY passaria sem a causa real do carregador.
  'ready-mentiroso': ["READY:cand.causa==='assets'", 'READY:true', 'READY inválido recusa cartaz'],
  // ORC2 deixaria de medir os inícios de cartaz por identidade.
  'orc2-mentiroso': ['ORC2:lazyPosterSubset(cand.posterProof,ref.posterProof)', 'ORC2:true', 'nominal rejeita ORC2 faltante'],
  // ORC3 deixaria de exigir fauna depois do último prop.
  'orc3-mentiroso': ['ORC3:cand.ultimoProp>0&&Number.isFinite(cand.primeiraFauna)&&cand.primeiraFauna>=cand.ultimoProp', 'ORC3:true', 'nominal rejeita ORC3 faltante'],
};

if (process.argv.includes('--mutantes')) {
  const run = args => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], { encoding: 'utf8', timeout: 60000, maxBuffer: 2000000 });
  const baseline = run([]); assert(baseline.status === 0 && !baseline.error && !baseline.signal, 'baseline válido');
  for (const [name, [, , clause]] of Object.entries(MUTANTES)) {
    const result = run([`--mutante=${name}`]), output = result.stdout + result.stderr;
    assert(result.status === 1 && !result.error && !result.signal && output.includes(`Mutação aplicada: ${name}`)
      && output.includes(`✗ ${clause}: `) && !/TypeError:|ReferenceError:|SyntaxError:/.test(output), `mutante exige prova semântica: ${name}`);
    console.log(`✓ veredicto: ${name} aplicado e detectado`);
  }
  console.log('veredicto: baseline verde e mutantes cegos: nenhum');
  process.exit(0);
}
if (mutation) {
  assert(Object.hasOwn(MUTANTES, mutation), 'mutante conhecido');
  const [before, after] = MUTANTES[mutation];
  assert.equal(source.split(before).length, 2, 'mutação única na fonte real');
  source = source.replace(before, after);
  console.log(`Mutação aplicada: ${mutation}`);
}

/* ---------- transformadores reais contra fontes reais ---------- */
const helpersBegin = source.indexOf('const ANSIOSO = '), helpersEnd = source.indexOf('\nconst PUBLIC_ROOT=', helpersBegin);
assert(helpersBegin >= 0 && helpersEnd > helpersBegin, 'fronteira real dos transformadores');
const helpers = vm.runInNewContext(source.slice(helpersBegin, helpersEnd) + '\n({poolAnsioso, faunaCedo, ANSIOSO, FAUNA_ADIADA})');
const textures = readFileSync(new URL('../../public/js/textures.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
let failures = 0;
for (const [name, task] of [
  ['cartaz transforma fonte real', () => assert.notEqual(helpers.poolAnsioso(textures), textures)],
  ['fauna transforma fonte real', () => assert.notEqual(helpers.faunaCedo(main), main)],
  ['cartaz rejeita âncora ausente', () => assert.throws(() => helpers.poolAnsioso(textures.replace(helpers.ANSIOSO, '')))],
  ['cartaz rejeita reaplicação', () => assert.throws(() => helpers.poolAnsioso(helpers.poolAnsioso(textures)))],
  ['fauna rejeita chamada ausente', () => assert.throws(() => helpers.faunaCedo(main.replace(helpers.FAUNA_ADIADA, '')))],
  ['fauna rejeita reaplicação', () => assert.throws(() => helpers.faunaCedo(helpers.faunaCedo(main)))],
]) {
  try { task(); console.log(`✓ ${name}`); }
  catch (error) { failures++; console.error(`✗ ${name}: ${error.name}: ${error.message.split('\n')[0]}`); }
}

/* ---------- a decisão real, executada de verdade ---------- */
const decBegin = source.indexOf('let saida=1;');
assert(decBegin >= 0, 'fronteira real do veredicto');
const teto = nome => source.match(new RegExp('const ' + nome + ' = ([0-9_]+);'));
assert(teto('TETO_BYTES') && teto('TETO_REQS'), 'tetos reais presentes');
const prova = started => ({ schema: 'boot-poster-proof/1', catalogue: ['p1', 'p2', 'p3'], started: [...started], intended: [...started], expected: [...started] });
const refAnsiosa = { causa: 'assets', bytes: 1_000_000, reqs: 10, posterProof: prova(['p1', 'p2', 'p3']), ultimoProp: 120, primeiraFauna: 400 }; // passada ansiosa: começou tudo
const cand = o => ({ causa: o.causa ?? 'assets', bytes: o.bytes ?? 1_000_000, reqs: o.reqs ?? 10, posterProof: o.posterProof, ultimoProp: o.ultimoProp ?? 120, primeiraFauna: o.primeiraFauna ?? 400 });
const lazyOk = prova(['p1']);            // subconjunto próprio da ansiosa → ORC2 ok
const cheia = prova(['p1', 'p2', 'p3']); // igual à ansiosa → ORC2 falso
const rodarDecisao = async ({ MUTANTE = '', exemplos: [nominal, referencia, mutante], medeFalha = false }) => {
  const context = {
    MUTANTE, aceitaMutante, lazyPosterSubset, SNAPSHOT: {}, BASE: 'https://example.test',
    TETO_BYTES: Number(teto('TETO_BYTES')[1].replaceAll('_', '')),
    TETO_REQS: Number(teto('TETO_REQS')[1].replaceAll('_', '')),
    console: { log() {}, error() {} }, browser: { close: async () => {} }, assertSnapshotLive() {},
    process: { exit(code) { context.saida = code; } },
  };
  context.mede = async (opcoes = {}) => {
    if (medeFalha) throw new Error('crash de prova');
    if (opcoes.refPoolAnsioso) return referencia;
    if (opcoes.mutante) return mutante;
    return nominal;
  };
  vm.createContext(context);
  // O bloco real (saida → process.exit) usa só as dependências injetadas acima.
  await vm.runInContext(`(async()=>{\n${source.slice(decBegin)}\n})()`, context);
  return context.saida;
};
const okCand = () => cand({ posterProof: lazyOk });
for (const [name, MUTANTE, exemplos, medeFalha, esperado] of [
  ['baseline verde', '', [okCand(), refAnsiosa, okCand()], false, 0],
  ['mutação ausente não é detecção', 'cartaz-ansioso', [okCand(), refAnsiosa, okCand()], false, 1],
  ['falha alheia não aceita mutante', 'cartaz-ansioso', [okCand(), refAnsiosa, cand({ bytes: 99_000_000, posterProof: lazyOk })], false, 1],
  ['fauna exige ORC3', 'fauna-cedo', [okCand(), refAnsiosa, cand({ posterProof: lazyOk, primeiraFauna: 100 })], false, 0],
  ['cartaz exige ORC2', 'cartaz-ansioso', [okCand(), refAnsiosa, cand({ posterProof: cheia })], false, 0],
  ['READY inválido recusa cartaz', 'cartaz-ansioso', [okCand(), refAnsiosa, cand({ causa: 'failsafe', posterProof: cheia })], false, 1],
  ['ORC1 pode acompanhar a falha esperada', 'cartaz-ansioso', [okCand(), refAnsiosa, cand({ bytes: 99_000_000, posterProof: cheia })], false, 0],
  ['crash não é detecção', 'cartaz-ansioso', [okCand(), refAnsiosa, okCand()], true, 3],
  ['nominal rejeita ORC2 faltante', '', [cand({ posterProof: cheia }), refAnsiosa, okCand()], false, 1],
  ['nominal rejeita ORC3 faltante', '', [cand({ posterProof: lazyOk, primeiraFauna: 100 }), refAnsiosa, okCand()], false, 1],
]) {
  let ret;
  try { ret = await rodarDecisao({ MUTANTE, exemplos, medeFalha }); assert.equal(ret, esperado, `saída ${ret}`); console.log(`✓ ${name}`); }
  catch (error) { failures++; console.error(`✗ ${name}: ${error.name}: ${error.message.split('\n')[0]} (esperado ${esperado})`); }
}
if (failures) process.exitCode = 1;
