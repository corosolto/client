import { readFileSync } from 'node:fs';
import { ALLOWLIST, allowlisted, validateAllowlist } from './cf-paridade-allowlist.mjs';

const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10) || '';
const resultadoArg = process.argv.find((arg) => arg.startsWith('--resultado='))?.slice(12) || '';
if (mutant && mutant !== 'rota-ausente') throw new Error(`mutante desconhecido: ${mutant}`);

if (mutant === 'rota-ausente') {
  const entries = structuredClone(ALLOWLIST.entries);
  entries[0].rotas[0] = '/rota-removida-pelo-mutante';
  const errors = validateAllowlist(entries);
  if (!errors.some((error) => error.includes('rota não existe'))) {
    throw new Error('mutante rota-ausente sobreviveu');
  }
  console.log('mutante rota-ausente reprovado como devia');
  process.exit(1);
}

if (!resultadoArg) process.exit(0);
const result = JSON.parse(readFileSync(resultadoArg, 'utf8'));
if (!Array.isArray(result.linhas)) throw new Error('resultado de paridade sem linhas');
const unexpected = result.linhas.filter((row) => allowlisted(row).length === 0 && (row.prod !== row.alvo || row.diferentes.length));
for (const row of result.linhas) {
  const allowed = allowlisted(row);
  if (allowed.length) console.log(`allowlist: ${row.rota} — ${allowed.map((entry) => entry.reason).join(' / ')}`);
}
if (unexpected.length) {
  console.error(`cf-paridade: ${unexpected.length} divergência(s) fora da allowlist`);
  for (const row of unexpected) console.error(`- ${row.rota}: prod=${row.prod} alvo=${row.alvo} ${row.diferentes.join('; ')}`);
  process.exit(1);
}
console.log(`cf-paridade: ${result.linhas.length} rotas, nenhuma divergência fora da allowlist`);
