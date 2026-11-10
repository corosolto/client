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
   A defesa é medida POR JOB (14/10/2026): lida no arquivo inteiro, o `if:` de outro job
   cobria o job sem defesa, e os mutantes guard-sem-if e gatilho-cego-novo saíam verdes
   (o vermelho deles vinha só da trava de mutação cega).

   WSEC2 · o csbrasil-bot-automerge sem CSBRASIL_BOT_TOKEN avisa (`::warning` "Bot
           inerte") e pula num PASSO de guarda, não num job separado. O job `bot-token`
           existia só para ler o secret e subia um runner a mais em cada disparo, e o
           automerge dispara em label, sync, review e a cada pr-fast que termina. Todo
           passo depois da guarda obedece a ela (`if: env.pular != '1'`).

   Uso: node tools/eval/workflow-secret-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = '.github/workflows';
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = { 'guard-sem-if': 'WSEC1', 'gatilho-cego-novo': 'WSEC1', 'guarda-em-job': 'WSEC2', 'passo-fura-guarda': 'WSEC2', 'guarda-muda': 'WSEC2' };
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

/* Gatilhos que, num PR de fork, chegam sem secret. `pull_request` entra na lista
   porque é o caso clássico; os outros dois foram os que sangraram aqui. */
const CEGOS = ['pull_request', 'pull_request_review', 'pull_request_review_comment'];

const arquivos = readdirSync(DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
const falhas = [];

/* Corpo de cada job por indentação (id com 2 espaços dentro de `jobs:`). */
function jobsDe(texto) {
  const out = {};
  let dentro = false;
  let atual = null;
  for (const linha of texto.split('\n')) {
    if (/^jobs:\s*$/.test(linha)) { dentro = true; continue; }
    if (!dentro) continue;
    if (/^\S/.test(linha)) { dentro = false; continue; }
    const id = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(linha);
    if (id) { atual = id[1]; out[atual] = ''; continue; }
    if (atual) out[atual] += `${linha}\n`;
  }
  return out;
}

const fontes = arquivos.map((nome) => [nome, readFileSync(join(DIR, nome), 'utf8')]);
/* gatilho-cego-novo: um workflow novo escuta review de PR e reprova sem o secret,
   sem `if:` que exclua o fork. É a forma exata do vermelho do classify em 21/08. */
if (MUT === 'gatilho-cego-novo') {
  fontes.push(['mutante-cego.yml', "on:\n  pull_request_review:\n    types: [submitted]\njobs:\n  rotula:\n    runs-on: ubuntu-latest\n    env:\n      GH_TOKEN: ${{ secrets.CSBRASIL_BOT_TOKEN }}\n    steps:\n      - run: |\n          if [ -z \"$GH_TOKEN\" ]; then\n            exit 1\n          fi\n"]);
}

for (let [nome, texto] of fontes) {
  if (MUT === 'guard-sem-if' && nome === 'csbrasil-bot-pr-classify.yml') {
    texto = texto.replace(/    if: >-\n(      github\.event_name[^\n]*\n)+/, '');
  }

  /* O bloco `on:` vai até a primeira chave de topo seguinte (coluna zero). Ler o
     arquivo inteiro daria falso positivo com `pull_request` citado em comentário
     dentro de um step. */
  const mOn = texto.match(/^on:\n([\s\S]*?)(?=^\S)/m);
  if (!mOn) continue;
  const bloco = mOn[1];
  const cegos = CEGOS.filter((g) => new RegExp(`^\\s{2}${g}:`, 'm').test(bloco));
  if (!cegos.length) continue;

  /* Por JOB, não por arquivo: o `if:` de defesa tem de estar no job que tem a guarda.
     Lido no arquivo inteiro, o `if:` de OUTRO job (o sweep do classify) cobria o job sem
     defesa, e os dois mutantes desta régua ficavam verdes calados. */
  for (const [job, corpo] of Object.entries(jobsDe(texto))) {
    /* Guarda de secret = o job aborta quando a variável de secret está vazia. */
    const temGuard = /-z "\$GH_TOKEN"|-z "\$\{?[A-Z_]*TOKEN/.test(corpo) && /exit 1/.test(corpo);
    if (!temGuard) continue;
    /* A defesa aceita: um `if:` DE JOB que amarre o event_name ou compare o repo da
       head com o repositório - as duas formas de dizer "aqui eu tenho secret". */
    const ifJob = /^ {4}if:([^\n]*\n(?: {6,}[^\n]*\n)*)/m.exec(corpo)?.[1] || '';
    if (!/github\.event_name\s*==|head\.repo\.full_name\s*==/.test(ifJob)) {
      falhas.push(`WSEC1 ${nome} · job \`${job}\`: guard de secret + gatilho cego (${cegos.join(', ')}) sem \`if:\` de job que exclua o caso de fork`);
    }
  }
}

/* ---- WSEC2: a guarda do token do automerge é passo, avisa, e manda nos seguintes ---- */
{
  let am = readFileSync(join(DIR, 'csbrasil-bot-automerge.yml'), 'utf8');
  if (MUT === 'guarda-em-job') am = am.replace(/^jobs:\n/m, 'jobs:\n  bot-token:\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n    steps:\n      - run: echo token\n');
  if (MUT === 'passo-fura-guarda') am = am.replace(/(- name: Fetch PR status\n)\s+if: env\.pular != '1'\n/, '$1');
  if (MUT === 'guarda-muda') am = am.replace(/::warning title=Bot inerte::/, '');
  const jobs = jobsDe(am);
  const ids = Object.keys(jobs);
  const esperados = ['automerge', 'sweep'];
  if (ids.length !== esperados.length || esperados.some((id) => !ids.includes(id))) {
    falhas.push(`WSEC2 csbrasil-bot-automerge.yml tem os jobs [${ids.join(', ')}] — esperados [${esperados.join(', ')}], cada um com guarda em passo`);
  }
  for (const id of esperados) {
    const passos = (jobs[id] || '').split(/\n {6}- /).slice(1);
    const guarda = passos[0] || '';
    if (!/-z "\$GH_TOKEN"/.test(guarda) || !/pular=1[^\n]*GITHUB_ENV/.test(guarda)) falhas.push(`WSEC2 o primeiro passo de ${id} não é a guarda do token (\`-z "$GH_TOKEN"\` → \`pular=1\` no GITHUB_ENV)`);
    if (!/::warning title=Bot inerte::/.test(guarda)) falhas.push(`WSEC2 a guarda de ${id} não avisa (\`::warning title=Bot inerte::\`) — bot inerte em silêncio`);
    if (/exit 1/.test(guarda)) falhas.push(`WSEC2 a guarda de ${id} reprova: sem PAT o job pula, não pinta o PR de vermelho`);
    passos.slice(1).forEach((p, i) => {
      if (!/^\s*if: env\.pular != '1'/m.test(p)) falhas.push(`WSEC2 o passo ${i + 2} de ${id} (${(/name: ([^\n]+)/.exec(p) || /uses: ([^\n@]+)/.exec(p) || [, '?'])[1]}) roda mesmo sem o token`);
    });
  }
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log(`  \x1b[32m✓\x1b[0m WSEC1 nenhum portão reprova PR de fork por secret que aquele gatilho não pode ter (${arquivos.length} workflows)`);
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego`);
  falhas.push('mutacao-cega');   // prova que não morde é vermelho, não aviso (MC1)
}
process.exit(falhas.length ? 1 : 0);
