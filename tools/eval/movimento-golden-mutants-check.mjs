/* Prova causal das guardas de comparação do movimento-golden: truncamento, caso extra e
   valor não finito têm que reprovar SEM regravar o baseline (hash antes/depois). */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHECK = path.join(HERE, 'movimento-golden.mjs');
const BASELINE = path.join(HERE, 'movimento-golden.json');
const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const hash0 = sha(BASELINE);

let verdes = 0, vermelhas = 0;
const roda = (args, espera, frases, proibidas = []) => {
  const r = spawnSync(process.execPath, [CHECK, ...args], { encoding: 'utf8', timeout: 120_000 });
  const saida = (r.stdout || '') + (r.stderr || '');
  const nome = args.join(' ') || '(sem flags)';
  const problemas = [];
  if (r.status === null) problemas.push(`timeout/crash: signal=${r.signal}`);
  if (Array.isArray(espera) ? !espera.includes(r.status) : r.status !== espera) problemas.push(`exit ${r.status} (esperado ${espera})`);
  for (const f of frases) if (!saida.includes(f)) problemas.push(`faltou "${f}"`);
  for (const f of proibidas) if (saida.includes(f)) problemas.push(`saiu "${f}"`);
  const crash = /(^|\n)(Error|SyntaxError|TypeError|ReferenceError)[^\n]*\n\s+at /.test(saida);
  if (crash) problemas.push('stack de exceção não tratada');
  if (problemas.length) { vermelhas++; console.log(`XX ${nome}\n   ${problemas.join(' | ')}`); }
  else { verdes++; console.log(`ok ${nome} → exit ${r.status}`); }
};

const GUARDAS = ['comprimento de amostras divergiu', 'caso sem baseline', 'valor não finito', 'caso sumiu'];
const t0 = Date.now();
roda([], [0, 1], [], GUARDAS);   // valores podem divergir por drift de produto; a FORMA é o que se prova
roda(['--mutante=nao-finito'], 1, ['valor não finito (', '-> NaN)']);
const tReject = Date.now();
roda(['--mutar=0'], 2, ['--mutar=<n> exige número finito não nulo'], GUARDAS);
roda(['--mutar=abc'], 2, ['--mutar=<n> exige número finito não nulo'], GUARDAS);
if (Date.now() - tReject > 10_000) { vermelhas++; console.log('XX rejeição de --mutar demorou (deve ser pré-simulação)'); }
else verdes++, console.log('ok rejeição de --mutar é pré-simulação (rápida)');
roda(['--mutante=truncado'], 1, ['comprimento de amostras divergiu — baseline 36, atual 18']);
roda(['--mutante=caso-extra'], 1, ['caso sem baseline (rode --write): st-praca_poderes#12345']);
roda(['--mutante=inexistente'], 2, ['mutante desconhecido: inexistente']);
roda(['--mutante=truncado', '--write'], 2, ['--mutante com --write']);
roda(['--mutar=1'], 1, ['REPROVADO']);

if (sha(BASELINE) !== hash0) { vermelhas++; console.log(`XX baseline mudou no disco: ${hash0.slice(0, 12)} -> ${sha(BASELINE).slice(0, 12)}`); }
else { verdes++; console.log(`ok baseline intacto (sha256 ${hash0.slice(0, 12)}…)`); }

console.log(`\nmovimento-golden-mutants: ${verdes} ok, ${vermelhas} falha(s) [${((Date.now() - t0) / 1000).toFixed(1)} s]`);
process.exit(vermelhas ? 1 : 0);
