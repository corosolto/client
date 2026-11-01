/* Driver de mutação: baseline verde + 4 mutantes, cada um morto PELA cláusula própria.
   O check emite ERRO-ESTRUTURADO {assert, name, clause}; só status 1 + AssertionError +
   cláusula esperada conta como mutante morto. Infra (status 2, TypeError/ReferenceError/
   SyntaxError, signal, timeout, marker ausente) é recusada — não é vitória do contrato. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MUTANTES = {
  'sem-impacto': 'dispatch deve expor força normalizada do pouso',
  'sem-agua': 'segundo pouso na água deve soltar 3 a 6 novas partículas',
  'altura-errada': 'divergiu da malha real de água',
  'sem-limpeza': 'dispose real: cada material próprio descartado exatamente 1 vez',
};

/* Classificação PURA do resultado de uma execução: devolve null (mutante morto pela
   cláusula certa) ou o motivo da recusa. --selftest inclui controles puros e filhos reais. */
export function classify({ status, signal, error, applied, structured, esperada }) {
  if (error) return 'erro de spawn/buffer/timeout';
  if (!applied) return 'mutação sem marcador de aplicação';
  if (signal) return `mutante morto por sinal ${signal} (não é a cláusula)`;
  if (status === null) return 'mutante estourou o timeout';
  if (status === 0) return 'mutante sobreviveu ao contrato';
  if (status !== 1) return `status inesperado ${status} (2 = infra/setup)`;
  if (!structured) return 'saída sem ERRO-ESTRUTURADO (marker ausente)';
  if (structured.assert !== 'assertion' || structured.name !== 'AssertionError') return `erro de preparação (${structured.name}), não asserção do contrato`;
  if (!String(structured.clause || '').includes(esperada)) {
    return `falhou fora da cláusula esperada "${esperada}": ${structured.clause}`;
  }
  return null;
}

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const desconhecidos = args.filter((a) => a !== '--selftest');
if (desconhecidos.length) {
  console.error(`argumento desconhecido: ${desconhecidos[0]} (use --selftest)`);
  process.exit(2);
}

{
  const esperada = MUTANTES['sem-agua'];
  const ok = { status: 1, signal: null, error: null, applied: true, structured: { assert: 'assertion', name: 'AssertionError', clause: `x: ${esperada} y` }, esperada };
  const falsos = [
    { ...ok, error: new Error('spawn') },
    { ...ok, applied: false },
    { ...ok, structured: { ...ok.structured, assert: 'infra' } },
    { ...ok, status: 0 },
    { ...ok, status: 2 },
    ...['TypeError', 'ReferenceError', 'SyntaxError'].map((name) => ({ ...ok, structured: { ...ok.structured, name } })),
    { ...ok, structured: null },
    { ...ok, structured: { ...ok.structured, clause: 'outra cláusula' } },
    { ...ok, status: null },
    { ...ok, signal: 'SIGTERM' },
    { ...ok, signal: 'SIGKILL' },
  ];
  assert.equal(classify(ok), null, 'controle válido foi recusado');
  falsos.forEach((caso, i) =>
    assert(classify(caso), `falso positivo aceito no caso ${i}: ${JSON.stringify(caso)}`));
  console.log('SELFTEST landing-impact-mutate: controle válido passa, infra não vira vitória');
  if (selftest) {
    /* Usa o handler extraído da fonte atual em filhos Node, sem boot/Game.
       Error com name forjado deve sair infra2 e ser recusado por classify. */
    const src = readFileSync('tools/eval/landing-impact-check.mjs', 'utf8');
    const ini = src.indexOf('const estruturar = (err) => ({');
    const fim = src.indexOf('const game = bootGame(');
    assert(ini !== -1 && fim !== -1 && fim > ini, 'contraprova: âncoras exatas do handler não encontradas na fonte atual');
    const bloco = src.slice(ini, fim);
    const clausula = 'contraprova-373 cláusula própria do contrato de pouso';
    const casos = [
      { id: 'nativa-assertionerror', evento: 'throw', esperado: 1, erro: 'const e = new assert.AssertionError({ message: CLAUSULA });' },
      { id: 'forjada-name-only', evento: 'reject', esperado: 2, erro: 'const e = new Error(CLAUSULA); e.name = "AssertionError";' },
      { id: 'TypeError', evento: 'reject', esperado: 2, erro: 'const e = new TypeError("infra própria de tipagem");' },
      { id: 'ReferenceError', evento: 'throw', esperado: 2, erro: 'const e = new ReferenceError("infra própria de referência");' },
      { id: 'SyntaxError', evento: 'throw', esperado: 2, erro: 'const e = new SyntaxError("infra própria de sintaxe");' },
    ];
    for (const c of casos) {
      const prog = 'const assert = require("node:assert/strict");\n'
        + 'const CLAUSULA = ' + JSON.stringify(clausula) + ';\n'
        + 'const estruturar = new Function("assert", ' + JSON.stringify(bloco) + ' + "\\n;return estruturar;")(assert);\n'
        + c.erro + '\n'
        + (c.evento === 'throw' ? 'throw e;' : 'Promise.reject(e);');
      const r = spawnSync(process.execPath, ['-e', prog], { encoding: 'utf8', timeout: 10_000, maxBuffer: 1024 * 1024 });
      const out = `${r.stdout || ''}\n${r.stderr || ''}`;
      assert(!r.error && !r.signal, `contraprova ${c.id}: spawn falhou (${r.error || r.signal})`);
      const linha = out.split('\n').reverse().find((l) => l.startsWith('ERRO-ESTRUTURADO '));
      assert(linha, `contraprova ${c.id}: handler real não emitiu ERRO-ESTRUTURADO`);
      const recibo = JSON.parse(linha.slice('ERRO-ESTRUTURADO '.length));
      assert.equal(r.status, c.esperado, `contraprova ${c.id}: exit esperado ${c.esperado}, saiu ${r.status}; recibo ${JSON.stringify(recibo)} (defeito name-only daria exit ${c.esperado === 2 ? 1 : 2})`);
      if (c.esperado === 1) assert.equal(recibo.assert, 'assertion', `contraprova ${c.id}: recibo ${JSON.stringify(recibo)}`);
      else assert.equal(recibo.assert, 'infra', `contraprova ${c.id}: handler aceitou erro não-AssertionError (${JSON.stringify(recibo)}) — defeito name-only`);
      const veredito = classify({ status: r.status, signal: r.signal, error: r.error, applied: true, structured: recibo, esperada: clausula });
      if (c.esperado === 1) assert.equal(veredito, null, `contraprova ${c.id}: classify recusou recibo válido (${veredito})`);
      else assert(veredito, `contraprova ${c.id}: classify aceitou recibo de infra`);
    }
    console.log(`SELFTEST contraprova-373: handler real extraído recusou forjado/infra e aceitou só AssertionError nativo (${casos.length} casos, uncaughtException + unhandledRejection)`);
    process.exit(0);
  }
}

const TIMEOUT_MS = 120_000, MAX_BUF = 8 * 1024 * 1024;
const runCheck = (simMutante) => {
  const r = spawnSync(process.execPath, [
    '--loader', './tools/eval/landing-impact-loader.mjs',
    'tools/eval/landing-impact-check.mjs',
  ], { cwd: process.cwd(), encoding: 'utf8', timeout: TIMEOUT_MS, maxBuffer: MAX_BUF, env: { ...process.env, SIM_MUTANTE: simMutante } });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  let structured = null;
  const linha = out.split('\n').reverse().find((l) => l.startsWith('ERRO-ESTRUTURADO '));
  if (linha) {
    try { structured = JSON.parse(linha.slice('ERRO-ESTRUTURADO '.length)); } catch { structured = null; }
  }
  const applied = out.includes(`MUTACAO_POUSO_APLICADA:${simMutante}`);
  return { status: r.status, signal: r.signal, error: r.error, applied, out, structured };
};

const base = runCheck('');
if (base.error || base.signal || base.status !== 0) {
  throw new Error(`baseline sem mutante deve sair verde:\n${base.out.slice(-1200)}`);
}
for (const [nome, esperada] of Object.entries(MUTANTES)) {
  const r = runCheck(nome);
  const problema = classify({ status: r.status, signal: r.signal, error: r.error, applied: r.applied, structured: r.structured, esperada });
  if (problema) throw new Error(`mutante ${nome}: ${problema}\n${r.out.slice(-1200)}`);
  console.log(`MUTANTE ${nome} morto pela cláusula "${esperada}"`);
}
console.log(`MUTAÇÃO landing-impact: baseline verde + ${Object.keys(MUTANTES).length} mutantes mortos pela cláusula certa`);
