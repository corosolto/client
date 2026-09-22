#!/usr/bin/env node
// ============================================================================
// laya-gate.mjs — decisão tipada calibrada (Laya local, System 1) sobre evidência.
// ----------------------------------------------------------------------------
// Recebe o JSON de evidência de UMA unidade (mapa ou viewmodel — o que o
// vision-judge produziu, opcionalmente com métricas) e pergunta à Laya decisões
// de ROTEAMENTO, não de gosto: melhorar/aprovar/descartar, prioridade, esforço e
// se a evidência basta sem humano. Falha de modelo = ERRO explícito (desconhecido
// nunca vira aprovado — contrato de métricas da casa).
//
// Uso:
//   node tools/eval/laya-gate.mjs --evidence out/map-audit/x/gelo.vision.json
//   cat evid.json | node tools/eval/laya-gate.mjs --stdin
// Requer: .ml-venv do monorepo (pip install laya) + modelo baixado no cache HF.
// ============================================================================
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d = '') => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const PY = process.env.LAYA_PY
  || (existsSync(resolve(HERE, '../../../../.ml-venv/bin/python')) ? resolve(HERE, '../../../../.ml-venv/bin/python') : null);
if (!PY) { console.error('python do .ml-venv não achado; export LAYA_PY=<python com laya>'); process.exit(2); }
const BRIDGE = resolve(HERE, 'laya-predict.py');
if (!existsSync(BRIDGE)) { console.error(`ponte não achada: ${BRIDGE}`); process.exit(2); }

let ev;
if (arg('stdin') !== '' || process.stdin.isTTY === false) {
  ev = JSON.parse(readFileSync(0, 'utf8'));
} else {
  const f = arg('evidence');
  if (!f || !existsSync(f)) { console.error('uso: --evidence arquivo.json (ou --stdin)'); process.exit(2); }
  ev = JSON.parse(readFileSync(f, 'utf8'));
}

/* Estado em PT compacto: scores, evidências e defeitos que o VLM produziu. */
const crit = Object.fromEntries(
  Object.entries(ev).filter(([k, v]) => v && typeof v === 'object' && typeof v.score === 'number')
    .map(([k, v]) => [k, `${v.score}/5 — ${String(v.evid || '').slice(0, 180)}`]),
);
const state = {
  unidade: ev.mapa || ev.arma || ev.id || 'desconhecida',
  tipo: ev.mapa ? 'mapa' : 'viewmodel',
  criterios: crit,
  nota_geral: ev.nota_geral,
  defeitos: (ev.defeitos || []).slice(0, 12),
  metricas: ev.metricas || {},
};

const questions = {
  decisao: {
    type: 'choice',
    instructions: 'Qual o roteamento correto desta unidade no pipeline de qualidade do jogo?',
    criteria: {
      melhorar: 'nota ruim mas recuperável com edição direta de cena/props no código Three.js',
      aprovar: 'pronta para a revisão final humana; sem defeitos que bloqueiem',
      descartar: 'irrecuperável no estado atual; sair da seleção',
    },
  },
  prioridade: {
    type: 'choice',
    instructions: 'Qual a prioridade de fila?',
    criteria: { P0: 'bloqueia o gate de estabilidade/DAU agora', P1: 'próxima onda de equalização', P2: 'polimento posterior' },
  },
  esforco: {
    type: 'score',
    instructions: 'Quanto esforço de correção os defeitos pedem?',
    criteria: ['ajuste leve', 'ajuste médio', 'retrabalho pesado'],
  },
  sem_humano: {
    type: 'choice',
    instructions: 'A evidência disponível é suficiente para tomar esta decisão sem revisão humana adicional?',
    criteria: {
      basta: 'defeitos e scores são claros e suficientes para rotear sozinho',
      escalona: 'há ambiguidade, contradição ou falta de dado; humano precisa olhar',
    },
  },
};
const r = spawnSync(PY, [BRIDGE], {
  input: JSON.stringify({ state, questions }),
  encoding: 'utf8', timeout: 600_000, maxBuffer: 32 * 1024 * 1024,
});
if (r.status !== 0) {
  console.error(`laya falhou (exit ${r.status}): ${(r.stderr || '').slice(0, 500)}`);
  process.exit(2);
}
let res;
try { res = JSON.parse(r.stdout); } catch (e) { console.error(`resposta da laya não é JSON: ${e}`); process.exit(2); }

const a = res.answers || {};
const pick = (k) => (a[k] ? { valor: a[k].choice ?? a[k].answer ?? a[k].score, confianca: a[k].confidence ?? null } : null);
const verdict = {
  unidade: state.unidade,
  decisao: pick('decisao'),
  prioridade: pick('prioridade'),
  esforco: pick('esforco'),
  sem_humano: pick('sem_humano'),
  ts: new Date().toISOString(),
};
const out = JSON.stringify(verdict, null, 2);
if (arg('out')) { const { writeFileSync } = await import('node:fs'); writeFileSync(arg('out'), out); }
console.log(out);
