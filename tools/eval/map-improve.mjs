#!/usr/bin/env node
// ============================================================================
// map-improve.mjs — loop AUTOMÁTADO de melhoria de mapa (three.js expert agent).
// ----------------------------------------------------------------------------
// audita -> agent (omp -p) edita a cena -> re-captura -> re-audita -> ratchet:
// só fica o que melhora a nota da rubrica E; senão reverte. Micro-commits com
// trailer Agent:, regras do enxame map2 (game.js só Edit, look.js append-only),
// browser em slot único (loop serial), e prompts de props para o Mint no fim.
//
// Uso (a partir da raiz do repo client):
//   node tools/eval/map-improve.mjs --map=gelo --base=main --iters=2
//   node tools/eval/map-improve.mjs --map=mansao --base=feat/times-e-mapas-completo
// Saída: worktree worktrees/map-loop-<mapa>/ (branch map2/loop-<mapa>-rN),
//        tools/eval/out/map-loop/<mapa>/ (audits por iteração) e
//        mint-prompts/<mapa>.md (props que faltam, para gerar no mint.gg).
// ============================================================================
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const MAP = arg('map');
const BASE = arg('base', 'main');
const ITERS = parseInt(arg('iters', '2'), 10);
const PORT = arg('port', '8291');
const AGENT = arg('agent', 'omp'); // omp -p (padrão) — ferramenta com Edit/Bash
if (!MAP) { console.error('uso: node tools/eval/map-improve.mjs --map=<id> [--base=main] [--iters=2]'); process.exit(2); }

const WT = resolve(REPO, 'worktrees', `map-loop-${MAP}`);
const BRANCH = `map2/loop-${MAP}-auto`;
const OUT = resolve(REPO, 'tools/eval/out/map-loop', MAP);
mkdirSync(OUT, { recursive: true });
const LOG = (m) => console.error(`[map-improve ${MAP}] ${m}`);

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: opts.timeout ?? 600_000, maxBuffer: 64 * 1024 * 1024, cwd: opts.cwd });
  if (r.status !== 0 && !opts.ok0) throw new Error(`${cmd} ${args.join(' ')} -> exit ${r.status}\n${(r.stderr || r.stdout || '').slice(0, 800)}`);
  return r.stdout;
}

/* 1. worktree dedicado (serial por mapa; slot único de browser). */
if (!existsSync(WT)) {
  sh('git', ['worktree', 'add', '-b', BRANCH, WT, BASE], { cwd: REPO });
  LOG(`worktree criado em ${WT} (base ${BASE})`);
} else {
  LOG(`worktree existente: ${WT}`);
}

/* Id de captura: o registro na base pode usar prefixo antigo (fy_campomorro na
   main vs campomorro nas branches map2). Resolve no registro REAL do worktree —
   falhar alto é melhor que capturar nada em silêncio (BUG do gl-shots vazio). */
const CAPTURE_ID = (() => {
  const reg = readFileSync(resolve(WT, 'public/js/maps.js'), 'utf8');
  const bloco = reg.slice(reg.indexOf('export const MAPS'), reg.indexOf('\n};', reg.indexOf('export const MAPS')));
  const ids = [...bloco.matchAll(/^\s{2}([a-z][a-z0-9_]*)\s*:\s*\{/gm)].map((m) => m[1]);
  const id = ids.find((x) => x === MAP) ?? ids.find((x) => x === `fy_${MAP}`);
  if (!id) throw new Error(`mapa ${MAP} não está no registro do worktree (ids: ${ids.join(',')})`);
  return id;
})();
LOG(`id de captura no registro: ${CAPTURE_ID}`);

/* 2. captura + auditoria de UMA iteração no worktree. */
function auditOnce(tag) {
  const capRoot = resolve(OUT, `cap-${tag}`); // map-audit itera dirs: o dir do mapa tem que se chamar <MAP>
  const shotsDir = resolve(capRoot, MAP);
  mkdirSync(shotsDir, { recursive: true });
  /* Servidor + captura num só bash: spawnSync em servidor vivo bloquearia para
     sempre (spawnSync sempre espera o filho sair) — o wrapper cria, captura e mata. */
  sh('bash', ['-c',
    `cd "${WT}" && lsof -ti :${PORT} | xargs kill 2>/dev/null; node tools/eval/serve.mjs ${PORT} & S=$!; trap 'kill $S 2>/dev/null' EXIT; ` +
    `for i in 1 2 3 4 5 6 7 8 9 10; do curl -sf -o /dev/null http://127.0.0.1:${PORT}/ && break; sleep 1; done; ` +
    `ONLY=${CAPTURE_ID} BASE=http://127.0.0.1:${PORT} node tools/eval/gl-shots.mjs "${shotsDir}" game; ` +
    `R=$?; kill $S 2>/dev/null; exit $R`], { cwd: WT, timeout: 900_000, ok0: true });
  if (!readdirSync(shotsDir).some((f) => f.endsWith('.png'))) throw new Error(`gl-shots não produziu PNG em ${shotsDir}`);
  sh('node', [resolve(HERE, 'map-audit.mjs'), capRoot, `--maps=${MAP}`, `--out=${resolve(OUT, `audit-${tag}`)}`], { cwd: WT });
  const audit = JSON.parse(readFileSync(resolve(OUT, `audit-${tag}`, 'audit.json'), 'utf8'));
  const r = audit.results.find((x) => x.mapa === MAP);
  if (!r || r.erro) throw new Error(`auditoria ${tag} sem resultado: ${JSON.stringify(r).slice(0, 300)}`);
  return r;
}

/* 3. agente melhorador: omp -p não-interativo, three.js expert, regras da casa. */
function improveAgent(evidencia) {
  const defeitos = (evidencia.evidencia?.defeitos || []).map((d) => `- ${d}`).join('\n');
  const crit = Object.entries(evidencia.evidencia || {}).filter(([, v]) => v && typeof v === 'object' && typeof v.score === 'number')
    .map(([k, v]) => `- ${k}: ${v.score}/5 — ${v.evid}`).join('\n');
  const prompt = `Você é especialista sênior em Three.js e direção de arte de arenas de FPS browser. Melhore o mapa "${MAP}" do jogo (sátira brasileira, web, Three.js) NO REPO ATUAL.

AUDITORIA VISUAL INDEPENDENTE (multi-ângulo, no jogo real):
${crit}
Nota geral atual: ${evidencia.nota}/5. Meta: >= 4/5 sem nenhum critério < 3.

DEFEITOS A CORRIGIR (priorize nesta ordem):
${defeitos}

REGRAS DA CASA (invioláveis):
1. Edite APENAS os arquivos da cena deste mapa: public/js/map_${MAP}*.js (e mapas.js se registro precisar). public/js/game.js NUNCA via escrita inteira — só edições pontuais se estritamente necessário.
2. Horizonte/céu: só APPEND em look.js (zona append-only).
3. Nenhum asset/marca/pessoa real com copyright; ids de props em snake_case.
4. Orçamento web: cena total < 500k tris; texturas <= 1024²; prefira reusar materiais/props existentes em public/models/.
5. Se faltar um prop que não existe no repo, NÃO baixe nada: escreva a especificação dele em mint-prompts/${MAP}.md (nome, prompt em PT para text-to-3D, tamanho aproximado, onde entra).
6. Sem deps novas, sem build step, sem tocar em áudio/telemetria.
7. NÃO rode checks/invariantes do repo inteiro (o loop re-captura e re-audia sozinho; checks de repo custam 30min e incham JSONs gerados).

Faça as edições agora. Responda no fim um SUMÁRIO curto do que mudou (bullet points).`;
  LOG('agent omp -p melhorando cena...');
  const out = sh(AGENT, ['-p', '--no-session', `--cwd=${WT}`, prompt], { timeout: 2700_000 });
  writeFileSync(resolve(OUT, 'agent-last.md'), out);
  return out;
}

/* 4. loop com ratchet: melhou -> commit; piorou -> revert. */
let best = null, bestAudit = null, iter = 0;
while (iter < ITERS) {
  iter += 1;
  LOG(`=== iteração ${iter}/${ITERS} — auditoria de estado ===`);
  const cur = auditOnce(`it${iter}-antes`);
  LOG(`nota atual: ${cur.nota}`);
  if (!best || cur.nota > best) {
    improveAgent(cur);
    const depois = auditOnce(`it${iter}-depois`);
    LOG(`nota pós-agent: ${depois.nota} (melhor registrada: ${Math.max(best ?? 0, cur.nota)})`);
    if (depois.nota > cur.nota) {
      sh('git', ['add', '-A'], { cwd: WT });
      sh('git', ['commit', '-m', `map(${MAP}): loop auto it${iter} — nota ${cur.nota} -> ${depois.nota} (rubrica E)`, '-m', `Agent: map-improve/${AGENT}`], { cwd: WT });
      best = depois.nota; bestAudit = depois;
      LOG(`commit ratchet (nota ${depois.nota})`);
    } else {
      sh('git', ['checkout', '--', '.'], { cwd: WT, ok0: true });
      sh('git', ['clean', '-fd'], { cwd: WT, ok0: true });
      LOG('sem ganho — revertido');
      best = Math.max(best ?? 0, cur.nota); bestAudit = bestAudit || cur;
      if (depois.nota <= cur.nota - 0.5) break; // piorou muito: para
    }
  } else {
    LOG('nota não supera a melhor já registrada — parando');
    bestAudit = bestAudit || cur;
    break;
  }
}

/* 5. FLIP do caminho percorrido (antes vs depois) quando houver as duas baterias. */
const antes = resolve(OUT, 'cap-it1-antes', MAP);
const depoisDir = readdirSync(OUT).filter((d) => /^cap-it\d+-depois$/.test(d)).sort().pop();
if (depoisDir && existsSync(antes)) {
  const f = sh('node', [resolve(HERE, 'flip-gate.mjs'), antes, resolve(OUT, depoisDir, MAP), '--out=' + resolve(OUT, 'flip-final.json')], { ok0: true });
  LOG(`FLIP final (antes vs depois):\n${f}`);
}
LOG(`concluído. melhor nota: ${best}. Detalhes: ${OUT}/ · worktree: ${WT} (branch ${BRANCH})`);
console.log(JSON.stringify({ mapa: MAP, melhor_nota: best, iteracoes: iter, branch: BRANCH, out: OUT }));
