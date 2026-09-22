#!/usr/bin/env node
// ============================================================================
// vision-judge.mjs — auditor visual ESTRUTURADO (evidência, nunca veredito).
// ----------------------------------------------------------------------------
// Envia screenshots a um VLM (modelos free de visão do opencode, sem chave
// nova) com as perguntas da rubrica (seção E de RUBRIC.md para mapas) e devolve
// JSON com scores 0-5 + defeitos enumerados. O papel do VLM é produzir evidência
// legível; a decisão de roteamento é da laya-gate.mjs, e o gosto final é humano.
//
// Uso:
//   node tools/eval/vision-judge.mjs --images a.png,b.png --rubric map
//   node tools/eval/vision-judge.mjs --images vm.png --rubric vm --out out.json
// Flags:
//   --model opencode/muse-spark-1.3-contributor-free   (fallback: mimo-v2.5)
//   --timeout 240   --extra "contexto extra em PT"
// ============================================================================
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = (n, d = '') => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const images = (arg('images') ? arg('images').split(',') : []).map((p) => resolve(p));
if (!images.length) { console.error('uso: --images a.png,b.png --rubric map'); process.exit(2); }
const RUBRIC = arg('rubric', 'map');
const OUT = arg('out');
const TIMEOUT = parseInt(arg('timeout', '240'), 10) * 1000;
const MODEL = arg('model', 'opencode/muse-spark-1.3-contributor-free');
const FALLBACK_MODEL = 'opencode/mimo-v2.5-free';
const EXTRA = arg('extra');

/* Rubricas: perguntas fechadas, saída JSON estrita. Mesmo contrato da RUBRIC.md. */
const RUBRICS = {
  map: {
    instr: `Você é auditor visual de mapas de FPS browser (Three.js, sátira brasileira). Pontue CADA critério de 0-5 (5=pronto, 0=péssimo) olhando TODAS as imagens (ângulos diferentes da mesma arena) e liste defeitos concretos e acionáveis. Responda SOMENTE JSON válido, sem texto fora dele:
{"lowpoly":{"score":N,"evid":"..."},"iluminacao":{"score":N,"evid":"..."},"densidade_props":{"score":N,"evid":"..."},"legibilidade_rotas":{"score":N,"evid":"..."},"horizonteceu":{"score":N,"evid":"..."},"defeitos":["defeito acionável 1","..."],"nota_geral":N}`,
    keys: ['lowpoly', 'iluminacao', 'densidade_props', 'legibilidade_rotas', 'horizonteceu'],
  },
  vm: {
    instr: `Você é auditor de viewmodels de FPS (arma em primeira pessoa). Pontue CADA critério de 0-5 e liste defeitos. Responda SOMENTE JSON válido:
{"silhueta":{"score":N,"evid":"..."},"posicionamento":{"score":N,"evid":"..."},"materiais":{"score":N,"evid":"..."},"animacao_frames":{"score":N,"evid":"..."},"defeitos":["..."],"nota_geral":N}`,
    keys: ['silhueta', 'posicionamento', 'materiais', 'animacao_frames'],
  },
};
const rub = RUBRICS[RUBRIC];
if (!rub) { console.error(`rubrica desconhecida: ${RUBRIC} (map|vm)`); process.exit(2); }

const semAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
function extractJson(txt) {
  const i = txt.indexOf('{'), j = txt.lastIndexOf('}');
  if (i < 0 || j <= i) return null;
  try { return JSON.parse(txt.slice(i, j + 1)); } catch { return null; }
}
function validate(j) {
  if (!j || typeof j !== 'object') return false;
  if (!rub.keys.every((k) => j[k] && typeof j[k].score === 'number')) return false;
  if (!Array.isArray(j.defeitos)) return false;
  return typeof j.nota_geral === 'number';
}

function ask(model, extraInstr = '') {
  const prompt = rub.instr + extraInstr + (EXTRA ? `\nContexto: ${EXTRA}` : '');
  const args = ['run', '--pure', '-m', model, prompt];
  for (const img of images) args.push('-f', img); // prompt ANTES dos -f: flag de array engole o resto
  const r = spawnSync('opencode', args, { encoding: 'utf8', timeout: TIMEOUT, maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) return { err: `opencode(${model}) exit ${r.status}: ${semAnsi(r.stderr || '').slice(0, 200)}` };
  const body = semAnsi(r.stdout).split('\n').filter((l) => !/^>\s/.test(l)).join('\n');
  const j = extractJson(body);
  if (!validate(j)) return { err: `JSON inválido de ${model}` };
  return { j };
}

let res = ask(MODEL);
if (res.err) {
  console.error(`[vision-judge] ${res.err} — retry com instrução estrita`);
  res = ask(MODEL, '\nRESPOSTA ANTERIOR INVÁLIDA. Devolva APENAS o objeto JSON, nada mais.');
}
if (res.err) {
  console.error(`[vision-judge] ${res.err} — fallback ${FALLBACK_MODEL}`);
  res = ask(FALLBACK_MODEL);
}
if (res.err) { console.error(`[vision-judge] FALHOU: ${res.err}`); process.exit(1); }

res.j._meta = { rubric: RUBRIC, model: MODEL, images: images.length, ts: new Date().toISOString() };
const out = JSON.stringify(res.j, null, 2);
if (OUT) writeFileSync(OUT, out);
console.log(out);
