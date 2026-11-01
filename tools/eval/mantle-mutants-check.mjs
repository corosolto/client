/* Prova causal dos mutantes do mantle-check: exit esperado por caso, cláusula alvo,
   'falha de ARNÊS' proibida em mutante semântico e trecho de saída quando falha. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHECK = path.join(HERE, 'mantle-check.mjs');
const ARNES = ['falha de ARNÊS', 'amostra abortada'];

let verdes = 0, vermelhas = 0;
const roda = (args, espera, frases, proibidas = [], env = {}) => {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [CHECK, ...args], { cwd: path.resolve(HERE, '../..'), encoding: 'utf8', timeout: 600_000, env: { ...process.env, ...env } });
  const stdout = r.stdout || '', stderr = r.stderr || '';
  const saida = stdout + stderr;
  const problemas = [];
  if (r.status === null) problemas.push(`crash/timeout: signal=${r.signal}`);
  if (Array.isArray(espera) ? !espera.includes(r.status) : r.status !== espera) problemas.push(`exit ${r.status} (esperado ${espera})`);
  for (const f of frases) if (!saida.includes(f)) problemas.push(`faltou "${f}"`);
  for (const f of proibidas) if (saida.includes(f)) problemas.push(`saiu "${f}"`);
  if (/(^|\n)(Error|SyntaxError|TypeError|ReferenceError)[^\n]*\n\s+at /.test(saida)) problemas.push('stack não tratada');
  const dt = ((Date.now() - t0) / 1000).toFixed(0);
  if (problemas.length) {
    vermelhas++;
    console.log(`XX ${args.join(' ')} [${dt}s]\n   ${problemas.join(' | ')}`);
    const trecho = saida.split('\n').filter((l) => l.trim()).slice(-25).join('\n');
    if (trecho) console.log(`   --- saída (últimas 25 linhas) ---\n${trecho.split('\n').map((l) => '   ' + l).join('\n')}`);
  } else { verdes++; console.log(`ok ${args.join(' ')} → exit ${r.status} [${dt}s]`); }
};

roda(['corrego'], 0, ['VERDE — as três cláusulas passam'], ARNES);
roda(['corrego', '--mutante=beirada-baixa'], 1, ['VERMELHO:', 'MNT2 —'], [...ARNES, 'selftest', 'régua cega']);
roda(['lajes', '--mutante=beirada-alta'], 1, ['VERMELHO:', 'MNT3 —', 'TERRITÓRIO NOVO'], ARNES);
roda(['lajes', '--mutante=travessia-congelada'], 1, ['VERMELHO:', 'MNT2 —'], [...ARNES, 'VERDE — as três cláusulas']);
/* canal-fechado: contrato declarado na fonte — aplicado de verdade (ID canônico corrego),
   mantle LIGADO volta VERDE (o conserto medido) e DESLIGADO acende MNT1. */
roda(['corrego', '--mutante=canal-fechado'], 0, ['VERDE — as três cláusulas passam'], ARNES);
roda(['corrego', '--mutante=canal-fechado'], 1, ['VERMELHO:', 'MNT1 —'], ARNES, { SIM_QS: '?mantle=0' });
/* pouso-nan: contraprova causal do guard de finitude — mantle real encerrado, pose NaN,
   MNT2 tem que reprovar SEM classificar como ARNÊS (não há exceção do motor). */
roda(['corrego', '--mutante=pouso-nan'], 1, ['VERMELHO:', 'MNT2 —'], [...ARNES, 'VERDE — as três cláusulas']);
/* mutante pedido e não aplicado é falha de ARNÊS fail-closed, nunca verde */
roda(['lajes', '--mutante=canal-fechado'], 1, ['VERMELHO:', 'NÃO aplicado em nenhum mapa — falha de ARNÊS'], ['VERDE — as três cláusulas']);
roda(['corrego', '--mutante=inexistente'], 2, ['mutante desconhecido: inexistente']);
/* CONTROLE NEGATIVO de classificação: exceção do motor é ARNÊS, jamais mordida de jogo. */
roda(['corrego', '--mutante=motor-explode'], 1,
  ['VERMELHO:', 'MNT2 — amostra abortada por EXCEÇÃO do motor (falha de ARNÊS, não cláusula): mutante causal: _updatePlayer explodiu'],
  ['stack não tratada']);
/* contaminação: beirada-alta + exceção de motor ao mesmo tempo — o texto de ARNÊS APARECE
   junto do MNT3, e é exatamente por isso que a proibição ampla acima tem dente. */
roda(['lajes', '--mutante=beirada-alta', '--mutante=motor-explode'], 1,
  ['VERMELHO:', 'MNT3 —', 'falha de ARNÊS, não cláusula'],
  ['stack não tratada']);

console.log(`\nmantle-mutants: ${verdes} ok, ${vermelhas} falha(s)`);
process.exit(vermelhas ? 1 : 0);
