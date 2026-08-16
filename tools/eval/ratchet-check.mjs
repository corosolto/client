/* Impede que KNOWN-RED cresça sem a justificativa definida em
   docs/issues/24-o-ratchet-de-dividas-so-cresce.md. */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const BASE = val('base', 'origin/main');

const IDs = (json) => Object.keys(json.dividas || {});

let atual;
try {
  atual = JSON.parse(readFileSync(new URL('./KNOWN-RED.json', import.meta.url), 'utf8'));
} catch (e) {
  console.error('✗ RAT0  não consegui ler tools/eval/KNOWN-RED.json:', e.message);
  process.exit(1);
}

let baseIDs = null;
try {
  const txt = execSync(`git show ${BASE}:tools/eval/KNOWN-RED.json`, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  baseIDs = IDs(JSON.parse(txt));
} catch (e) {
  console.error(`✗ RAT0  não consegui ler KNOWN-RED.json da base ${BASE}:`, e.message.split('\n')[0]);
  process.exit(1);
}

const atuais = new Set(IDs(atual));
const entradas = baseIDs ? baseIDs.filter((id) => !atuais.has(id)) : [];   // quitadas
const novas = baseIDs ? [...atuais].filter((id) => !baseIDs.includes(id)) : [];   // novas dívidas

const body = process.env.PR_BODY || '';
let cerca = null;
const declaracoes = body.split(/\r?\n/).map((linha) => {
  const marcador = linha.match(/^ {0,3}(`{3,}|~{3,})/)?.[1];
  if (!cerca && marcador) {
    cerca = { caractere: marcador[0], tamanho: marcador.length };
    return '';
  }
  if (cerca) {
    const fechamento = linha.match(/^ {0,3}(`+|~+)[ \t]*$/)?.[1];
    if (fechamento?.[0] === cerca.caractere && fechamento.length >= cerca.tamanho) cerca = null;
    return '';
  }
  return linha;
}).join('\n').replace(/<!--[\s\S]*?(?:-->|$)/g, '');
const motivos = new Map();
for (const m of declaracoes.matchAll(/^ratchet:\s*([+-]?)([A-Z0-9_]+)(?:\s+porque\s+(.+))?\s*$/gim)) {
  motivos.set(m[2].toUpperCase(), { libera: m[1] === '+', motivo: m[3] || '' });
}

console.log(`RÉGUA DE RATCHET   base ${BASE}\n`);
console.log(`Dívidas na main:   ${baseIDs ? baseIDs.length : 'n/d'}   no PR: ${atuais.size}`);

const semMotivo = novas.filter((id) => !motivos.has(id) || !motivos.get(id).libera || !motivos.get(id).motivo.trim());
console.log(`\nR1 · entradas NOVAS no KNOWN-RED: ${novas.length}`);
if (novas.length) console.log(`     ${novas.join(', ')}`);
for (const id of novas) {
  const ok = motivos.has(id) && motivos.get(id).libera && motivos.get(id).motivo.trim();
  console.log(`   · ${id}  ${ok ? 'liberada por ratchet: motivo presente' : 'REPROVA — precisa de ratchet: +ID porque <motivo>'}`);
}
console.log(`     ${semMotivo.length === 0 ? 'PASSA' : 'FALHA'}\n`);

console.log(`R2 · entradas REMOVIDAS (quitação): ${entradas.length}`);
if (entradas.length) console.log(`     ${entradas.join(', ')} — saíram da dívida`);
console.log(`     PASSA\n`);

console.log(`R3 · saldo: +${novas.length} novas, −${entradas.length} quitadas → ${novas.length - entradas.length} líquido`);

const passou = semMotivo.length === 0;
console.log(`\n${passou
  ? '✓ RATC1  ratchet só andou para frente (novas justificadas ou ausentes)'
  : '✗ RATC1  dívida nova sem motivo escrito — escreva ratchet: +<ID> porque <motivo> no corpo do PR'}`);
process.exit(passou ? 0 : 1);
