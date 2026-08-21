#!/usr/bin/env node
/* ============================================================================
   workflow-secret-check.mjs — PORTÃO QUE NÃO PODE MEDIR NÃO VOTA
   ----------------------------------------------------------------------------
   MEDIDO EM 21/08/2026, nos últimos 29 PRs: `classify` vermelho em 11 dos 14 PRs
   vindos de FORK e em 0 dos 15 de casa. A causa não era o código de ninguém.

   A regra do GitHub: um workflow disparado por `pull_request`, `pull_request_review`
   ou `pull_request_review_comment` a partir de um FORK roda SEM os secrets do
   repositório. Só `pull_request_target`, `workflow_dispatch`, `schedule` e
   `workflow_run` correm no contexto base e enxergam secret.

   Um job que (a) escuta um desses gatilhos cegos e (b) sai com erro quando o secret
   está vazio, reprova todo PR externo por um motivo que o autor não tem como
   consertar - e ainda ensina o time a ignorar vermelho, que é o dano caro.

   O QUE ESTA RÉGUA EXIGE: se o job pode ser disparado por gatilho cego, ele precisa
   de um `if:` que o exclua desse caso. O guard de secret continua podendo existir e
   continuar falhando alto onde o secret DEVERIA estar lá.

   Uso: node tools/eval/workflow-secret-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = '.github/workflows';
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = { 'guard-sem-if': 'WSEC1', 'gatilho-cego-novo': 'WSEC1' };
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

/* Gatilhos que, num PR de fork, chegam sem secret. `pull_request` entra na lista
   porque é o caso clássico; os outros dois foram os que sangraram aqui. */
const CEGOS = ['pull_request', 'pull_request_review', 'pull_request_review_comment'];

const arquivos = readdirSync(DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
const falhas = [];

for (const nome of arquivos) {
  let texto = readFileSync(join(DIR, nome), 'utf8');
  if (MUT === 'guard-sem-if' && nome === 'csbrasil-bot-pr-classify.yml') {
    texto = texto.replace(/    if: >-\n(      github\.event_name[^\n]*\n)+/, '');
  }
  if (MUT === 'gatilho-cego-novo' && nome === 'preview-bot.yml') {
    texto = texto.replace('  pull_request_target:', '  pull_request_review:\n    types: [submitted]\n  pull_request_target:');
  }

  /* O bloco `on:` vai até a primeira chave de topo seguinte (coluna zero). Ler o
     arquivo inteiro daria falso positivo com `pull_request` citado em comentário
     dentro de um step. */
  const mOn = texto.match(/^on:\n([\s\S]*?)(?=^\S)/m);
  if (!mOn) continue;
  const bloco = mOn[1];
  const cegos = CEGOS.filter((g) => new RegExp(`^\\s{2}${g}:`, 'm').test(bloco));
  if (!cegos.length) continue;

  /* Guard de secret = o job aborta quando a variável de secret está vazia. */
  const temGuard = /-z "\$GH_TOKEN"|-z "\$\{?[A-Z_]*TOKEN/.test(texto) && /exit 1/.test(texto);
  if (!temGuard) continue;

  /* A defesa aceita: um `if:` de job que amarre o event_name ou compare o repo da
     head com o repositório - as duas formas de dizer "aqui eu tenho secret". */
  const temDefesa = /if:[\s\S]{0,400}?(github\.event_name\s*==|head\.repo\.full_name\s*==)/.test(texto);
  if (!temDefesa) {
    falhas.push(`WSEC1 ${nome}: guard de secret + gatilho cego (${cegos.join(', ')}) sem \`if:\` que exclua o caso de fork`);
  }
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log(`  \x1b[32m✓\x1b[0m WSEC1 nenhum portão reprova PR de fork por secret que aquele gatilho não pode ter (${arquivos.length} workflows)`);
if (MUT && !falhas.length) console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego`);
process.exit(falhas.length ? 1 : 0);
