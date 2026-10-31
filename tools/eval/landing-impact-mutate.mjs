/* Driver de mutação: baseline verde + 4 mutantes, cada um morto PELA cláusula própria.
   O check emite ERRO-ESTRUTURADO {assert, name, clause}; só status 1 + AssertionError +
   cláusula esperada conta como mutante morto. Infra (status 2, TypeError/ReferenceError/
   SyntaxError, signal, timeout, marker ausente) é recusada — não é vitória do contrato. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const MUTANTES = {
  'sem-impacto': 'dispatch deve expor força normalizada do pouso',
  'sem-agua': 'segundo pouso na água deve soltar 3 a 6 novas partículas',
  'altura-errada': 'divergiu da malha real de água',
  'sem-limpeza': 'dispose real: cada material próprio descartado exatamente 1 vez',
};

/* Classificação PURA do resultado de uma execução: devolve null (mutante morto pela
   cláusula certa) ou o motivo da recusa. Metatestada em --selftest sem subprocesso algum. */
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
  if (selftest) process.exit(0);
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
