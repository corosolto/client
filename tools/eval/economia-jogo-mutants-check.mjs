// Exige classificação e exit exatos; crash e timeout não contam como detecção.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
