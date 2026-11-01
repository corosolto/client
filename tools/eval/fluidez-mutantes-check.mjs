// Cada alias executa seu baseline e exige morte semântica do mutante correspondente.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ALVOS = {
  movimento: { helper: 'movimento-fluidez-check.mjs', mutante: 'acel-dura', clausula: 'MVF_ACEL', detalhe: '__mutAccel=44' },
  mantle: { helper: 'mantle-fluidez-check.mjs', mutante: 'teleporte', clausula: 'MF_TRAJ', detalhe: '_stepMantle teleporte' },
};
const RESULTADO = 'FLUIDEZ_RESULT:';
const post = (a) => `POST ${a.helper} mutante=${a.mutante} aplicado ${a.detalhe}`;
function veredito(r, alvo, mutante = true) {
  const texto = `${r.stdout || ''}\n${r.stderr || ''}`;
  if (r.error || r.signal || /SyntaxError|ReferenceError|TypeError|setup:/.test(texto)) return false;
  const posts = texto.split('\n').filter((l) => l.startsWith('POST '));
  const registros = texto.split('\n').filter((l) => l.startsWith(RESULTADO));
  if (!mutante) return r.status === 0 && posts.length === 0 && registros.length === 0;
  if (r.status !== 1 || posts.length !== 1 || posts[0] !== post(alvo) || registros.length !== 1) return false;
  let d;
  try { d = JSON.parse(registros[0].slice(RESULTADO.length)); } catch { return false; }
  return d?.tool === alvo.helper && d.mutante === alvo.mutante && d.applied === true
    && d.tipo === 'AssertionError' && d.clausula === alvo.clausula;
}
function metaprova() {
  for (const alvo of Object.values(ALVOS)) {
    const d = { tool: alvo.helper, mutante: alvo.mutante, applied: true, tipo: 'AssertionError', clausula: alvo.clausula };
    const stderr = (record) => `${post(alvo)}\n${RESULTADO}${JSON.stringify(record)}\n`;
    const valido = { status: 1, error: null, signal: null, stdout: '', stderr: stderr(d) };
    assert.ok(veredito(valido, alvo), 'meta: mutante válido recusado');
    const falsos = [
      ...[0, 2, null].map((status) => ({ ...valido, status })),
      { ...valido, signal: 'SIGKILL' }, { ...valido, error: new Error('spawn') },
      { ...valido, error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }) },
      { ...valido, stderr: valido.stderr.split('\n').slice(1).join('\n') },
      { ...valido, stderr: valido.stderr + post(alvo) + '\n' },
      { ...valido, stderr: post(alvo) + '\n' },
      { ...valido, stderr: valido.stderr + RESULTADO + JSON.stringify(d) + '\n' },
      { ...valido, stderr: post(alvo) + '\n' + RESULTADO + '{\n' },
      ...[{ tool: 'outro' }, { mutante: 'outro' }, { applied: false }, { tipo: 'Error' }, { clausula: 'OUTRA' }]
        .map((delta) => ({ ...valido, stderr: stderr({ ...d, ...delta }) })),
      ...['TypeError', 'ReferenceError', 'SyntaxError', 'setup:'].map((erro) => ({ ...valido, stderr: valido.stderr + erro + '\n' })),
    ];
    falsos.forEach((r, i) => assert.ok(!veredito(r, alvo), `meta: falso positivo ${i}`));
    const base = { status: 0, error: null, signal: null, stdout: '', stderr: '' };
    assert.ok(veredito(base, alvo, false), 'meta: baseline válida recusada');
    for (const r of [{ ...base, status: 1 }, { ...base, signal: 'SIGTERM' }, { ...base, error: new Error('spawn') },
      { ...base, stderr: post(alvo) + '\n' }, { ...base, stderr: RESULTADO + '{}\n' }, { ...base, stderr: 'TypeError' }]) {
      assert.ok(!veredito(r, alvo, false), 'meta: baseline falsa aceita');
    }
  }
}
const args = process.argv.slice(2);
if (args.length !== 1 || (args[0] !== '--selftest' && !Object.hasOwn(ALVOS, args[0]))) {
  console.error('uso: fluidez-mutantes-check.mjs movimento|mantle|--selftest');
  process.exit(2);
}
metaprova();
if (args[0] === '--selftest') {
  console.log('VERDE fluidez: metaprova de mutantes e baselines');
} else {
  const alvo = ALVOS[args[0]];
  const executar = (argsFilho) => spawnSync(process.execPath,
    [fileURLToPath(new URL(alvo.helper, import.meta.url)), ...argsFilho],
    { timeout: 120000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' });
  const baseline = executar([]);
  assert.ok(veredito(baseline, alvo, false), `baseline inválida: ${alvo.helper}, status=${baseline.status}`);
  const mutante = executar([`--mutante=${alvo.mutante}`]);
  assert.ok(veredito(mutante, alvo), `mutante sem prova: ${alvo.mutante}, status=${mutante.status}, ${String(mutante.stderr).slice(-2500)}`);
  /* GLM-392 (lease 8988df95): append-only, SOMENTE no alias mantle, após baseline0/mutante1
     confirmados — o companheiro portátil normal0 cobre 50ms com seus próprios baseline,
     3 mutantes causais e controles; alias movimento e --selftest permanecem byte-idênticos. */
  if (args[0] === 'mantle') {
    const portatil = spawnSync(process.execPath,
      [fileURLToPath(new URL('mantle-dt-check.mjs', import.meta.url))],
      { timeout: 180000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' });
    assert.ok(portatil.status === 0 && !portatil.error && !portatil.signal && portatil.stderr === '',
      `mantle portátil 50ms falhou/infra: status=${portatil.status}, ${String(portatil.stderr).slice(-2500)}`);
    const linhas = String(portatil.stdout || '').split('\n');
    assert.ok(linhas.length === 3 && linhas[2] === '' && linhas[0].startsWith('DT50_392_PAIRS:')
      && linhas[1].startsWith('VERDE mantle-dt-check.mjs:'), 'protocolo integral do companheiro obrigatório');
    const cobertura = JSON.parse(linhas[0].slice('DT50_392_PAIRS:'.length));
    assert.ok(cobertura.tool === 'mantle-dt-check.mjs' && cobertura.baseline.A.dt === 1 / 60
      && cobertura.baseline.B.dt === 0.05 && cobertura.commonTimes.length === cobertura.baseline.B.updates
      && cobertura.wrongBaselineControl.death.clausula === 'MF50_DT', 'identidade/contraprova da cobertura ausentes');
  }
  console.log(`VERDE fluidez ${args[0]}: baseline0, mutante1/${alvo.clausula}, POST e resultado únicos; metaprova verde`);
}
