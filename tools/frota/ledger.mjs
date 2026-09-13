#!/usr/bin/env node
/* ============================================================================
   ledger.mjs — A MEMÓRIA QUE SOBREVIVE AO TURNO.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Agente da frota morre no meio: estoura limite de token, a máquina reinicia, o
   turno expira. O que não pode morrer junto é o QUE JÁ FOI FEITO. Sem isso o
   próximo turno recomeça do zero — e recomeçar é pior que não começar, porque
   ele desfaz o checkpoint anterior achando que está limpando sujeira.

   O prompt do orquestrador da casa já dizia: "se o agente parar por limite, o
   próximo deve ler o ledger e o `git status`, sem recomeçar". Este arquivo é o
   ledger que aquela frase pressupunha e que nunca existiu.

   FORMATO: JSONL, append-only, um arquivo por lane.
   Append-only não é preciosismo — é o que permite dois processos escrevendo sem
   corromper, e é o que deixa o histórico do turno auditável depois que a lane
   mentiu sobre o que fez. Nada de reescrever linha passada.

   Vive em ~/.csbrasil-frota/ledger/ e NÃO no repositório: heartbeat de agente
   não é história do projeto, e commitar isso poluiria todo diff da frota.

   USO
     node tools/frota/ledger.mjs escrever lane-561 ANDAMENTO "rebase 3 de 7"
     node tools/frota/ledger.mjs ler lane-561 [--n=10]
     node tools/frota/ledger.mjs resumo
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const RAIZ = path.join(os.homedir(), '.csbrasil-frota', 'ledger');

export const ESTADOS = [
  'ANDAMENTO',
  'AGUARDANDO DONO',
  'BLOQUEADO',
  'VIOLACAO',
  'TURNO ABERTO',
  'TURNO FECHADO',
];

const arquivo = (lane) => path.join(RAIZ, `${lane}.jsonl`);

export function escrever(lane, estado, nota, extra = {}) {
  fs.mkdirSync(RAIZ, { recursive: true });
  const linha = { quando: new Date().toISOString(), lane, estado, nota, ...extra };
  fs.appendFileSync(arquivo(lane), JSON.stringify(linha) + '\n');
  return linha;
}

export function ler(lane, n = 20) {
  try {
    const linhas = fs.readFileSync(arquivo(lane), 'utf8').trim().split('\n').filter(Boolean);
    return linhas.slice(-n).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

export function lanes() {
  try {
    return fs.readdirSync(RAIZ).filter((f) => f.endsWith('.jsonl')).map((f) => f.replace(/\.jsonl$/, ''));
  } catch {
    return [];
  }
}

export function ultimo(lane) {
  return ler(lane, 1)[0] ?? null;
}

/** O bloco que entra no prompt do próximo turno. Sem ele o agente recomeça. */
export function contextoParaPrompt(lane, n = 12) {
  const linhas = ler(lane, n);
  if (!linhas.length) return 'LEDGER: vazio — este é o primeiro turno desta lane.';
  return [
    `LEDGER da ${lane} (${linhas.length} últimas entradas, mais antiga primeiro):`,
    ...linhas.map((l) => `  [${l.quando.slice(5, 16).replace('T', ' ')}] ${l.estado}: ${l.nota}`),
  ].join('\n');
}

const ehPrincipal = process.argv[1] && process.argv[1].endsWith('ledger.mjs');

if (ehPrincipal) {
  const [acao, lane, estado, ...resto] = process.argv.slice(2);

  if (acao === 'resumo') {
    const todas = lanes();
    if (!todas.length) console.log('  nenhuma lane registrada ainda');
    for (const l of todas) {
      const u = ultimo(l);
      console.log(`  ${l.padEnd(26)} ${String(u?.estado ?? '?').padEnd(16)} ${u?.quando?.slice(5, 16).replace('T', ' ')}  ${String(u?.nota ?? '').slice(0, 60)}`);
    }
    process.exit(0);
  }

  if (acao === 'ler') {
    const n = Number(process.argv.find((a) => a.startsWith('--n='))?.split('=')[1] ?? 20);
    for (const l of ler(lane, n)) console.log(`[${l.quando}] ${l.estado}: ${l.nota}`);
    process.exit(0);
  }

  if (acao === 'escrever') {
    if (!ESTADOS.includes(estado)) {
      console.error(`estado inválido: ${estado}\nválidos: ${ESTADOS.join(' | ')}`);
      process.exit(2);
    }
    const l = escrever(lane, estado, resto.join(' '));
    console.log(`ledger ← ${l.lane} ${l.estado}`);
    process.exit(0);
  }

  console.error('uso: ledger.mjs <escrever|ler|resumo> [lane] [estado] [nota]');
  process.exit(2);
}
