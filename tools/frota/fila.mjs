#!/usr/bin/env node
/* ============================================================================
   fila.mjs — QUEM PRECISA DE TRABALHO AGORA, E POR QUÊ NESSA ORDEM.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   A casa aprendeu a produzir mais rápido do que integra. No dia em que este
   arquivo nasceu havia 47 PRs abertos, 11 em conflito e 22 com check vermelho,
   contra uma main que andava sozinha. Fan-out de produção não resolve isso —
   piora: cada merge na main empurra os conflitantes para mais longe. O gargalo
   é integração, e integração precisa de uma FILA, não de mais braço.

   A ordem não é por número de PR nem por data. É por RISCO DE APODRECER:

     1. CONFLITO   — dívida que cresce sozinha. Cada commit na main aumenta o
                     custo de resolver. É a única classe que fica mais cara se
                     você não fizer nada, então vem primeiro, sempre.
     2. VERMELHO   — invariante crítica reprovando. Custo estável, mas bloqueia
                     o merge. Ordenado por quantas réguas faltam.
     3. PRONTO     — verde, sem conflito, esperando decisão humana. Custo zero
                     para o agente; aparece para o dono saber o que apertar.
     4. RASCUNHO   — trabalho não terminado. Só entra quando as classes acima
                     esvaziam, senão a fila volta a crescer pela ponta errada.
     5. PARADO     — sem commit há PARADO_DIAS. Provável abandono; a fila marca
                     para o dono decidir entre retomar e fechar, e nunca
                     despacha sozinha (fechar PR é decisão do dono).

   O QUE ELA NÃO FAZ
   Não faz merge, não faz push, não fecha PR. Só lê e ordena. Quem age é o
   `runner.mjs`, e mesmo ele para antes da main — ver `GUARDRAILS.md`.

   USO
     node tools/frota/fila.mjs              tabela para humano
     node tools/frota/fila.mjs --json       para o runner consumir
     node tools/frota/fila.mjs --classe=CONFLITO
     node tools/frota/fila.mjs --limite=5
   ========================================================================== */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

const PARADO_DIAS = 5;
const CAMPOS = 'number,title,headRefName,isDraft,mergeable,updatedAt,statusCheckRollup,author';

const CLASSES = ['CONFLITO', 'VERMELHO', 'PRONTO', 'RASCUNHO', 'PARADO'];
const PESO = Object.fromEntries(CLASSES.map((c, i) => [c, i]));

async function gh(args) {
  const { stdout } = await exec('gh', args, { maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

export async function lerPRs() {
  const bruto = await gh(['pr', 'list', '--state', 'open', '--limit', '200', '--json', CAMPOS]);
  return JSON.parse(bruto);
}

export async function mapaDeWorktrees() {
  const { stdout } = await exec('git', ['worktree', 'list', '--porcelain'], { maxBuffer: 8 * 1024 * 1024 });
  const mapa = new Map();
  let caminho = null;
  for (const linha of stdout.split('\n')) {
    if (linha.startsWith('worktree ')) caminho = linha.slice(9).trim();
    else if (linha.startsWith('branch ') && caminho) {
      mapa.set(linha.slice(7).trim().replace(/^refs\/heads\//, ''), caminho);
    }
  }
  return mapa;
}

function falhas(pr) {
  return (pr.statusCheckRollup || [])
    .filter((c) => c.conclusion === 'FAILURE')
    .map((c) => c.name);
}

function diasParado(pr) {
  return (Date.now() - new Date(pr.updatedAt).getTime()) / 86400000;
}

export function classificar(pr) {
  const vermelhos = falhas(pr);
  const parado = diasParado(pr);
  if (pr.mergeable === 'CONFLICTING') return 'CONFLITO';
  if (vermelhos.length > 0) return 'VERMELHO';
  if (parado > PARADO_DIAS) return 'PARADO';
  if (pr.isDraft) return 'RASCUNHO';
  return 'PRONTO';
}

export function ordenar(itens) {
  return [...itens].sort((a, b) => {
    if (PESO[a.classe] !== PESO[b.classe]) return PESO[a.classe] - PESO[b.classe];
    if (a.classe === 'VERMELHO' && a.falhas.length !== b.falhas.length) {
      return b.falhas.length - a.falhas.length;
    }
    return b.dias - a.dias;
  });
}

export async function montarFila() {
  const [prs, worktrees] = await Promise.all([lerPRs(), mapaDeWorktrees()]);
  const itens = prs.map((pr) => ({
    numero: pr.number,
    titulo: pr.title,
    branch: pr.headRefName,
    autor: pr.author?.login ?? '?',
    classe: classificar(pr),
    falhas: falhas(pr),
    dias: Number(diasParado(pr).toFixed(1)),
    rascunho: pr.isDraft,
    worktree: worktrees.get(pr.headRefName) ?? null,
  }));
  return ordenar(itens);
}

function tabela(fila) {
  const contagem = Object.fromEntries(CLASSES.map((c) => [c, 0]));
  for (const i of fila) contagem[i.classe] += 1;

  const linhas = [];
  linhas.push('');
  linhas.push('  FILA DA FROTA — ordenada por risco de apodrecer');
  linhas.push('  ' + '-'.repeat(94));
  linhas.push(
    '  ' + CLASSES.map((c) => `${c} ${contagem[c]}`).join('  ·  ') + `  ·  TOTAL ${fila.length}`,
  );
  linhas.push('  ' + '-'.repeat(94));

  let classeAtual = null;
  for (const i of fila) {
    if (i.classe !== classeAtual) {
      classeAtual = i.classe;
      linhas.push('');
      linhas.push(`  ── ${classeAtual} ──`);
    }
    const wt = i.worktree ? i.worktree.split('/').slice(-1)[0] : '— sem worktree —';
    const motivo =
      i.classe === 'VERMELHO' ? i.falhas.join(',') : i.classe === 'PARADO' ? `${i.dias}d` : '';
    linhas.push(
      `  #${String(i.numero).padEnd(4)} ${i.titulo.slice(0, 46).padEnd(46)} ${String(motivo).slice(0, 20).padEnd(20)} ${wt}`,
    );
  }
  linhas.push('');
  return linhas.join('\n');
}

const ehPrincipal = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());

if (ehPrincipal) {
  const arg = (n, d) => {
    const m = process.argv.find((a) => a.startsWith(`--${n}=`));
    return m ? m.split('=')[1] : d;
  };
  let fila = await montarFila();
  const classe = arg('classe');
  if (classe) fila = fila.filter((i) => i.classe === classe.toUpperCase());
  const limite = Number(arg('limite', 0));
  if (limite > 0) fila = fila.slice(0, limite);

  if (process.argv.includes('--json')) console.log(JSON.stringify(fila, null, 2));
  else console.log(tabela(fila));
}
