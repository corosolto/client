// Exige classificação e exit exatos; crash e timeout não contam como detecção.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { classificarMutanteIsolado, rodarMutanteIsolado } from './economia-jogo-isolado.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHECK = path.join(HERE, 'economia-jogo-check.mjs');

let verdes = 0, vermelhas = 0;
const roda = (args, espera, frases, proibidas = []) => {
  const r = spawnSync(process.execPath, [CHECK, ...args], { cwd: path.resolve(HERE, '../..'), encoding: 'utf8', timeout: 300_000 });
  const saida = (r.stdout || '') + (r.stderr || '');
  const problemas = [];
  if (r.status === null) problemas.push(`crash/timeout: signal=${r.signal}`);
  if (Array.isArray(espera) ? !espera.includes(r.status) : r.status !== espera) problemas.push(`exit ${r.status} (esperado ${espera})`);
  for (const f of frases) if (!saida.includes(f)) problemas.push(`faltou "${f}"`);
  for (const f of proibidas) if (saida.includes(f)) problemas.push(`saiu "${f}"`);
  if (problemas.length) { vermelhas++; console.log(`XX ${args.join(' ')} → exit ${r.status}\n   ${problemas.join(' | ')}`); }
  else { verdes++; console.log(`ok ${args.join(' ')} → exit ${r.status}`); }
};

// Protocolo do processo: saída correta com status errado nunca vira detecção.
try {
  const nome = 'sem-perda', linha = `mutante ${nome}: DETECTADO (EJ6 {})`;
  const resumo = 'economia no jogo: 3/3 verdes; mutantes cegos: nenhum; cant_test: nenhum';
  const ok = { status: 0, signal: null, stdout: `${linha}\n${resumo}`, stderr: '' };
  assert.equal(classificarMutanteIsolado(nome, ok, 3).estado, 'detectado');
  for (const alteracao of [
    { status: 1 }, { status: null, signal: 'SIGABRT' },
    { error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }) },
    { stdout: `${linha}\n${resumo.replace('3/3', '2/3')}` },
    { stdout: `${linha}\n${linha}\n${resumo}` },
    { stdout: `${linha.replace(nome, 'outro')}\n${resumo}` },
    { stdout: linha }, { stdout: resumo },
  ]) assert.equal(classificarMutanteIsolado(nome, { ...ok, ...alteracao }, 3).estado, 'cant_test');
  assert.equal(classificarMutanteIsolado(nome, { ...ok, status: 1,
    stdout: `mutante ${nome}: VERDE, régua cega\n${resumo.replace('cegos: nenhum', `cegos: ${nome}`)}` }, 3).estado, 'cego');
  const dir = mkdtempSync(path.join(tmpdir(), 'economia-isolado-'));
  try {
    const worker = path.join(dir, 'worker.mjs');
    writeFileSync(worker, `console.log('mutante sem-perda: DETECTADO (EJ6 ' + JSON.stringify({pid: process.pid}) + ')');\nconsole.log(${JSON.stringify(resumo)});`);
    const processos = [rodarMutanteIsolado(worker, nome, 3), rodarMutanteIsolado(worker, nome, 3)];
    assert(processos.every(r => r.estado === 'detectado' && r.pid !== process.pid
      && JSON.parse(r.linha.slice(r.linha.indexOf('{'), -1)).pid === r.pid));
    assert.notEqual(processos[0].pid, processos[1].pid);
    const morto = path.join(dir, 'signal.mjs');
    writeFileSync(morto, "process.kill(process.pid, 'SIGTERM');");
    const crash = rodarMutanteIsolado(morto, nome, 3);
    assert.equal(crash.estado, 'cant_test');
    assert(crash.linha.includes('signal=SIGTERM'));

  } finally { rmSync(dir, { recursive: true, force: true }); }
  verdes++; console.log('ok isolamento: processos distintos e falhas parciais recusadas');
} catch (e) { vermelhas++; console.log(`XX isolamento: ${e.message}`); }

/* Sucesso nominal do mutante semântico: baseline íntegra + DETECTADO pela cláusula EJ6. */
roda(['--mutante=sem-perda'], 0,
  ['mutante sem-perda: DETECTADO (EJ6', 'mutantes cegos: nenhum', 'cant_test: nenhum'],
  ['régua cega', 'CANT_TEST', 'XX ']);
/* Controle negativo: exceção do arnês é CANT_TEST fail-closed, nunca mordida. */
roda(['--mutante=boot-explode'], 1,
  ['mutante boot-explode: CANT_TEST — exceção do arnês sob mutante', 'cant_test: boot-explode'],
  ['mutante boot-explode: DETECTADO', 'mutante boot-explode: VERDE']);
roda(['--mutante=inexistente'], 1, ['Mutante desconhecido: inexistente']);

console.log(`\neconomia-jogo-mutants: ${verdes} ok, ${vermelhas} falha(s)`);
process.exit(vermelhas ? 1 : 0);
