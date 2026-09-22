#!/usr/bin/env node
// ============================================================================
// map-audit.mjs — auditoria completa de mapas: captura -> evidência -> decisão.
// ----------------------------------------------------------------------------
// Para cada dir de shots (bateria gl-shots), roda o vision-judge (rubrica E de
// RUBRIC.md) e a laya-gate, e produz um ranking com gate numérico. O humano
// continua assinando todo flip final; isto corta o volume que ele precisa olhar.
//
// Uso:
//   node tools/eval/map-audit.mjs <shotsRoot> [--maps gelo,mansao] [--aspect 32]
//   node tools/eval/map-audit.mjs ~/map2/shots-r2 --out out/map-audit/r1
// Saída: <out>/<mapa>.json (evidência), <out>/<mapa>.verdict.json (Laya),
//        audit.json (consolidado) e AUDIT.md (ranking legível).
// ============================================================================
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d = '') => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const ROOT = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!ROOT || !existsSync(ROOT)) { console.error('uso: node tools/eval/map-audit.mjs <shotsRoot> [--maps a,b] [--aspect 32] [--out dir]'); process.exit(2); }
const ASPECT = arg('aspect', '32');
const ONLY = arg('maps') ? arg('maps').split(',') : null;
const OUT = resolve(arg('out', 'tools/eval/out/map-audit/' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')));
mkdirSync(OUT, { recursive: true });

const dirs = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => ({ mapa: d.name, dir: resolve(ROOT, d.name) }))
  .filter(({ mapa, dir }) => {
    if (mapa.startsWith('.') || mapa === 'logs') return false;
    if (ONLY && !ONLY.includes(mapa)) return false;
    return readdirSync(dir).some((f) => f.endsWith('.png'));
  });
if (!dirs.length) { console.error(`nenhum dir de shots com PNG em ${ROOT}`); process.exit(2); }

function run(tool, args, opts = {}) {
  const r = spawnSync('node', [resolve(HERE, tool), ...args], {
    encoding: 'utf8', timeout: opts.timeout ?? 600_000, maxBuffer: 64 * 1024 * 1024,
  });
  return { code: r.status, out: r.stdout || '', err: r.stderr || '' };
}
function parseJson(txt) {
  const i = txt.indexOf('{'), j = txt.lastIndexOf('}');
  return i >= 0 && j > i ? JSON.parse(txt.slice(i, j + 1)) : null;
}

const results = [];
for (const { mapa, dir } of dirs) {
  const pngs = readdirSync(dir).filter((f) => f.endsWith(`-${ASPECT}-`) && f.endsWith('.png') && f.startsWith('game-')).sort();
  const imgs = (pngs.length ? pngs : readdirSync(dir).filter((f) => f.endsWith('.png') && f.startsWith('game-')).sort())
    .map((f) => resolve(dir, f));
  if (!imgs.length) { console.error(`[${mapa}] sem shots game-*.png; pulando`); continue; }
  console.error(`[${mapa}] vision-judge (${imgs.length} imgs)...`);

  const vj = run('vision-judge.mjs', ['--images=' + imgs.join(','), '--rubric=map', `--extra=mapa ${mapa}`]);
  const evJson = parseJson(vj.out);
  if (!evJson) {
    console.error(`[${mapa}] vision-judge FALHOU: ${(vj.err || vj.out).slice(0, 200)}`);
    results.push({ mapa, erro: 'vision-judge', detalhe: (vj.err || vj.out).slice(0, 300) });
    continue;
  }
  evJson.mapa = mapa;
  const mFile = resolve(dir, '_metrics.json');
  if (existsSync(mFile)) { try { evJson.metricas = JSON.parse(readFileSync(mFile, 'utf8')); } catch { /* métrica ilegível não bloqueia */ } }
  const evPath = resolve(OUT, `${mapa}.json`);
  writeFileSync(evPath, JSON.stringify(evJson, null, 2));

  console.error(`[${mapa}] laya-gate (nota ${evJson.nota_geral})...`);
  const lg = run('laya-gate.mjs', ['--evidence=' + evPath]);
  const verdict = parseJson(lg.out);
  if (!verdict) {
    console.error(`[${mapa}] laya-gate FALHOU: ${(lg.err || lg.out).slice(0, 200)}`);
    results.push({ mapa, erro: 'laya-gate', detalhe: (lg.err || lg.out).slice(0, 300), evidencia: evJson });
    continue;
  }
  results.push({ mapa, nota: evJson.nota_geral, pior_criterio: Math.min(...Object.entries(evJson).filter(([, v]) => v && typeof v === 'object' && typeof v.score === 'number').map(([, v]) => v.score)), n_defeitos: evJson.defeitos.length, verdict, evidencia: evJson });
  console.error(`[${mapa}] ${verdict.decisao.valor} (p=${verdict.decisao.confianca}) prio ${verdict.prioridade.valor}`);
}

results.sort((a, b) => (a.nota ?? 99) - (b.nota ?? 99));
writeFileSync(resolve(OUT, 'audit.json'), JSON.stringify({ root: ROOT, aspect: ASPECT, ts: new Date().toISOString(), results }, null, 2));

/* Relatório legível — ranking + gate numérico da rubrica E. */
const gate = (r) => r.erro ? 'ERRO' : r.nota >= 4 && r.pior_criterio >= 3 ? 'APROVAR' : r.nota >= 2.5 ? 'MELHORAR' : 'DESCARTAR?';
const linhas = results.map((r) => ({
  mapa: r.mapa, nota: r.nota, gate: gate(r), laya: r.verdict?.decisao?.valor, conf: r.verdict?.decisao?.confianca,
  prio: r.verdict?.prioridade?.valor, esforco: r.verdict?.esforco?.valor, sem_humano: r.verdict?.sem_humano?.valor,
}));
const md = [
  `# AUDIT — ${basename(ROOT)} (${results.length} mapas, aspecto ${ASPECT})`,
  '',
  `Gate numérico (rubrica E): nota≥4 e pior critério≥3 = APROVAR · 2.5≤nota = MELHORAR · <2.5 = DESCARTAR? · ERRO = reprocessar`,
  'Desconhecido/falha nunca vira aprovado. Laya roteia; humano assina flip final.',
  '',
  '| mapa | nota | gate | laya | conf | prio | esforço | sem humano |', '|---|---|---|---|---|---|---|---|',
  ...linhas.map((l) => `| ${l.mapa} | ${l.nota ?? '—'} | ${l.gate} | ${l.laya ?? '—'} | ${l.conf ?? '—'} | ${l.prio ?? '—'} | ${l.esforco ?? '—'} | ${l.sem_humano ?? '—'} |`),
  '',
  ...results.flatMap((r) => r.erro
    ? [`## ${r.mapa} — ${r.erro}`, '```', r.detalhe, '```', '']
    : [`## ${r.mapa} — nota ${r.nota}`, ...(r.evidencia.defeitos || []).map((d) => `- ${d}`), '']),
].join('\n');
writeFileSync(resolve(OUT, 'AUDIT.md'), md);
console.log(JSON.stringify(linhas, null, 2));
console.error(`\nescrito ${OUT}/audit.json e AUDIT.md`);
