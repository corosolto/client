#!/usr/bin/env node
/* ============================================================================
   mutacao-cega-check.mjs — A PROVA DE QUE A RÉGUA MORDE NÃO PODE SAIR VERDE
   ----------------------------------------------------------------------------
   A casa tem uma lei: régua que não morde não existe, e quem demonstra a mordida
   é o modo `--mutante=`. O problema achado em 21/08: cinco réguas imprimiam

     ✗ MUTAÇÃO 'x' não acendeu nenhuma cláusula — portão cego (lei 3)

   e logo abaixo chamavam `process.exit(falhas.length ? 1 : 0)`. Com a lista de
   falhas vazia — que é exatamente o caso do portão cego — o processo saía com
   ZERO. Quem roda a mutação num laço e confere o código de saída (o jeito óbvio de
   automatizar isso) via VERDE justamente na hora em que a régua se mostrou cega.

   A prova da mordida não pode ter o mesmo defeito que ela existe para caçar.

   MC1 · toda régua que anuncia mutação cega tem de REPROVAR nesse caso.

   Uso: node tools/eval/mutacao-cega-check.mjs [--mutante=exit-cego]
   ============================================================================ */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'tools/eval';
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && MUT !== 'exit-cego') { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const falhas = [];
let auditadas = 0;

for (const nome of readdirSync(DIR).filter((f) => f.endsWith('.mjs'))) {
  let texto = readFileSync(join(DIR, nome), 'utf8');
  if (MUT === 'exit-cego' && nome === 'docs-autoria-check.mjs') {
    texto = texto.replace(/\n\s*falhas\.push\('mutacao-cega'\);[^\n]*/, '');
  }

  /* Só interessa quem TEM o modo mutante e anuncia o caso cego: régua sem mutação
     não está mentindo sobre uma prova que não faz. */
  if (!/não acendeu nenhuma cláusula/.test(texto)) continue;
  auditadas++;

  /* Duas formas de fazer certo, e a casa já usa as duas: empurrar o caso na lista de
     falhas (telemetry-check) ou levar uma flag até o `process.exit`. O que não vale é
     imprimir o aviso e sair pelo `falhas.length`, que ali é zero por definição. */
  const depois = texto.slice(texto.indexOf('não acendeu nenhuma cláusula'));
  const entraNasFalhas = /falhas\.push/.test(depois.slice(0, 300));
  const saida = texto.match(/process\.exit(?:Code)?\s*[(=]\s*([^;)]*)\)?/g) || [];
  const flagNoExit = saida.some((e) => /mutacaoCega|cega/i.test(e));
  if (!entraNasFalhas && !flagNoExit) {
    falhas.push(`MC1 ${nome}: anuncia "portão cego" e sai por \`${saida[saida.length - 1] || 'nada'}\` — a lista de falhas está vazia nesse caso, então o processo sai VERDE`);
  }
}

if (!auditadas) falhas.push('MC1 nenhuma régua com modo mutante encontrada — a varredura perdeu o alvo');

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log(`  \x1b[32m✓\x1b[0m MC1 as ${auditadas} réguas com modo mutante reprovam quando a mutação não morde`);
const mutacaoCega = MUT && !falhas.length;
if (mutacaoCega) console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
process.exit(falhas.length || mutacaoCega ? 1 : 0);
