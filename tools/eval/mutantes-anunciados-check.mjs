#!/usr/bin/env node
/* ============================================================================
   mutantes-anunciados-check.mjs — O CABEÇALHO NÃO PODE ANUNCIAR MUTANTE QUE NÃO RODA
   ----------------------------------------------------------------------------
   ACHADO NA #1132: o comentário `"//eval:community-inbox"` anunciava 12 mutantes
   no campo "Mutantes: a, b, c…", mas o script `"eval:community-inbox"` só
   executava 5 — e um desses 5 (`portao-mudo`) nem estava no cabeçalho. Quem lia
   o package.json acreditava que a central de mensagens tinha 12 réguas de
   mutação provadas; o CI só cobrava 5 clausuras. Falso-verde de documentação:
   nenhum código mentia, só o comentário que descreve o que o script faz.

   MA1 · todo mutante que o cabeçalho `//eval:X` anuncia (`Mutante(s): a, b, c`)
         aparece como `--mutant=`/`--mutante=` em algum ponto da cadeia do
         script `eval:X`. Anunciar sem ligar é a mentira original da #1132.
   MA2 · todo `--mutant=`/`--mutante=` que o script `eval:X` executa está
         listado no cabeçalho. Ligar sem anunciar é a mesma mentira de ponta-
         cabeça — ninguém lendo o comentário sabe que aquela cláusula já está
         coberta (era o caso do `portao-mudo`, consertado na própria #1132).

   DÍVIDA (ver `DIVIDA_MA1` abaixo): ao escrever esta régua sobre o package.json
   INTEIRO (não só o community-inbox), apareceram pares que já divergiam antes
   da #1132 — `eval:smoke`, `eval:chao`, `eval:vm-teto`, `eval:vm-placar`,
   `eval:mprecuo` e `eval:tprajada` anunciam mutante(s) que o próprio script
   nunca executa. Não é o pedido desta issue (que é só o community-inbox) e por
   isso não foram religados aqui. Entram como DÍVIDA (aviso, não reprova); uma
   crítica FORA dessa lista reprova de verdade. Quando a régua citada ligar o
   mutante, REMOVA a entrada.
   MA3 · toda entrada da dívida ainda é dívida: o cabeçalho anuncia e a cadeia
         não roda. Entrada quitada que fica na lista vira licença para o mesmo
         mutante ser desligado de novo em silêncio, então reprova até sair.

   Uso: node tools/eval/mutantes-anunciados-check.mjs [--mutante=anuncia-fantasma|executa-fantasma|divida-quitada]
   ============================================================================ */
import { readFileSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = { 'anuncia-fantasma': 'MA1', 'executa-fantasma': 'MA2', 'divida-quitada': 'MA3' };
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = { ...pkg.scripts };

/* Mutantes desta própria prova: uma régua-fake, nunca executada de verdade
   (só o TEXTO entra na análise — esta régua não roda `npm run`, só lê string),
   que prova que MA1/MA2 mordem sem precisar sujar um par real. */
if (MUT === 'anuncia-fantasma') {
  // anuncia `fantasma-nao-ligado` e não roda --mutant(e)= nenhum: MA1 tem de acender.
  scripts['//eval:__mutante_fake__'] = 'Régua fake só desta prova. Mutante: fantasma-nao-ligado.';
  scripts['eval:__mutante_fake__'] = 'node tools/eval/__nao_existe__.mjs';
} else if (MUT === 'executa-fantasma') {
  // anuncia só `real` mas a cadeia roda `real` E `fantasma-extra`: MA2 tem de acender.
  scripts['//eval:__mutante_fake__'] = 'Régua fake só desta prova. Mutante: real.';
  scripts['eval:__mutante_fake__'] = 'node tools/eval/__nao_existe__.mjs --mutant=real && node tools/eval/__nao_existe__.mjs --mutant=fantasma-extra';
}

/* Dívida pré-existente (ver cabeçalho). Chave = script `eval:X`, valor = lista
   de mutantes que o cabeçalho anuncia e o script ainda não executa. */
const DIVIDA_MA1 = {
  'eval:smoke': ['fumaca', 'sem-fx', 'sem-tracer', 'sem-nuvem', 'transparente', 'acima-do-ceu', 'enterrada', 'tracer-fantasma', 'fumaca-no-impacto', 'clarao-grande'],
  'eval:chao': ['afunda'],
  'eval:vm-teto': ['sem-teto'],
  'eval:vm-placar': ['placar-velho', 'sem-dono', 'chave-ligada', 'celula-nova'],
  'eval:mprecuo': ['semrecuo'],
  'eval:tprajada': ['fade'],
};
if (MUT === 'divida-quitada') {
  // põe na dívida um mutante que a cadeia já roda: MA3 tem de acender.
  DIVIDA_MA1['eval:community-inbox'] = ['unsafe-text'];
}

/* `"Mutantes: a, b e c."` → ['a','b','c']. Tolera o conector "e" antes do
   último item e um parêntese explicativo colado no fim (caso do vm-placar). */
function mutantesDeclarados(comentario) {
  const m = comentario.match(/Mutantes?:\s*(.+)$/is);
  if (!m) return [];
  const lista = m[1].replace(/\([^)]*\)/g, '').replace(/\.$/, '').trim();
  const partes = lista.split(',').map((s) => s.trim()).filter(Boolean);
  if (partes.length) {
    const ultima = partes[partes.length - 1];
    const dividida = ultima.split(/\s+e\s+/);
    if (dividida.length === 2) {
      partes[partes.length - 1] = dividida[0].trim();
      partes.push(dividida[1].trim());
    }
  }
  return partes.filter(Boolean);
}

/* Todo `--mutant=x`/`--mutante=x` citado na cadeia do script, dentro ou fora
   de uma negação `!`. */
function mutantesExecutados(script) {
  return [...new Set([...String(script).matchAll(/--mutant[e]?=([a-zA-Z0-9_-]+)/g)].map((x) => x[1]))];
}

const falhas = [];
const dividas = [];
let auditados = 0;
const dividaVista = new Set();

for (const [chave, valor] of Object.entries(scripts)) {
  if (!chave.startsWith('//')) continue;
  if (!/mutantes?:/i.test(String(valor))) continue;
  auditados++;

  const scriptKey = chave.slice(2);
  const scriptVal = scripts[scriptKey] || '';
  if (!scripts[scriptKey]) {
    falhas.push(`MA0 \`${chave}\` descreve mutantes mas \`${scriptKey}\` não existe em scripts`);
    continue;
  }

  const declarados = mutantesDeclarados(String(valor));
  const executados = mutantesExecutados(scriptVal);
  const declaradosSet = new Set(declarados);
  const executadosSet = new Set(executados);
  const divida = new Set(DIVIDA_MA1[scriptKey] || []);

  for (const m of declarados) {
    if (executadosSet.has(m)) continue;
    if (divida.has(m)) dividas.push(`${scriptKey} anuncia \`${m}\` mas não executa (DÍVIDA conhecida, fora do pedido da #1132)`);
    else falhas.push(`MA1 ${scriptKey} anuncia \`${m}\` no cabeçalho mas a cadeia não roda --mutant(e)=${m} — mutante fantasma`);
  }
  for (const m of executados) {
    if (!declaradosSet.has(m)) {
      falhas.push(`MA2 ${scriptKey} roda --mutant(e)=${m} mas o cabeçalho não anuncia esse mutante — cobertura real escondida de quem lê o package.json`);
    }
  }
  for (const m of divida) {
    dividaVista.add(`${scriptKey}/${m}`);
    if (executadosSet.has(m)) falhas.push(`MA3 ${scriptKey}/${m} já executa — remova de DIVIDA_MA1 em tools/eval/mutantes-anunciados-check.mjs`);
    else if (!declaradosSet.has(m)) falhas.push(`MA3 ${scriptKey}/${m} saiu do cabeçalho — remova de DIVIDA_MA1 em tools/eval/mutantes-anunciados-check.mjs`);
  }
}
for (const [scriptKey, lista] of Object.entries(DIVIDA_MA1))
  for (const m of lista)
    if (!dividaVista.has(`${scriptKey}/${m}`)) falhas.push(`MA3 ${scriptKey}/${m} está em DIVIDA_MA1 mas o cabeçalho \`//${scriptKey}\` não existe ou não lista mutantes — remova a entrada`);

if (!auditados) falhas.push('MA0 nenhum cabeçalho `//eval:X` com "Mutante(s):" encontrado — a varredura perdeu o alvo');

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
for (const d of dividas) console.log(`  \x1b[33m≈\x1b[0m DÍVIDA ${d}`);
if (!falhas.length) {
  console.log(`  \x1b[32m✓\x1b[0m MA ${auditados} cabeçalho(s) com "Mutante(s):" batem com o que a cadeia executa`
    + (dividas.length ? ` (${dividas.length} dívida(s) conhecida(s), não reprovam)` : ''));
}

const mutacaoCega = MUT && !falhas.length;
if (mutacaoCega) console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
process.exit(falhas.length || mutacaoCega ? 1 : 0);
