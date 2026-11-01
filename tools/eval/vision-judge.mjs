#!/usr/bin/env node
// ============================================================================
// vision-judge.mjs — auditor visual ESTRUTURADO (evidência, nunca veredito).
// ----------------------------------------------------------------------------
// Envia screenshots a um VLM (modelos free de visão do opencode, sem chave
// nova) com as perguntas da rubrica e devolve JSON com scores 0-5 + defeitos
// enumerados. O papel do VLM é produzir evidência legível; a decisão de
// roteamento e o gosto final são humanos (mesmo contrato da RUBRIC.md).
//
// Uso:
//   node tools/eval/vision-judge.mjs --images a.png,b.png --rubric map
//   node tools/eval/vision-judge.mjs --images vm.png --rubric vm --out out.json
//   node tools/eval/vision-judge.mjs --images c1.png,c2.png --rubric char
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
const MODEL = arg('model', 'opencode/nemotron-3.5-super-vl-free');
const FALLBACK_MODEL = 'opencode/nemotron-3.5-super-vl-free';
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
  char: {
    instr: `Você é auditor visual de personagens 3D estilizados de um FPS browser (Three.js, sátira política brasileira). Cada imagem mostra o MESMO personagem de ângulos diferentes segurando uma arma (frente, 3/4 e close na empunhadura). Pontue CADA critério de 0-5 (5=perfeito/creível, 0=péssimo) e liste defeitos CONCRETOS e acionáveis (ex.: "mão direita atravessa o cabo", "arma aponta pra cima", "braço esquerdo flutuando longe do guarda-mão", "cabeça virada contrária ao torso"). Responda SOMENTE JSON válido, sem texto fora dele:
{"empunhadura_mao_direita":{"score":N,"evid":"..."},"mao_de_apoio":{"score":N,"evid":"..."},"orientacao_arma":{"score":N,"evid":"..."},"postura_corpo":{"score":N,"evid":"..."},"maos_e_dedos":{"score":N,"evid":"..."},"qualidade_modelo":{"score":N,"evid":"..."},"defeitos":["defeito acionável 1","..."],"nota_geral":N}`,
    keys: ['empunhadura_mao_direita', 'mao_de_apoio', 'orientacao_arma', 'postura_corpo', 'maos_e_dedos', 'qualidade_modelo'],
  },
};
const rub = RUBRICS[RUBRIC];
if (!rub) { console.error(`rubrica desconhecida: ${RUBRIC} (map|vm|char)`); process.exit(2); }

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

/* OPENROUTER (31/10, chave do dono): com OPENROUTER_API_KEY no env, o juiz usa um VL
 * forte via API em vez dos free do opencode (que alucinam em close). A chave NUNCA vai
 * para arquivo versionado: env apenas. Modelo default: gemini-2.5-flash (bom em visão,
 * barato); troque com --or_model=. */
const OR_KEY = process.env.OPENROUTER_API_KEY || '';
const OR_MODEL = arg('or_model', 'google/gemini-2.5-flash');

async function askOr(model, extraInstr = '') {
  const content = [{ type: 'text', text: rub.instr + extraInstr + (EXTRA ? `\nContexto: ${EXTRA}` : '') }];
  for (const img of images) {
    content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${readFileSync(img).toString('base64')}` } });
  }
  let j = null;
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${OR_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content }], max_tokens: 2048 }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    j = await r.json();
  } catch (e) {
    return { err: `openrouter(${model}) rede: ${String(e && e.message || e).slice(0, 160)}` };
  }
  if (j?.error) return { err: `openrouter(${model}): ${JSON.stringify(j.error).slice(0, 160)}` };
  const parsed = extractJson(j?.choices?.[0]?.message?.content || '');
  if (!validate(parsed)) return { err: `JSON inválido de openrouter(${model})` };
  return { j: parsed, model };
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
  return { j, model };
}

const ESTRICTO = '\nRESPOSTA ANTERIOR INVÁLIDA. Devolva APENAS o objeto JSON, nada mais.';
let res = OR_KEY ? await askOr(OR_MODEL) : ask(MODEL);
if (res.err) {
  console.error(`[vision-judge] ${res.err} — retry com instrução estrita`);
  res = OR_KEY ? await askOr(OR_MODEL, ESTRICTO) : ask(MODEL, ESTRICTO);
}
if (res.err && !OR_KEY) {
  console.error(`[vision-judge] ${res.err} — fallback ${FALLBACK_MODEL}`);
  res = ask(FALLBACK_MODEL);
}
if (res.err) { console.error(`[vision-judge] FALHOU: ${res.err}`); process.exit(1); }

res.j._meta = { rubric: RUBRIC, model: res.model, images: images.length, ts: new Date().toISOString() };
const out = JSON.stringify(res.j, null, 2);
if (OUT) writeFileSync(OUT, out);
console.log(out);
